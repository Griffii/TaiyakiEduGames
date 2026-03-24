<!-- src/views/CommentsModeration.vue -->
<template>
  <div class="page">
    <div v-if="checkingGate" class="muted">Checking access…</div>

    <div v-else-if="!isDev" class="forbidden">
      <h2>Forbidden</h2>
      <p>This page is only available to developers.</p>
    </div>

    <template v-else>
      <header class="head">
        <div class="left">
          <h1 class="title">Comments Moderation</h1>
          <span class="count" v-if="!loading">({{ filteredRows.length }})</span>
        </div>

        <div class="tools">
          <div class="tool">
            <label for="statusTab" class="muted">View:</label>
            <select id="statusTab" v-model="activeTab">
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div class="tool">
            <label for="sortby" class="muted">Sort by:</label>
            <select id="sortby" v-model="sortBy" @change="sortNow">
              <option value="created_at">Date created</option>
              <option value="reviewed_at">Date reviewed</option>
              <option value="display_name">Username</option>
              <option value="slug">Visual novel</option>
              <option value="body">Comment text</option>
            </select>
          </div>

          <div class="tool">
            <label for="sortdir" class="muted">Direction:</label>
            <select id="sortdir" v-model="sortDir" @change="sortNow">
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
      </header>

      <div class="subtools">
        <input
          v-model="search"
          class="search-input"
          type="text"
          placeholder="Search username, VN slug, or comment text…"
        />

        <button class="btn sm" :disabled="loading" @click="bootstrap">
          Refresh
        </button>
      </div>

      <main class="content">
        <p v-if="loading" class="muted">Loading comments…</p>
        <p v-else-if="error" class="error">{{ error }}</p>

        <div v-else class="table-outer">
          <div class="table-wrap comments-wrap" role="region" aria-label="Comments moderation table" tabindex="0">
            <table class="comments-table">
              <thead>
                <tr>
                  <th class="col-user">
                    <button class="th-btn" type="button" @click="sortByKey('display_name')">
                      User
                      <span class="sort" :data-active="sortBy === 'display_name'" :data-dir="sortDir" />
                    </button>
                  </th>

                  <th class="col-slug">
                    <button class="th-btn" type="button" @click="sortByKey('slug')">
                      Visual Novel
                      <span class="sort" :data-active="sortBy === 'slug'" :data-dir="sortDir" />
                    </button>
                  </th>

                  <th class="col-body">
                    <button class="th-btn" type="button" @click="sortByKey('body')">
                      Comment
                      <span class="sort" :data-active="sortBy === 'body'" :data-dir="sortDir" />
                    </button>
                  </th>

                  <th class="col-created">
                    <button class="th-btn" type="button" @click="sortByKey('created_at')">
                      Created
                      <span class="sort" :data-active="sortBy === 'created_at'" :data-dir="sortDir" />
                    </button>
                  </th>

                  <th class="col-reviewed">
                    <button class="th-btn" type="button" @click="sortByKey('reviewed_at')">
                      Reviewed
                      <span class="sort" :data-active="sortBy === 'reviewed_at'" :data-dir="sortDir" />
                    </button>
                  </th>

                  <th class="col-actions">Actions</th>
                </tr>
              </thead>

              <tbody>
                <tr v-for="comment in filteredRows" :key="comment.id">
                  <td class="col-user">
                    <div class="user-cell">
                      <img
                        class="avatar"
                        :src="avatarSrc(comment)"
                        alt="Avatar"
                        @error="onAvatarError"
                      />
                      <div class="user-meta">
                        <strong>{{ comment.display_name || 'User' }}</strong>
                        <div class="muted dark">{{ comment.user_id }}</div>
                      </div>
                    </div>
                  </td>

                  <td class="col-slug">
                    <div class="slug-pill">{{ comment.slug }}</div>
                  </td>

                  <td class="col-body">
                    <div class="comment-body">{{ comment.body }}</div>
                  </td>

                  <td class="col-created">
                    <div>{{ formatDateTime(comment.created_at) }}</div>
                  </td>

                  <td class="col-reviewed">
                    <div>{{ formatDateTime(comment.reviewed_at) }}</div>
                  </td>

                  <td class="col-actions">
                    <div class="actions">
                      <button
                        v-if="comment.moderation_status !== 'approved'"
                        class="btn success sm"
                        :disabled="!!savingMap[comment.id]"
                        @click="setModerationStatus(comment, 'approved')"
                      >
                        Approve
                      </button>

                      <button
                        v-if="comment.moderation_status !== 'rejected'"
                        class="btn danger sm"
                        :disabled="!!savingMap[comment.id]"
                        @click="setModerationStatus(comment, 'rejected')"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>

                <tr v-if="filteredRows.length === 0">
                  <td colspan="6" class="muted center">No comments found.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useUserStore } from '@/stores/users'
import DefaultLogo from '@/assets/images/logos/Mushroom_Avatar.png'

type UUID = string
type ModerationStatus = 'pending' | 'approved' | 'rejected'

