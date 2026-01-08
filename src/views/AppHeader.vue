<!-- src/components/AppHeader.vue -->
<template>
  <header class="app-header appheader-bg">
    <!-- Decorative header background -->
    <div class="code-bg" aria-hidden="true"></div>

    <div class="inner">
      <!-- Left: EiTake brand (always visible, routes to /dashboard) -->
      <div class="left">
        <button class="brand-name" type="button" @click="goDashboard" title="Dashboard">
          EiTake
        </button>
      </div>

      <!-- Right: Nav + Auth (avatar or login) -->
      <div class="right">
        <!-- Primary nav (desktop) -->
        <nav class="actions" aria-label="Primary navigation" ref="actionsEl">
          <div class="pill-list" role="menubar">
            <!-- Users button (conditional) — placed left of dropdowns -->
            <RouterLink
              v-if="usersAction"
              class="btn action nav-btn"
              :class="{ active: isActiveAction(usersAction) }"
              :to="usersAction.to"
              role="menuitem"
              :title="usersAction.title || usersAction.label"
            >
              <span v-if="usersAction.icon" class="icon" aria-hidden="true">{{ usersAction.icon }}</span>
              <span>{{ usersAction.label }}</span>
            </RouterLink>

            <!-- Dropdowns -->
            <template v-for="(action, i) in dropdownActions" :key="i">
              <div class="header-action-dropdown" role="menuitem" :title="action.title || action.label">
                <ActivityPillList
                  v-if="action.dropdown.component === 'ActivityPillList'"
                  variant="dropdown"
                  v-bind="action.dropdown.props"
                />
                <TextbookPillList
                  v-else
                  variant="dropdown"
                  buttonText="Textbooks"
                  :showSectionTitle="false"
                  :startOpen="false"
                  :closeOnSelect="true"
                  :showCountsInButton="true"
                />
              </div>
            </template>
          </div>

          <!-- Mobile hamburger -->
          <button
            class="btn action nav-btn menu-toggle"
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

        <!-- Auth: avatar (authed) OR login button (guest) -->
        <div class="auth-slot">
          <button
            v-if="auth.isAuthenticated"
            class="avatar-btn"
            type="button"
            @click="openProfile()"
            aria-label="Open profile"
            title="Open profile"
          >
            <img class="avatar" :src="avatarSrc" alt="User avatar" @error="onAvatarError" />
          </button>

          <button
            v-else
            ref="loginBtnEl"
            class="btn auth-btn nav-btn auth-btn--login"
            type="button"
            @click="login"
            aria-label="Log in"
            title="Log in"
          >
            Login
          </button>
        </div>
      </div>
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
            <!-- Users (mobile) -->
            <RouterLink
              v-if="usersAction"
              class="btn action nav-btn"
              :class="{ active: isActiveAction(usersAction) }"
              :to="usersAction.to"
              role="menuitem"
              :title="usersAction.title || usersAction.label"
              @click="closeMenu"
            >
              <span v-if="usersAction.icon" class="icon" aria-hidden="true">{{ usersAction.icon }}</span>
              <span>{{ usersAction.label }}</span>
            </RouterLink>

            <!-- Dropdowns (mobile) -->
            <template v-for="(action, i) in dropdownActions" :key="i">
              <div class="menu-dropdown-wrap" role="menuitem">
                <ActivityPillList
                  v-if="action.dropdown.component === 'ActivityPillList'"
                  variant="dropdown"
                  v-bind="action.dropdown.props"
                />
                <TextbookPillList
                  v-else
                  variant="dropdown"
                  buttonText="Textbooks"
                  :showSectionTitle="false"
                  :startOpen="false"
                  :closeOnSelect="true"
                  :showCountsInButton="true"
                />
              </div>
            </template>
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
import { computed, onMounted, onBeforeUnmount, ref, watch, nextTick, onScopeDispose } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/users'
import { supabase } from '@/lib/supabase'
import type { Subscription } from '@supabase/supabase-js'

import BrandLogo from '@/assets/images/logos/EiTake_Kanji.png'
import Profile from '@/components/Profile.vue'
import AvatarSelection from '@/components/AvatarSelection.vue'
import ActivityPillList from '@/components/ActivityPillList.vue'
import TextbookPillList from '@/components/TextbookPillList.vue'

