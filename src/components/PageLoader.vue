<template>
  <transition name="fade">
    <div v-if="loading" class="overlay" aria-live="polite" aria-busy="true">
      <div class="spinner" aria-hidden="true"></div>
      <div class="label">Loading…</div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { isLoading } from '@/state/loading'

const loading = computed(() => isLoading.value)
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(10, 20, 16, 0.35); /* translucent chalkboard tint */
  backdrop-filter: blur(1px);
  z-index: 9999;
}

/* chalky spinner */
.spinner {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 4px solid rgba(255,255,255,0.25);
  border-top-color: #fff;
  animation: spin .8s linear infinite;
  filter: drop-shadow(0 0 8px rgba(255,255,255,0.25));
}

.label {
  margin-top: 14px;
  color: #f7f7f2;
  font-weight: 800;
  letter-spacing: .5px;
  text-shadow:
    0 1px 0 rgba(255,255,255,0.3),
    0 0 6px rgba(255,255,255,0.16);
  font-family: "Baloo 2", "Fredoka", system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* nice fade */
.fade-enter-active, .fade-leave-active { transition: opacity .12s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@keyframes spin { to { transform: rotate(360deg); } }
</style>
