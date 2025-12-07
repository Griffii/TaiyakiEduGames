<!-- src/views/flashcard-system/CustomDecks.vue -->
<template>
  <section class="custom-decks-page chalkboard-bg" aria-labelledby="page-title">
    <header class="topbar">
      <h1 id="page-title" class="title">My Custom Decks</h1>
      <div class="actions">
        <button class="btn create" type="button" @click="openCreateDialog" :disabled="busy">+ Create</button>
        <button
          class="btn edit-toggle"
          type="button"
          :aria-pressed="editMode"
          @click="toggleEditMode"
          :class="{ on: editMode }"
          title="Toggle Edit Mode"
        >
          {{ editMode ? 'Done' : 'Edit' }}
        </button>
      </div>
    </header>

    <!-- Zero state -->
    <div v-if="!busy && decks.length === 0" class="zero">
      <p>It's empty...</p>
      <button class="btn primary" type="button" @click="openCreateDialog">Create your first deck</button>
    </div>

    <!-- Loading -->
    <div v-if="busy" class="loading" role="status" aria-live="polite">Loading…</div>

    <!-- Grid of deck cards (drag to re-order when edit mode is ON) -->
    <ul
      v-if="!busy && decks.length > 0"
      class="deck-grid"
      role="list"
      :aria-label="editMode ? 'Reorder your decks by dragging' : 'Your custom decks'"
    >
      <li
        v-for="(d, idx) in decks"
        :key="d.id"
        class="deck-item"
        :class="{ dragging: draggingId === d.id, draggable: editMode }"
        :draggable="editMode && editingId !== d.id"
        :aria-grabbed="editMode && draggingId === d.id ? 'true' : 'false'"
        @dragstart="onDragStart($event, idx, d.id)"
        @dragenter.prevent="onDragEnter($event, idx)"
        @dragover.prevent="onDragOver($event, idx)"
        @drop.prevent="onDrop($event, idx)"
        @dragend="onDragEnd"
      >
        <div class="deck-card">
          <!-- Clickable body (disabled in edit mode) -->
          <div
            class="deck-click"
            role="button"
            tabindex="0"
            :aria-label="`Open ${d.title}`"
            @click="!editMode && openDeck(d.id)"
            @keydown.enter="!editMode && openDeck(d.id)"
          >
            <!-- Cover -->
            <div class="cover">
              <img
                v-if="covers[d.id]"
                class="cover-img"
                :src="covers[d.id]"
                alt=""
                referrerpolicy="no-referrer"
                @error="onCoverError(d.id)"
              />
              <div v-else class="cover-fallback" :data-initial="initials(d.title)"></div>
            </div>

            <!-- Footer: title + count badge; title becomes input during rename -->
            <div class="deck-footer">
              <template v-if="editingId === d.id">
                <input
                  ref="renameInputRef"
                  v-model="renameTitle"
                  :maxlength="120"
                  class="title-input"
                  aria-label="Deck title"
                  @mousedown.stop
                  @dragstart.prevent
                />
              </template>
              <template v-else>
                <div class="deck-title" :title="d.title">{{ d.title }}</div>
              </template>
              <span class="count-badge" :aria-label="`${d.card_count} cards`">{{ d.card_count }}</span>
            </div>
          </div>

          <!-- Bottom edit bar -->
          <div v-if="editMode" class="deck-edit-bar">
            <template v-if="editingId === d.id">
              <div class="edit-left">
                <span class="muted small">Editing title…</span>
              </div>
              <div class="edit-right">
                <button class="btn tiny success" type="button" @click="confirmRename(d)">Save</button>
                <button class="btn tiny cancel" type="button" @click="cancelRename">Cancel</button>
                <!-- Delete hidden while editing -->
              </div>
            </template>
            <template v-else>
              <div class="edit-left">
                <button class="btn tiny" type="button" @click.stop="startRename(d)">Rename</button>
              </div>
              <div class="edit-right">
                <button class="btn tiny danger" type="button" @click.stop="askDelete(d)">Delete</button>
              </div>
            </template>
          </div>
        </div>
      </li>
    </ul>

    <!-- GLASS OVERLAY (for any open modal) -->
    <div v-if="showCreate || confirmDeleteId" class="glass-overlay" aria-hidden="true"></div>

    <!-- Create Dialog -->
    <dialog v-if="showCreate" class="modal modal-create" open @click.self="closeCreateDialog">
      <form class="modal-card" @submit.prevent="submitCreate">
        <header class="modal-head">
          <h3>Create New Deck</h3>
        </header>
        <div class="modal-body">
          <label class="field">
            <span class="label">Title <span class="req">*</span></span>
            <input
              ref="createTitleRef"
              class="input"
              v-model.trim="createForm.title"
              :maxlength="120"
              required
              placeholder="e.g., Animals – Unit 3 Mix"
            />
          </label>
          <label class="field">
            <span class="label">Description</span>
            <textarea
              class="textarea"
              v-model.trim="createForm.description"
              :maxlength="500"
              placeholder="(optional) Short description"
              rows="3"
            ></textarea>
          </label>
        </div>
        <footer class="modal-foot">
          <button class="btn cancel" type="button" @click="closeCreateDialog" :disabled="busy">Cancel</button>
          <button class="btn success" type="submit" :disabled="busy || createForm.title.length === 0">Create</button>
        </footer>
      </form>
    </dialog>

    <!-- Delete Confirm -->
    <dialog v-if="confirmDeleteId" class="modal modal-delete" open @click.self="cancelDelete">
      <div class="modal-card">
        <header class="modal-head">
          <h3>Delete Deck?</h3>
        </header>
        <div class="modal-body">
          <p>
            This will permanently delete
            <strong>{{ decks.find(d => d.id === confirmDeleteId)?.title }}</strong>.
            This can’t be undone.
          </p>
        </div>
        <footer class="modal-foot">
          <button class="btn cancel" type="button" @click="cancelDelete" :disabled="busy">Cancel</button>
          <button class="btn danger" type="button" @click="confirmDelete" :disabled="busy">Delete</button>
        </footer>
      </div>
    </dialog>

    <p v-if="err" class="error" role="alert">{{ err }}</p>
  </section>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'

