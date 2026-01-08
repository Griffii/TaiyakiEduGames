<!-- src/views/ThemeEditor.vue -->
<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useTheme } from '@/utils/useTheme'

type Emits = {
  (e: 'update:open', v: boolean): void
  (e: 'close'): void
}
const emit = defineEmits<Emits>()
const props = defineProps<{ open: boolean }>()

const { current, keys, applyTheme } = useTheme()
const localOpen = ref(props.open)

watch(() => props.open, (v) => (localOpen.value = v))

function close() {
  localOpen.value = false
  emit('update:open', false)
  emit('close')
}

function onBackdrop(e: MouseEvent) {
  if (e.target === e.currentTarget) close()
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

async function onChangeTheme(e: Event) {
  const val = (e.target as HTMLSelectElement).value
  await applyTheme(val as any) // still apply locally for SSR/standalone use
}

onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <teleport to="body">
    <div
      v-show="localOpen"
      class="theme-modal__backdrop"
      role="presentation"
      @click="onBackdrop"
    >
      <section
        class="theme-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="theme-editor-title"
      >
        <header class="theme-modal__head">
          <h2 id="theme-editor-title">Choose a Theme</h2>
          <button
            class="icon-btn close"
            type="button"
            aria-label="Close"
            title="Close"
            @click="close"
          >×</button>
        </header>

        <div class="theme-modal__body">
          <label class="theme-label" for="theme-select">Theme</label>

          <!-- Select with chevron indicator -->
          <div class="select-wrap">
            <select
              id="theme-select"
              class="theme-select"
              :value="current"
              @change="onChangeTheme"
            >
              <option v-for="k in keys" :key="k" :value="k">{{ k }}</option>
            </select>
            <span class="chevron" aria-hidden="true"></span>
          </div>

          <p class="hint">Your choice saves automatically.</p>
        </div>

        <footer class="theme-modal__foot">
          <button class="btn" type="button" @click="close">Done</button>
        </footer>
      </section>
    </div>
  </teleport>
</template>

<style scoped>
/* Backdrop uses modal overlay tokens */
.theme-modal__backdrop {
  position: fixed;
  inset: 0;
  background: var(--modal-overlay-bg);
  backdrop-filter: var(--modal-overlay-filter);
  display: grid;
  place-items: center;
  z-index: 1000;
}

/* Modal shell draws from modal tokens */
.theme-modal {
  width: min(560px, 92vw);
  background: var(--modal-surface);
  color: var(--modal-on-surface);
  border: 1px solid var(--modal-border);
  border-radius: var(--modal-radius);
  box-shadow: var(--modal-shadow);
  padding: 1rem 1rem 0.75rem;
}

.theme-modal__head {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: start;
  gap: 0.5rem;
  padding: 0.25rem 0.25rem 0.5rem;
  border-bottom: 1px dashed var(--modal-border);
}

.theme-modal__head h2 {
  margin: 0;
  font-size: clamp(1.1rem, 1.2vw + 0.8rem, 1.5rem);
  font-weight: 800;
  color: var(--modal-on-surface);
  letter-spacing: 0.2px;
}

/* Close button — use modal close tokens */
.icon-btn.close {
  inline-size: 40px;
  block-size: 40px;
  border-radius: 50%;
  border: 2px solid var(--modal-close-border);
  background: var(--modal-close-bg);
  color: var(--modal-close-on);
  display: grid;
  place-items: center;
  font-size: 1.25rem;
  cursor: pointer;
  transition: transform 120ms ease, filter 120ms ease;
  box-shadow: var(--elevation-1);
}
.icon-btn.close:hover { transform: scale(1.05); filter: brightness(1.05); }
.icon-btn.close:active { transform: scale(0.98); }
.icon-btn.close:focus-visible { box-shadow: var(--focus-ring); }

.theme-modal__body {
  display: grid;
  gap: 0.75rem;
  padding: 0.9rem 0.25rem 1rem;
}

.theme-label {
  font-weight: 700;
  color: var(--modal-on-surface);
}

/* Select + Chevron wrapper */
.select-wrap { position: relative; }

/* IMPORTANT:
   Use the dedicated select-menu tokens so the dropdown remains readable
   across dark/light themes. These were added alongside modal tokens. */
.theme-select {
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  padding: 0.75rem 2.75rem 0.75rem 0.9rem; /* extra right padding for chevron */
  border-radius: var(--radius-lg);
  border: 2px solid var(--select-menu-border);
  background: var(--select-menu-surface);
  color: var(--select-menu-on);
  box-shadow: var(--elevation-1);
  outline: none;
  font-weight: 700; /* improves contrast perception */
  text-shadow: none; /* avoid muddy edges on colored bgs */
}
.theme-select:focus { box-shadow: var(--focus-ring); }
.theme-select option {
  background: var(--select-menu-surface);
  color: var(--select-menu-on);
}
.theme-select:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Chevron: right side down arrow indicator */
.select-wrap .chevron {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%) rotate(45deg);
  width: 10px;
  height: 10px;
  pointer-events: none;
  color: var(--modal-on-surface-muted);
  border-right: 3px solid currentColor;
  border-bottom: 3px solid currentColor;
  opacity: 0.85;
}

.hint {
  margin: 0.25rem 0 0;
  font-size: 0.9rem;
  color: var(--modal-on-surface-muted);
}

.theme-modal__foot {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.75rem 0.25rem 1rem;
  border-top: 1px dashed var(--modal-border);
}

/* Buttons: theme tokens + scale hover effect */
.btn {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-on);
  border: 2px solid var(--btn-primary-border);
  border-radius: var(--radius-md);
  padding: 0.65rem 1rem;
  box-shadow: var(--elevation-1);
  cursor: pointer;
  transition: transform 120ms ease, box-shadow 120ms ease, filter 120ms ease;
}
.btn:hover { transform: translateY(-1px) scale(1.02); filter: saturate(1.02); }
.btn:active { transform: translateY(0) scale(0.99); }
.btn:focus-visible { box-shadow: var(--focus-ring); }

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .icon-btn.close,
  .btn {
    transition: none;
  }
}
</style>
