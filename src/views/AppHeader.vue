<template>
  <header class="app-header appheader-bg">
    <!-- Decorative header background -->
    <div class="code-bg" aria-hidden="true"></div>

    <div class="inner">
      <!-- Left: Brand text (guest) OR avatar/meta (authed) -->
      <div class="left">
        <template v-if="auth.isAuthenticated">
          <button
            class="avatar-btn"
            type="button"
            @click="openProfile()"
            aria-label="Open profile"
            title="Open profile"
          >
            <img class="avatar" :src="avatarSrc" alt="User avatar" @error="onAvatarError" />
          </button>

          <div class="meta">
            <div class="name">
              {{ displayName }}
              <!-- Role chips removed -->
            </div>
            <div class="org">Lv. {{ levelLabel }}</div>
          </div>
        </template>

        <template v-else>
          <div class="brand-name" title="EiTake">EiTake</div>
        </template>
      </div>

      <!-- Top-right: logo + Login/Logout -->
      <div class="top-right">
        <img :src="BrandLogo" alt="EiTake logo" class="brand-logo" title="EiTake" />

        <button
          v-if="!auth.isAuthenticated"
          class="btn small auth-btn"
          type="button"
          @click="login"
          aria-label="Log in"
          title="Log in"
        >
          Log in
        </button>

        <button
          v-else
          class="btn logout small auth-btn"
          type="button"
          @click="logout"
          aria-label="Log out"
          title="Log out"
        >
          Log out
        </button>
      </div>

      <!-- Bottom-right: primary nav -->
      <nav class="actions" aria-label="Primary navigation" ref="actionsEl">
        <div class="pill-list" role="menubar">
          <RouterLink
            v-for="(a, i) in headerActions"
            :key="i"
            class="btn action small"
            :class="{ active: $route.path.startsWith(a.to) }"
            :to="a.to"
            role="menuitem"
            :title="a.title || a.label"
          >
            <span v-if="a.icon" class="icon" aria-hidden="true">{{ a.icon }}</span>
            <span>{{ a.label }}</span>
          </RouterLink>
        </div>

        <!-- Mobile hamburger -->
        <button
          class="btn action small menu-toggle"
          :class="{ 'is-open': menuOpen }"
          type="button"
          :aria-expanded="menuOpen ? 'true' : 'false'"
          aria-controls="actions-menu"
          @click="toggleMenu"
        >
          <span class="menu-icon" aria-hidden="true">
            <span class="bar"></span>
            <span class="bar"></span>
            <span class="bar"></span>
          </span>
          <span class="menu-label">Menu</span>
        </button>
      </nav>
    </div>

    <!-- Mobile dropdown -->
    <Teleport to="body">
      <Transition name="menu-fade">
        <div
          v-if="menuOpen"
          id="actions-menu"
          class="menu-panel"
          role="dialog"
          aria-modal="true"
          @click.self="closeMenu"
        >
          <div class="menu-sheet">
            <RouterLink
              v-for="(a, i) in headerActions"
              :key="i"
              class="btn action small"
              :class="{ active: $route.path.startsWith(a.to) }"
              :to="a.to"
              role="menuitem"
              :title="a.title || a.label"
              @click="closeMenu"
            >
              <span v-if="a.icon" class="icon" aria-hidden="true">{{ a.icon }}</span>
              <span>{{ a.label }}</span>
            </RouterLink>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Profile popup -->
    <Teleport to="body">
      <Profile
        v-if="profileOpen"
        :key="auth.profile?.id || 'anon'"
        :open="profileOpen"
        @close="closeProfile"
        @choose-avatar="openAvatarFromProfile"
      />
    </Teleport>

    <!-- Avatar selection popup -->
    <Teleport to="body">
      <AvatarSelection
        v-if="avatarOpen"
        :current-key="auth.profile?.avatar_url || undefined"
        @close="onAvatarClosed"
      />
    </Teleport>
  </header>
</template>


<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch, nextTick, onScopeDispose } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/users';
import { supabase } from '@/lib/supabase';
import type { Subscription } from '@supabase/supabase-js';

import BrandLogo from '@/assets/images/logos/EiTake_Kanji.png';
import Profile from '@/components/Profile.vue';
import AvatarSelection from '@/components/AvatarSelection.vue';
import MushroomGreeters from '@/components/MushroomGreeters.vue';

const router = useRouter();
const route = useRoute();
const auth = useUserStore();