type UUID = string
type CustomDeck = {
  id: UUID
  owner_user_id: UUID
  org_id: UUID | null
  title: string
  description: string | null
  visibility: 'private' | 'org'
  card_count: number
  position: number | null
  created_at: string
  updated_at: string
}

const router = useRouter()
const decks = ref<CustomDeck[]>([])
const covers = ref<Record<string, string | undefined>>({})
const busy = ref(false)
const err = ref<string | null>(null)
const editMode = ref(false)

const showCreate = ref(false)
const createForm = reactive({ title: '', description: '' })
const createTitleRef = ref<HTMLInputElement | null>(null)

const editingId = ref<UUID | null>(null)
const renameTitle = ref('')
const renameInputRef = ref<HTMLInputElement | null>(null)

const confirmDeleteId = ref<UUID | null>(null)

/* DnD state */
const draggingId = ref<UUID | null>(null)
const dragFrom = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

function clearErrorSoon() { window.setTimeout(() => (err.value = null), 3000) }
function initials(title: string) {
  const parts = title.trim().split(/\s+/)
  const letters = (parts[0]?.[0] || '') + (parts[1]?.[0] || '')
  return letters.toUpperCase() || 'D'
}

async function getUserId(): Promise<UUID> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('Not authenticated')
  return data.user.id as UUID
}

function nextPositionValue(): number {
  // space positions by 1000 to allow future inserts
  const max = decks.value.reduce((m, d) => Math.max(m, d.position ?? 0), 0)
  return (isFinite(max) ? max : 0) + 1000
}

