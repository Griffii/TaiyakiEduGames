<!-- src/components/Profile.vue -->
<template>
  <teleport to="body">
    <div v-if="open" class="overlay" @click.self="closePanel">
      <section class="panel" role="dialog" aria-modal="true" aria-label="Profile">
        <!-- Header -->
        <header class="header" v-if="profile">
          <div class="left">
            <button
              class="avatar-button"
              type="button"
              @click="showAvatarPicker = true"
              aria-label="Change avatar"
              title="Change avatar"
            >
              <div class="avatar">
                <img v-if="avatarUrl" :src="avatarUrl" alt="User avatar" @error="onImgError" />
                <div v-else class="avatar-fallback">{{ initials }}</div>
              </div>
            </button>

            <div class="id-block">
              <h2 class="name">
                <template v-if="isEditing && canEditName">
                  <input
                    v-model="form.name"
                    class="name-input"
                    type="text"
                    placeholder="Enter display name"
                    :maxlength="64"
                  />
                  <!-- Save lives inline, just to the right of the input -->
                  <button class="save-inline btn" :disabled="saving || !trimmedName" @click="saveEdits">
                    {{ saving ? 'Saving…' : 'Save' }}
                  </button>
                </template>
                <template v-else>
                  {{ profile?.name ?? 'Unnamed User' }}
                </template>

                <!-- Role chip: Staff for viewer + Org role if present -->
                <span v-if="showStaffChip" class="role-badge staff">Staff</span>
                <span v-if="inOrg && orgRole" class="role-badge" :class="roleClass(orgRole)">
                  {{ prettyRole(orgRole) }}
                </span>
              </h2>

              <p class="email">{{ profile?.email }}</p>

              <!-- Optional Org Title (public.orgs.name) -->
              <p v-if="inOrg && orgName" class="org-title" :title="orgName">
                {{ orgName }}
              </p>
            </div>
          </div>

          <div class="right">
            <div class="actions-bar">
              <!-- Hamburger dropdown -->
              <div class="menu-wrapper" ref="menuRef">
                <button
                  type="button"
                  class="menu-toggle"
                  :class="{ open: actionsOpen }"
                  :aria-expanded="actionsOpen ? 'true' : 'false'"
                  aria-haspopup="true"
                  aria-label="Profile menu"
                  @click.stop="actionsOpen = !actionsOpen"
                >
                  <span class="menu-line"></span>
                  <span class="menu-line"></span>
                  <span class="menu-line"></span>
                </button>

                <!-- Animated dropdown -->
                <transition name="menu-pop">
                  <div v-if="actionsOpen" class="menu-dropdown">
                    <button class="menu-item" type="button" @click="goThemeEditor">
                      Theme Selector
                    </button>

                    <button
                      v-if="!orgMembershipLoaded || !inOrg"
                      class="menu-item"
                      type="button"
                      @click="onEnterSchoolCode"
                    >
                      Enter School Code
                    </button>

                    <button
                      v-if="viewerIsStaff"
                      class="menu-item"
                      type="button"
                      :class="{ on: showDevTools }"
                      @click="showDevTools = !showDevTools"
                    >
                      {{ showDevTools ? 'Hide Dev Tools' : 'Show Dev Tools' }}
                    </button>

                    <button v-if="canEditName" class="menu-item" type="button" @click="toggleEdit">
                      {{ isEditing ? 'Cancel Name Edit' : 'Edit Display Name' }}
                    </button>

                    <!-- LAST ITEM: Log Out -->
                    <button class="menu-item logout-item" type="button" @click="logout">
                      Log Out
                    </button>
                  </div>
                </transition>
              </div>

              <!-- Close button removed (click outside closes) -->
            </div>
          </div>
        </header>

        <!-- Save feedback (kept for messages only) -->
        <div v-if="isEditing" class="save-messages">
          <span v-if="saveError" class="save-error">{{ saveError }}</span>
          <span v-if="saveOk" class="save-ok">Saved ✓</span>
        </div>

        <!-- Global Loading / Error -->
        <div v-if="initialLoading" class="loading">
          <span class="spinner" aria-hidden="true"></span>
          <span>Loading profile…</span>
        </div>
        <div v-else-if="error" class="error">{{ error }}</div>

        <!-- Body -->
        <section v-else class="body">
          <!-- Levels: pass dev-tools toggle + target user -->
          <div class="center-flex">
            <UserLevels :overlay="false" :showDevTools="showDevTools" :user-id="profile?.id || null" />
          </div>

          <!-- Actions row: Achievements / Daily Challenge / Stats 
          <div class="quick-actions">
            <button class="action-chip btn" type="button" @click="openSoon('Achievements')" title="View Achievements">
              Achievements
            </button>
            <button class="action-chip btn" type="button" @click="openSoon('Daily Challenge')" title="Daily Challenge">
              Daily Challenge
            </button>
            <button class="action-chip btn" type="button" @click="openSoon('Stats')" title="Stats">
              Stats
            </button>
          </div>
          -->

          <!-- Simple "Coming Soon" popup -->
          <div v-if="soonOpen" class="soon-pop" role="dialog" aria-modal="true" aria-label="Coming Soon">
            <div class="soon-pop-head">
              <strong class="soon-title">{{ soonTitle }}</strong>
              <button class="soon-x" @click="closeSoon" aria-label="Close">×</button>
            </div>
            <p class="soon-desc">Coming Soon</p>
          </div>
        </section>

        <!-- Avatar picker -->
        <AvatarSelection
          v-if="showAvatarPicker"
          :key="'picker:' + (profile?.id || 'me')"
          :current-key="profile?.avatar_url || ''"
          :target-user-id="profile?.id || null"
          @close="onAvatarClosed"
          @updated="onAvatarUpdated"
          @selected="onAvatarUpdated"
        />
      </section>

      <!-- School Code Input -->
      <SchoolCodeInput v-model:open="showSchoolCode" @joined="onJoinedOrg" />
    </div>
  </teleport>

  <!-- Theme loading overlay -->
  <Teleport to="body">
    <div v-if="themeLoading" class="theme-loading-overlay" role="status" aria-live="polite" aria-label="Applying theme">
      <div class="spinner" aria-hidden="true"></div>
      <div class="loading-caption">Applying theme…</div>
    </div>
  </Teleport>

  <!-- Theme Editor Modal -->
  <ThemeEditor
    v-model:open="themeEditorOpen"
    @close="closeThemeEditor"
    @applying-theme="beginThemeLoad"
    @applied="endThemeLoad"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/users'
