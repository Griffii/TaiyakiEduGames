<!-- src/components/AvatarSelection.vue -->
<template>
  <teleport to="body">
    <div class="av-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="av-modal-title" @click.self="close">
      <div class="av-modal">
        <header class="av-modal-head">
          <h2 id="av-modal-title">Choose an avatar</h2>
          <button class="av-close" type="button" @click="close" aria-label="Close">✕</button>
        </header>

        <div class="av-body">
          <div v-if="loading" class="av-status">Loading avatars…</div>
          <div v-else-if="error" class="av-status av-error">Couldn’t load avatars: {{ error }}</div>
          <div v-else-if="avatars.length === 0" class="av-status">
            No avatars found in <code>public-assets/avatars/</code> (including subfolders).<br />
            <small>Check the bucket name, folder path, and List/Read permissions.</small>
          </div>

          <div v-else class="av-grid" role="list">
            <button v-for="a in avatars" :key="a.path" role="listitem" type="button" class="av-item"
              :aria-label="a.name" :class="{ selected: isSelected(a) }" @click="saveAvatar(a)" :disabled="saving"
              :title="a.path">
              <img :src="a.url" :alt="a.name" @error="onImageError($event, a)" />
            </button>
          </div>
        </div>

        <footer class="av-foot">
          <div class="left">
            <span v-if="saving" class="saving">Saving…</span>
            <span v-if="saveError" class="save-error">Error: {{ saveError }}</span>
            <span v-if="savedOk" class="save-ok">Updated!</span>
          </div>

        </footer>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useUserStore } from '@/stores/users'

type AvFile = { name: string; path: string; url: string }

const props = defineProps<{
  currentUrl?: string
  currentKey?: string
  targetUserId?: string | null
}>()

// Volar-friendly, strongly-typed emits
const emit = defineEmits<{
  close: []
  updated: [{ key: string; userId: string }]
  selected: [{ key: string; userId: string }]
}>()

const BUCKET = 'public-assets'
const ROOT_PREFIX = 'avatars'

/** Staff flag (unlocks secret-avatars listing and lets you set others’ avatars) */
const isStaff = ref(false)

const avatars = ref<AvFile[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const saving = ref(false)
const savedOk = ref(false)
const saveError = ref<string | null>(null)

const IMG_EXT = /\.(png|jpe?g|webp|gif|svg)$/i
const isImageFile = (name: string) => IMG_EXT.test(name)

function normalizeUrl(u?: string) {
  if (!u) return ''
  try { const x = new URL(u); x.search = ''; x.hash = ''; return x.toString() } catch { return u.split('?')[0] }
}

function isSelected(a: AvFile): boolean {
  if (props.currentKey && a.path === props.currentKey) return true
  if (props.currentUrl && normalizeUrl(a.url) === normalizeUrl(props.currentUrl)) return true
  return false
}

async function toPublicUrl(path: string): Promise<string> {
  const res = supabase.storage.from(BUCKET).getPublicUrl(path)
  const publicUrl = res?.data?.publicUrl || ''
  if (publicUrl) return publicUrl
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
  return data?.signedUrl ?? ''
}

/** Recursively list images under prefix. If not staff, skip any path containing secret-avatars/. */
function shouldIncludePath(path: string): boolean {
  if (isStaff.value) return true
  return !path.split('/').some(seg => seg.trim().toLowerCase() === 'secret-avatars')
}

async function listRecursive(prefix: string, out: AvFile[]) {
  let offset = 0
  const limit = 100
  while (true) {
    const { data, error: listErr } = await supabase.storage.from(BUCKET)
      .list(prefix, { limit, offset, sortBy: { column: 'name', order: 'asc' } })
    if (listErr) throw listErr
    if (!data || data.length === 0) break

    for (const item of data) {
      const subPrefix = prefix ? `${prefix}/${item.name}` : item.name
      // if directory, probe; if file, collect
      if (item.metadata) {
        // file-ish entry (some drivers set metadata); still verify extension
        if (isImageFile(item.name)) {
          const path = `${prefix}/${item.name}`.replace(/^\/+/, '')
          if (shouldIncludePath(path)) {
            const url = await toPublicUrl(path)
            if (url) out.push({ name: item.name, path, url })
          }
        }
      } else {
        // likely a folder; try one level peek
        const { data: probe } = await supabase.storage.from(BUCKET).list(subPrefix, { limit: 1 })
        if ((probe?.length ?? 0) > 0) await listRecursive(subPrefix, out)
      }
    }

    if (data.length < limit) break
    offset += limit
  }
}

async function detectStaff() {
  isStaff.value = false
  try {
    const { data, error } = await supabase.rpc('is_staff')
    if (!error && typeof data === 'boolean') isStaff.value = data
    else {
      // fallback: check staff_roles
      const { data: auth } = await supabase.auth.getUser()
      const uid = auth?.user?.id
      if (uid) {
        const { data: roles } = await supabase
          .from('staff_roles')
          .select('role')
          .eq('user_id', uid)
        const has = (roles ?? []).some(r => ['DEV', 'ADMIN'].includes(String(r.role).toUpperCase()))
        isStaff.value = has
      }
    }
  } catch {/* ignore */ }
}

async function loadAvatars() {
  loading.value = true
  error.value = null
  avatars.value = []
  try {
    await detectStaff()
    const acc: AvFile[] = []
    await listRecursive(ROOT_PREFIX, acc)
    const seen = new Set<string>()
    avatars.value = acc.filter(a => shouldIncludePath(a.path))
      .filter(a => !seen.has(a.path) && (seen.add(a.path), true))
  } catch (e: any) {
    error.value = e?.message ?? String(e)
  } finally {
    loading.value = false
  }
}

async function saveAvatar(av: AvFile) {
  if (saving.value) return
  saving.value = true
  savedOk.value = false
  saveError.value = null

  try {
    const { data: auth } = await supabase.auth.getUser()
    const authedUserId = auth?.user?.id ?? null

    // Who are we updating?
    const targetId = (props.targetUserId && String(props.targetUserId).trim() !== '')
      ? String(props.targetUserId)
      : authedUserId

    if (!targetId) throw new Error('You must be logged in to change an avatar.')

    // If editing someone else, require staff (RLS should also enforce)
    if (targetId !== authedUserId && !isStaff.value) {
      throw new Error('Only staff can change other users’ avatars.')
    }

    const { error: updErr } = await supabase
      .from('profiles')
      .update({ avatar_url: av.path })
      .eq('id', targetId)
    if (updErr) throw updErr

    // If we changed our own, refresh the store (keeps header/profile in sync without full reload)
    if (authedUserId && authedUserId === targetId) {
      const store = useUserStore?.()
      await store?.loadProfile?.()
    }

    savedOk.value = true
    emit('updated', { key: av.path, userId: targetId })
    emit('selected', { key: av.path, userId: targetId })
    setTimeout(() => emit('close'), 250)
  } catch (e: any) {
    saveError.value = e?.message ?? String(e)
  } finally {
    saving.value = false
  }
}

function close() { emit('close') }
function onImageError(e: Event, _av: AvFile) {
  const el = e.target as HTMLImageElement
  if (el) el.style.visibility = 'hidden'
}
function onKeydown(ev: KeyboardEvent) { if (ev.key === 'Escape') close() }

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  loadAvatars()
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>


<style scoped>
/* Overlay */
.av-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.65);
  display: grid;
  place-items: center;
  z-index: 2000;
}

