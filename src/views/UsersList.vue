<!-- src/views/UsersList.vue -->
<template>
  <div class="page">
    <!-- Access gate -->
    <div v-if="checkingGate" class="muted">Checking access…</div>
    <div v-else-if="!isDev" class="forbidden">
      <h2>Forbidden</h2>
      <p>This page is only available to developers.</p>
    </div>

    <template v-else>
      <header class="head">
        <div class="left">
          <h1 class="title">Users</h1>
          <span class="count" v-if="!loading">({{ totalCount }})</span>
        </div>

        <div class="tools">
          <div class="tool">
            <label for="sortby" class="muted">Sort by:</label>
            <select id="sortby" v-model="sortBy" @change="sortNow">
              <option value="alpha">Alphabetical</option>
              <option value="created">Date added</option>
              <option value="level">Level</option>
              <option value="org">Org</option>
              <option value="role">Role</option>
              <option value="last">Last logged in</option>
              <option value="email">E-mail</option>
            </select>
          </div>

          <div class="tool">
            <label for="pagesize" class="muted">Rows:</label>
            <select id="pagesize" v-model.number="pageSize" @change="onPageSize">
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </div>
        </div>
      </header>

      <!-- Pagination (top, right-aligned) -->
      <div v-if="!loading && !error" class="pager-row right">
        <div class="pager">
          <button class="btn sm" :disabled="currentPage === 1" @click="gotoPage(1)">« First</button>
          <button class="btn sm" :disabled="currentPage === 1" @click="gotoPage(currentPage - 1)">‹ Prev</button>
          <span class="muted">Page</span>
          <input class="page-input" type="number" :min="1" :max="totalPages" v-model.number="pageInput"
            @change="onGoToInput" />
          <span class="muted">of {{ totalPages }}</span>
          <button class="btn sm" :disabled="currentPage === totalPages" @click="gotoPage(currentPage + 1)">Next ›</button>
          <button class="btn sm" :disabled="currentPage === totalPages" @click="gotoPage(totalPages)">Last »</button>
          <div class="range" v-if="totalCount">Showing {{ startIndex + 1 }}–{{ endIndex }} of {{ totalCount }}</div>
        </div>
      </div>

      <main class="content">
        <p v-if="loading" class="muted">Loading users…</p>
        <p v-else-if="error" class="error">{{ error }}</p>

        <div v-else class="table-outer">
          <div class="table-wrap users-wrap" role="region" aria-label="Users table" tabindex="0">
            <table class="users-table">
              <thead>
                <tr>
                  <th class="col-avatar">Avatar</th>
                  <th class="col-name">
                    <button class="th-btn" type="button" @click="sortByKey('alpha')">
                      Name
                      <span class="sort" :data-active="sortBy==='alpha'" :data-dir="sortDir" />
                    </button>
                  </th>
                  <th class="col-email">
                    <button class="th-btn" type="button" @click="sortByKey('email')">
                      E-mail
                      <span class="sort" :data-active="sortBy==='email'" :data-dir="sortDir" />
                    </button>
                  </th>
                  <th class="col-org">
                    <button class="th-btn" type="button" @click="sortByKey('org')">
                      Org
                      <span class="sort" :data-active="sortBy==='org'" :data-dir="sortDir" />
                    </button>
                  </th>
                  <th class="col-role">
                    <button class="th-btn" type="button" @click="sortByKey('role')">
                      Role
                      <span class="sort" :data-active="sortBy==='role'" :data-dir="sortDir" />
                    </button>
                  </th>
                  <th class="col-level center">
                    <button class="th-btn center" type="button" @click="sortByKey('level')">
                      Levels
                      <span class="sort" :data-active="sortBy==='level'" :data-dir="sortDir" />
                    </button>
                  </th>
                  <th class="col-login">
                    <button class="th-btn" type="button" @click="sortByKey('last')">
                      Last logged in
                      <span class="sort" :data-active="sortBy==='last'" :data-dir="sortDir" />
                    </button>
                  </th>
                  <th class="col-actions">Actions</th>
                </tr>
              </thead>

              <tbody>
                <tr v-for="u in pagedUsers" :key="u.id">
                  <!-- Avatar (clickable to open Profile.vue) -->
                  <td class="col-avatar">
                    <img class="avatar clickable" :src="avatarSrc(u)" alt="Avatar"
                      @error="onAvatarError" @click="openProfile(u.id)" title="Open profile" />
                  </td>

                  <td class="col-name">
                    <div class="name-line">
                      <strong>{{ u.name || '—' }}</strong>
                    </div>
                  </td>

                  <td class="col-email">
                    <div class="email">{{ u.email || '—' }}</div>
                  </td>

                  <td class="col-org">
                    <div class="org">{{ u.orgName || '—' }}</div>
                  </td>

                  <td class="col-role">
                    <div class="role">{{ u.role || '—' }}</div>
                  </td>

                  <!-- Levels (main bubble ABOVE the 3 skill bubbles) -->
                  <td class="col-level center">
                    <div class="levels-stack">
                      <div class="level-main" :style="levelBadgeStyle(levelOf(u))">{{ levelOf(u) }}</div>
                      <div class="skills-row">
                        <div class="skill s-red" :title="'Reading Lv ' + (u.reading_level || 1)">
                          {{ u.reading_level || 1 }}
                        </div>
                        <div class="skill s-green" :title="'Writing Lv ' + (u.writing_level || 1)">
                          {{ u.writing_level || 1 }}
                        </div>
                        <div class="skill s-blue" :title="'Listening Lv ' + (u.listening_level || 1)">
                          {{ u.listening_level || 1 }}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td class="col-login">
                    <div class="last">{{ formatLast(u.last_seen, u.created_at) }}</div>
                  </td>

                  <td class="col-actions">
                    <button class="btn danger sm" @click="softDelete(u)" :disabled="saving" title="Delete account">
                      Delete account
                    </button>
                  </td>
                </tr>

                <tr v-if="pagedUsers.length === 0">
                  <td colspan="8" class="muted center">No users found.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination (bottom, right-aligned) -->
          <div class="pager-row right">
            <div class="pager">
              <button class="btn sm" :disabled="currentPage === 1" @click="gotoPage(1)">« First</button>
              <button class="btn sm" :disabled="currentPage === 1" @click="gotoPage(currentPage - 1)">‹ Prev</button>
              <span class="muted">Page</span>
              <input class="page-input" type="number" :min="1" :max="totalPages" v-model.number="pageInput"
                @change="onGoToInput" />
              <span class="muted">of {{ totalPages }}</span>
              <button class="btn sm" :disabled="currentPage === totalPages" @click="gotoPage(currentPage + 1)">Next ›</button>
              <button class="btn sm" :disabled="currentPage === totalPages" @click="gotoPage(totalPages)">Last »</button>
              <div class="range" v-if="totalCount">Showing {{ startIndex + 1 }}–{{ endIndex }} of {{ totalCount }}</div>
            </div>
          </div>
        </div>
      </main>
    </template>

    <!-- Profile popup -->
    <Teleport to="body">
      <Profile v-if="profileOpen && selectedId" :open="profileOpen" :user-id="selectedId" @close="closeProfile" />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useUserStore } from '@/stores/users'
