<!-- src/components/CustomDeckButton.vue -->
<template>
  <!-- Logged-in view -->
  <RouterLink
    v-if="isAuthed"
    class="btn custom-decks"
    :style="rootStyle"
    to="/custom-decks"
    title="Go to your Custom Decks"
  >
    <span>My Custom Decks</span>
  </RouterLink>

  <!-- Not logged in -->
  <div v-else class="customdeck-login-msg" :style="rootStyle">
    Please log in or sign up to make custom decks.
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { supabase } from '@/lib/supabase'

const props = defineProps({
  /** Optional max height (px). If set, the button/message will not exceed it. */
  maxHeight: { type: Number, default: null },

  /**
   * Optional: scale the button's padding+font a bit when you need it smaller.
   * 1 = default, 0.9 = slightly smaller, etc.
   */
  scale: { type: Number, default: 1 },
})

const rootStyle = computed(() => {
  const s = Math.max(0.6, Math.min(1.2, Number(props.scale) || 1))
  return {
    '--cdb-max-h': props.maxHeight ? `${props.maxHeight}px` : 'none',
    '--cdb-scale': String(s),
  }
})

const isAuthed = ref(false)
let authSubscription = null

async function checkAuth() {
  const { data } = await supabase.auth.getSession()
  isAuthed.value = !!data.session
}

onMounted(() => {
  void checkAuth()

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    isAuthed.value = !!session
  })

  authSubscription = data.subscription
})

onBeforeUnmount(() => {
  if (authSubscription) {
    authSubscription.unsubscribe()
    authSubscription = null
  }
})
</script>

<style scoped>
/* =========================
   NOT LOGGED IN MESSAGE BOX
   ========================= */
.customdeck-login-msg {
  width: 100%;
  text-align: center;

  /* Scale-friendly */
  padding: calc(0.85rem * var(--cdb-scale, 1)) calc(1rem * var(--cdb-scale, 1));
  font-size: calc(0.9rem * var(--cdb-scale, 1));

  font-weight: 600;
  color: var(--header-on-surface);
  background: var(--neutral-0);
  border: 2px solid var(--header-border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--header-shadow);
  line-height: 1.35;

  /* New: cap height when needed */
  max-height: var(--cdb-max-h, none);
  overflow: hidden;
  display: grid;
  align-items: center;
}

/* =========================
   LOGGED-IN BUTTON
   ========================= */
.btn.custom-decks {
  position: relative;
  overflow: hidden;

  background: var(--customdeck-button-bg);
  color: var(--customdeck-button-on);
  font-weight: 900;

  /* Scale-friendly */
  font-size: calc(1.12rem * var(--cdb-scale, 1));
  padding: calc(14px * var(--cdb-scale, 1)) calc(26px * var(--cdb-scale, 1));

  border: 0;
  border-radius: var(--radius-lg);
  text-decoration: none;

  text-shadow:
    -1px 0 color-mix(in srgb, var(--neutral-900) 100%, transparent),
    0 1px color-mix(in srgb, var(--neutral-900) 100%, transparent),
    1px 0 color-mix(in srgb, var(--neutral-900) 100%, transparent),
    0 -1px color-mix(in srgb, var(--neutral-900) 100%, transparent);

  box-shadow:
    var(--elevation-2),
    inset 0 0 0 2px color-mix(in srgb, var(--neutral-0) 35%, transparent);

  transition: transform .18s ease, box-shadow .18s ease, filter .18s ease;

  /* New: cap height when needed */
  max-height: var(--cdb-max-h, none);
  display: inline-grid;
  align-items: center;
}

/* Keep the inner content visible even when capped */
.btn.custom-decks > * {
  position: relative;
  z-index: 1;
  line-height: 1.1;
}

/* Dot layer animation */
.btn.custom-decks::before {
  content: "";
  position: absolute;
  top: -120%;
  left: -170%;
  width: 440%;
  height: 440%;
  z-index: 0;
  transform: rotate(45deg);

  background-image: radial-gradient(var(--customdeck-dots) 34%, rgba(0, 0, 0, 0) 36%);
  background-size: 72px 72px;
  opacity: .52;

  animation: decks-dots-slower 120s linear infinite;
  pointer-events: none;
}

@keyframes decks-dots-slower {
  0% { background-position: 0 0; }
  100% { background-position: 450% 450%; }
}

@media (prefers-reduced-motion: reduce) {
  .btn.custom-decks::before { animation: none; }
  .btn.custom-decks:hover { transform: translateY(-2px); }
}

.btn.custom-decks:hover {
  transform: scale(1.08) translateY(-2px);
  box-shadow:
    var(--elevation-3),
    inset 0 0 0 2px color-mix(in srgb, var(--neutral-0) 55%, transparent);
  filter: brightness(1.04) saturate(1.05);
}
</style>