const router = useRouter()
const route = useRoute()
const auth = useUserStore()

/* ─────────────────────────────────────────────────────────────
   Helpers: timeout + guard
───────────────────────────────────────────────────────────── */
function withTimeout<T>(p: PromiseLike<T>, ms = 3500, label = 'op'): Promise<T> {
  let to: any
  const t = new Promise<never>((_, rej) => (to = setTimeout(() => rej(new Error(`${label}:timeout`)), ms)))
  return Promise.race([p as any, t]).finally(() => clearTimeout(to)) as Promise<T>
}
let mountCancelled = false
onScopeDispose(() => {
  mountCancelled = true
})

/* ─────────────────────────────────────────────────────────────
   Focus/visibility re-hydrate
───────────────────────────────────────────────────────────── */
function onFocus() {
  if (!auth.isAuthenticated) return
  void Promise.allSettled([auth.loadProfile?.(), auth.loadXp?.()])
  void refreshLevel(true)
}
function onVisibility() {
  if (document.visibilityState === 'visible') onFocus()
}

/* ─────────────────────────────────────────────────────────────
   Level source #1 (authoritative): v_profile_progress
   Level source #2 (fallback): derive from xp_levels + xp_total
   (Level is no longer shown in header, but keeping logic intact for other consumers.)
───────────────────────────────────────────────────────────── */
type XpRow = { level: number; min_xp: number }
const xpLevels = ref<XpRow[]>([])
const xpLevelsLoaded = ref(false)
let xpLevelsLoading = false

function normalizeRows(rows: any[] | null | undefined): XpRow[] {
  if (!Array.isArray(rows)) return []
  const norm = rows
    .map(r => ({ level: Number(r?.level), min_xp: Number(r?.min_xp) }))
    .filter(r => Number.isFinite(r.level) && Number.isFinite(r.min_xp))
    .sort((a, b) => a.min_xp - b.min_xp)
  return norm
}

async function ensureXpLevels(force = false) {
  if (xpLevelsLoading) return
  if (xpLevelsLoaded.value && !force) return
  xpLevelsLoading = true
  try {
    const res = await withTimeout(
      supabase
        .from('xp_levels')
        .select('level,min_xp')
        .order('min_xp', { ascending: true }) as unknown as PromiseLike<{ data: any[] | null; error: any }>,
      4000,
      'xp_levels'
    )
    if (res.error) {
      xpLevelsLoaded.value = false
      return
    }
    const cleaned = normalizeRows(res.data)
    xpLevels.value = cleaned
    xpLevelsLoaded.value = cleaned.length > 0
  } catch {
    xpLevelsLoaded.value = false
  } finally {
    xpLevelsLoading = false
  }
}

function deriveLevel(xp: number, rows: XpRow[]): number {
  if (!rows.length || !Number.isFinite(xp)) return 1
  let lvl = rows[0]?.level ?? 1
  for (const r of rows) {
    if (xp >= r.min_xp) lvl = r.level
    else break
  }
  return lvl
}

/** Primary fetch: use v_profile_progress.level */
async function fetchLevelFromView(userId: string): Promise<number | null> {
  try {
    const res = await withTimeout(
      supabase
        .from('v_profile_progress')
        .select('level')
        .eq('user_id', userId)
        .maybeSingle() as unknown as PromiseLike<{ data: { level?: number } | null; error: any }>,
      3500,
      'v_profile_progress'
    )
    if (res?.error) return null
    const lvl = Number(res?.data?.level)
    return Number.isFinite(lvl) && lvl > 0 ? lvl : 1
  } catch {
    return null
  }
}

/** Orchestrator: try view → fallback to derive */
const levelValue = ref<number>(1)
async function refreshLevel(forceXpLevels = false) {
  if (!auth.isAuthenticated) {
    levelValue.value = 1
    return
  }
  const uid = auth.profile?.id || (await supabase.auth.getUser()).data?.user?.id || null
  if (!uid) {
    levelValue.value = 1
    return
  }

  const fromView = await fetchLevelFromView(uid)
  if (fromView != null) {
    levelValue.value = fromView
    return
  }

  if (!xpLevelsLoaded.value || forceXpLevels) await ensureXpLevels(true)
  const xp = Number(auth.xpTotal ?? 0)
  levelValue.value = deriveLevel(xp, xpLevels.value)
}

