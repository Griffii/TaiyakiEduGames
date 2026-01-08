<!-- src/views/AdminPanel.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { supabase } from '@/lib/supabase'
import { useUserStore } from '@/stores/users'
import ProfileModal from '@/components/Profile.vue'
import ThemeEditor from '@/components/ThemeEditor.vue'

type UUID = string
type MemberRole = 'admin' | 'teacher' | 'student'

type MembershipRow = { org_id: UUID; user_id: UUID; role: MemberRole }
type ProfileRow = { id: UUID; display_name: string | null; email: string | null; last_seen?: string | null }
type PublicProfileRow = { id: UUID; avatar_url: string | null }
type ProgressRow = {
  user_id: UUID
  level: number | null
  reading_level?: number | null
  writing_level?: number | null
  listening_level?: number | null
}
type UserRecord = {
  id: UUID
  roles: MemberRole[]
  display_name: string
  email: string
  avatar_url: string | null
  level?: number | null
  reading_level?: number | null
  writing_level?: number | null
  listening_level?: number | null
  last_seen?: string | null
  _pending?: boolean
}

const userStore = useUserStore()

const loading = ref(false)
const error = ref<string | null>(null)

const orgName = computed(() => userStore.orgName ?? '')
const orgId = computed(() => userStore.orgId ?? null)

// Data
const allMembers = ref<UserRecord[]>([])

// Sorting
const teacherSortKey = ref<'display_name' | 'email' | 'last_seen'>('display_name')
const teacherSortDir = ref<'asc' | 'desc'>('asc')
const studentSortKey = ref<'display_name' | 'email' | 'level' | 'last_seen'>('display_name')
const studentSortDir = ref<'asc' | 'desc'>('asc')

// Pagination (independent per table)
type PageSize = 10 | 25 | 50 | 100
const teacherPageSize = ref<PageSize>(10)
const studentPageSize = ref<PageSize>(10)
const teacherPage = ref(1)
const studentPage = ref(1)

// Profile modal
const showProfile = ref(false)
const activeUserId = ref<UUID | null>(null)
function openProfile(uid: UUID) { activeUserId.value = uid; showProfile.value = true }
function closeProfile() { showProfile.value = false }

