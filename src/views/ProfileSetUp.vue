<!-- src/views/profile/ProfileSetUp.vue -->
<template>
  <div class="setup-view">
    <div class="container">
      <section class="card" aria-labelledby="setup-title">
        <header class="head">
          <h1 id="setup-title" class="title">Welcome 🎉</h1>
          <p class="sub">Finish setting up your account.</p>
        </header>

        <div v-if="loading" class="loading-row">
          <span class="spinner" aria-hidden="true"></span>
          <span class="loading-text">Loading…</span>
        </div>

        <form v-else class="form" @submit.prevent="submit">
          <!-- Name -->
          <label class="lab" for="name">Display Name</label>
          <div class="row">
            <input
              id="name"
              v-model="name"
              @input="onNameInput"
              :aria-invalid="!isNameValid ? 'true' : 'false'"
              type="text"
              placeholder="Your display name"
              class="inp"
              autocomplete="name"
              inputmode="text"
              autocapitalize="words"
              maxlength="60"
              required
            />
          </div>
          <small v-if="!isNameValid" class="err">
            Use letters, numbers, spaces, _ - . ' ’ ・ only (max 60).
          </small>

          <!-- Avatar -->
          <label class="lab">Avatar</label>
          <div class="avatar">
            <img
              v-if="avatarSrc"
              :src="avatarSrc"
              alt="Avatar preview"
              class="avatar-img"
              @error="onAvatarImgError"
            />
            <div class="avatar-actions">
              <button class="choose-pill" type="button" @click="showAvatarModal = true">
                Choose avatar
              </button>
              <small class="muted">You can change this later.</small>
            </div>
          </div>

          <p v-if="errorMsg" class="err">{{ errorMsg }}</p>

          <div class="actions">
            <button class="btn pri" type="submit" :disabled="saving">
              <span v-if="saving">Saving…</span>
              <span v-else>Save & continue</span>
            </button>
          </div>
        </form>
      </section>
    </div>

    <!-- Avatar picker (updates profiles.avatar_url itself) -->
    <AvatarSelection
      v-if="showAvatarModal"
      :current-key="auth.profile?.avatar_url || undefined"
      @close="onAvatarClosed"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useUserStore } from '@/stores/users'
import AvatarSelection from '@/components/AvatarSelection.vue'

const auth = useUserStore()
const router = useRouter()

const loading = ref(true)
const saving = ref(false)
const errorMsg = ref<string | null>(null)

