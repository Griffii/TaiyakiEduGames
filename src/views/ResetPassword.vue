<template>
  <div class="chalkboard-bg">
    <main class="login-shell" role="main">
      <section class="login-card" aria-labelledby="reset-title">
        <header class="login-head">
          <h1 id="reset-title" class="main-title">Set a new password</h1>
          <p class="main-sub">
            <span v-if="!hasRecoverySession">We couldn’t verify a recovery session. Try the link again, or request a new one.</span>
            <span v-else>Enter your new password below.</span>
          </p>
          <p v-if="bannerMsg" class="info" style="margin-top:8px">{{ bannerMsg }}</p>
        </header>

        <form class="login-form" @submit.prevent="onSubmit" v-if="hasRecoverySession">
          <label class="field-label" for="pw1">New password</label>
          <div class="field-wrap has-addon">
            <input
              id="pw1"
              :type="show1 ? 'text' : 'password'"
              v-model.trim="pw1"
              autocomplete="new-password"
              placeholder="At least 8 characters"
              minlength="8"
              class="field-input"
              required
            />
            <button class="icon-btn hover-scale" type="button" @click="show1 = !show1" :aria-pressed="show1 ? 'true' : 'false'">
              <svg v-if="!show1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="icon"><path d="M12 5c5.05 0 9.27 3.11 10.94 7.5C21.27 16.89 17.05 20 12 20S2.73 16.89 1.06 12.5C2.73 8.11 6.95 5 12 5zm0 2C7.94 7 4.48 9.44 3.05 12.5 4.48 15.56 7.94 18 12 18s7.52-2.44 8.95-5.5C19.52 9.44 16.06 7 12 7zm0 2.5A3.5 3.5 0 1 1 8.5 13 3.5 3.5 0 0 1 12 9.5zm0 2A1.5 1.5 0 1 0 13.5 13 1.5 1.5 0 0 0 12 11.5z"/></svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="icon"><path d="M2 4.27 3.28 3 21 20.72 19.73 22l-2.39-2.39A12.2 12.2 0 0 1 12 20c-5.05 0-9.27-3.11-10.94-7.5a13.7 13.7 0 0 1 5.18-6.33L2 4.27zM12 7c4.06 0 7.52 2.44 8.95 5.5-.59 1.31-1.49 2.47-2.61 3.42l-2-2a5 5 0 0 0-6.76-6.76l-1.7-1.7A13.85 13.85 0 0 1 12 7zm-3.5 6a3.5 3.5 0 0 0 4.41 3.37l-4.28-4.28A3.47 3.47 0 0 0 8.5 13z"/></svg>
            </button>
          </div>

          <label class="field-label" for="pw2">Confirm password</label>
          <input
            id="pw2"
            :type="show2 ? 'text' : 'password'"
            v-model.trim="pw2"
            autocomplete="new-password"
            placeholder="Re-enter your password"
            minlength="8"
            class="field-input"
            required
          />

          <div style="display:flex;gap:8px;align-items:center;margin-top:4px">
            <label style="display:flex;align-items:center;gap:6px">
              <input type="checkbox" v-model="show2" />
              <span class="muted">Show confirm</span>
            </label>
          </div>

          <p v-if="err" class="error">{{ err }}</p>
          <p v-if="ok" class="info">{{ ok }}</p>

          <button class="primary-btn hover-scale" type="submit" :disabled="busy">
            <span v-if="busy">Updating…</span>
            <span v-else>Update password</span>
          </button>
        </form>

        <div v-else class="login-form">
          <button class="primary-btn hover-scale" type="button" @click="$router.replace('/')" style="margin-top:8px">
            Back to login
          </button>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'

const hasRecoverySession = ref(false)
const busy = ref(false)
const err = ref<string | null>(null)
const ok = ref<string | null>(null)

const pw1 = ref('')
const pw2 = ref('')
const show1 = ref(false)
const show2 = ref(false)
const bannerMsg = ref<string | null>(null)

onMounted(async () => {
  // When user arrives from the email link, Supabase puts a recovery session in the URL hash.
  // supabase-js reads it on init and sets the session. We just check for a session now.
  const { data, error } = await supabase.auth.getSession()
  if (error) console.warn(error)
  hasRecoverySession.value = !!data.session
  if (!hasRecoverySession.value) {
    bannerMsg.value = 'No active recovery session.'
  }
})