async function refresh() {
  busy.value = true
  err.value = null
  try {
    const uid = await getUserId()
    // 1) Load my decks (include position), ordered by position then updated_at
    const { data, error } = await supabase
      .from('custom_decks')
      .select('id, owner_user_id, org_id, title, description, visibility, card_count, position, created_at, updated_at')
      .eq('owner_user_id', uid)
      .order('position', { ascending: true, nullsFirst: true })
      .order('updated_at', { ascending: false })
    if (error) throw error
    decks.value = (data ?? []) as CustomDeck[]

    // 2) Random cover per deck from view
    covers.value = {}
    const deckIds = decks.value.map(d => d.id)
    if (deckIds.length > 0) {
      const { data: rc, error: e2 } = await supabase
        .from('v_custom_deck_random_cover')
        .select('deck_id, image_url')
        .in('deck_id', deckIds)
      if (e2) throw e2

      ;(rc || []).forEach((row: any) => {
        covers.value[row.deck_id] = row?.image_url ?? undefined
      })
      deckIds.forEach(id => {
        if (!(id in covers.value)) covers.value[id] = undefined
      })
    }
  } catch (e: any) {
    err.value = e?.message ?? 'Failed to load decks'
    clearErrorSoon()
  } finally {
    busy.value = false
  }
}

function toggleEditMode() {
  editMode.value = !editMode.value
  if (!editMode.value) {
    // leaving edit mode — clear any DnD / rename state
    editingId.value = null
    renameTitle.value = ''
    draggingId.value = null
    dragFrom.value = null
    dragOverIndex.value = null
  }
}

function openCreateDialog() {
  showCreate.value = true
  createForm.title = ''
  createForm.description = ''
  nextTick(() => createTitleRef.value?.focus())
}
function closeCreateDialog() { showCreate.value = false }