/* ─────────────────────────────────────────────────────────────
   Helpers: timeout + guard
───────────────────────────────────────────────────────────── */
function withTimeout<T>(p: PromiseLike<T>, ms = 3500, label = 'op'): Promise<T> {
  let to: any;
  const t = new Promise<never>((_, rej) => (to = setTimeout(() => rej(new Error(`${label}:timeout`)), ms)));
  return Promise.race([p as any, t]).finally(() => clearTimeout(to)) as Promise<T>;
}
let mountCancelled = false;
onScopeDispose(() => { mountCancelled = true; });

/* ─────────────────────────────────────────────────────────────
   Focus/visibility re-hydrate
───────────────────────────────────────────────────────────── */
function onFocus() {
  if (!auth.isAuthenticated) return;
  void Promise.allSettled([auth.loadProfile?.(), auth.loadXp?.()]);
  void refreshLevel(true);
}
function onVisibility() { if (document.visibilityState === 'visible') onFocus(); }

/* ─────────────────────────────────────────────────────────────
   Level source #1 (authoritative): v_profile_progress
   Level source #2 (fallback): derive from xp_levels + xp_total
───────────────────────────────────────────────────────────── */
type XpRow = { level: number; min_xp: number };
const xpLevels = ref<XpRow[]>([]);
const xpLevelsLoaded = ref(false);
let xpLevelsLoading = false;

function normalizeRows(rows: any[] | null | undefined): XpRow[] {
  if (!Array.isArray(rows)) return [];
  const norm = rows
    .map(r => ({ level: Number(r?.level), min_xp: Number(r?.min_xp) }))
    .filter(r => Number.isFinite(r.level) && Number.isFinite(r.min_xp))
    .sort((a, b) => a.min_xp - b.min_xp);
  return norm;
}

async function ensureXpLevels(force = false) {
  if (xpLevelsLoading) return;
  if (xpLevelsLoaded.value && !force) return;
  xpLevelsLoading = true;
  try {
    const res = await withTimeout(
      supabase
        .from('xp_levels')
        .select('level,min_xp')
        .order('min_xp', { ascending: true }) as unknown as PromiseLike<{ data: any[] | null; error: any }>,
      4000,
      'xp_levels'
    );
    if (res.error) { xpLevelsLoaded.value = false; return; }
    const cleaned = normalizeRows(res.data);
    xpLevels.value = cleaned;
    xpLevelsLoaded.value = cleaned.length > 0;
  } catch { xpLevelsLoaded.value = false; }
  finally { xpLevelsLoading = false; }
}

function deriveLevel(xp: number, rows: XpRow[]): number {
  if (!rows.length || !Number.isFinite(xp)) return 1;
  let lvl = rows[0]?.level ?? 1;
  for (const r of rows) { if (xp >= r.min_xp) lvl = r.level; else break; }
  return lvl;
}

/** Primary fetch: use v_profile_progress.level */
async function fetchLevelFromView(userId: string): Promise<number | null> {
  try {
    const res = await withTimeout(
      supabase.from('v_profile_progress').select('level').eq('user_id', userId).maybeSingle() as unknown as PromiseLike<{ data: { level?: number } | null; error: any }>,
      3500,
      'v_profile_progress'
    );
    if (res?.error) return null;
    const lvl = Number(res?.data?.level);
    return Number.isFinite(lvl) && lvl > 0 ? lvl : 1;
  } catch {
    return null;
  }
}

/** Orchestrator: try view → fallback to derive */
const levelValue = ref<number>(1);
async function refreshLevel(forceXpLevels = false) {
  if (!auth.isAuthenticated) { levelValue.value = 1; return; }
  const uid = auth.profile?.id || (await supabase.auth.getUser()).data?.user?.id || null;
  if (!uid) { levelValue.value = 1; return; }

  // 1) Try the view (authoritative and cheap)
  const fromView = await fetchLevelFromView(uid);
  if (fromView != null) { levelValue.value = fromView; return; }

  // 2) Fallback: derive from xp_total + xp_levels
  if (!xpLevelsLoaded.value || forceXpLevels) await ensureXpLevels(true);
  const xp = Number(auth.xpTotal ?? 0);
  levelValue.value = deriveLevel(xp, xpLevels.value);
}

/* Computed label for template */
const levelLabel = computed(() => (auth.isAuthenticated ? String(levelValue.value) : '—'));

/* Keep level fresh when xp changes */
watch(() => auth.xpTotal, () => { if (auth.isAuthenticated) void refreshLevel(); });

/* ─────────────────────────────────────────────────────────────
   Lifecycle
───────────────────────────────────────────────────────────── */
let authSub: Subscription | null = null;