watch(
  () => auth.xpTotal,
  () => {
    if (auth.isAuthenticated) void refreshLevel()
  }
)

/* ─────────────────────────────────────────────────────────────
   Login shimmer gating (one play per hover session)
───────────────────────────────────────────────────────────── */
const loginBtnEl = ref<HTMLButtonElement | null>(null)

function onLoginAnimEnd(e: AnimationEvent) {
  if (e.animationName !== 'loginShimmer') return
  // Lock shimmer until hover ends
  loginBtnEl.value?.classList.add('is-shimmered')
}

function resetLoginShimmerLock() {
  // Re-arm shimmer for the next fresh hover/focus session
  loginBtnEl.value?.classList.remove('is-shimmered')
}

/* ─────────────────────────────────────────────────────────────
   Lifecycle
───────────────────────────────────────────────────────────── */
let authSub: Subscription | null = null

onMounted(() => {
  window.addEventListener('focus', onFocus)
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('keydown', onKeydown)

  // Login shimmer listeners (only if guest button exists)
  const lb = loginBtnEl.value
  if (lb) {
    lb.addEventListener('animationend', onLoginAnimEnd)
    lb.addEventListener('mouseleave', resetLoginShimmerLock)
    lb.addEventListener('focusout', resetLoginShimmerLock)
    lb.addEventListener('mouseenter', resetLoginShimmerLock)
    lb.addEventListener('focusin', resetLoginShimmerLock)
  }

  void (async () => {
    try {
      await withTimeout(auth.ensureIdentityLoaded?.() ?? Promise.resolve(), 2500, 'identity')
    } catch {
      /* continue */
    } finally {
      if (mountCancelled) return
      if (auth.isAuthenticated) {
        await Promise.allSettled([auth.loadProfile?.(), auth.loadXp?.()])
        await refreshLevel(true)
      } else {
        void ensureXpLevels()
      }
    }
  })()

  const {
    data: { subscription }
  } = supabase.auth.onAuthStateChange(event => {
    queueMicrotask(async () => {
      if (mountCancelled) return
      if (event === 'SIGNED_IN') {
        await Promise.allSettled([auth.loadProfile?.(), auth.loadXp?.()])
        await refreshLevel(true)
        return
      }
      if (event === 'SIGNED_OUT') {
        levelValue.value = 1
        xpLevels.value = []
        xpLevelsLoaded.value = false
        return
      }
      if (auth.isAuthenticated) {
        void Promise.allSettled([auth.loadProfile?.(), auth.loadXp?.()])
        void refreshLevel()
      }
    })
  })
  authSub = subscription
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('focus', onFocus)
  document.removeEventListener('visibilitychange', onVisibility)
  document.documentElement.style.overflow = ''
  document.body.style.overflow = ''
  authSub?.unsubscribe()
  authSub = null

  const lb = loginBtnEl.value
  if (lb) {
    lb.removeEventListener('animationend', onLoginAnimEnd)
    lb.removeEventListener('mouseleave', resetLoginShimmerLock)
    lb.removeEventListener('focusout', resetLoginShimmerLock)
    lb.removeEventListener('mouseenter', resetLoginShimmerLock)
    lb.removeEventListener('focusin', resetLoginShimmerLock)
  }
})