async function onSubmit() {
  err.value = null
  ok.value = null

  if (pw1.value !== pw2.value) {
    err.value = 'Passwords do not match.'
    return
  }
  if (pw1.value.length < 8) {
    err.value = 'Password must be at least 8 characters.'
    return
  }

  busy.value = true
  const { error } = await supabase.auth.updateUser({ password: pw1.value })
  busy.value = false

  if (error) {
    err.value = error.message || 'Could not update password.'
    return
  }
  ok.value = 'Password updated. You’re all set!'
  // Optional: redirect after a short delay
  // setTimeout(() => window.location.replace('/'), 900)
}
</script>

<style scoped>
/* ---------- Background (chalkboard) ---------- */
.chalkboard-bg {
  min-height: 100vh;
  background:
    url("@/assets/images/backgrounds/asfalt-light.png"),
    radial-gradient(1100px 600px at 120% -10%, rgba(255, 255, 255, 0.08) 0%, transparent 60%),
    radial-gradient(900px 500px at -10% 120%, rgba(255, 255, 255, 0.07) 0%, transparent 60%),
    linear-gradient(180deg, #1d3b2c 0%, #256349 100%);
  background-repeat: repeat, no-repeat, no-repeat, no-repeat;
  background-size: 440px 440px, auto, auto, auto;
  background-blend-mode: soft-light, normal, normal, normal;
  display: grid;
  place-items: center;
  padding: clamp(12px, 3vw, 24px);
}

/* ---------- Shell & Card ---------- */
.login-shell { width: min(92vw, 760px); }
.login-card {
  backdrop-filter: blur(2px);
  background: rgba(18, 31, 27, 0.64);
  border: 2px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45), inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  padding: clamp(18px, 3.5vw, 40px);
  color: #e9f5ef;
}

/* ---------- Header ---------- */
.login-head { display: grid; justify-items: center; text-align: center; margin-bottom: clamp(10px, 1.6vw, 16px); }
.brand-logo { width: clamp(120px, 22vw, 160px); height: auto; filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.35)); }
.main-title {
  font-family: "Baloo 2", "Fredoka", "Comic Neue", system-ui;
  font-size: clamp(28px, 5.2vw, 44px);
  line-height: 1.05;
  color: #f7f7f2;
  margin: 2px 0 6px;
}
.main-sub { font-size: clamp(14px, 2.6vw, 16px); opacity: 0.9; margin: 0; }