onMounted(() => {
  window.addEventListener('focus', onFocus);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('keydown', onKeydown);

  void (async () => {
    try { await withTimeout(auth.ensureIdentityLoaded?.() ?? Promise.resolve(), 2500, 'identity'); }
    catch { /* continue */ }
    finally {
      if (mountCancelled) return;
      if (auth.isAuthenticated) {
        await Promise.allSettled([auth.loadProfile?.(), auth.loadXp?.()]);
        await refreshLevel(true);
      } else {
        // preload thresholds for fast fallback later
        void ensureXpLevels();
      }
    }
  })();

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
    queueMicrotask(async () => {
      if (mountCancelled) return;
      if (event === 'SIGNED_IN') {
        await Promise.allSettled([auth.loadProfile?.(), auth.loadXp?.()]);
        await refreshLevel(true);
        return;
      }
      if (event === 'SIGNED_OUT') {
        levelValue.value = 1;
        xpLevels.value = [];
        xpLevelsLoaded.value = false;
        return;
      }
      if (auth.isAuthenticated) {
        void Promise.allSettled([auth.loadProfile?.(), auth.loadXp?.()]);
        void refreshLevel();
      }
    });
  });
  authSub = subscription;
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  window.removeEventListener('focus', onFocus);
  document.removeEventListener('visibilitychange', onVisibility);
  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';
  authSub?.unsubscribe();
  authSub = null;
});

/* ─────────────────────────────────────────────────────────────
   Avatar/name
───────────────────────────────────────────────────────────── */
const avatarSrc = computed(() => {
  const raw = auth.profile?.avatar_url;
  if (!raw) return BrandLogo;
  if (/^https?:\/\//i.test(raw)) return raw;
  return supabase.storage.from('public-assets').getPublicUrl(raw).data.publicUrl || BrandLogo;
});
const displayName = computed(() => auth.displayName || '');

/* ─────────────────────────────────────────────────────────────
   Nav / actions
───────────────────────────────────────────────────────────── */
const isOnDashboard = computed(() => {
  const name = (route.name as string) || '';
  const path = route.path || '';
  return name?.toLowerCase().includes('dashboard') || path === '/dashboard';
});

type HeaderAction = { label: string; to: string; title?: string; icon?: string };

const headerActions = computed<HeaderAction[]>(() => {
  const items: HeaderAction[] = [
    { label: 'Home', to: '/dashboard', icon: '🏠' },
    { label: 'Games', to: '/activities', icon: '🎮' },
  ];

  if (auth.isDev) {
    items.push({ label: 'Users', to: '/users', icon: '👥', title: 'Users (Dev only)' });
  }
  if (auth.orgRole === 'admin') {
    items.push({ label: 'Admin', to: '/admin-panel', icon: '🛠️', title: 'Admin Panel' });
  }

  return items;
});

/* ─────────────────────────────────────────────────────────────
   Auth actions
───────────────────────────────────────────────────────────── */
function goBack() { router.back(); }
async function login() {
  try { await router.push({ name: 'Login' }); }
  catch { await router.push('/login'); }
}
async function logout() {
  try { await auth.signOut?.(); }
  finally {
    try {
      Object.keys(localStorage).forEach(k => { if (k.startsWith('sb-')) localStorage.removeItem(k); });
      auth.$reset?.();
    } catch {}
    await router.replace('/dashboard');
  }
}

/* ─────────────────────────────────────────────────────────────
   Modals / menu
───────────────────────────────────────────────────────────── */
const profileOpen = ref(false);
const avatarOpen = ref(false);
function openProfile() { profileOpen.value = true; }
function closeProfile() { profileOpen.value = false; }
function openAvatarFromProfile() { avatarOpen.value = true; }
async function onAvatarClosed() { avatarOpen.value = false; void auth.loadProfile?.(); }

const menuOpen = ref(false);
function toggleMenu() { menuOpen.value = !menuOpen.value; }
function closeMenu() { menuOpen.value = false; }
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (avatarOpen.value) { avatarOpen.value = false; return; }
    if (profileOpen.value) { profileOpen.value = false; return; }
    closeMenu();
  }
}
watch(() => route.fullPath, () => closeMenu());

const anyModalOpen = computed(() => menuOpen.value || profileOpen.value || avatarOpen.value);
watch(anyModalOpen, async (open) => {
  document.documentElement.style.overflow = open ? 'hidden' : '';
  document.body.style.overflow = open ? 'hidden' : '';
  await nextTick();
});

