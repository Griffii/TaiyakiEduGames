<!-- src/components/Search.vue -->
<template>
  <!-- Full-bleed nav bar (non-sticky) -->
  <div class="search-bar" role="region" aria-label="Search and Navigation" ref="rootEl">
    <div class="inner">
      <!-- Left: Menus -->
      <nav class="menus" aria-label="Activity Menus">
        <div
          class="menu"
          v-for="(group, i) in safeMenus"
          :key="group.label"
        >
          <button
            type="button"
            class="menu-btn"
            @click="toggle(i)"
            :aria-expanded="openIndex === i ? 'true' : 'false'"
            :aria-controls="'menu-pop-' + i"
          >
            {{ group.label }} <span aria-hidden="true">▾</span>
          </button>

          <div
            v-if="openIndex === i"
            class="menu-pop"
            :id="'menu-pop-' + i"
            role="listbox"
            :aria-label="group.label + ' menu'"
          >
            <button
              v-for="it in group.items"
              :key="it.id"
              class="menu-item"
              role="option"
              type="button"
              @click="select(group.label, it)"
            >
              {{ it.label }}
            </button>
            <div v-if="!group.items || !group.items.length" class="menu-empty">No items</div>
          </div>
        </div>
      </nav>

      <!-- Right: Search -->
      <form class="search" role="search" @submit.prevent>
        <input
          :placeholder="placeholder || 'Search tags, games, or activities…'"
          v-model="q"
          type="search"
          aria-label="Search tags, games, or activities"
        />
        <button type="submit" title="Search" aria-label="Search">🔎</button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

type MenuItem = { id: string; label: string }
type MenuGroupLabel = 'Reading' | 'Writing' | 'Listening' | 'Tags'
type MenuGroup = { label: MenuGroupLabel; items: MenuItem[] }

const props = defineProps<{
  menus?: MenuGroup[]
  placeholder?: string
}>()

const emit = defineEmits<{
  (e: 'selectActivity', id: string): void
  (e: 'selectTag', tag: string): void
}>()

const q = ref('')
const openIndex = ref<number | null>(null)
const rootEl = ref<HTMLElement | null>(null)

/* Always-visible placeholders until real data arrives */
const placeholderMenus = computed<MenuGroup[]>(() => ([
  {
    label: 'Reading',
    items: [
      { id: 'reading-1', label: 'Reading Activity 1 (placeholder)' },
      { id: 'reading-2', label: 'Reading Activity 2 (placeholder)' },
      { id: 'reading-3', label: 'Reading Activity 3 (placeholder)' },
    ],
  },
  {
    label: 'Writing',
    items: [
      { id: 'writing-1', label: 'Writing Activity 1 (placeholder)' },
      { id: 'writing-2', label: 'Writing Activity 2 (placeholder)' },
      { id: 'writing-3', label: 'Writing Activity 3 (placeholder)' },
    ],
  },
  {
    label: 'Listening',
    items: [
      { id: 'listening-1', label: 'Listening Activity 1 (placeholder)' },
      { id: 'listening-2', label: 'Listening Activity 2 (placeholder)' },
      { id: 'listening-3', label: 'Listening Activity 3 (placeholder)' },
    ],
  },
]))

/* If any incoming groups have items, use them (hide empty Tags). Else use placeholders. */
const safeMenus = computed<MenuGroup[]>(() => {
  const incoming = Array.isArray(props.menus) ? props.menus : []
  const withItems = incoming
    .filter(g => (g.items?.length ?? 0) > 0)
    .filter(g => g.label !== 'Tags' || (g.items?.length ?? 0) > 0)
  return withItems.length ? withItems : placeholderMenus.value
})

function toggle(i: number) {
  openIndex.value = openIndex.value === i ? null : i
}
function select(group: MenuGroupLabel, item: MenuItem) {
  if (group === 'Tags') emit('selectTag', item.label)
  else emit('selectActivity', item.id)
  openIndex.value = null
}