type CommentRow = {
  id: UUID
  slug: string
  user_id: UUID
  body: string
  moderation_status: ModerationStatus
  created_at: string | null
  updated_at: string | null
  reviewed_at: string | null
  display_name: string | null
  avatar_url: string | null
}

const auth = useUserStore()
const router = useRouter()

const isDev = computed(() => auth.isDev)
const checkingGate = ref(true)

const loading = ref(true)
const error = ref<string | null>(null)
const rows = ref<CommentRow[]>([])
const savingMap = ref<Record<string, boolean>>({})

const activeTab = ref<ModerationStatus>('pending')
const search = ref('')
const sortBy = ref<'created_at' | 'reviewed_at' | 'display_name' | 'slug' | 'body'>('created_at')
const sortDir = ref<'asc' | 'desc'>('desc')

onMounted(async () => {
  await auth.ensureIdentityLoaded()
  await auth.checkDevStatus().catch(() => {})

  if (!auth.isDev) {
    checkingGate.value = false
    router.replace('/dashboard')
    return
  }

  checkingGate.value = false
  await bootstrap()
})

async function bootstrap() {
  loading.value = true
  error.value = null

  try {
    const { data: commentsData, error: commentsError } = await supabase
      .from('visual_novel_comments')
      .select(`
        id,
        slug,
        user_id,
        body,
        moderation_status,
        created_at,
        updated_at,
        reviewed_at,
        is_deleted
      `)
      .eq('is_deleted', false)

    if (commentsError) throw commentsError

    const baseRows = (commentsData || []) as Array<CommentRow & { is_deleted?: boolean }>
    const userIds = [...new Set(baseRows.map((row) => row.user_id).filter(Boolean))]

    let profileMap: Record<string, { display_name?: string | null; avatar_url?: string | null }> = {}

    if (userIds.length) {
      const { data: profiles, error: profilesError } = await supabase.rpc(
        'get_public_profiles_by_ids',
        { p_ids: userIds }
      )

      if (profilesError) throw profilesError

      profileMap = Object.fromEntries(
        (profiles || []).map((profile: any) => [
          profile.id,
          {
            display_name: profile.display_name ?? null,
            avatar_url: profile.avatar_url ?? null,
          },
        ])
      )
    }

    rows.value = baseRows.map((row) => {
      const profile = profileMap[row.user_id] || null

      return {
        id: row.id,
        slug: row.slug,
        user_id: row.user_id,
        body: row.body,
        moderation_status: row.moderation_status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        reviewed_at: row.reviewed_at,
        display_name: profile?.display_name || 'User',
        avatar_url: profile?.avatar_url || null,
      }
    })

    sortNow()
  } catch (e: any) {
    error.value = e?.message ?? String(e)
  } finally {
    loading.value = false
  }
}

function sortByKey(key: typeof sortBy.value) {
  if (sortBy.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = key
    sortDir.value = key === 'display_name' || key === 'slug' || key === 'body' ? 'asc' : 'desc'
  }

  sortNow()
}

function sortNow() {
  const dir = sortDir.value === 'asc' ? 1 : -1

  rows.value = [...rows.value].sort((a, b) => {
    let av: any = ''
    let bv: any = ''

    if (sortBy.value === 'created_at') {
      av = new Date(a.created_at || 0).getTime()
      bv = new Date(b.created_at || 0).getTime()
    } else if (sortBy.value === 'reviewed_at') {
      av = new Date(a.reviewed_at || 0).getTime()
      bv = new Date(b.reviewed_at || 0).getTime()
    } else if (sortBy.value === 'display_name') {
      av = a.display_name || ''
      bv = b.display_name || ''
    } else if (sortBy.value === 'slug') {
      av = a.slug || ''
      bv = b.slug || ''
    } else if (sortBy.value === 'body') {
      av = a.body || ''
      bv = b.body || ''
    }

    if (av === bv) return 0
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
    return String(av).localeCompare(String(bv)) * dir
  })
}

const filteredRows = computed(() => {
  const needle = search.value.trim().toLowerCase()

  return rows.value
    .filter((row) => row.moderation_status === activeTab.value)
    .filter((row) => {
      if (!needle) return true

      return [
        row.display_name || '',
        row.slug || '',
        row.body || '',
        row.user_id || '',
      ].some((value) => String(value).toLowerCase().includes(needle))
    })
})

async function setModerationStatus(comment: CommentRow, nextStatus: ModerationStatus) {
  if (comment.moderation_status === nextStatus) return
  if (savingMap.value[comment.id]) return

  savingMap.value = {
    ...savingMap.value,
    [comment.id]: true,
  }

  const previousRows = [...rows.value]

  rows.value = rows.value.map((row) => {
    if (row.id !== comment.id) return row

    return {
      ...row,
      moderation_status: nextStatus,
      reviewed_at: new Date().toISOString(),
    }
  })

  sortNow()

  try {
    const { data, error: updateError } = await supabase
      .from('visual_novel_comments')
      .update({
        moderation_status: nextStatus,
      })
      .eq('id', comment.id)
      .select('reviewed_at')
      .single()

    if (updateError) throw updateError

    rows.value = rows.value.map((row) => {
      if (row.id !== comment.id) return row
      return {
        ...row,
        reviewed_at: data?.reviewed_at ?? row.reviewed_at,
      }
    })

    sortNow()
  } catch (e: any) {
    rows.value = previousRows
    sortNow()
    alert(e?.message || 'Failed to update moderation status.')
  } finally {
    savingMap.value = {
      ...savingMap.value,
      [comment.id]: false,
    }
  }
}