/** Normalize public_profiles.avatar_url to a public URL. */
function resolveAvatarUrl(pp: PublicProfileRow | undefined): string | null {
  let key = pp?.avatar_url?.trim() || ''
  if (!key) return null
  if (/^https?:\/\//i.test(key)) return key
  key = key.replace(/^\/+/, '').replace(/\/{2,}/g, '/')
  if (!key.startsWith('avatars/')) key = `avatars/${key}`
  return supabase.storage.from('public-assets').getPublicUrl(key).data.publicUrl || null
}
function onAvatarError(e: Event) {
  const img = e.target as HTMLImageElement
  img.onerror = null
  img.style.visibility = 'hidden'
}

/** Format: "Mon 12 @ 14:05" */
function fmtDate(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const month = d.toLocaleString(undefined, { month: 'short' })
  const day = d.getDate()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${month} ${day} @ ${hh}:${mm}`
}

// Fetch org members (+profiles.last_seen, avatars, levels)
async function fetchOrgMembers() {
  if (!orgId.value) return
  loading.value = true
  error.value = null
  try {
    // 1) memberships for this org
    const { data: memberships, error: mErr } = await supabase
      .from('org_memberships')
      .select('org_id,user_id,role')
      .eq('org_id', orgId.value)
    if (mErr) throw mErr
    const mems = (memberships ?? []) as MembershipRow[]
    if (!mems.length) { allMembers.value = []; return }

    // Map roles per user (dedupe)
    const byUser = new Map<UUID, Set<MemberRole>>()
    for (const m of mems) {
      if (!byUser.has(m.user_id)) byUser.set(m.user_id, new Set<MemberRole>())
      byUser.get(m.user_id)!.add(m.role)
    }
    const ids = Array.from(byUser.keys())

    // 2) profiles: name/email/last_seen
    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('id,display_name,email,last_seen')
      .in('id', ids)
    if (pErr) throw pErr
    const pMap = new Map<UUID, ProfileRow>()
    for (const p of (profiles ?? []) as ProfileRow[]) pMap.set(p.id, p)

    // 3) public_profiles (avatars)
    const { data: publicProfiles, error: ppErr } = await supabase
      .from('public_profiles')
      .select('id,avatar_url')
      .in('id', ids)
    if (ppErr) throw ppErr
    const ppMap = new Map<UUID, PublicProfileRow>()
    for (const r of (publicProfiles ?? []) as PublicProfileRow[]) ppMap.set(r.id, r)

    // 4) levels (main + subs if present)
    const { data: progresses, error: prErr } = await supabase
      .from('v_profile_progress')
      .select('user_id,level,reading_level,writing_level,listening_level')
      .in('user_id', ids)
    if (prErr) console.warn('v_profile_progress fetch failed:', prErr)
    const lvlMap = new Map<UUID, ProgressRow>()
    for (const pr of (progresses ?? []) as ProgressRow[]) lvlMap.set(pr.user_id, pr)

    // 5) Merge
    const merged: UserRecord[] = ids.map((uid) => {
      const roles = Array.from(byUser.get(uid) ?? [])
      const prof = pMap.get(uid)
      const pub = ppMap.get(uid)
      const pr = lvlMap.get(uid)
      return {
        id: uid,
        roles,
        display_name: prof?.display_name ?? '(No name)',
        email: prof?.email ?? '',
        avatar_url: resolveAvatarUrl(pub),
        level: pr?.level ?? null,
        reading_level: pr?.reading_level ?? null,
        writing_level: pr?.writing_level ?? null,
        listening_level: pr?.listening_level ?? null,
        last_seen: prof?.last_seen ?? null,
      }
    })

    allMembers.value = merged
    // Reset pagination to page 1 after refresh
    teacherPage.value = 1
    studentPage.value = 1
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load members'
  } finally {
    loading.value = false
  }
}

// Derivations
const teacherish = computed(() =>
  allMembers.value.filter(u => u.roles.includes('teacher') || u.roles.includes('admin'))
)
const students = computed(() =>
  allMembers.value.filter(u => u.roles.includes('student'))
)
const teacherCount = computed(() => teacherish.value.length)
const studentCount = computed(() => students.value.length)

function cmpStr(a?: string, b?: string) {
  const A = (a ?? '').toLowerCase()
  const B = (b ?? '').toLowerCase()
  if (A < B) return -1
  if (A > B) return 1
  return 0
}
function cmpNum(a?: number | null, b?: number | null) {
  const A = Number.isFinite(a as number) ? (a as number) : -Infinity
  const B = Number.isFinite(b as number) ? (b as number) : -Infinity
  return A - B
}
function cmpDate(a?: string | null, b?: string | null) {
  const A = a ? Date.parse(a) : -Infinity
  const B = b ? Date.parse(b) : -Infinity
  return A - B
}

const sortedTeachers = computed(() => {
  const key = teacherSortKey.value
  const dir = teacherSortDir.value
  const base = [...teacherish.value]
  base.sort((a, b) => {
    let res = 0
    if (key === 'display_name') res = cmpStr(a.display_name, b.display_name)
    else if (key === 'email') res = cmpStr(a.email, b.email)
    else if (key === 'last_seen') res = cmpDate(a.last_seen ?? null, b.last_seen ?? null)
    return dir === 'asc' ? res : -res
  })
  return base
})

const sortedStudents = computed(() => {
  const key = studentSortKey.value
  const dir = studentSortDir.value
  const base = [...students.value]
  base.sort((a, b) => {
    let res = 0
    if (key === 'display_name') res = cmpStr(a.display_name, b.display_name)
    else if (key === 'email') res = cmpStr(a.email, b.email)
    else if (key === 'level') res = cmpNum(a.level ?? null, b.level ?? null)
    else if (key === 'last_seen') res = cmpDate(a.last_seen ?? null, b.last_seen ?? null)
    return dir === 'asc' ? res : -res
  })
  return base
})

/* ---------- Sort handlers ---------- */
function sortTeachersBy(key: 'display_name' | 'email' | 'last_seen') {
  if (teacherSortKey.value === key) {
    teacherSortDir.value = teacherSortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    teacherSortKey.value = key
    teacherSortDir.value = key === 'display_name' ? 'asc' : 'desc'
  }
}
function sortStudentsBy(key: 'display_name' | 'email' | 'level' | 'last_seen') {
  if (studentSortKey.value === key) {
    studentSortDir.value = studentSortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    studentSortKey.value = key
    studentSortDir.value = (key === 'level' || key === 'last_seen') ? 'desc' : 'asc'
  }
}

/* ---------- Pagination helpers ---------- */
function slicePage<T>(rows: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize
  return rows.slice(start, start + pageSize)
}
const pagedTeachers = computed(() => slicePage(sortedTeachers.value, teacherPage.value, teacherPageSize.value))
const pagedStudents = computed(() => slicePage(sortedStudents.value, studentPage.value, studentPageSize.value))

const teacherPageCount = computed(() => Math.max(1, Math.ceil(sortedTeachers.value.length / teacherPageSize.value)))
const studentPageCount = computed(() => Math.max(1, Math.ceil(sortedStudents.value.length / studentPageSize.value)))

function setTeacherSize(size: PageSize) { teacherPageSize.value = size; teacherPage.value = 1 }
function setStudentSize(size: PageSize) { studentPageSize.value = size; studentPage.value = 1 }

/* Change handlers to satisfy TS when using <select> */
function onTeacherSizeChange(e: Event) {
  const val = Number((e.target as HTMLSelectElement).value) as PageSize
  setTeacherSize(val)
}
function onStudentSizeChange(e: Event) {
  const val = Number((e.target as HTMLSelectElement).value) as PageSize
  setStudentSize(val)
}

function gotoTeacherPage(n: number) { teacherPage.value = Math.min(Math.max(1, n), teacherPageCount.value) }
function gotoStudentPage(n: number) { studentPage.value = Math.min(Math.max(1, n), studentPageCount.value) }

/* ---------- Remove from org ---------- */
async function removeFromOrg(user: UserRecord) {
  if (!orgId.value) return
  const ok = window.confirm(`Remove ${user.display_name || 'this user'} from this org?`)
  if (!ok) return
  user._pending = true
  try {
    const { error: dErr } = await supabase
      .from('org_memberships')
      .delete()
      .eq('org_id', orgId.value)
      .eq('user_id', user.id)
    if (dErr) throw dErr
    allMembers.value = allMembers.value.filter(u => u.id !== user.id)
  } catch (e: any) {
    alert(e?.message ?? 'Failed to remove user from org')
  } finally {
    user._pending = false
  }
}

/* ---------- School Code modal ---------- */
const schoolCodeOpen = ref(false)
const schoolCode = ref<string>('')

async function openSchoolCode() {
  schoolCodeOpen.value = true
  await nextTick()

  if (!orgId.value) {
    schoolCode.value = 'No Code Set'
    return
  }

  // Query public.orgs for org_code; array style avoids 404s
  const { data, error, status } = await supabase
    .from('orgs')
    .select('org_code')
    .eq('id', orgId.value)
    .limit(1)

  if (error) {
    // RLS or auth issues
    schoolCode.value = (status === 401 || status === 403) ? 'Not allowed' : 'No Code Set'
    return
  }

  const row = Array.isArray(data) ? data[0] : null
  const codeNum = Number(row?.org_code)
  schoolCode.value = Number.isFinite(codeNum) ? codeNum.toString().padStart(6, '0') : 'No Code Set'
}

async function copySchoolCode() {
  try { await navigator.clipboard.writeText(String(schoolCode.value ?? '')) } catch { }
}

/**  END School Code Modal **/

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

function goSubscription() { alert('Subscription portal coming soon!') }

onMounted(async () => {
  // global events fired by theme switcher (e.g., ThemeEditor)
  window.addEventListener('eitake:theme:begin', beginThemeLoad)
  window.addEventListener('eitake:theme:end', endThemeLoad)

  await userStore.ensureIdentityLoaded()
  await fetchOrgMembers()
})

onUnmounted(() => {
  window.removeEventListener('eitake:theme:begin', beginThemeLoad)
  window.removeEventListener('eitake:theme:end', endThemeLoad)
})
</script>

<template>
  <section class="admin-panel chalkboard-bg">
    <div class="inner">
      <!-- Header / Title & Stats -->
      <header class="head">
        <div class="left">
          <h1 class="title">
            {{ orgName }}
            <small class="subtitle">Admin Panel</small>
          </h1>
          <p class="hint">Manage people, themes, and your subscription.</p>
        </div>

        <div class="stats">
          <div class="stat-card">
            <div class="label">Teachers</div>
            <div class="value">{{ teacherCount }}</div>
          </div>
          <div class="stat-card">
            <div class="label">Students</div>
            <div class="value">{{ studentCount }}</div>
          </div>
        </div>
      </header>

      <!-- Actions -->
      <div class="actions">
        <button class="btn theme" type="button" @click="goThemeEditor">Theme Editor</button>
        <button class="btn subscription" type="button" @click="goSubscription">Subscription</button>
        <button class="btn school-code" type="button" @click="openSchoolCode">School Code</button>
      </div>

      <!-- Errors / Loading -->
      <div v-if="error" class="error">{{ error }}</div>
      <div v-if="loading" class="loading">Loading members…</div>

      <!-- Teachers Table -->
      <section v-if="!loading" class="table-section">
        <div class="table-header">
          <h2 class="table-title">Teachers</h2>

          <!-- Pagination controls -->
          <div class="pager">
            <label class="page-size">
              <span class="rows-label">Rows:</span>
              <select :value="teacherPageSize" @change="onTeacherSizeChange">
                <option :value="10">10</option>
                <option :value="25">25</option>
                <option :value="50">50</option>
                <option :value="100">100</option>
              </select>
            </label>
            <div class="page-buttons">
              <button class="mini-btn arrow" :disabled="teacherPage <= 1"
                      @click="gotoTeacherPage(teacherPage - 1)" aria-label="Previous page">◀</button>
              <span class="page-indicator">{{ teacherPage }} / {{ teacherPageCount }}</span>
              <button class="mini-btn arrow" :disabled="teacherPage >= teacherPageCount"
                      @click="gotoTeacherPage(teacherPage + 1)" aria-label="Next page">▶</button>
            </div>
          </div>
        </div>

        <div class="table-wrap" role="region" aria-labelledby="teachers-table">
          <table id="teachers-table" class="users-table">
            <thead>
              <tr>
                <th class="col-avatar">Avatar</th>
                <th class="col-name">
                  <button class="th-btn" type="button" @click="sortTeachersBy('display_name')">
                    Name
                    <span class="sort" :data-active="teacherSortKey === 'display_name'"
                          :data-dir="teacherSortDir" />
                  </button>
                </th>

                <th class="col-email">
                  <button class="th-btn" type="button" @click="sortTeachersBy('email')">
                    E-mail
                    <span class="sort" :data-active="teacherSortKey === 'email'"
                          :data-dir="teacherSortDir" />
                  </button>
                </th>

                <th class="col-level"></th>

                <th class="col-login">
                  <button class="th-btn" type="button" @click="sortTeachersBy('last_seen')">
                    Last logged in
                    <span class="sort" :data-active="teacherSortKey === 'last_seen'"
                          :data-dir="teacherSortDir" />
                  </button>
                </th>
                <th class="col-actions">Actions</th>
              </tr>
            </thead>

            <tbody>
              <tr v-if="pagedTeachers.length === 0">
                <td colspan="6" class="empty">No teachers yet.</td>
              </tr>
              <tr v-for="u in pagedTeachers" :key="u.id">
                <td class="col-avatar">
                  <button class="avatar-btn" type="button" @click="openProfile(u.id)"
                          :title="`Open ${u.display_name} profile`">
                    <img class="avatar" :src="u.avatar_url || ''" alt="" @error="onAvatarError" />
                  </button>
                </td>
                <td class="col-name">
                  <div class="name-stack">
                    <span class="name">{{ u.display_name }}</span>
                    <span v-if="u.roles.includes('admin')" class="chip chip-admin">Admin</span>
                  </div>
                </td>

                <td class="col-email"><span class="email">{{ u.email }}</span></td>

                <td class="col-level"></td>

                <td class="col-login"><span class="login">{{ fmtDate(u.last_seen) }}</span></td>
                <td class="col-actions">
                  <button class="mini-btn danger" type="button" :disabled="u._pending"
                          @click="removeFromOrg(u)">
                    Remove from org
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Students Table -->
      <section v-if="!loading" class="table-section">
        <div class="table-header">
          <h2 class="table-title">Students</h2>

          <!-- Pagination controls -->
          <div class="pager">
            <label class="page-size">
              <span class="rows-label">Rows:</span>
              <select :value="studentPageSize" @change="onStudentSizeChange">
                <option :value="10">10</option>
                <option :value="25">25</option>
                <option :value="50">50</option>
                <option :value="100">100</option>
              </select>
            </label>
            <div class="page-buttons">
              <button class="mini-btn arrow" :disabled="studentPage <= 1"
                      @click="gotoStudentPage(studentPage - 1)" aria-label="Previous page">◀</button>
              <span class="page-indicator">{{ studentPage }} / {{ studentPageCount }}</span>
              <button class="mini-btn arrow" :disabled="studentPage >= studentPageCount"
                      @click="gotoStudentPage(studentPage + 1)" aria-label="Next page">▶</button>
            </div>
          </div>
        </div>

        <div class="table-wrap" role="region" aria-labelledby="students-table">
          <table id="students-table" class="users-table">
            <thead>
              <tr>
                <th class="col-avatar">Avatar</th>
                <th class="col-name">
                  <button class="th-btn" type="button" @click="sortStudentsBy('display_name')">
                    Name
                    <span class="sort" :data-active="studentSortKey === 'display_name'"
                          :data-dir="studentSortDir" />
                  </button>
                </th>
                <th class="col-email">
                  <button class="th-btn" type="button" @click="sortStudentsBy('email')">
                    E-mail
                    <span class="sort" :data-active="studentSortKey === 'email'"
                          :data-dir="studentSortDir" />
                  </button>
                </th>
                <th class="col-level center">
                  <button class="th-btn center" type="button" @click="sortStudentsBy('level')">
                    Levels
                    <span class="sort" :data-active="studentSortKey === 'level'"
                          :data-dir="studentSortDir" />
                  </button>
                </th>
                <th class="col-login">
                  <button class="th-btn" type="button" @click="sortStudentsBy('last_seen')">
                    Last logged in
                    <span class="sort" :data-active="studentSortKey === 'last_seen'"
                          :data-dir="studentSortDir" />
                  </button>
                </th>
                <th class="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="pagedStudents.length === 0">
                <td colspan="6" class="empty">No students yet.</td>
              </tr>
              <tr v-for="u in pagedStudents" :key="u.id">
                <td class="col-avatar">
                  <button class="avatar-btn" type="button" @click="openProfile(u.id)"
                          :title="`Open ${u.display_name} profile`">
                    <img class="avatar" :src="u.avatar_url || ''" alt="" @error="onAvatarError" />
                  </button>
                </td>
                <td class="col-name"><span class="name">{{ u.display_name }}</span></td>
                <td class="col-email"><span class="email">{{ u.email }}</span></td>
                <td class="col-level center">
                  <div class="levels">
                    <span class="level-main" :title="`Level ${u.level ?? 1}`">{{ u.level ?? 1 }}</span>
                    <div class="level-sub">
                      <span class="dot dot-reading" :title="`Reading ${u.reading_level ?? '—'}`">{{ u.reading_level ?? '—' }}</span>
                      <span class="dot dot-writing" :title="`Writing ${u.writing_level ?? '—'}`">{{ u.writing_level ?? '—' }}</span>
                      <span class="dot dot-listening" :title="`Listening ${u.listening_level ?? '—'}`">{{ u.listening_level ?? '—' }}</span>
                    </div>
                  </div>
                </td>
                <td class="col-login"><span class="login">{{ fmtDate(u.last_seen) }}</span></td>
                <td class="col-actions">
                  <button class="mini-btn danger" type="button" :disabled="u._pending"
                          @click="removeFromOrg(u)">
                    Remove from org
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <!-- Profile Modal -->
    <ProfileModal v-if="activeUserId" v-model:open="showProfile" :user-id="activeUserId" :dev="false"
                  @close="closeProfile" />

    <!-- School Code Modal -->
    <Teleport to="body">
      <div v-if="schoolCodeOpen" class="code-modal" role="dialog" aria-modal="true"
           @click.self="schoolCodeOpen = false">
        <div class="code-sheet">
          <button class="code-close" aria-label="Close" @click="schoolCodeOpen = false">✕</button>
          <h3 class="code-title">School Code</h3>
          <div class="code-box">{{ schoolCode || 'No Code Set' }}</div>
          <div class="code-actions">
            <button class="btn" @click="copySchoolCode">Copy</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Theme loading overlay -->
    <Teleport to="body">
      <div
        v-if="themeLoading"
        class="theme-loading-overlay"
        role="status"
        aria-live="polite"
        aria-label="Applying theme"
      >
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
  </section>
</template>

<style scoped>
/* ================= AdminPanel ================= */

/* Layout */
.admin-panel {
  min-height: 100dvh;
  padding: 24px 0 56px;
  color: var(--text-main);
  padding-top: 20px;
}

.inner {
  width: min(1100px, 92vw);
  margin: 0 auto;
}

/* Header */
.head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 16px;
}

.title {
  font-size: var(--main-title-size);
  line-height: 1.15;
  font-weight: 900;
  color: var(--main-title-color);
  text-shadow: var(--main-title-shadow);
  margin: 0;
  font-family: var(--main-title-font);
}

.subtitle {
  display: inline-block;
  font-size: var(--main-subtitle-size);
  font-weight: 700;
  margin-left: 8px;
  opacity: 0.95;
  color: var(--main-subtitle-color);
  text-shadow: var(--main-subtitle-shadow);
  font-family: var(--main-subtitle-font);
}

.hint {
  margin: 6px 0 0;
  color: var(--main-text-soft);
}

/* Stats */
.stats {
  display: grid;
  grid-auto-flow: column;
  gap: 12px;
}

.stat-card {
  background: var(--table-surface);
  border: 1px solid var(--table-border);
  border-radius: var(--table-radius);
  padding: 10px 14px;
  min-width: 120px;
  text-align: center;
  box-shadow: var(--table-shadow);
  color: var(--table-on-surface);
}

.stat-card .label {
  font-size: 12px;
  color: var(--table-muted);
  margin-bottom: 4px;
}

.stat-card .value {
  font-size: 22px;
  font-weight: 800;
  color: var(--table-on-surface);
}

/* Actions */
.actions {
  display: flex;
  gap: 12px;
  margin: 18px 0 24px;
  flex-wrap: wrap;
}

/* Base button on panel surface */
.btn {
  border: 1px solid var(--border-main);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 120ms ease, opacity 120ms ease, box-shadow 120ms ease, background 120ms ease;
  color: var(--text-main);
  background: var(--surface-main);
  box-shadow: var(--shadow-main);
}
.btn:hover   { transform: translateY(-1px); }
.btn:active  { transform: scale(0.98); }

/* Mapped to existing button tokens for consistency */
.btn.theme {
  background: var(--btn-secondary-bg);
  color: var(--btn-secondary-on);
  border-color: var(--btn-secondary-border);
}
.btn.subscription {
  background: var(--btn-success-bg);
  color: var(--btn-success-on);
  border-color: var(--btn-success-border);
}
.btn.school-code {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-on);
  border-color: var(--btn-primary-border);
}
.btn.ghost { background: var(--btn-ghost-bg); color: var(--btn-ghost-on); border-color: var(--btn-ghost-border); }

/* Tables */
.table-section { margin-top: 8px; }

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 8px;
}

.table-title {
  font-size: clamp(16px, 2.2vw, 22px);
  margin: 0;
  font-weight: 900;
  color: var(--main-title-color);
  text-shadow: var(--main-subtitle-shadow);
}

.pager { display: inline-flex; gap: 12px; align-items: center; }

.page-size .rows-label {
  color: var(--main-subtitle-color);
  font-weight: 700;
  margin-right: 4px;
}

.page-buttons { display: inline-flex; gap: 8px; align-items: center; }
.page-indicator { font-weight: 700; color: var(--table-on-surface); }

.table-wrap {
  overflow: auto;
  border-radius: var(--table-radius);
  border: 1px solid var(--table-border);
  background: var(--table-surface);
  box-shadow: var(--table-shadow);
  color: var(--table-on-surface);
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 940px;
}

.users-table thead th {
  position: sticky;
  top: 0;
  background: var(--table-header-surface);
  text-align: left;
  font-weight: 800;
  padding: 10px 12px;
  border-bottom: 1px solid var(--table-border);
  white-space: nowrap;
  font-size: 13px;
  color: var(--table-on-surface);
}
.users-table thead th.center { text-align: center; }

.users-table tbody td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--table-border);
  vertical-align: middle;
  color: var(--table-on-surface);
}
.users-table tbody tr:last-child td { border-bottom: 0; }

/* Consistent column widths to align tables */
.col-avatar { width: 72px; }
.col-name   { width: 280px; }
.col-level  { width: 200px; text-align: center; }
.col-email  { width: 280px; }
.col-login  { width: 170px; } /* ensure Email aligns between tables */
.col-actions{ width: 170px; }

/* Avatars */
.avatar-btn {
  position: relative;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  object-fit: cover;
  outline: 2px solid color-mix(in srgb, var(--border-main) 60%, transparent);
  outline-offset: 2px;
  background: var(--surface-main-weak);
}
.avatar:hover { outline: 2px dashed var(--accent-primary); }

/* Name + admin chip (stacked) */
.name-stack { display: grid; gap: 4px; align-items: start; }
.name { font-weight: 900; color: var(--table-on-surface); }

.chip-admin {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 10px;
  line-height: 1;
  font-weight: 800;
  letter-spacing: .2px;
  color: var(--chip-admin-on);
  background: var(--chip-admin-bg);
  border: 1px solid var(--chip-admin-border);
  width: auto;
  max-width: max-content;
}

/* Email + dates */
.email { color: var(--table-muted); }
.login { color: var(--table-on-surface); opacity: .9; }

/* Levels UI (uses profile/back-compat tokens) */
.col-level.center,
.users-table thead th.col-level.center { text-align: center; }

.levels {
  display: grid;
  grid-template-rows: auto auto;
  justify-items: center;
  align-items: center;
  gap: 4px;
  margin: 0 auto;
}

.level-main {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  font-weight: 900;
  font-size: 14px;
  color: var(--text-profile);
  background: var(--surface-profile-weak);
  border: 1px solid var(--border-profile);
  box-shadow: var(--shadow-profile);
}

.level-sub {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
}

.dot {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  font-weight: 800;
  font-size: 11px;
  color: var(--neutral-0);
  border: 1px solid color-mix(in srgb, var(--ring-profile) 60%, transparent);
  text-shadow: 0 1px 0 color-mix(in srgb, var(--ring-profile) 40%, transparent);
}
.dot-reading   { background: var(--level-reading); }
.dot-writing   { background: var(--level-writing); }
.dot-listening { background: var(--level-listening); }

/* Small buttons */
.mini-btn {
  border: 1px solid var(--border-main);
  background: var(--surface-main-weak);
  color: var(--text-main);
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  cursor: pointer;
  transition: transform 120ms ease, opacity 120ms ease, background 120ms ease;
}
.mini-btn:hover  { transform: translateY(-1px); }
.mini-btn:active { transform: translateY(0); }

.mini-btn.danger {
  border-color: var(--btn-danger-border);
  background: color-mix(in srgb, var(--btn-danger-bg) 14%, var(--neutral-0) 86%);
  color: var(--btn-danger-on);
}

/* Sort icon */
.th-btn {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  background: transparent;
  border: 0;
  color: inherit;
  font: inherit;
  padding: 0;
  cursor: pointer;
}

.sort {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-top: 1px;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  opacity: 0.6;
  transform: rotate(45deg);
}
.sort[data-active="true"][data-dir="asc"]  { transform: rotate(-135deg); opacity: 1; }
.sort[data-active="true"][data-dir="desc"] { transform: rotate(45deg);  opacity: 1; }

/* Empty */
.empty {
  text-align: center;
  color: var(--table-muted);
  padding: 18px 12px;
}

/* School Code Modal */
.code-modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: var(--modal-overlay-bg);
  backdrop-filter: var(--modal-overlay-filter);
  display: grid;
  place-items: center;
}

.code-sheet {
  position: relative;
  width: min(480px, 92vw);
  background: var(--modal-surface);
  color: var(--modal-on-surface);
  border: 1px solid var(--modal-border);
  border-radius: var(--modal-radius);
  padding: 18px;
  box-shadow: var(--modal-shadow);
}

.code-close {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 1px solid var(--modal-close-border);
  background: var(--modal-close-bg);
  color: var(--modal-close-on);
  font-weight: 900;
  line-height: 1;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.code-close:hover { filter: brightness(1.05); }

.code-title {
  margin: 0 0 10px;
  font-size: 18px;
  font-weight: 900;
  color: var(--modal-on-surface);
}

.code-box {
  display: grid;
  place-items: center;
  min-height: 120px;
  font-size: clamp(24px, 6vw, 44px);
  font-weight: 900;
  letter-spacing: .5px;
  background: var(--surface-main-weak);
  border: 1px dashed var(--border-main-strong);
  border-radius: var(--radius-md);
  margin-bottom: 12px;
  color: var(--modal-on-surface);
}

.code-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* Errors / loading */
.error   { color: var(--accent-danger); font-weight: 800; }
.loading { color: var(--main-title-color); }


</style>