/* Click-outside to close */
function onDocMouseDown(e: MouseEvent) {
  const r = rootEl.value
  if (!r) return
  const t = e.target as Node
  if (!r.contains(t)) openIndex.value = null
}
onMounted(() => document.addEventListener('mousedown', onDocMouseDown))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocMouseDown))
</script>

<style scoped>
/* Full-bleed (non-sticky) bar */
.search-bar {
  inline-size: 100vw;
  margin-inline: calc(50% - 50vw);

  /* App-Header tokens */
  background: var(--header-surface);
  color: var(--header-on-surface);
  border-block-end: var(--header-border-width) solid var(--header-border-color);
  box-shadow: var(--header-shadow);

  min-block-size: 60px; /* ensure visible height */
  position: relative;
}

/* Optional subtle header grid overlay */
.search-bar::after {
  content: "";
  position: absolute; inset: 0;
  background-image:
    linear-gradient(var(--header-grid-color) 1px, transparent 1px),
    linear-gradient(90deg, var(--header-grid-color) 1px, transparent 1px);
  background-size: 22px 22px, 22px 22px;
  pointer-events: none;
  opacity: .15;
}

/* Constrained inner container */
.inner {
  max-inline-size: 1280px;
  margin-inline: auto;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
}

/* Menus row */
.menus {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-block-size: 36px;
}

.menu { position: relative; }

/* Menu button — use header button tokens */
.menu-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--header-btn-border-color, var(--header-border-color));
  background: var(--header-btn-bg);
  color: var(--header-btn-text);
  cursor: pointer;
  font-weight: 800;
  line-height: 1;
  transition: background .15s ease, border-color .15s ease, box-shadow .15s ease, color .15s ease;
}
.menu-btn:hover {
  background: var(--header-btn-hover, var(--neutral-100));
  color: var(--header-btn-text-hover, var(--header-btn-text));
  border-color: var(--header-border-color);
}
.menu-btn:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

/* Popover — match header styling */
.menu-pop {
  position: absolute;
  inset-block-start: calc(100% + 6px);
  inset-inline-start: 0;
  min-inline-size: 240px;
  max-inline-size: min(340px, 80vw);
  max-block-size: 280px;
  overflow: auto;

  background: var(--header-btn-bg);
  color: var(--header-btn-text);
  border: 1px solid var(--header-btn-border-color, var(--header-border-color));
  border-radius: 12px;
  padding: 6px;
  box-shadow: 0 12px 28px rgba(0,0,0,.25);
  z-index: 1000;
}

.menu-item {
  display: block;
  inline-size: 100%;
  text-align: left;
  padding: 8px 10px;
  border-radius: 8px;
  background: transparent;
  border: 0;
  color: var(--header-btn-text);
  cursor: pointer;
  font-weight: 700;
  transition: background .12s ease, color .12s ease;
}
.menu-item:hover {
  background: color-mix(in srgb, var(--header-accent) 15%, var(--header-btn-bg) 85%);
}
.menu-item:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
.menu-empty { padding: 10px; color: color-mix(in srgb, var(--header-on-surface) 55%, #fff 45%); }

/* Search box — header tokens */
.search {
  display: flex;
  gap: 8px;
  align-items: center;
  min-block-size: 36px;
}
.search input {
  inline-size: min(42vw, 520px);
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--header-btn-border-color, var(--header-border-color));
  background: var(--header-btn-bg);
  color: var(--header-btn-text);
  transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
}
.search input::placeholder {
  color: color-mix(in srgb, var(--header-btn-text) 55%, #fff 45%);
}
.search input:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
  background: color-mix(in srgb, var(--header-btn-bg) 85%, #fff 15%);
}

.search button {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--header-btn-border-color, var(--header-border-color));
  background: var(--header-btn-bg);
  color: var(--header-btn-text);
  cursor: pointer;
  font-weight: 800;
  transition: background .15s ease, border-color .15s ease, box-shadow .15s ease, color .15s ease;
}
.search button:hover {
  background: var(--header-btn-hover, var(--neutral-100));
  color: var(--header-btn-text-hover, var(--header-btn-text));
  border-color: var(--header-border-color);
}
.search button:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

</style>