import { supabase } from '@/lib/supabase'
import AvatarSelection from '@/components/AvatarSelection.vue'
import DefaultLogo from '@/assets/images/logos/Mushroom_Avatar.png'
import UserLevels from '@/components/UserLevels.vue'
import ThemeEditor from '@/components/ThemeEditor.vue'

type UUID = string
type Profile = { id: UUID; name: string | null; email: string | null; avatar_url: string | null }

const props = defineProps<{ open: boolean; onClose?: () => any; userId?: string | null }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'chooseAvatar', key: string): void
  (e: 'update:open', value: boolean): void
  (e: 'enterOrgCode'): void
}>()

const router = useRouter()
const auth = useUserStore()

const loading = ref(false)
const error = ref<string | null>(null)
const profile = ref<Profile | null>(null)
const initialLoading = ref(false)
const actionsOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)

const viewerId = ref<string | null>(null)
const viewerIsStaff = ref<boolean>(false)
const showDevTools = ref(false) // controls UserLevels dev tools

const avatarVersion = ref(0)

const isEditing = ref(false)
const saving = ref(false)
const saveOk = ref(false)
const saveError = ref<string | null>(null)
const form = ref<{ name: string }>({ name: '' })
const trimmedName = computed(() => (form.value.name || '').trim())

/* Org membership */
const orgMembershipLoaded = ref(false)
const inOrg = ref(false)
const orgRole = ref<string | null>(null)
const orgId = ref<string | null>(null)
const orgName = ref<string | null>(null)

/* Coming Soon popup */
const soonOpen = ref(false)
const soonTitle = ref('Coming Soon')
function openSoon(title: string) {
  soonTitle.value = title
  soonOpen.value = true
}
function closeSoon() {
  soonOpen.value = false
}