/* Modal */
.av-modal {
  background: #fff;
  color: #111827;
  width: min(960px, 92vw);
  max-height: 82vh;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
  display: grid;
  grid-template-rows: auto 1fr auto;
  overflow: hidden;
}

/* Header */
.av-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.av-modal-head h2 {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
}

.av-close {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 2px solid #991b1b;       /* darker red ring */
  border-radius: 50%;
  background: #ef4444;              /* red */
  color: #ffffff;                   /* white “x” */
  font-size: 18px;
  font-weight: 900;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 2px 0 rgba(0,0,0,.15);
  transition: transform .12s ease, filter .12s ease;
}

.av-close:hover {
  filter: brightness(1.05);
  transform: scale(1.06);
}

.av-close:active {
  transform: scale(0.95);
}

.av-close:focus-visible {
  outline: 3px dashed #991b1b;
  outline-offset: 2px;
}


/* Body */
.av-body {
  padding: 14px;
  overflow: auto;
}

.av-status {
  color: #4b5563;
  text-align: center;
  padding: 20px 0;
}

.av-status.av-error {
  color: #b91c1c;
}

/* Grid of circular avatar buttons */
.av-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: 14px;
}

.av-item {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 9999px;
  border: 2px solid transparent;
  background: #f9fafb;
  cursor: pointer;
  padding: 0;
  overflow: hidden;
}

.av-item[disabled] {
  opacity: 0.6;
  cursor: default;
}

.av-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.av-item:hover {
  border-color: #c7d2fe;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
}

.av-item.selected {
  border-color: #6366f1;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.25);
}

/* Footer */
.av-foot {
  padding: 12px 14px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.left {
  min-height: 1.5rem;
  display: flex;
  align-items: center;
  gap: 10px;
}

.saving {
  color: #374151;
}

.save-ok {
  color: #059669;
  font-weight: 700;
}

.save-error {
  color: #b91c1c;
}

.av-cancel {
  background: transparent;
  border: 1px solid #d1d5db;
  padding: 8px 12px;
  border-radius: 10px;
  cursor: pointer;
}

.av-cancel:hover {
  background: #f3f4f6;
}
</style>