/** ---------- Name sanitization & validation ---------- */
const NAME_MAX = 60
const NAME_REGEX = /^[\p{L}\p{N}\p{M} _'\-\.・’]+$/u
function sanitizeName(raw: string): string {
  const s1 = (raw ?? '').normalize('NFKC')
  const s2 = s1.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').replace(/[\u200B-\u200D\uFEFF]/g, '')
  return s2.replace(/[^\p{L}\p{N}\p{M} _'\-\.・’]+/gu, '').slice(0, NAME_MAX).trim()
}
const name = ref('')
const isNameValid = computed(() => name.value.length > 0 && NAME_REGEX.test(name.value))
function onNameInput(e: Event) {
  const el = e.target as HTMLInputElement
  const cleaned = sanitizeName(el.value)
  if (el.value !== cleaned) el.value = cleaned
  name.value = cleaned
}
/** --------------------------------------------------- */

/** Avatar state */
const showAvatarModal = ref(false)
const avatarSrc = ref('')
function onAvatarImgError(){ avatarSrc.value = '' }
async function buildAvatarUrl(key?: string | null) {
  if (!key) { avatarSrc.value = ''; return }
  const pub = supabase.storage.from('public-assets').getPublicUrl(key)
  avatarSrc.value = pub?.data?.publicUrl || ''
  if (!avatarSrc.value) {
    const { data } = await supabase.storage.from('public-assets').createSignedUrl(key, 3600)
    avatarSrc.value = data?.signedUrl ?? ''
  }
}
function onAvatarClosed(){
  showAvatarModal.value = false
  buildAvatarUrl(auth.profile?.avatar_url)
}

/** Init: view page (no Teleport) */
onMounted(async () => {
  try {
    const { data } = await supabase.auth.getSession()
    const user = data.session?.user
    if (!user) {
      // no session; route to login
      router.replace('/login')
      return
    }
    if (!auth.profile) await auth.loadProfile?.()

    const p = auth.profile
    name.value = sanitizeName(p?.display_name ?? p?.name ?? auth.displayName ?? '')
    await buildAvatarUrl(p?.avatar_url)
  } catch (e) {
    // non-fatal; show form anyway
  } finally {
    loading.value = false
  }
})

watch(() => auth.profile?.avatar_url, (k) => buildAvatarUrl(k))

/** Submit: update ONLY `profiles`, mark setup_complete, then push to dashboard */
async function submit() {
  errorMsg.value = null
  if (!isNameValid.value) {
    errorMsg.value = 'Please enter a valid name.'
    return
  }
  const { data } = await supabase.auth.getSession()
  const userId = data.session?.user?.id
  if (!userId) {
    errorMsg.value = 'Not signed in.'
    return
  }

  const cleanName = sanitizeName(name.value)
  saving.value = true
  try {
    const { error: pErr } = await supabase
      .from('profiles')
      .update({
        display_name: cleanName,
        name: cleanName,             // keep in sync if both exist
        avatar_url: auth.profile?.avatar_url ?? null,
        setup_complete: true
      })
      .eq('id', userId)

    if (pErr) throw pErr

    await auth.loadProfile?.()
    router.replace('/dashboard')     // ✅ required: end on dashboard
  } catch (e: any) {
    errorMsg.value = e?.message ?? 'Could not save your setup.'
  } finally {
    saving.value = false
  }
}

/** Keep Not now: go to dashboard without saving */
function cancel() {
  router.replace('/dashboard')
}
</script>

<style scoped>
/* View shell (let your global App.vue provide background if it already does) */
.setup-view {
  min-height: 100%;
  display: grid;
  align-items: start;
}

.container {
  width: min(760px, 92vw);
  margin: 24px auto;
}

/* Light card */
.card{
  border-radius: 18px;
  background: #ffffff;
  color: #132322;
  border: 1px solid rgba(0,0,0,.08);
  box-shadow: 0 24px 60px rgba(0,0,0,.12);
  padding: 18px clamp(18px, 3vw, 28px);
}

.head{ text-align:center; margin-bottom:8px; }
.title{ font-size: 28px; margin:0; color:#0f1f1e; }
.sub{ color:#3b4e4c; margin:.25rem 0 .5rem; }

.loading-row{
  display:flex; align-items:center; gap:10px;
  padding: 10px 0;
  color:#3b4e4c;
}
.spinner{
  width:16px; height:16px; border-radius:50%;
  border:2px solid rgba(0,0,0,.15);
  border-top-color:#2f86ff;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg) } }

.form{ display:grid; gap:12px; }

.lab{ font-weight:700; color:#223c3a; letter-spacing:.2px; }
.row{ display:grid; }

/* Light input */
.inp{
  width:100%; appearance:none;
  border:1px solid rgba(0,0,0,.14);
  background:#fbfeff;
  color:#132322;
  border-radius:12px;
  padding:12px 14px; outline:none;
  transition:border-color .15s, background-color .15s, box-shadow .15s;
  font-size:16px;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,.03);
}
.inp::placeholder{ color:rgba(0,0,0,.45); }
.inp:focus{
  border-color:#2f86ff;
  background:#ffffff;
  box-shadow:0 0 0 3px rgba(47,134,255,.15), inset 0 0 0 1px rgba(0,0,0,.05);
}

.err{ color:#b60000; }
.muted{ opacity:.75; font-size:.9rem; color:#526a68; }

/* Avatar row (lighter) */
.avatar{
  display:flex; align-items:center; gap:12px;
}
.avatar-img{
  width:64px; height:64px; border-radius:50%;
  object-fit:cover;
  border:1px solid rgba(0,0,0,.12);
  background:#f3f7f9;
}
.avatar-actions{ display:grid; gap:6px; }

/* Rounder, brighter choose button */
.choose-pill{
  border-radius:9999px;
  padding:10px 16px;
  border:none;
  background:#ff8f3a;
  color:#ffffff;
  font-weight:800;
  cursor:pointer;
  box-shadow:0 6px 16px rgba(255,143,58,.26);
  transition: transform .1s ease, filter .15s ease, box-shadow .15s ease;
}
.choose-pill:hover{ transform: translateY(-1px); filter:brightness(1.05); box-shadow:0 8px 20px rgba(255,143,58,.3); }

/* Actions */
.actions{
  display:flex; gap:10px; justify-content:flex-end; margin-top:6px;
}
.btn{
  border:1px solid rgba(0,0,0,.14);
  background:#ffffff;
  color:#163130; padding:10px 14px; border-radius:12px;
  font-weight:800; cursor:pointer;
  transition: transform .1s ease, filter .15s ease, box-shadow .15s ease;
}
.btn:hover{ transform: translateY(-1px); filter:saturate(106%); box-shadow:0 6px 16px rgba(0,0,0,.08); }

/* Primary */
.pri{
  background: linear-gradient(180deg,#9bf0cb 0%,#59d6aa 90%);
  color:#0b2a23; border:none;
  box-shadow:0 10px 24px rgba(18,185,134,.28);
}
.ghost2{
  background: #ffffff;
  border-color: rgba(0,0,0,.18);
  color:#2a4947;
}
</style>