async function submitCreate() {
  if (!createForm.title.trim()) return
  busy.value = true
  err.value = null
  try {
    const uid = await getUserId()
    const optimisticId = crypto.randomUUID()
    const optimistic: CustomDeck = {
      id: optimisticId as UUID,
      owner_user_id: uid,
      org_id: null,
      title: createForm.title.trim(),
      description: createForm.description.trim() || null,
      visibility: 'private',
      card_count: 0,
      position: nextPositionValue(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    decks.value.unshift(optimistic)
    covers.value[optimisticId] = undefined
    closeCreateDialog()

    const { data, error } = await supabase
      .from('custom_decks')
      .insert({
        owner_user_id: uid,
        title: optimistic.title,
        description: optimistic.description,
        visibility: 'private',
        position: optimistic.position
      })
      .select('id, owner_user_id, org_id, title, description, visibility, card_count, position, created_at, updated_at')
      .single()
    if (error) throw error

    const idx = decks.value.findIndex(d => d.id === optimisticId)
    if (idx !== -1) decks.value[idx] = data as CustomDeck
  } catch (e: any) {
    // rollback
    decks.value = decks.value.filter(d => !(d.id && d.id.length === 36))
    err.value = e?.message ?? 'Failed to create deck'
    clearErrorSoon()
  } finally {
    busy.value = false
  }
}

/** Rename flow */
function startRename(d: CustomDeck) {
  editingId.value = d.id
  renameTitle.value = d.title
  nextTick(() => renameInputRef.value?.select())
}
function cancelRename() {
  editingId.value = null
  renameTitle.value = ''
}
async function confirmRename(d: CustomDeck) {
  const newTitle = renameTitle.value.trim()
  if (!editingId.value) return
  if (!newTitle || newTitle === d.title) { cancelRename(); return }
  const prev = d.title
  d.title = newTitle
  editingId.value = null
  renameTitle.value = ''
  try {
    const { error } = await supabase.from('custom_decks').update({ title: newTitle }).eq('id', d.id)
    if (error) throw error
  } catch (e: any) {
    d.title = prev
    err.value = e?.message ?? 'Rename failed'
    clearErrorSoon()
  }
}

/** Delete flow */
function askDelete(d: CustomDeck) { confirmDeleteId.value = d.id }
function cancelDelete() { confirmDeleteId.value = null }
async function confirmDelete() {
  if (!confirmDeleteId.value) return
  const id = confirmDeleteId.value
  const snapshot = decks.value.slice()
  decks.value = decks.value.filter(d => d.id !== id)
  delete covers.value[id]
  confirmDeleteId.value = null
  try {
    const { error } = await supabase.from('custom_decks').delete().eq('id', id)
    if (error) throw error
  } catch (e: any) {
    decks.value = snapshot
    err.value = e?.message ?? 'Delete failed'
    clearErrorSoon()
  }
}

/** Drag & Drop ordering */
function isInteractiveTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return !!el?.closest?.('input, textarea, button, [contenteditable="true"], .title-input')
}

function onDragStart(ev: DragEvent, i: number, id: UUID) {
  if (!editMode.value) return
  if (editingId.value || isInteractiveTarget(ev.target)) {
    // Don’t start drag from an input or while renaming
    ev.preventDefault()
    return
  }
  dragFrom.value = i
  draggingId.value = id
  if (ev.dataTransfer) {
    ev.dataTransfer.setData('text/plain', String(i))
    ev.dataTransfer.effectAllowed = 'move'
  }
}
function onDragEnter(_ev: DragEvent, i: number) {
  if (!editMode.value) return
  dragOverIndex.value = i
}
function onDragOver(ev: DragEvent, _i: number) {
  if (!editMode.value) return
  ev.preventDefault()
  if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move'
}
function onDrop(ev: DragEvent, i: number) {
  if (!editMode.value) return
  ev.preventDefault()

  let from = dragFrom.value
  if (from == null) {
    const txt = ev.dataTransfer?.getData('text/plain')
    if (txt && !Number.isNaN(Number(txt))) from = Number(txt)
  }

  dragFrom.value = null
  dragOverIndex.value = null
  draggingId.value = null

  if (from == null || from === i) return

  // Reorder locally (immutable copy for Vue reactivity)
  const list = decks.value.slice()
  const [moved] = list.splice(from, 1)
  list.splice(i, 0, moved)
  decks.value = list

  // Persist order to DB
  persistDeckPositions()
}
function onDragEnd() {
  dragFrom.value = null
  dragOverIndex.value = null
  draggingId.value = null
}

/** Persist order to DB after each change */
function nextPosBase(i: number) { return (i + 1) * 1000 }

async function persistDeckPositions() {
  try {
    const updates = decks.value.map((d, i) => ({ id: d.id, position: nextPosBase(i) }))
    // optimistic local update
    decks.value = decks.value.map((d, i) => ({ ...d, position: updates[i].position }))
    await Promise.all(
      updates.map(u => supabase.from('custom_decks').update({ position: u.position }).eq('id', u.id))
    )
  } catch (e) {
    console.error(e)
    err.value = 'Failed to save new order'; clearErrorSoon()
  }
}

/** Helpers */
function openDeck(id: UUID) { router.push({ name: 'deck', params: { id }, query: { kind: 'custom' } }) }
function onCoverError(deckId: UUID) { covers.value[deckId] = undefined }

onMounted(() => { refresh() })
</script>

<style scoped>
/* =========================
   CustomDecks — token-only styling (no legacy vars)
   ========================= */

.custom-decks-page {
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 1.25rem;
  padding: 2rem 4vw 3rem;
  margin: 0 auto;
  width: min(1100px, 94vw);
  position: relative;
  z-index: 0;

  padding-top: var(--app-header-height);
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title {
  font-size: clamp(1.5rem, 2.6vw, 2rem);
  font-weight: 900;
  color: var(--main-title-color);
  text-shadow: var(--main-title-shadow);
}

.actions { display: flex; gap: 0.5rem; }

/* Buttons — palette via global btn tokens; shells via modal tokens */
.btn {
  appearance: none;
  border: 1px solid var(--modal-border);
  background: var(--modal-surface);
  color: var(--flashcards-on-surface);
  padding: 0.5rem 0.8rem;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.08s ease, background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  box-shadow: var(--modal-shadow);
}
.btn:hover { transform: translateY(-1px); }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }

/* Variants */
.btn.create { border-color: var(--decks-border); background: var(--modal-surface); }
.btn.ghost { background: transparent; color: var(--main-text-color); }
.btn.primary { background: var(--modal-surface); color: var(--modal-on-surface); border-color: color-mix(in srgb, var(--modal-border) 60%, #000 40%); }
.btn.edit-toggle { border-color: var(--accent-warning); background: var(--modal-surface); color: var(--modal-on-surface); }
.btn.edit-toggle.on { border-color: var(--accent-danger); box-shadow: 0 0 0 2px var(--accent-danger) inset; }

.btn.danger {
  background: var(--btn-danger-bg);
  color: var(--modal-close-on);
  border-color: var(--btn-danger-border);
}
.btn.danger:hover { filter: brightness(0.98) saturate(1.02); }

.btn.cancel {
  background: var(--btn-ghost-bg);
  color: var(--btn-ghost-on);
  border-color: var(--btn-ghost-border);
}
.btn.cancel:hover { filter: brightness(0.98); }

.btn.success {
  background: var(--btn-success-bg);
  color: var(--btn-success-on);
  border-color: var(--btn-success-border);
}
.btn.success:hover { filter: brightness(0.98) saturate(1.02); }

.loading { opacity: 0.85; font-size: 0.95rem; color: var(--modal-on-surface-muted); }

.zero {
  text-align: center;
  border-radius: 16px;
  color: var(--neutral-0);
  font-size: larger;
}
.zero .btn { margin-top: 1rem; }

/* ===== Grid ===== */
.deck-grid {
  --min: 260px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--min), 1fr));
  gap: 0.9rem;
  position: relative;
  z-index: 1;
}
.deck-item { display: grid; }
.deck-item.draggable { cursor: grab; }
.deck-item.dragging { opacity: 0.75; cursor: grabbing; }

