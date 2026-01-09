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
  <div
    v-else
    ref="msgEl"
    class="customdeck-login-msg"
    :style="msgStyle"
  >
    <span class="msg-inline">
      Please
      <RouterLink class="auth-link" to="/login">log in</RouterLink>
      or
      <RouterLink class="auth-link" to="/login">sign up</RouterLink>
      to make custom decks.
    </span>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onBeforeUpdate, onMounted, ref, watch } from 'vue'
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

/* ---------------------------
   Auth state
--------------------------- */
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

/* ---------------------------
   Fit-to-width for login msg
   - Do not wrap at links
   - Shrink font-size until it fits
--------------------------- */
const msgEl = ref(null)

// Base size matches your CSS intent (0.9rem) but we compute px so we can binary-search reliably.
const MSG_MAX_PX = ref(15) // will be set on mount from computed style
const MSG_MIN_PX = 11

const msgFontPx = ref(null)

const msgStyle = computed(() => ({
  ...rootStyle.value,
  ...(msgFontPx.value ? { fontSize: `${msgFontPx.value}px` } : {}),
}))

let ro = null
let raf = 0

function cancelRaf() {
  if (raf) {
    cancelAnimationFrame(raf)
    raf = 0
  }
}

function scheduleFit() {
  cancelRaf()
  raf = requestAnimationFrame(() => {
    void fitMsgToWidth()
  })
}

async function fitMsgToWidth() {
  // Only applies when not authed (element exists)
  const el = msgEl.value
  if (!el) return

  // Establish max font-size from the element’s current computed font-size (includes scale)
  const cs = window.getComputedStyle(el)
  const currentPx = Number.parseFloat(cs.fontSize) || 14
  MSG_MAX_PX.value = currentPx

  // Start at max
  msgFontPx.value = MSG_MAX_PX.value
  await nextTick()

  // If it fits, done
  if (el.scrollWidth <= el.clientWidth) return

  // Binary search between min and max
  let lo = MSG_MIN_PX
  let hi = Math.floor(MSG_MAX_PX.value)
  let best = lo

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    msgFontPx.value = mid
    await nextTick()

    if (el.scrollWidth <= el.clientWidth) {
      best = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }

  msgFontPx.value = best
}

// When the “not logged in” block is about to render, clear any stale font size.
onBeforeUpdate(() => {
  if (isAuthed.value) msgFontPx.value = null
})

// Fit when switching to unauth state, and on container resizes.
watch(
  () => isAuthed.value,
  async (authed) => {
    if (!authed) {
      await nextTick()
      scheduleFit()
      // Observe size changes of the message itself (covers responsive layout changes)
      if (!ro && msgEl.value) {
        ro = new ResizeObserver(() => scheduleFit())
        ro.observe(msgEl.value)
      }
    } else {
      // Clean up observer when it disappears
      if (ro) {
        ro.disconnect()
        ro = null
      }
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  cancelRaf()
  if (ro) {
    ro.disconnect()
    ro = null
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

  /* Cap height when needed */
  max-height: var(--cdb-max-h, none);

  /* Critical: do not wrap at links or spaces; shrink-to-fit is handled in JS */
  white-space: nowrap;

  /* Safety: if it somehow can’t fit even at min, do not wrap; ellipsis instead */
  overflow: hidden;
  text-overflow: ellipsis;

  display: grid;
  align-items: center;
}

/* Keep message contents inline and unbreakable */
.msg-inline {
  display: inline;
  white-space: nowrap;
}

/* Inline auth links (no wrap points) */
.auth-link {
  display: inline;
  white-space: nowrap;

  color: var(--accent-primary);
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.auth-link:hover {
  text-decoration-thickness: 2px;
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

  /* Cap height when needed */
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