/* ─────────────────────────────────────────────────────────────
   Avatar
───────────────────────────────────────────────────────────── */
const avatarSrc = computed(() => {
  const raw = auth.profile?.avatar_url
  if (!raw) return BrandLogo
  if (/^https?:\/\//i.test(raw)) return raw
  return supabase.storage.from('public-assets').getPublicUrl(raw).data.publicUrl || BrandLogo
})

/* ─────────────────────────────────────────────────────────────
   Nav / actions
───────────────────────────────────────────────────────────── */
export type HeaderAction =
  | {
      kind: 'link'
      label: string
      to: string
      icon?: string
      title?: string
    }
  | {
      kind: 'dropdown'
      label: string
      icon?: string
      title?: string
      dropdown: {
        component: 'ActivityPillList' | 'TextbookPillList'
        props?: {
          show: 'activities' | 'tools' | 'both'
          order?: 'activities-first' | 'tools-first'
          showSectionTitles?: boolean
          buttonText: string
          startOpen?: boolean
          closeOnSelect?: boolean
          showCountsInButton?: boolean
        }
      }
    }

function isActiveAction(a: Extract<HeaderAction, { kind: 'link' }>): boolean {
  if (a.to === '/dashboard') return route.path === '/dashboard'
  return route.path.startsWith(a.to)
}

const usersAction = computed<Extract<HeaderAction, { kind: 'link' }> | null>(() => {
  if (!auth.isDev) return null
  return {
    kind: 'link',
    label: 'Users',
    to: '/users',
    icon: '',
    title: 'Users (Dev only)'
  }
})

const dropdownActions = computed<Extract<HeaderAction, { kind: 'dropdown' }>[]>(() => {
  return [
    {
      kind: 'dropdown',
      label: 'Games',
      icon: '🎮',
      dropdown: {
        component: 'ActivityPillList',
        props: {
          show: 'activities',
          buttonText: 'Games',
          showSectionTitles: false,
          closeOnSelect: true,
          startOpen: false,
          showCountsInButton: true
        }
      }
    },
    {
      kind: 'dropdown',
      label: 'Teacher Tools',
      icon: '🧰',
      dropdown: {
        component: 'ActivityPillList',
        props: {
          show: 'tools',
          buttonText: 'Teacher Tools',
          showSectionTitles: false,
          closeOnSelect: true,
          startOpen: false,
          showCountsInButton: true
        }
      }
    },
    {
      kind: 'dropdown',
      label: 'Textbooks',
      icon: '📚',
      dropdown: {
        component: 'TextbookPillList'
      }
    }
  ]
})

async function goDashboard() {
  if (route.path === '/dashboard') return
  try {
    await router.push('/dashboard')
  } catch {
    /* ignore */
  }
}

/* ─────────────────────────────────────────────────────────────
   Auth actions
───────────────────────────────────────────────────────────── */
async function login() {
  try {
    await router.push({ name: 'Login' })
  } catch {
    await router.push('/login')
  }
}

/* ─────────────────────────────────────────────────────────────
   Modals / menu
───────────────────────────────────────────────────────────── */
const profileOpen = ref(false)
const avatarOpen = ref(false)

function openProfile() {
  profileOpen.value = true
}
function closeProfile() {
  profileOpen.value = false
}
function openAvatarFromProfile() {
  avatarOpen.value = true
}
async function onAvatarClosed() {
  avatarOpen.value = false
  void auth.loadProfile?.()
}

const menuOpen = ref(false)
function toggleMenu() {
  menuOpen.value = !menuOpen.value
}
function closeMenu() {
  menuOpen.value = false
}
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (avatarOpen.value) {
      avatarOpen.value = false
      return
    }
    if (profileOpen.value) {
      profileOpen.value = false
      return
    }
    closeMenu()
  }
}
watch(
  () => route.fullPath,
  () => closeMenu()
)

const anyModalOpen = computed(() => menuOpen.value || profileOpen.value || avatarOpen.value)
watch(anyModalOpen, async open => {
  document.documentElement.style.overflow = open ? 'hidden' : ''
  document.body.style.overflow = open ? 'hidden' : ''
  await nextTick()
})

/* ─────────────────────────────────────────────────────────────
   Refs & avatar fallback
───────────────────────────────────────────────────────────── */
const actionsEl = ref<HTMLElement | null>(null)
function onAvatarError(e: Event) {
  const img = e.target as HTMLImageElement
  img.onerror = null
  img.src = BrandLogo
}
</script>

<style scoped>
/* Header frame — slightly taller */
.app-header {
  position: relative;
  inset-inline: 0;
  inset-block-start: 0;
  width: 100%;
  height: var(--app-header-height);

  /* IMPORTANT: dropdown menus must be able to escape the header bounds */
  overflow: visible;
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
    linear-gradient(to bottom, var(--header-grid-color) var(--grid-line-w), transparent 0),
    linear-gradient(to right, var(--header-grid-color) var(--grid-line-w), transparent 0),
    var(--header-surface);
  background-size:
    var(--grid-size) var(--grid-size),
    var(--grid-size) var(--grid-size),
    auto;
  background-position: 0 0, 0 0, center;

  pointer-events: none;
}