import Profile from '@/components/Profile.vue'
import DefaultLogo from '@/assets/images/logos/Mushroom_Avatar.png'

const auth = useUserStore()
const router = useRouter()
const isDev = computed(() => auth.isDev)
const checkingGate = ref(true)

onMounted(async () => {
  await auth.ensureIdentityLoaded()
  await auth.checkDevStatus().catch(() => { })
  if (!auth.isDev) {
    checkingGate.value = false
    router.replace('/dashboard')
    return
  }
  checkingGate.value = false
  await bootstrap()
})

/* -------- Types -------- */
type UUID = string
type Row = {
  id: UUID
  name: string | null
  email: string | null
  created_at: string | null
  last_seen: string | null
  avatar_url?: string | null
  xp_total?: number | null
  reading_level?: number | null
  writing_level?: number | null
  listening_level?: number | null
  orgId?: UUID | null
  orgName?: string | null
  role?: string | null
}

/* -------- State -------- */
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const rows = ref<Row[]>([])
const totalCount = computed(() => rows.value.length)

/* main level thresholds — same as old file */
const xpLevels = ref<{ level: number; min_xp: number }[]>([])

/* -------- Bootstrap (same method as before) + org/role fix -------- */
async function bootstrap() {
  loading.value = true
  error.value = null
  try {
    // 1) xp level thresholds
    const { data: lvData, error: lvErr } = await supabase
      .from('xp_levels').select('level, min_xp').order('min_xp', { ascending: true })
    if (lvErr) throw lvErr
    xpLevels.value = (lvData || []) as any[]

    // 2) profiles (same source; include last_seen/avatar_url if present)
    const { data: profs, error: pErr } = await supabase
      .from('profiles')
      .select('id, name, email, avatar_url, created_at, last_seen')
      .order('created_at', { ascending: false })
    if (pErr) throw pErr

    const base = (profs || []) as Row[]
    const ids = base.map(r => r.id)

    // 3) totals for main level
    const xpMap: Record<string, number> = {}
    if (ids.length) {
      const { data: totals } = await supabase
        .from('user_xp_total').select('user_id, xp_total').in('user_id', ids)
      for (const r of (totals || []) as any[]) xpMap[r.user_id] = Number(r.xp_total ?? 0)
    }

    // 4) skill snapshot
    const skillMap: Record<string, { reading_level: number; writing_level: number; listening_level: number }> = {}
    if (ids.length) {
      const { data: prog, error: progErr } = await supabase
        .from('v_profile_progress')
        .select('user_id, reading_level, writing_level, listening_level')
        .in('user_id', ids)
      if (progErr) throw progErr
      for (const r of (prog || []) as any[]) {
        skillMap[r.user_id] = {
          reading_level: Number(r.reading_level ?? 1),
          writing_level: Number(r.writing_level ?? 1),
          listening_level: Number(r.listening_level ?? 1),
        }
      }
    }

    // 5) org + role (DB first; Pinia fallback). IMPORTANT: don't select orgs.name (caused 42703 in your logs)
    const orgMemMap = new Map<UUID, { org_id: UUID | null; role: string | null }>()
    const orgMap = new Map<UUID, { name: string | null; org_code: string | null }>()
    if (ids.length) {
      const { data: mems } = await supabase
        .from('org_memberships').select('user_id, org_id, role').in('user_id', ids)
      for (const m of (mems || []) as any[]) orgMemMap.set(m.user_id, { org_id: m.org_id, role: m.role })

      const orgIds = Array.from(new Set((mems || []).map((m: any) => m.org_id).filter(Boolean))) as UUID[]
      if (orgIds.length) {
        // FIX: only select fields that exist: name, org_code
        const { data: orgs } = await supabase
          .from('orgs').select('id, name, org_code').in('id', orgIds)
        for (const o of (orgs || []) as any[]) {
          orgMap.set(o.id, { name: o.name ?? null, org_code: o.org_code ?? null })
        }
      }
    }
    function orgNameFromPinia(orgId: UUID | null): string | null {
      try {
        if (!orgId) return null
        const anyStore = auth as any
        const org = anyStore?.orgMap?.[orgId]
        if (!org) return null
        return org.name || org.name || org.org_code || null
      } catch { return null }
    }

    // 6) build unified rows
    rows.value = base.map(r => {
      const m = orgMemMap.get(r.id) || { org_id: null, role: null }
      const o = (m.org_id ? orgMap.get(m.org_id) : null) || null
      const orgName = orgNameFromPinia(m.org_id) || o?.name || o?.org_code || null
      return {
        ...r,
        xp_total: xpMap[r.id] ?? 0,
        reading_level: skillMap[r.id]?.reading_level ?? 1,
        writing_level: skillMap[r.id]?.writing_level ?? 1,
        listening_level: skillMap[r.id]?.listening_level ?? 1,
        orgId: m.org_id ?? null,
        orgName,
        role: m.role ?? null,
      }
    })

    sortNow()
    gotoPage(1)
  } catch (e: any) {
    error.value = e?.message ?? String(e)
  } finally {
    loading.value = false
  }
}