/* Optional visual cue for current drop target */
.deck-item:hover .deck-card { outline: 2px dashed transparent; }
.deck-item.dragging .deck-card { outline-color: transparent; }
.deck-item[data-drop="true"] .deck-card { outline-color: var(--accent-secondary); }

/* Card container — 4:3 */
.deck-card {
  display: grid;
  grid-template-rows: 1fr auto; /* body + edit bar */
  border-radius: 16px;
  overflow: hidden;
  border: 2px solid var(--decks-border);
  background: var(--neutral-50);
  box-shadow: var(--flashcards-shadow);
  aspect-ratio: 4 / 3;
  transform: translateZ(0);
  transform-origin: center center;
  transition: transform 120ms ease, box-shadow 120ms ease, outline-color 120ms ease;
  will-change: transform;
}
.deck-card:hover,
.deck-card:focus-within {
  transform: scale(1.02);
  z-index: 2;
  box-shadow: var(--elevation-2), var(--flashcards-shadow);
}
.deck-card:active { transform: scale(0.995); }

@media (prefers-reduced-motion: reduce) {
  .deck-card { transition: box-shadow 120ms ease; }
  .deck-card:hover, .deck-card:focus-within, .deck-card:active { transform: none; }
}

/* Clickable area */
.deck-click { cursor: pointer; outline: none; display: grid; grid-template-rows: 1fr auto; height: 100%; }
.deck-click:focus-visible { box-shadow: 0 0 0 3px var(--accent-secondary); }

/* Cover */
.cover { position: relative; width: 100%; height: 100%; background: var(--neutral-100); }
.cover-img { width: 100%; height: 100%; object-fit: cover; }
.cover-fallback {
  width: 100%; height: 100%;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  display: grid; place-items: center;
  color: var(--neutral-0); font-weight: 900;
  font-size: clamp(1.4rem, 5.5vw, 2rem); letter-spacing: 1px;
}
.cover-fallback::after { content: attr(data-initial); }