/* ---------- Form ---------- */
.login-form { display: grid; gap: clamp(10px, 2.4vw, 14px); max-width: 560px; margin: 0 auto; }
.field-label { font-weight: 600; color: #f2fff9; margin-top: 6px; margin-bottom: 4px; letter-spacing: 0.2px; font-size: clamp(13px, 2.6vw, 14px); }
.field-wrap { position: relative; display: grid; }
.field-wrap.has-addon { grid-template-columns: 1fr auto; align-items: center; column-gap: 8px; }
.field-input {
  width: 100%;
  appearance: none;
  border: 2px solid rgba(255, 255, 255, 0.14);
  background: rgba(7, 12, 10, 0.35);
  color: #eafff6;
  border-radius: 12px;
  padding: clamp(10px, 2.8vw, 12px) clamp(12px, 3vw, 14px);
  outline: none;
  transition: border-color .15s ease, background-color .15s ease, box-shadow .15s ease;
  font-size: clamp(15px, 3.6vw, 16px);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
}
.field-input::placeholder { color: rgba(233, 245, 239, 0.55); }
.field-input:focus {
  border-color: rgba(153, 255, 210, 0.9);
  background: rgba(7, 12, 10, 0.5);
  box-shadow: 0 0 0 3px rgba(153, 255, 210, 0.18), inset 0 0 0 1px rgba(255, 255, 255, 0.06);
}

/* ---------- Buttons (shared hover scale) ---------- */
.hover-scale { transition: transform .2s ease, filter .15s ease, box-shadow .15s ease; }
.hover-scale:hover { transform: scale(1.03); }
.hover-scale:active { transform: scale(0.98); }

/* Primary action */
.primary-btn {
  margin-top: 8px;
  background: linear-gradient(180deg, #9bf0cb 0%, #59d6aa 90%);
  color: #0b2a23;
  border: none;
  border-radius: 12px;
  padding: 12px 16px;
  font-weight: 800;
  font-size: clamp(15px, 3.8vw, 16px);
  cursor: pointer;
  box-shadow: 0 10px 28px rgba(18, 185, 134, 0.35);
}

/* Link-style */
.link-row { margin-top: 8px; }
.link-btn {
  appearance: none;
  background: none;
  border: none;
  padding: 0;
  color: #c8ffe6;
  text-decoration: underline;
  font-weight: 700;
  cursor: pointer;
}
.link-btn:hover { color: #ffffff; }

/* Sign up: shiny + glitter */
.sign-up-btn {
  position: relative;
  overflow: hidden;
  margin-top: 8px;
  background: rgba(18, 185, 134, 0.1);
  color: #baffdf;
  border: 2px solid rgba(153, 255, 210, 0.7);
  border-radius: 14px;
  padding: 12px 18px;
  font-weight: 800;
  font-size: clamp(15px, 3.8vw, 16px);
  letter-spacing: .2px;
  cursor: pointer;
  line-height: 1;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.sign-up-btn::before {
  content: "";
  position: absolute;
  inset: -40% -20%;
  background: linear-gradient(115deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.45) 45%,
    rgba(255, 255, 255, 0.12) 50%,
    rgba(255, 255, 255, 0) 55%);
  transform: translateX(-120%) skewX(-18deg);
  filter: blur(0.5px);
  pointer-events: none;
  animation: shine-sweep 1.2s ease forwards;
  animation-play-state: paused;
}
.sign-up-btn::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(4px 4px at 20% 30%, rgba(255,255,255,0.9), transparent 60%),
    radial-gradient(3px 3px at 65% 25%, rgba(255,255,255,0.8), transparent 60%),
    radial-gradient(3px 3px at 80% 70%, rgba(255,255,255,0.8), transparent 60%),
    radial-gradient(4px 4px at 35% 75%, rgba(255,255,255,0.9), transparent 60%);
  opacity: 0;
  pointer-events: none;
  animation: glitter-pop 1.1s ease-in-out;
  animation-play-state: paused;
}
.sign-up-btn:hover::before,
.sign-up-btn:focus-visible::before { animation-play-state: running; }
.sign-up-btn:hover::after,
.sign-up-btn:focus-visible::after { animation-play-state: running; }

@keyframes shine-sweep {
  0%   { transform: translateX(-120%) skewX(-18deg); opacity: 0.0; }
  10%  { opacity: .25; }
  55%  { opacity: .35; }
  100% { transform: translateX(120%) skewX(-18deg); opacity: 0; }
}
@keyframes glitter-pop {
  0%   { opacity: 0; transform: translateY(2px) scale(0.95); }
  20%  { opacity: .9; transform: translateY(0)    scale(1); }
  60%  { opacity: .6; }
  100% { opacity: 0; transform: translateY(-2px) scale(1.02); }
}

/* Back to sign in: simple, no shine */
.back-btn {
  margin-top: 6px;
  background: transparent;
  color: #d9fff0;
  border: 2px dashed rgba(198, 255, 241, 0.5);
  border-radius: 12px;
  padding: 10px 14px;
  font-weight: 800;
  font-size: clamp(14px, 3.6vw, 15px);
  cursor: pointer;
}
.back-btn:hover,
.back-btn:focus-visible {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(198, 255, 241, 0.85);
}

/* Icon-only utility button */
.icon-btn {
  margin-left: 8px;
  height: 44px;
  width: 44px;
  border-radius: 10px;
  border: 2px solid rgba(255, 255, 255, 0.14);
  background: rgba(7, 12, 10, 0.35);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: border-color .15s ease, background-color .15s ease, transform .2s ease;
}
.icon-btn:hover { border-color: rgba(153, 255, 210, 0.9); background: rgba(7, 12, 10, 0.5); }
.icon { width: 22px; height: 22px; fill: #e9f5ef; opacity: 0.9; }

/* Messages */
.error { color: #ff6b6b; margin-top: 4px; }
.info { color: #51d88a; margin-top: 4px; }
.muted { opacity: .75; font-size: .9rem; }

/* ---------- View swap fade ---------- */
.fade-swap-enter-active, .fade-swap-leave-active { transition: opacity .18s ease; }
.fade-swap-enter-from, .fade-swap-leave-to { opacity: 0; }

/* ---------- Password reset modal ---------- */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  display: grid;
  place-items: center;
  z-index: 50;
  padding: 16px;
}
.modal {
  width: min(92vw, 520px);
  background: rgba(14, 22, 19, 0.96);
  border: 2px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  box-shadow: 0 30px 80px rgba(0,0,0,0.55);
  padding: 18px 18px 16px;
  color: #e9f5ef;
}
.modal-form { display: grid; gap: 10px; margin-top: 10px; }
.modal-actions {
  display: flex; gap: 10px; justify-content: flex-end; align-items: center; margin-top: 6px;
}

/* ---------- Mobile tweaks ---------- */
@media (max-width: 560px) {
  .login-card { padding: clamp(16px, 5vw, 22px); }
  .login-form { max-width: 100%; }
  .icon-btn { height: 40px; width: 40px; }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .hover-scale, .icon-btn, .sign-up-btn::before, .sign-up-btn::after {
    transition: none !important;
    animation: none !important;
    transform: none !important;
  }
}
</style>