/* -------- Sorting / Paging -------- */
const sortBy = ref<'alpha' | 'created' | 'level' | 'org' | 'role' | 'last' | 'email'>('created') // default: Date added
const sortDir = ref<'asc' | 'desc'>('desc') // newest first
const users = ref<Row[]>([])

function sortByKey(key: typeof sortBy.value) {
  if (sortBy.value === key) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else {
    sortBy.value = key
    // sensible default directions
    sortDir.value = (key === 'created' || key === 'last' || key === 'level') ? 'desc' : 'asc'
  }
  sortNow()
}

function sortNow() {
  const arr = [...rows.value]
  const dir = sortDir.value === 'asc' ? 1 : -1
  arr.sort((a, b) => {
    let av: any = '', bv: any = ''
    if (sortBy.value === 'alpha') { av = a.name || a.email || ''; bv = b.name || b.email || '' }
    else if (sortBy.value === 'email') { av = a.email || ''; bv = b.email || '' }
    else if (sortBy.value === 'created') { av = new Date(a.created_at || 0).getTime(); bv = new Date(b.created_at || 0).getTime() }
    else if (sortBy.value === 'last') { av = new Date(a.last_seen || 0).getTime(); bv = new Date(b.last_seen || 0).getTime() }
    else if (sortBy.value === 'org') { av = a.orgName || ''; bv = b.orgName || '' }
    else if (sortBy.value === 'role') { av = a.role || ''; bv = b.role || '' }
    else if (sortBy.value === 'level') { av = levelOf(a); bv = levelOf(b) }

    if (av === bv) return 0
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
    return String(av).localeCompare(String(bv)) * dir
  })
  users.value = arr
  if (currentPage.value > totalPages.value) currentPage.value = totalPages.value || 1
}