function avatarSrc(row: CommentRow) {
  const raw = row.avatar_url
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

function formatDateTime(iso: string | null) {
  if (!iso) return '—'

  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleString()
  } catch {
    return '—'
  }
}
</script>

<style scoped>
.page {
  display: grid;
  grid-template-rows: auto auto 1fr;
  gap: 1rem;
  padding: 2rem 4vw 3rem;
  margin: 0 auto;
  width: min(80vw, 1500px);
  padding-top: 20px;
}

@media (max-width: 960px) {
  .page {
    width: 100%;
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

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .75rem;
  flex-wrap: wrap;
}

.left {
  display: inline-flex;
  align-items: baseline;
  gap: .5rem;
}

.title {
  font-size: 1.8rem;
  font-weight: 800;
  margin: 0;
  color: #fff;
}

.count {
  color: rgba(255, 255, 255, .85);
  font-weight: 700;
}

.tools,
.subtools {
  display: flex;
  align-items: center;
  gap: .75rem;
  flex-wrap: wrap;
}

.tools {
  color: #f8fafc;
}

.subtools {
  justify-content: space-between;
}

.tool {
  display: inline-flex;
  align-items: center;
  gap: .45rem;
}

label.muted {
  color: #e5e7eb;
}

select,
.search-input {
  padding: .45rem .6rem;
  border: 1px solid rgba(255, 255, 255, .35);
  border-radius: 8px;
  background: rgba(255, 255, 255, .14);
  color: #fff;
}

select option {
  color: #111;
  background: #fff;
}

.search-input {
  min-width: min(420px, 100%);
}

.search-input::placeholder {
  color: rgba(255, 255, 255, .72);
}

.content {
  display: grid;
  gap: 1rem;
}

.muted {
  color: #e5e7eb;
}

.muted.dark {
  color: #6b7280;
  font-size: .75rem;
  word-break: break-all;
}

.error {
  color: #fecaca;
}

.center {
  text-align: center;
}

.comments-wrap {
  border: 1px solid var(--main-border, #e5e7eb);
  border-radius: 12px;
  background: var(--main-surface-weak, #fff);
  box-shadow: 0 6px 18px rgba(0,0,0,.06) inset;
  margin: 0 auto;
  max-width: calc(100vw - max(20px, env(safe-area-inset-left) + env(safe-area-inset-right)));
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  scrollbar-gutter: stable both-edges;
}

.comments-table {
  width: 100%;
  min-width: 1100px;
  border-collapse: collapse;
}

.comments-table thead th {
  position: sticky;
  top: 0;
  background: var(--main-surface-strong, #fafafa);
  text-align: left;
  font-weight: 800;
  padding: 10px 12px;
  border-bottom: 1px solid var(--main-border, #e5e5e5);
  white-space: nowrap;
}

.comments-table tbody td {
  padding: 12px;
  border-bottom: 1px solid var(--main-border, #f0f0f0);
  vertical-align: top;
  color: var(--main-text, #111);
}

.col-user { width: 250px; }
.col-slug { width: 180px; }
.col-body { width: 520px; }
.col-created { width: 180px; }
.col-reviewed { width: 180px; }
.col-actions { width: 180px; }

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

.sort[data-active="true"][data-dir="asc"] {
  transform: rotate(-135deg);
  opacity: 1;
}

.sort[data-active="true"][data-dir="desc"] {
  transform: rotate(45deg);
  opacity: 1;
}

.user-cell {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.user-meta {
  display: grid;
  gap: 3px;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  flex: 0 0 auto;
}

.slug-pill {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  background: #eef2ff;
  color: #3730a3;
  font-weight: 700;
  word-break: break-word;
}

.comment-body {
  white-space: pre-wrap;
  line-height: 1.5;
  word-break: break-word;
}

.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn {
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #111;
  padding: .45rem .7rem;
  border-radius: 8px;
  font-weight: 800;
  cursor: pointer;
}

.btn.sm {
  padding: .3rem .55rem;
  font-size: .85rem;
}

.btn:disabled {
  opacity: .6;
  cursor: not-allowed;
}

.btn.success {
  border-color: #bbf7d0;
  color: #166534;
  background: #f0fdf4;
}

.btn.success:hover:enabled {
  background: #dcfce7;
}

.btn.danger {
  border-color: #fecaca;
  color: #b91c1c;
  background: #fff5f5;
}

.btn.danger:hover:enabled {
  background: #fee2e2;
}

@media (max-width: 560px) {
  .comments-table {
    font-size: 0.93rem;
  }

  .comments-table thead th,
  .comments-table tbody td {
    padding: 8px 9px;
  }

  .subtools {
    align-items: stretch;
  }

  .search-input {
    min-width: 0;
    width: 100%;
  }
}
</style>