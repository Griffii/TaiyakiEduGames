<template>
  <!-- Logged-in view -->
  <RouterLink
    v-if="isAuthed"
    class="btn custom-decks"
    to="/custom-decks"
    title="Go to your Custom Decks"
  >
    <span>My Custom Decks</span>
  </RouterLink>

  <!-- Not logged in -->
  <div v-else class="customdeck-login-msg">
    Please log in or sign up to make custom decks.
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { supabase } from '@/lib/supabase'

const isAuthed = ref(false)
let authSubscription = null

async function checkAuth() {
  const { data } = await supabase.auth.getSession()
  isAuthed.value = !!data.session
}

onMounted(() => {
  void checkAuth()

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    // Fire whenever user logs in / logs out / token refreshed
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
  padding: 0.85rem 1rem;
  font-size: 0.9rem;
  font-weight: 600;

  color: var(--header-on-surface);
  background: color-mix(in srgb, var(--header-surface) 75%, var(--neutral-0) 25%);
  border: 2px solid var(--header-border-color);
  border-radius: var(--radius-lg);

  box-shadow: var(--header-shadow);
  line-height: 1.35;
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
  font-size: 1.12rem;
  padding: 14px 26px;
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
}

.btn.custom-decks > * {
  position: relative;
  z-index: 1;
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
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 450% 450%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .btn.custom-decks::before {
    animation: none;
  }
  .btn.custom-decks:hover {
    transform: translateY(-2px);
  }
}

.btn.custom-decks:hover {
  transform: scale(1.08) translateY(-2px);
  box-shadow:
    var(--elevation-3),
    inset 0 0 0 2px color-mix(in srgb, var(--neutral-0) 55%, transparent);
  filter: brightness(1.04) saturate(1.05);
}
</style>
