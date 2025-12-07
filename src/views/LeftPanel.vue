<!-- src/components/LeftPanel.vue -->
<template>
  <div>
    <!-- Side panel -->
    <aside
      class="side-panel side-panel--left"
      :class="{ 'side-panel--open': isOpen }"
      aria-label="Left navigation"
    >
      <header class="side-panel__header">
        <h2 class="side-panel__title">Explore</h2>
        <button
          type="button"
          class="side-panel__close"
          @click="closePanel"
          aria-label="Close left panel"
        >
          <
        </button>
      </header>

      <div class="side-panel__scroll">
        <ActivityPillList />

      </div>
    </aside>

    <!-- Circle toggle button shown when collapsed -->
    <button
      v-if="!isOpen"
      type="button"
      class="side-toggle side-toggle--left"
      @click="openPanel"
      aria-label="Open left panel"
    >
      >
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import ActivityPillList from '@/components/ActivityPillList.vue'

const isOpen = ref(true)
const hasInteracted = ref(false)

function updateInitialState() {
  if (window.innerWidth <= 768) {
    isOpen.value = false
  } else {
    isOpen.value = true
  }
}

function openPanel() {
  isOpen.value = true
  hasInteracted.value = true
}

function closePanel() {
  isOpen.value = false
  hasInteracted.value = true
}

function onResize() {
  const w = window.innerWidth

  // If screen small → auto collapse unless user forced open
  if (w <= 768) {
    if (!hasInteracted.value) {
      isOpen.value = false
    }
    return
  }

  // If screen large → auto open only if user hasn’t interacted
  if (!hasInteracted.value) {
    isOpen.value = true
  }
}

onMounted(() => {
  updateInitialState()
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
})

</script>

<style scoped>
/* Fixed left panel overlay, under the fixed header */
.side-panel {
  position: fixed;
  inset-inline-start: 0; /* left: 0 */
  inset-block-start: var(--app-header-height, 64px);
  inset-block-end: 0; /* bottom: 0 */
  width: clamp(220px, 20vw, 320px);

  display: flex;
  flex-direction: column;
  box-sizing: border-box;

  /* Match AppHeader tokens */
  background: var(--header-surface);
  border-right: var(--header-border-width, 3px) solid var(--header-border-color);
  box-shadow: var(--header-shadow);
  color: var(--header-on-surface);

  z-index: 90;

  transform: translateX(-100%);
  transition: transform 0.2s ease-out;
}

.side-panel--open {
  transform: translateX(0);
}

/* Panel header */
.side-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem 0.25rem;
  border-bottom: var(--header-border-width, 3px) solid var(--header-border-color);
}

.side-panel__title {
  font-size: 0.9rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.side-panel__close {
  border: none;
  background: transparent;
  color: var(--header-on-surface);
  font-size: 1rem;
  cursor: pointer;

  opacity: 0.6; /* subtle fade */
  transition:
    transform 0.15s ease,
    opacity 0.15s ease,
    filter 0.15s ease;
}

/* Hover: darker + slightly larger */
.side-panel__close:hover {
  opacity: 1;
  transform: scale(1.15);
  filter: brightness(0.85); /* darken the icon slightly */
}

/* Active press: subtle shrink */
.side-panel__close:active {
  transform: scale(0.92);
}

/* Scrollable content */
.side-panel__scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0 0.75rem 0.75rem;
}

/* Sections */
.side-panel__section + .side-panel__section {
  margin-top: 0.75rem;
}

.side-panel__section-title {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 0.35rem;
}

/* Lists */
.side-panel__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.side-panel__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.25rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background 0.16s ease, transform 0.12s ease;
}

.side-panel__item:hover {
  background: color-mix(in srgb, var(--header-surface) 80%, #ffffff 20%);
  transform: translateX(1px);
}

.side-panel__icon {
  font-size: 1.05rem;
  width: 1.5rem;
  text-align: center;
}

.side-panel__label {
  font-size: 0.9rem;
}

/* Circle toggle button shown when collapsed */
.side-toggle {
  position: fixed;
  inset-block-start: calc(var(--app-header-height, 64px) + 20px);
  width: 40px;
  height: 40px;
  border-radius: 999px;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  border: var(--header-border-width, 3px) solid var(--header-border-color);
  background: var(--header-surface);
  color: var(--header-on-surface);
  box-shadow: var(--header-shadow);
  cursor: pointer;

  z-index: 95;
}

.side-toggle--left {
  inset-inline-start: 12px;
}

/* Base state stays the same, but add slight fade */
.side-toggle {
  opacity: 0.75;
  transition:
    transform 0.15s ease,
    opacity 0.15s ease,
    filter 0.15s ease;
}

/* Hover: brighten + scale */
.side-toggle:hover {
  opacity: 1;
  transform: scale(1.12);
  filter: brightness(1.1);
}

/* Active press: shrink a little */
.side-toggle:active {
  transform: scale(0.92);
}

/* Optional: tweak for very small screens */
@media (max-width: 480px) {
  .side-panel {
    width: min(80vw, 320px);
  }
}
</style>