/* Editing permission */
const canEditName = computed(() => viewerIsStaff.value || (viewerId.value && viewerId.value === profile.value?.id))
const showStaffChip = computed(() => viewerIsStaff.value && viewerId.value && profile.value?.id === viewerId.value)
function toggleEdit() {
  if (!canEditName.value) return
  isEditing.value = !isEditing.value
  saveOk.value = false
  saveError.value = null
  if (isEditing.value && profile.value) form.value.name = profile.value.name || ''
}

/* Button Hamburger Menu */
function onClickOutside(e: MouseEvent) {
  if (!actionsOpen.value) return
  const el = menuRef.value
  if (el && !el.contains(e.target as Node)) {
    actionsOpen.value = false
  }
}

/* School Code Input Modal */
import SchoolCodeInput from '@/components/SchoolCodeInput.vue'

const showSchoolCode = ref(false)

function onEnterSchoolCode() {
  showSchoolCode.value = true
}

function onJoinedOrg() {
  // Refresh the org info shown in Profile after successful join
  fetchOrgInfo(profile.value?.id || '')
  // Optionally show a toast
}

/* ---------- Theme Editor Modal ---------- */
const themeEditorOpen = ref(false)
function goThemeEditor() {
  themeEditorOpen.value = true
}
function closeThemeEditor() {
  themeEditorOpen.value = false
}
/* --------------------------------------- */

/* ---------- Theme switching overlay state ---------- */
const themeLoading = ref(false)
function beginThemeLoad() {
  themeLoading.value = true
  document.documentElement.classList.add('theme-loading')
}
function endThemeLoad() {
  themeLoading.value = false
  document.documentElement.classList.remove('theme-loading')
}
/* --------------------------------------------------- */