/* Level computation — identical logic to old file */
function levelOf(u: Row): number {
  const xp = Number(u.xp_total ?? 0)
  if (!xpLevels.value.length) return 1
  let lvl = xpLevels.value[0]?.level ?? 1
  for (const row of xpLevels.value) { if (xp >= Number(row.min_xp)) lvl = row.level; else break }
  return Math.max(1, Math.min(25, lvl))
}

/* Pastel badge */
function levelBadgeStyle(level: number) {
  const idx = Math.max(1, Math.min(25, level)) - 1
  const hue = Math.round((idx / 25) * 300)
  const c1 = `hsl(${hue} 70% 92%)`
  const c2 = `hsl(${(hue + 24) % 360} 65% 82%)`
  return {
    background: `radial-gradient(circle at 30% 30%, ${c1}, ${c2})`,
    border: '1px solid rgba(0,0,0,.06)'
  }
}

/* Paging */
const pageSize = ref<number>(25)
const currentPage = ref<number>(1)
const pageInput = ref<number>(1)
const totalPages = computed(() => Math.max(1, Math.ceil((users.value.length || 0) / pageSize.value)))
const startIndex = computed(() => (currentPage.value - 1) * pageSize.value)
const endIndex = computed(() => Math.min(startIndex.value + pageSize.value, users.value.length))
const pagedUsers = computed(() => users.value.slice(startIndex.value, endIndex.value))
function gotoPage(p: number) { const c = Math.max(1, Math.min(totalPages.value, p || 1)); currentPage.value = c; pageInput.value = c }
function onGoToInput() { gotoPage(pageInput.value) }
function onPageSize() { gotoPage(1) }

/* Profile popup */
const profileOpen = ref(false)
const selectedId = ref<string | null>(null)
function openProfile(id: string) { profileOpen.value = true; selectedId.value = id }
function closeProfile() { profileOpen.value = false; selectedId.value = null }

/* Avatars */
function avatarSrc(u: Row) {
  const raw = u.avatar_url
  if (!raw) return DefaultLogo
  if (/^https?:\/\//i.test(String(raw))) return String(raw)
  const { data } = supabase.storage.from('public-assets').getPublicUrl(String(raw))
  return data?.publicUrl || DefaultLogo
}
function onAvatarError(e: Event) {
  const img = e.target as HTMLImageElement
  img.onerror = null
  img.src = DefaultLogo
}

/* Delete — same RPC style as old file (soft delete) */
async function softDelete(u: Row) {
  if (!confirm(`Delete account for "${u.name || u.email || u.id}"?\nThis can be undone only by a DB admin.`)) return
  saving.value = true
  try {
    const { error: e } = await supabase.rpc('dev_soft_delete_profile', { user_id: u.id })
    if (e) throw e
    rows.value = rows.value.filter(r => r.id !== u.id)
    sortNow()
    if (startIndex.value >= rows.value.length && currentPage.value > 1) gotoPage(currentPage.value - 1)
  } catch (e: any) {
    alert(e?.message || 'Failed to delete account.')
  } finally { saving.value = false }
}

/* Formatters */
function formatLast(lastSeen: string | null, created: string | null): string {
  const iso = lastSeen || created
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleString()
  } catch { return '—' }
}
</script>


<style scoped>
/* Page layout — 80% width, responsive */
.page {
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 1rem;
  padding: 2rem 4vw 3rem;
  margin: 0 auto;
  width: min(80vw, 1400px);
  padding-top: var(--app-header-height);
}
@media (max-width: 960px) {
  .page {
    width: 100%;
    /* keep centered while respecting safe areas */
    padding-left: max(10px, env(safe-area-inset-left), 3vw);
    padding-right: max(10px, env(safe-area-inset-right), 3vw);
    padding-top: 1.25rem;
    padding-bottom: 2rem;
  }
}

.forbidden {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1rem;
}