/* Footer (title + count badge) — light surface → dark text */
.deck-footer {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--modal-surface);
  border-top: 1px solid var(--modal-border);
  min-height: 60px;
}
.deck-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 900;
  font-size: 1rem;
  color: var(--flashcards-on-surface);
}
.title-input {
  width: 100%;
  font-weight: 900;
  font-size: 1rem;
  border-radius: 8px;
  border: 1px solid var(--modal-border);
  background: var(--modal-surface);
  color: var(--modal-on-surface);
  padding: 0.35rem 0.5rem;
  outline: none;
}
.title-input:focus { border-color: color-mix(in srgb, var(--modal-border) 60%, #000 40%); }

.count-badge {
  display: inline-grid;
  place-items: center;
  min-width: 32px;
  height: 26px;
  padding: 0 8px;
  border-radius: 999px;
  background: var(--accent-primary);
  color: var(--neutral-0);
  font-weight: 900;
  font-size: 0.9rem;
  border: 1px solid var(--modal-border);
  box-shadow: var(--elevation-1);
}

/* Bottom edit bar (light surface -> dark text) */
.deck-edit-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.6rem;
  background: var(--modal-surface);
  border-top: 1px solid var(--modal-border);
}
.edit-left { display: flex; gap: 0.5rem; align-items: center; }
.edit-right { margin-left: auto; display: flex; gap: 0.5rem; align-items: center; }
.muted.small { color: var(--modal-on-surface-muted); font-size: 0.9rem; }

.btn.tiny { padding: 0.28rem 0.55rem; font-size: 0.86rem; border-radius: 8px; }

/* ===== Modals & Overlay ===== */

/* Frosted glass overlay that absorbs outside clicks */
.glass-overlay {
  position: fixed;
  inset: 0;
  z-index: 2500;
  background: var(--modal-overlay-bg);
  backdrop-filter: var(--modal-overlay-filter);
  -webkit-backdrop-filter: var(--modal-overlay-filter);
}

/* Remove ANY native dialog box/shadow/background */
.modal,
.modal[open],
.modal-create,
.modal-delete {
  position: fixed;
  inset: 0;
  z-index: 3000;
  border: none !important;
  padding: 0 !important;
  margin: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  width: 100%;
  max-width: none;
}
.modal::backdrop,
.modal-create::backdrop,
.modal-delete::backdrop { background: transparent !important; }

/* Modal card shell (light) */
.modal-card {
  width: min(560px, 92vw);
  margin: 25vh auto;
  border: 1px solid var(--modal-border);
  border-radius: 16px;
  background: var(--modal-surface);
  box-shadow: none;
  overflow: hidden;
}
.modal-delete .modal-card { box-shadow: var(--elevation-3); }

/* Headers / body / foot */
.modal-head { padding: 1rem 1.25rem; border-bottom: 1px solid var(--modal-border); }
.modal-head h3 { margin: 0; font-size: 1.1rem; color: var(--flashcards-on-surface); }
.modal-body { padding: 1rem 1.25rem; display: grid; gap: 0.75rem; color: var(--flashcards-on-surface); }
.modal-foot { display: flex; justify-content: flex-end; gap: 0.6rem; padding: 0.9rem 1.25rem 1.25rem; }

/* Form fields (light) */
.field { display: grid; gap: 0.35rem; }
.label { font-weight: 700; font-size: 0.95rem; color: var(--modal-on-surface-muted); }
.req { color: var(--accent-danger); }
.input, .textarea {
  width: 100%; padding: 0.55rem 0.7rem; border-radius: 10px;
  border: 1px solid var(--modal-border);
  background: var(--neutral-50); color: var(--flashcards-on-surface); outline: none;
}
.input:focus, .textarea:focus { border-color: color-mix(in srgb, var(--modal-border) 60%, #000 40%); }

/* Error stripe */
.error {
  margin-top: 0.5rem;
  color: color-mix(in srgb, var(--accent-danger) 88%, var(--neutral-0) 12%);
  background: color-mix(in srgb, var(--accent-danger) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-danger) 35%, transparent);
  padding: 0.6rem 0.75rem;
  border-radius: 10px;
}
</style>