/* Avatar URL */
const avatarUrl = computed(() => {
  const key = profile.value?.avatar_url
  if (!key) return DefaultLogo
  const { data } = supabase.storage.from('public-assets').getPublicUrl(String(key))
  const base = data?.publicUrl || DefaultLogo
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}v=${avatarVersion.value}`
})
const initials = computed(() => {
  const base = profile.value?.name?.trim() || profile.value?.email || 'U'
  const parts = base.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  const first = parts[0] || ''
  const fromEmail = first.includes('@') ? first.split('@')[0] : first
  return (fromEmail.slice(0, 2) || 'U').toUpperCase()
})

/* UI + data helpers */
const showAvatarPicker = ref(false)
function closePanel() {
  try {
    props.onClose?.()
  } finally {
    actionsOpen.value = false
    emit('update:open', false)
    emit('close')
  }
}
function onImgError(e: Event) {
  const img = e.target as HTMLImageElement
  img.onerror = null
  img.src = DefaultLogo
}

async function resolveTargetUserId(): Promise<string | null> {
  if (props.userId) return props.userId
  const { data: authUser } = await supabase.auth.getUser()
  return authUser.user?.id ?? null
}

async function fetchViewerStaff() {
  const { data: authUser } = await supabase.auth.getUser()
  viewerId.value = authUser.user?.id ?? null
  viewerIsStaff.value = false
  showDevTools.value = false // reset toggle on open
  if (!viewerId.value) return
  try {
    const { data } = await supabase.rpc('is_staff')
    viewerIsStaff.value = !!data
  } catch {
    /* ignore */
  }
}

async function fetchProfile() {
  loading.value = true
  error.value = null
  profile.value = null
  try {
    const uid = await resolveTargetUserId()
    if (!uid) {
      error.value = 'No user id available.'
      return
    }

    const { data: prof, error: pErr } = await supabase
      .from('profiles')
      .select('id, name, email, avatar_url')
      .eq('id', uid)
      .single()
    if (pErr) throw pErr
    profile.value = (prof || null) as Profile
    avatarVersion.value = Date.now()

    await fetchOrgInfo(uid)
  } catch (e: any) {
    error.value = e?.message ?? String(e)
  } finally {
    loading.value = false
  }
}

/* Org info (role + org name) */
async function fetchOrgInfo(uid: string) {
  orgMembershipLoaded.value = false
  inOrg.value = false
  orgRole.value = null
  orgId.value = null
  orgName.value = null

  try {
    // Try to read membership; adjust table/column names to your schema if needed
    const { data: mems, error: mErr } = await supabase
      .from('org_memberships')
      .select('org_id, role')
      .eq('user_id', uid)
      .limit(1)
    if (mErr) throw mErr

    const membership = mems?.[0]
    if (membership) {
      inOrg.value = true
      orgId.value = membership.org_id || null
      orgRole.value = membership.role || null

      if (orgId.value) {
        const { data: org, error: oErr } = await supabase.from('orgs').select('name').eq('id', orgId.value).single()
        if (!oErr && org) orgName.value = org.name ?? null
      }
    }
  } catch {
    // Non-fatal; leave as not-in-org if blocked by RLS etc.
  } finally {
    orgMembershipLoaded.value = true
  }
}

function prettyRole(role: string) {
  const r = role.toLowerCase()
  if (r.includes('admin')) return 'Admin'
  if (r.includes('teacher') || r.includes('staff')) return 'Teacher'
  return 'Student'
}
function roleClass(role: string) {
  const r = role.toLowerCase()
  if (r.includes('admin')) return 'admin'
  if (r.includes('teacher') || r.includes('staff')) return 'teacher'
  return 'student'
}

/* Save edits */
async function saveEdits() {
  if (!profile.value || !canEditName.value) return

  const newName = trimmedName.value
  if (!newName) {
    saveError.value = 'Name cannot be empty.'
    return
  }

  saving.value = true
  saveOk.value = false
  saveError.value = null

  try {
    // Use the privileged RPC so staff can edit others
    const targetId = profile.value.id
    const { error: rpcErr } = await supabase.rpc('set_user_display_name', {
      target_user: targetId,
      new_name: newName
    })
    if (rpcErr) throw rpcErr

    // Optimistic local update
    profile.value = { ...profile.value, name: newName }

    // Optional mirror to public_profiles (might be blocked by RLS)
    try {
      await supabase.from('public_profiles').upsert(
        {
          user_id: targetId,
          display_name: newName,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id' }
      )
    } catch {
      /* ignore if blocked by RLS */
    }

    saveOk.value = true
    isEditing.value = false
  } catch (e: any) {
    saveError.value = e?.message ?? String(e)
  } finally {
    saving.value = false
  }
}

/* Avatar picker hooks */
function onAvatarClosed() {
  showAvatarPicker.value = false
}
function onAvatarUpdated(payload?: { key?: string; url?: string } | string) {
  let key: string | undefined
  if (typeof payload === 'string') key = payload
  else if (payload && typeof payload === 'object') key = payload.key ?? payload.url

  if (key && profile.value) {
    profile.value = { ...profile.value, avatar_url: key }
    emit('chooseAvatar', key)
  }

  avatarVersion.value = Date.now()
}

/* Logout (added to hamburger menu; last item) */
async function logout() {
  actionsOpen.value = false

  try {
    if (auth.signOut) {
      await auth.signOut()
    } else {
      await supabase.auth.signOut()
    }
  } finally {
    try {
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('sb-')) localStorage.removeItem(k)
      })
      auth.$reset?.()
    } catch {
      /* ignore */
    }

    closePanel()
    await router.replace('/dashboard')
  }
}

/* Close on Escape */
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') closePanel()
}

/* Lifecycle: open/load & react to user change */
watch(
  [() => props.open, () => props.userId],
  async ([isOpen]) => {
    if (isOpen) {
      actionsOpen.value = false
      initialLoading.value = true
      error.value = null

      try {
        await Promise.all([fetchViewerStaff(), fetchProfile()])
      } finally {
        initialLoading.value = false
      }

      window.addEventListener('keydown', onKey)
      window.addEventListener('click', onClickOutside)
    } else {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('click', onClickOutside)
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('click', onClickOutside)
})
</script>

<style scoped>
/* ============ OVERLAY / PANEL (modal tokens) ============ */
.overlay {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  z-index: 100;
  background: var(--modal-overlay-bg);
  backdrop-filter: var(--modal-overlay-filter);
}

.panel {
  position: relative;
  width: min(860px, 96vw);
  max-height: 90vh;
  overflow: auto;
  background: var(--modal-surface);
  color: var(--modal-on-surface);
  border: 2px solid var(--modal-border);
  border-radius: var(--modal-radius);
  box-shadow: var(--modal-shadow);
  /* OPTIONAL: reclaim right padding now that close button is removed */
  padding: 18px 20px 22px 20px;
  z-index: 101;
}

/* ============ HEADER L/R ============ */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding-bottom: 14px;
  margin-bottom: 12px;
  border-bottom: 2px dashed var(--modal-border);
  flex-wrap: nowrap;
}

.header .left {
  display: flex;
  align-items: center;
  gap: 18px;
  min-width: 0;
}

.header .right {
  display: flex;
  align-items: flex-start;
  margin-left: auto;
}

/* Only used now to hold the menu-wrapper (positioning is handled on panel) */
.actions-bar {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* --- HAMBURGER MENU (updated size + alignment) --- */
.menu-wrapper {
  position: absolute;
  top: 14px;
  /* OPTIONAL: no longer reserve space for close button */
  right: 10px;
  z-index: 40;
}

/* Bigger hamburger button */
.menu-toggle {
  background: transparent;
  border: none;
  padding: 6px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 4px; /* spacing between lines */
  width: 34px; /* increased size */
  height: 34px; /* increased size */
  transition: transform 0.14s ease, filter 0.14s ease;
}

.menu-toggle:hover {
  transform: scale(1.2);
  filter: brightness(1.06);
}

.menu-toggle:active {
  transform: scale(0.95);
}

/* Hamburger lines (bigger) */
.menu-line {
  width: 22px; /* was 18px */
  height: 3px; /* was 2px */
  border-radius: 999px;
  background: var(--modal-on-surface);
  transition: transform 0.18s ease, opacity 0.18s ease;
  transform-origin: center;
}

/* Open → X animation */
.menu-toggle.open .menu-line:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}
.menu-toggle.open .menu-line:nth-child(2) {
  opacity: 0;
}
.menu-toggle.open .menu-line:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}

/* Dropdown unchanged */
.menu-dropdown {
  position: absolute;
  top: 46px; /* lowered to match new button height */
  right: 0;
  min-width: 190px;
  padding: 8px;
  border-radius: 12px;
  border: 2px solid var(--modal-border);
  background: var(--modal-surface);
  box-shadow: var(--modal-shadow);
  display: grid;
  gap: 6px;
  z-index: 50;
}

/* --- Dropdown open/close animation --- */
.menu-pop-enter-from,
.menu-pop-leave-to {
  opacity: 0;
  transform: scaleY(0.8);
}
.menu-pop-enter-to,
.menu-pop-leave-from {
  opacity: 1;
  transform: scaleY(1);
}
.menu-pop-enter-active,
.menu-pop-leave-active {
  transform-origin: top right; /* expands downward from the button */
  transition: opacity 150ms ease-out, transform 150ms ease-out;
}

/* Items inside dropdown */
.menu-item {
  width: 100%;
  text-align: left;
  border-radius: 999px;
  border: 2px solid var(--btn-ghost-border);
  background: var(--btn-ghost-bg);
  color: var(--btn-ghost-on);
  font-size: 13px;
  font-weight: 900;
  padding: 6px 12px;
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;
}

.menu-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.12);
}

.menu-item.on {
  border-color: var(--btn-secondary-border);
  background: var(--btn-secondary-bg);
  color: var(--btn-secondary-on);
}

.menu-item:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-primary) 40%, transparent);
}

/* OPTIONAL: make Log Out feel "danger-ish" */
.logout-item {
  border-color: var(--btn-danger-border, color-mix(in srgb, var(--accent-danger) 55%, #000 45%));
  background: color-mix(in srgb, var(--accent-danger) 14%, var(--btn-ghost-bg) 86%);
  color: color-mix(in srgb, var(--accent-danger) 70%, var(--btn-ghost-on) 30%);
}

/* ============ BUTTONS (global button tokens) ============ */
.btn {
  height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  border: 2px solid var(--btn-ghost-border);
  background: var(--btn-ghost-bg);
  color: var(--btn-ghost-on);
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.08);
}

.btn:hover {
  transform: scale(1.07);
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.12);
}

.btn:active {
  transform: scale(0.97);
}

.btn.theme {
  background: var(--btn-secondary-bg);
  color: var(--btn-secondary-on);
  border-color: var(--btn-secondary-border);
}

/* Dev Tools = Secondary */
.devtools-btn {
  border-color: var(--btn-secondary-border);
  background: var(--btn-secondary-bg);
  color: var(--btn-secondary-on);
}

.devtools-btn.on {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--btn-secondary-bg) 22%, transparent);
}

/* Edit = Success by default */
.edit-btn {
  border-color: var(--btn-success-border);
  background: var(--btn-success-bg);
  color: var(--btn-success-on);
}

/* When editing (aria-pressed="true") show "Cancel" as lighter red using --warning-* */
.edit-btn[aria-pressed='true'] {
  border-color: var(--warning-border, var(--accent-danger));
  background: var(--warning-bg, color-mix(in srgb, var(--accent-danger) 10%, #fff 90%));
  color: var(--warning-on, color-mix(in srgb, var(--accent-danger) 65%, #000 35%));
}

.edit-btn[aria-pressed='true']:hover {
  filter: brightness(1.03);
  transform: scale(1.03);
}

/* Enter School Code (uses warning accent — no dedicated btn-warning tokens) */
.enter-org-btn {
  border-color: color-mix(in srgb, var(--accent-warning) 40%, #000 60%);
  background: color-mix(in srgb, var(--accent-warning) 18%, #fff 82%);
  color: #3a2a00;
}

/* ============ AVATAR ============ */
.avatar-button {
  background: transparent;
  border: 0;
  padding: 0;
  cursor: pointer;
  border-radius: 9999px;
}

.avatar {
  width: 92px;
  height: 92px;
  border-radius: 999px;
  overflow: hidden;
  position: relative;
  background: var(--neutral-0);
  display: grid;
  place-items: center;
  border: 2px solid var(--modal-border);
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.avatar-fallback {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  font-weight: 900;
  font-size: 28px;
  color: var(--modal-on-surface-muted);
}

.avatar-button:hover .avatar {
  outline: 2px dotted var(--accent-primary);
  outline-offset: 2px;
}

/* ============ ID BLOCK ============ */
.id-block {
  min-width: 0;
}

.id-block .name {
  margin: 0;
  font-size: 22px;
  line-height: 1.2;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.name-input {
  font-size: 20px;
  padding: 8px 10px;
  border-radius: 12px;
  border: 2px solid var(--modal-border);
  min-width: 240px;
  background: var(--neutral-0);
  color: var(--modal-on-surface);
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.04);
}

/* Save inline = success tone */
.save-inline {
  height: 36px;
  border-radius: 999px;
  border: 2px solid var(--btn-success-border);
  background: var(--btn-success-bg);
  color: var(--btn-success-on);
}

/* Meta lines */
.id-block .email {
  margin: 2px 0 0;
  color: var(--modal-on-surface-muted);
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.org-title {
  margin: 2px 0 0;
  color: var(--modal-on-surface);
  font-size: 13px;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ============ SAVE MESSAGES ============ */
.save-messages {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 2px 0;
  margin-bottom: 6px;
}

.save-error {
  color: var(--accent-danger);
  font-size: 13px;
  font-weight: 800;
}

.save-ok {
  color: var(--accent-success);
  font-size: 13px;
  font-weight: 800;
}

/* ============ BODY / CENTER ============ */
.body {
  padding-top: 6px;
}

.center-flex {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* ============ QUICK ACTIONS ============ */
.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  justify-content: center;
  align-items: flex-start;
  align-content: flex-start;
  margin: 0 auto;
  padding: 12px 8px;
  max-width: 820px;
  box-sizing: border-box;
}

.action-chip {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  flex: 1 1 clamp(180px, 30%, 320px);
  min-height: clamp(56px, 8vh, 88px);
  padding: clamp(10px, 1.4vh, 14px) clamp(14px, 2vw, 22px);
  border-radius: 16px;
  border: 2px solid var(--btn-ghost-border);
  background: var(--btn-ghost-bg);
  color: var(--btn-ghost-on);
  font-weight: 1000;
  font-size: clamp(14px, 2.2vw, 20px);
  line-height: 1.25;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
  box-sizing: border-box;
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.08);
}

.action-chip:hover {
  transform: scale(1.04);
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.12);
}

.action-chip:active {
  transform: scale(0.98);
}

@media (max-width: 520px) {
  .action-chip {
    flex: 1 1 100%;
  }
}

/* Colorize each action with tokenized accents */
.quick-actions .action-chip:nth-child(1) {
  /* Achievements = success */
  border-color: var(--btn-success-border);
  background: color-mix(in srgb, var(--btn-success-bg) 25%, #fff 75%);
  color: var(--btn-success-on);
}

.quick-actions .action-chip:nth-child(2) {
  /* Daily = warning (no btn-warning) */
  border-color: color-mix(in srgb, var(--accent-warning) 40%, #000 60%);
  background: color-mix(in srgb, var(--accent-warning) 22%, #fff 78%);
  color: #3a2a00;
}

.quick-actions .action-chip:nth-child(3) {
  /* Stats = primary */
  border-color: var(--btn-primary-border);
  background: color-mix(in srgb, var(--btn-primary-bg) 18%, #fff 82%);
  color: var(--btn-primary-on);
}

/* Focus ring */
.quick-actions .action-chip:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

/* ============ COMING SOON POPUP ============ */
.soon-pop {
  position: relative; /* anchor for internal layout */
  margin-top: 12px;
  border: 2px solid var(--modal-border);
  border-radius: 14px;
  padding: 12px;
  background: var(--modal-surface);
  box-shadow: var(--modal-shadow);
}

.soon-pop-head {
  display: flex;
  align-items: center;
  width: 100%;
}

.soon-title {
  font-weight: 1000;
  color: var(--modal-on-surface);
  font-size: 22px;
}

/* "Coming Soon" close button (keeps previous style) */
.soon-x {
  margin-left: auto;
  align-self: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 50%;
  border: 2px solid var(--modal-close-border);
  background: var(--modal-close-bg);
  color: var(--modal-close-on);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  transition: transform 0.12s ease, filter 0.12s ease;
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.15);
}

.soon-x:hover {
  transform: scale(1.08);
  filter: brightness(1.05);
}

.soon-x:active {
  transform: scale(0.95);
}

/* Description text */
.soon-desc {
  margin: 6px 0 2px;
  color: var(--modal-on-surface-muted);
  font-weight: 800;
}

/* ============ LOADING / ERROR ============ */
.loading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  color: var(--modal-on-surface-soft);
}

.spinner {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 3px solid var(--modal-border);
  border-top-color: var(--accent-primary);
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error {
  color: var(--accent-danger);
  margin-top: 10px;
  font-weight: 900;
}

/* ============ ROLE CHIPS (role-specific tokens) ============ */
.role-badge {
  background: var(--chip-bg);
  color: var(--chip-on);
  border: 2px solid var(--chip-border);
  font-weight: 1000;
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 12px;
}

.role-badge.staff {
  /* Use dev chip as Staff */
  background: var(--chip-dev-bg);
  border-color: var(--chip-dev-border);
  color: var(--chip-dev-on);
}

.role-badge.student {
  background: var(--chip-student-bg);
  border-color: var(--chip-student-border);
  color: var(--chip-student-on);
}

.role-badge.teacher {
  background: var(--chip-teacher-bg);
  border-color: var(--chip-teacher-border);
  color: var(--chip-teacher-on);
}

.role-badge.admin {
  background: var(--chip-admin-bg);
  border-color: var(--chip-admin-border);
  color: var(--chip-admin-on);
}

/* ============ RESPONSIVE ============ */
@media (max-width: 720px) {
  .panel {
    padding: 14px 14px 18px 14px; /* OPTIONAL: reclaim right padding on mobile too */
  }

  .avatar {
    width: 76px;
    height: 76px;
  }

  .id-block .name {
    font-size: 20px;
    gap: 8px;
  }

  .name-input {
    min-width: 0;
    width: min(68vw, 320px);
  }

  .header {
    gap: 12px;
  }

  .header .left {
    gap: 14px;
  }

  .actions-bar {
    gap: 8px;
  }
}
</style>