/* More breathing room left/right */
.inner {
  position: relative;
  z-index: 2;
  height: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  padding: 8px clamp(18px, 4vw, 32px);
}

.left {
  display: inline-flex;
  align-items: flex-end;
  min-width: 0;
}

.right {
  display: inline-flex;
  align-items: flex-end;
  gap: 12px;
  min-width: 0;
}

/* EiTake brand button */
.brand-name {
  appearance: none;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;

  font-weight: 900;
  letter-spacing: 0.3px;
  font-size: clamp(28px, 3vh, 34px);
  color: var(--header-on-surface);
  text-shadow: 0 1px 0 color-mix(in srgb, var(--header-on-surface) 60%, transparent);

  transition: transform 0.12s ease, opacity 0.12s ease;
}

.brand-name:hover {
  transform: translateY(-1px);
  opacity: 0.98;
}

.brand-name:active {
  transform: translateY(0);
}

/* Auth buttons use header button tokens */
.auth-btn {
  color: var(--header-btn-on);
}

/* Avatar button — slightly tighter for right side */
.avatar-btn {
  position: relative;
  display: grid;
  place-items: center;
  width: clamp(52px, 6.6vh, 64px);
  height: clamp(52px, 6.6vh, 64px);
  border-radius: 999px;
  padding: 0;
  border: 3px dotted transparent;
  background: transparent;
  cursor: pointer;
  transition: border-color 0.18s ease, transform 0.12s ease;
}

.avatar-btn:hover {
  border-color: var(--header-border-color);
  transform: translateY(-1px);
}

.avatar-btn:active {
  transform: translateY(0);
}

.avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 1.5px solid var(--modal-border);
  object-fit: cover;
  background: var(--neutral-100);
}

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

  transition: background-size 0.32s ease, color 0.18s ease, background-color 0.18s ease, transform 0.12s ease;
  will-change: background-size;
}

.btn:hover {
  transform: translateY(-1px);
  background-color: var(--header-btn-hover);
  color: var(--header-btn-text-hover);
  background-size: 100% 100%;
}

.btn:active {
  transform: translateY(0);
}

/* Nav buttons (Users + Login) — match dropdown trigger sizing */
.nav-btn {
  border-radius: 12px;
  padding: 10px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.01em;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  line-height: 1.1;
}

.nav-btn .icon {
  line-height: 1;
}

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

/* ============================================================================
   LOGIN BUTTON — INTENTIONALLY LOUD (NO THEME TOKENS)
   Shimmer runs ONCE per hover session (locks until mouse leaves / focus ends)
   ============================================================================ */
.auth-btn--login {
  border: 2px solid rgba(116, 255, 186, 0.95);
  color: #062312;
  background-color: #20e37f;
  background-image: linear-gradient(180deg, #86ffcf 0%, #2cf08d 45%, #12d06f 100%);
  box-shadow:
    0 14px 30px rgba(0, 0, 0, 0.34),
    0 0 0 2px rgba(10, 255, 170, 0.22),
    0 0 26px rgba(22, 255, 160, 0.34);

  padding: 10px;
  min-width: 115px;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.01em;
  border-radius: 12px;

  position: relative;
  overflow: hidden;

  background-size: auto;
  justify-content: center;
}

.auth-btn--login::before {
  content: '';
  position: absolute;
  inset: 1px;
  border-radius: 12px;
  pointer-events: none;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0) 52%);
  mix-blend-mode: soft-light;
}

/* shimmer sweep (idle) */
.auth-btn--login::after {
  content: '';
  position: absolute;
  top: -40%;
  left: -60%;
  width: 55%;
  height: 180%;
  pointer-events: none;
  background: linear-gradient(
    110deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.55) 45%,
    rgba(255, 255, 255, 0) 70%
  );
  transform: translateX(-10%) rotate(8deg);
  opacity: 0;
}

/* Run ONCE when hovered, but only if we haven't shimmered during this hover session */
.auth-btn--login:hover:not(.is-shimmered)::after,
.auth-btn--login:focus-visible:not(.is-shimmered)::after {
  animation: loginShimmer 2.2s ease-in-out 1;
}