/* ─────────────────────────────────────────────────────────────
   Greeters ref & avatar fallback
───────────────────────────────────────────────────────────── */
const actionsEl = ref<HTMLElement | null>(null);
function onAvatarError(e: Event) {
  const img = e.target as HTMLImageElement;
  img.onerror = null;
  img.src = BrandLogo;
}
</script>

<style scoped>
/* Header frame — now FIXED and a bit shorter */
.app-header {
  position: fixed;
  inset-inline: 0;
  inset-block-start: 0;
  width: 100%;
  height: var(--app-header-height);

  overflow: clip;
  isolation: isolate;
  border-bottom: var(--header-border-width) solid var(--header-border-color);
  box-shadow: var(--header-shadow);

  z-index: 100;
}

/* Two-tone header surface with grid lines */
.appheader-bg .code-bg {
  position: absolute;
  inset: 0;
  z-index: 0;

  --grid-size: 24px;
  --grid-line-w: 1px;

  background:
    /* grid (y) */ linear-gradient(to bottom, var(--header-grid-color) var(--grid-line-w), transparent 0),
    /* grid (x) */ linear-gradient(to right,  var(--header-grid-color) var(--grid-line-w), transparent 0),
    /* base */      var(--header-surface);
  background-size:
    var(--grid-size) var(--grid-size),
    var(--grid-size) var(--grid-size),
    auto;
  background-position: 0 0, 0 0, center;
}

/* Slightly tighter inner padding to keep height compact */
.inner {
  position: relative;
  z-index: 2;
  height: 100%;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 18px;
  padding: 8px clamp(12px, 3vw, 20px);
}

.left {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.brand-name {
  font-weight: 900;
  letter-spacing: .3px;
  font-size: clamp(22px, 3vh, 30px);
  color: var(--header-on-surface);
  text-shadow: 0 1px 0 color-mix(in srgb, var(--header-on-surface) 60%, transparent);
}

/* Auth buttons use header button tokens */
.auth-btn { color: var(--header-btn-on); }

/* Avatar button */
.avatar-btn {
  position: relative;
  display: grid;
  place-items: center;
  width: clamp(48px, 7vh, 64px);
  height: clamp(48px, 7vh, 64px);
  border-radius: 999px;
  padding: 0;
  border: 3px dotted transparent;
  background: transparent;
  cursor: pointer;
  transition: border-color .18s ease;
}
.avatar-btn:hover { border-color: var(--header-border-color); }

.avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 1.5px solid var(--modal-border);
  object-fit: cover;
  background: var(--neutral-100);
}

.meta { display: grid; gap: 2px; color: var(--header-on-surface); }

.name {
  font-weight: 800;
  letter-spacing: .2px;
  font-size: clamp(18px, 2.4vh, 22px);
  line-height: 1.15;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--header-on-surface);
}

.org {
  font-weight: 700;
  opacity: .95;
  font-size: clamp(13px, 1.9vh, 16px);
  line-height: 1.12;
  color: var(--modal-on-surface-muted);
}

.top-right {
  position: absolute;
  top: 6px;
  right: 10px;
  z-index: 5;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.brand-logo { height: 30px; width: auto; display: block; }

/* Buttons with animated fill */
.btn {
  border: 2px solid var(--header-btn-border-color);
  background-color: var(--header-btn-bg);
  color: var(--header-btn-text);
  padding: 6px 10px;
  border-radius: 12px;
  font-weight: 800;
  text-decoration: none;
  cursor: pointer;
  box-shadow: var(--header-shadow);

  background-image: var(--header-btn-fill);
  background-repeat: no-repeat;
  background-position: 0 0;
  background-size: 0% 100%;

  transition:
    background-size .32s ease,
    color .18s ease,
    background-color .18s ease,
    transform .12s ease;
  will-change: background-size;
}

.btn:hover {
  transform: translateY(-1px);
  background-color: var(--header-btn-hover);
  color: var(--header-btn-text-hover);
  background-size: 100% 100%;
}
.btn:active { transform: translateY(0); }

.small { padding: 4px 10px; font-size: 13px; }

.btn.logout {
  background-color: var(--logout-btn-bg);
  color: var(--logout-btn-on);
  border-color: var(--btn-danger-border);

  background-image: var(
    --logout-btn-fill,
    linear-gradient(
      90deg,
      var(--logout-fill-start, color-mix(in srgb, var(--accent-danger) 30%, var(--neutral-0) 70%)),
      var(--logout-fill-mid,   var(--accent-danger)) 60%,
      var(--logout-fill-end,   color-mix(in srgb, var(--accent-danger) 80%, var(--neutral-900) 20%))
    )
  );
  background-repeat: no-repeat;
  background-position: 0 0;
  background-size: 0% 100%;

  transition:
    background-size .32s ease,
    color .18s ease,
    background-color .18s ease,
    transform .12s ease;
  will-change: background-size;
}
.btn.logout:hover {
  background-size: 100% 100%;
  color: var(--logout-btn-on-hover);
  filter: saturate(1.02);
}

/* Nav actions */
.actions {
  position: absolute;
  right: 10px;
  bottom: 4px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  z-index: 5;
}

.pill-list { display: inline-flex; gap: 8px; }

.btn.action.active {
  transform: translateY(-1px);
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.08);
  background-color: var(--header-btn-hover);
  color: var(--header-btn-on-hover);
  background-image: var(--header-btn-fill);
  background-repeat: no-repeat;
  background-position: 0 0;
  background-size: 100% 100%;
}

