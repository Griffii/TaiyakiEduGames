<!-- src/views/AuthCallback.vue -->
<template>
  <div class="chalkboard-bg">
    <main class="login-shell" role="main">
      <section class="login-card" aria-labelledby="authcb-title">
        <header class="login-head">
          <h1 id="authcb-title" class="main-title">Redirecting…</h1>
          <p class="main-sub">Taking you to the login page.</p>
        </header>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'

const router = useRouter()

onMounted(async () => {
  try {
    // Make extra sure we don't keep any local session
    await supabase.auth.signOut().catch(() => {})
    // Clear common PKCE artefacts Supabase stores
    try { localStorage.removeItem('supabase.pkce.code_verifier') } catch {}

    // Clean the URL (no auth params lingering in history)
    window.history.replaceState({}, document.title, '/auth/callback')

    // Send them to login with a tiny flag you can use for a toast
    router.replace({ name: 'login', query: { cb: '1' } })
  } catch {
    // If anything odd happens, still push to login
    router.replace({ name: 'login' })
  }
})
</script>

<style scoped>
/* Reuse login styles for a consistent look */
.chalkboard-bg{min-height:100vh;display:grid;place-items:center;background:
  url("@/assets/images/backgrounds/asfalt-light.png"),
  radial-gradient(1100px 600px at 120% -10%, rgba(255,255,255,.08) 0%, transparent 60%),
  radial-gradient(900px 500px at -10% 120%, rgba(255,255,255,.07) 0%, transparent 60%),
  linear-gradient(180deg,#1d3b2c 0%,#256349 100%);background-repeat:repeat,no-repeat,no-repeat,no-repeat;background-size:440px 440px,auto,auto,auto;background-blend-mode:soft-light,normal,normal,normal;}
.login-shell{width:min(60vw);padding:clamp(12px,2vw,24px);}
.login-card{backdrop-filter:blur(2px);background:rgba(18,31,27,.6);border:2px solid rgba(255,255,255,.08);box-shadow:0 30px 80px rgba(0,0,0,.45),inset 0 0 0 1px rgba(255,255,255,.05);border-radius:20px;padding:clamp(20px,3vw,40px);color:#e9f5ef;}
.login-head{display:grid;justify-items:center;text-align:center;margin-bottom:12px;}
.main-title{font-family:"Baloo 2","Fredoka","Comic Neue",system-ui;font-size:42px;line-height:0.01;color:#f7f7f2;}
.main-sub{font-size:16px;opacity:.9;}
</style>