/* Header & controls (kept) */
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .75rem;
  flex-wrap: wrap;
}
.left { display: inline-flex; align-items: baseline; gap: .5rem; }
.title { font-size: 1.8rem; font-weight: 800; margin: 0; color: #fff; }
.count { color: rgba(255, 255, 255, .85); font-weight: 700; }
.tools { display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; color: #f8fafc; }
.tool { display: inline-flex; align-items: center; gap: .45rem; }
label.muted { color: #e5e7eb; }
select {
  padding: .35rem .5rem;
  border: 1px solid rgba(255, 255, 255, .4);
  border-radius: 8px;
  background: rgba(255, 255, 255, .15);
  color: #fff;
}
select option { color: #111; background: #fff; }

.content { display: grid; gap: 1rem; }
.muted { color: #e5e7eb; }
.error { color: #fecaca; }
.center { text-align: center; }
.range { color: #e5e7eb }

/* Pager (right-aligned) */
.pager-row.right {
  display: flex;
  justify-content: flex-end;
  margin-bottom: .25rem;
}
.pager {
  display: inline-flex;
  align-items: center;
  gap: .4rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.page-input {
  width: 72px;
  padding: .25rem .35rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

/* Table container — centered, never overflows, scrolls when within 10px of screen edges */
.users-wrap {
  border: 1px solid var(--main-border, #e5e7eb);
  border-radius: 12px;
  background: var(--main-surface-weak, #fff);
  box-shadow: 0 6px 18px rgba(0,0,0,.06) inset;

  /* keep the wrapper centered; leave 10px minimum on both sides */
  margin: 0 auto;
  max-width: calc(100vw - max(20px, env(safe-area-inset-left) + env(safe-area-inset-right)));
  /* horizontal scrolling when the table is wider than the viewport minus margins */
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  scrollbar-gutter: stable both-edges;
}

/* AdminPanel-like table */
.users-table {
  width: 100%;
  border-collapse: collapse;

  /* keep a consistent minimum table width; wrapper handles scroll */
  min-width: 900px;

}

.users-table thead th {
  position: sticky;
  top: 0;
  background: var(--main-surface-strong, #fafafa);
  text-align: left;
  font-weight: 800;
  padding: 10px 12px;
  border-bottom: 1px solid var(--main-border, #e5e5e5);
  white-space: nowrap;
}

.users-table tbody td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--main-border, #f0f0f0);
  vertical-align: middle;
  color: var(--main-text, #111);
}

/* On very small screens:
   - Do NOT shrink the table width (keeps min-width:900px for stable columns)
   - Shrink CONTENT (font-size, padding) so more fits per row while still enabling horizontal scroll */
@media (max-width: 560px) {
  .users-table {
    font-size: 0.93rem; /* shrink content, not table width */
  }
  .users-table thead th,
  .users-table tbody td {
    padding: 8px 9px;
  }
  .users-wrap {
    padding-right: 10px;
  }
}

/* Column sizing */
.col-avatar { width: 64px; }
.col-name   { width: 220px; }
.col-email  { width: 280px; }
.col-org    { width: 180px; }
.col-role   { width: 140px; }
.col-level  { width: 170px; }
.col-login  { width: 170px; }
.col-actions{ width: 160px; }
.center { text-align: center; }

/* Sort button + chevron */
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
  border: 2px solid var(--main-text, #111);
  border-left: 0;
  border-top: 0;
  opacity: 0.6;
  transform: rotate(45deg);
}
.sort[data-active="true"][data-dir="asc"] { transform: rotate(-135deg); opacity: 1; }
.sort[data-active="true"][data-dir="desc"] { transform: rotate(45deg); opacity: 1; }

/* Avatar */
.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  cursor: pointer;
}
.avatar:hover {
  outline: 2px dashed #60A5FA;
  outline-offset: 2px;
}

/* Levels layout: main bubble ABOVE the three skills (smaller main) */
.levels-stack {
  display: grid;
  grid-auto-rows: min-content;
  gap: 8px;
  justify-items: center;
}
.level-main {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  color: #0f172a;
  font-weight: 900;
  font-size: .95rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, .08), inset 0 1px 2px rgba(255, 255, 255, .5);
}
.skills-row {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: center;
}
.skill {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 900;
  font-size: .72rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, .12), inset 0 1px 2px rgba(255, 255, 255, .25);
}
.s-red { background: #ef4444; }
.s-green { background: #22c55e; }
.s-blue { background: #3b82f6; }

/* Buttons */
.btn {
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #111;
  padding: .35rem .6rem;
  border-radius: 8px;
  font-weight: 800;
  cursor: pointer;
}
.btn.sm { padding: .25rem .5rem; font-size: .85rem; }
.btn:disabled { opacity: .6; cursor: not-allowed; }
.btn.danger { border-color: #fecaca; color: #b91c1c; background: #fff; }
.btn.danger:hover { background: #fff5f5; }
</style>