/* Mobile menu toggle */
.menu-toggle {
  display: none;
  align-items: center;
  gap: 6px;
  padding-inline: 10px 12px;
  transition:
    transform .12s ease,
    box-shadow .12s ease;
}

.menu-toggle:hover {
  transform: translateY(-1px) scale(1.02);
}

.menu-icon {
  position: relative;
  width: 18px;
  height: 16px;
  display: inline-flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
}

.menu-icon .bar {
  height: 2px;
  width: 100%;
  border-radius: 999px;
  background: var(--header-btn-text);
  transition:
    transform .18s ease,
    opacity .18s ease,
    width .18s ease,
    background-color .18s ease;
}

/* Morph into an X when open */
.menu-toggle.is-open .menu-icon .bar:nth-child(1) {
  transform: translateY(5px) rotate(45deg);
}

.menu-toggle.is-open .menu-icon .bar:nth-child(2) {
  opacity: 0;
  width: 0;
}

.menu-toggle.is-open .menu-icon .bar:nth-child(3) {
  transform: translateY(-5px) rotate(-45deg);
}

.menu-label {
  font-size: 13px;
  font-weight: 800;
}

@media (max-width: 720px) {
  .pill-list { display: none; }
  .menu-toggle { display: inline-flex; }
}

/* Mobile menu overlay — sits OVER header + side panels */
.menu-panel {
  position: fixed;
  padding-top: var(--app-header-height);
  inset: 0;
  z-index: 1000;
  background: var(--modal-overlay-bg);
  backdrop-filter: var(--modal-overlay-filter);
  pointer-events: auto;

  /* For dropdown-style animation */
  transform-origin: top center;
  transform: scaleY(1);
}


.menu-sheet {
  position: absolute;
  right: 12px;
  top: calc(var(--header-h) + 8px);
  max-height: calc(100vh - (var(--header-h) + 24px));
  overflow: auto;
  display: grid;
  gap: 8px;
  grid-auto-rows: min-content;
  min-width: min(92vw, 420px);
  background: var(--modal-surface);
  border: 1px solid var(--modal-border);
  border-radius: var(--radius-lg);
  padding: 12px;
  box-shadow: var(--modal-shadow);
  pointer-events: auto;
}

.menu-sheet * { pointer-events: auto; }

.menu-sheet .btn {
  --menu-item-h: 36px;
  display: flex;
  align-items: center;
  gap: 8px;
  height: var(--menu-item-h);
  max-height: var(--menu-item-h);
  padding: 6px 10px;
  font-size: 14px;
  line-height: 1.1;
  border-radius: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--modal-on-surface);
  background: var(--modal-surface);
  border-color: var(--modal-border);
}
.menu-sheet .btn:hover {
  background: color-mix(in srgb, var(--modal-accent) 12%, var(--modal-surface) 88%);
  transform: translateY(-1px);
}

.menu-sheet .btn .icon { margin-right: 6px; line-height: 1; }
@media (max-width: 380px) {
  .menu-sheet .btn {
    --menu-item-h: 32px;
    font-size: 13px;
    padding: 5px 9px;
  }
}

/* Dropdown open/close animation */
.menu-fade-enter-active,
.menu-fade-leave-active {
  transition: opacity .18s ease, transform .18s ease;
}

.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}

.menu-fade-enter-to,
.menu-fade-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .btn,
  .btn:hover,
  .btn.logout,
  .btn.logout:hover,
  .menu-icon .bar,
  .menu-fade-enter-active,
  .menu-fade-leave-active {
    transition: none;
  }
}
</style>