.auth-btn--login:hover {
  transform: translateY(-1px) scale(1.03);
  filter: brightness(1.06) saturate(1.08);
  box-shadow:
    0 18px 36px rgba(0, 0, 0, 0.40),
    0 0 0 2px rgba(10, 255, 170, 0.28),
    0 0 34px rgba(22, 255, 160, 0.46);
  background-size: auto;
}

.auth-btn--login:active {
  transform: translateY(0) scale(0.99);
}

.auth-btn--login:focus-visible {
  outline: none;
  box-shadow:
    0 18px 36px rgba(0, 0, 0, 0.40),
    0 0 0 4px rgba(10, 255, 170, 0.35),
    0 0 40px rgba(22, 255, 160, 0.46);
}

@keyframes loginShimmer {
  0% {
    transform: translateX(-10%) rotate(8deg);
    opacity: 0;
  }
  18% {
    opacity: 0.95;
  }
  55% {
    transform: translateX(240%) rotate(8deg);
    opacity: 0.65;
  }
  100% {
    transform: translateX(240%) rotate(8deg);
    opacity: 0;
  }
}

/* Nav actions */
.actions {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  z-index: 5;
}

.pill-list {
  display: inline-flex;
  gap: 10px;
  align-items: center;
}

/* Dropdown slots in header — no forced wide boxes */
.header-action-dropdown {
  display: inline-flex;
  align-items: center;
  width: auto;
}

/* Ensure dropdown components keep their own sizing */
.header-action-dropdown :deep(.apl-root--dropdown),
.header-action-dropdown :deep(.tpl-root--dropdown),
.menu-dropdown-wrap :deep(.apl-root--dropdown),
.menu-dropdown-wrap :deep(.tpl-root--dropdown) {
  width: auto;
}

/* Encourage dropdown triggers to visually align with nav-btn sizing */
.pill-list :deep(.pill-btn),
.menu-sheet :deep(.pill-btn) {
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12.5px;
  font-weight: 700;
  line-height: 1.1;
}

/* Mobile menu toggle */
.menu-toggle {
  display: none;
  align-items: center;
  gap: 8px;
  padding-inline: 12px 14px;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
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
  transition: transform 0.18s ease, opacity 0.18s ease, width 0.18s ease, background-color 0.18s ease;
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
  font-size: 12.5px;
  font-weight: 900;
}

@media (max-width: 720px) {
  .pill-list {
    display: none;
  }

  .menu-toggle {
    display: inline-flex;
  }
}

/* Mobile menu overlay */
.menu-panel {
  position: fixed;
  padding-top: var(--app-header-h);
  inset: 0;
  z-index: 1000;
  background: var(--modal-overlay-bg);
  backdrop-filter: var(--modal-overlay-filter);
  pointer-events: auto;

  transform-origin: top center;
  transform: scaleY(1);
}

.menu-sheet {
  position: absolute;
  right: 12px;
  top: calc(var(--app-header-h) + 8px);
  max-height: calc(100vh - (var(--app-header-h) + 24px));
  overflow: auto;
  display: grid;
  gap: 10px;
  grid-auto-rows: min-content;
  min-width: min(92vw, 420px);
  background: var(--modal-surface);
  border: 1px solid var(--modal-border);
  border-radius: var(--radius-lg);
  padding: 12px;
  box-shadow: var(--modal-shadow);
  pointer-events: auto;
}

.menu-sheet * {
  pointer-events: auto;
}

.menu-sheet .btn {
  --menu-item-h: 40px;
  display: flex;
  align-items: center;
  gap: 10px;
  height: var(--menu-item-h);
  max-height: var(--menu-item-h);
  padding: 8px 12px;
  font-size: 14px;
  line-height: 1.1;
  border-radius: 12px;
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

.menu-sheet .btn .icon {
  margin-right: 6px;
  line-height: 1;
}

.menu-dropdown-wrap {
  width: 100%;
}

@media (max-width: 380px) {
  .menu-sheet .btn {
    --menu-item-h: 36px;
    font-size: 13px;
    padding: 7px 11px;
  }
}

/* Dropdown open/close animation */
.menu-fade-enter-active,
.menu-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
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
  .menu-icon .bar,
  .menu-fade-enter-active,
  .menu-fade-leave-active,
  .brand-name,
  .avatar-btn {
    transition: none;
  }

  .auth-btn--login:hover::after,
  .auth-btn--login:focus-visible::after {
    animation: none;
  }
}
</style>
