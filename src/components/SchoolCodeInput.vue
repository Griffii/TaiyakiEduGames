<!-- src/components/SchoolCodeInput.vue -->
<template>
    <teleport to="body">
        <div v-if="open" class="overlay" @click.self="close">
            <section class="panel" role="dialog" aria-modal="true" aria-label="Enter School Code">
                <!-- Header -->
                <header class="head">
                    <h2 class="title">Enter School Code</h2>
                    <button class="close-btn" @click="close" aria-label="Close">×</button>
                </header>

                <!-- Instructions -->
                <p class="hint">
                    Ask your teacher for the 6-digit school code.
                </p>

                <!-- Code input -->
                <form class="form" @submit.prevent="submit">
                    <label for="code" class="label">6-digit code</label>

                    <!-- Visual 6 boxes (still a single accessible input) -->
                    <div class="code-boxes" @click="focusRealInput">
                        <span v-for="i in 6" :key="i" class="box" :data-filled="digits[i - 1] ? 'y' : 'n'">
                            {{ digits[i - 1] ?? '' }}
                        </span>
                        <!-- Real input (screen-reader & keyboard focusable) -->
                        <input id="code" ref="realInput" class="real-input" inputmode="numeric"
                            autocomplete="one-time-code" aria-label="Six digit school code" :value="raw"
                            @input="onInput" @keydown="onKey" maxlength="6" pattern="[0-9]*" />
                    </div>

                    <div class="actions">
                        <button class="btn join-btn" type="submit" :disabled="busy || digits.length !== 6">
                            {{ busy ? 'Joining…' : 'Join School' }}
                        </button>

                    </div>

                    <p v-if="err" class="error" role="alert">{{ err }}</p>
                    <p v-if="okMsg" class="ok">{{ okMsg }}</p>
                </form>
            </section>
        </div>
    </teleport>
</template>

<script setup lang="ts">

import { ref, computed, defineProps, defineEmits, watch, onMounted, onBeforeUnmount } from 'vue'
import { supabase } from '@/lib/supabase'

type UUID = string

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
    (e: 'update:open', v: boolean): void
    (e: 'close'): void
    (e: 'joined', payload: { orgId: UUID; orgName?: string | null }): void
}>()

const raw = ref('')            // user-typed code (we'll pass as-is to RPC)
const busy = ref(false)
const err = ref<string | null>(null)
const okMsg = ref<string | null>(null)
const realInput = ref<HTMLInputElement | null>(null)

const digits = computed(() => raw.value.replace(/\D/g, '').slice(0, 6).split(''))

function onInput(e: Event) {
    const t = e.target as HTMLInputElement
    raw.value = (t.value || '').replace(/\D/g, '').slice(0, 6)
}

function onKey(e: KeyboardEvent) {
    if (e.key === 'Enter') {
        e.preventDefault()
        submit()
    }
}

function focusRealInput() { realInput.value?.focus() }

function resetState() {
    raw.value = ''
    busy.value = false
    err.value = null
    okMsg.value = null
}

function close() {
    emit('update:open', false)
    emit('close')
    setTimeout(resetState, 50)
}

async function submit() {
    err.value = null
    okMsg.value = null
    if (digits.value.length !== 6) {
        err.value = 'Please enter the 6-digit code.'
        return
    }
    busy.value = true
    try {
        // Ensure we have a logged-in user
        const { data: au } = await supabase.auth.getUser()
        const userId = au.user?.id as UUID | undefined
        if (!userId) throw new Error('You must be signed in.')

        // 1) Find org via RPC (server strips leading zeros, org_code is int4)
        const { data: rows, error: rpcErr } = await supabase.rpc('lookup_org_by_code', { p_code: raw.value })
        if (rpcErr) throw rpcErr
        const org = rows?.[0]
        if (!org) throw new Error('No school found for that code.')

        // 2) Check if already a member
        const { data: existing, error: existsErr } = await supabase
            .from('org_memberships')
            .select('org_id, user_id, role')
            .eq('org_id', org.id)
            .eq('user_id', userId)
            .limit(1)
        if (existsErr) throw existsErr

        if (existing && existing.length) {
            okMsg.value = 'You are already a member of this school.'
            emit('joined', { orgId: org.id, orgName: org.name ?? null })
            setTimeout(close, 650)
            return
        }

        // 3) Insert membership as 'student'
        const { error: insErr } = await supabase
            .from('org_memberships')
            .upsert(
                { org_id: org.id, user_id: userId, role: 'student' },
                { onConflict: 'org_id,user_id', ignoreDuplicates: true }
            )
        if (insErr) throw insErr

        okMsg.value = `Joined: ${org.name ?? 'School'}.`
        emit('joined', { orgId: org.id, orgName: org.name ?? null })
        setTimeout(close, 900)
    } catch (e: any) {
        // surface a concise message
        err.value = e?.message ?? 'Something went wrong.'
    } finally {
        busy.value = false
    }
}

/* Lifecycle: when opened, focus input & bind Escape */
function onEsc(e: KeyboardEvent) {
    if (e.key === 'Escape' && props.open && !busy.value) close()
}

watch(
    () => props.open,
    (o) => {
        if (o) {
            setTimeout(() => realInput.value?.focus(), 50)
            window.addEventListener('keydown', onEsc)
        } else {
            window.removeEventListener('keydown', onEsc)
        }
    },
    { immediate: true }
)

onMounted(() => { if (props.open) window.addEventListener('keydown', onEsc) })
onBeforeUnmount(() => window.removeEventListener('keydown', onEsc))
</script>


<style scoped>
/* Overlay reuses Profile overlay vibe */
.overlay {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    background: rgba(10, 12, 20, .52);
    z-index: 90;
}

/* Panel matches app card style */
.panel {
    position: relative;
    width: min(520px, 94vw);
    background: var(--profile-surface, #fff);
    color: var(--profile-text, #111);
    border: 2px solid var(--profile-border-strong, #1f2937);
    border-radius: 16px;
    box-shadow: var(--profile-shadow, 0 12px 50px rgba(0, 0, 0, .2));
    padding: 18px 16px 16px;
}

.head {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
}

.title {
    margin: 0;
    font-weight: 1000;
    font-size: 22px;
    color: var(--profile-text, #111);
}

.close-btn {
    margin-left: auto;
    width: 34px;
    height: 34px;
    padding: 0;
    border-radius: 50%;
    border: 2px solid #b80f38;
    background: linear-gradient(#ff3f66, #ff0f43);
    color: #fff;
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    transition: transform .12s ease, filter .12s ease;
    box-shadow: 0 2px 0 rgba(0, 0, 0, .15);
}

.close-btn:hover {
    transform: scale(1.08);
}

.hint {
    margin: 0 2px 12px;
    color: var(--profile-text-muted, #4b5563);
    font-weight: 800;
    font-size: 13px;
}

/* Form */
.form {
    display: grid;
    gap: 12px;
}

.label {
    font-weight: 900;
    font-size: 13px;
    color: var(--profile-text, #111);
}

/* Fancy code boxes with a hidden real input overlaid */
.code-boxes {
    position: relative;
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 8px;
    padding: 8px;
    border: 2px dashed var(--profile-border, #cbd5e1);
    border-radius: 14px;
    background: #fff;
    cursor: text;
}

.box {
    height: 56px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    border: 2px solid var(--profile-border-strong, #1f2937);
    font-weight: 1000;
    font-size: 22px;
    background: #ffffff;
    box-shadow: 0 2px 0 rgba(0, 0, 0, .06);
}

.box[data-filled="n"] {
    color: #9ca3af;
}

.real-input {
    position: absolute;
    inset: 0;
    opacity: 0.0001;
    /* keep accessible but invisible */
    width: 100%;
    height: 100%;
    border: 0;
    background: transparent;
    caret-color: transparent;
    /* caret hidden (we show boxes instead) */
}

/* Buttons (reuse app .btn look) */
.btn {
    height: 38px;
    padding: 0 16px;
    border-radius: 999px;
    border: 2px solid var(--profile-border-strong, #1f2937);
    background: #fff;
    color: var(--profile-text, #111);
    font-size: 14px;
    font-weight: 900;
    cursor: pointer;
    transition: transform .12s ease, box-shadow .12s ease;
    box-shadow: 0 2px 0 rgba(0, 0, 0, .08);
}

.btn:hover {
    transform: scale(1.05);
}

.btn:active {
    transform: scale(0.97);
}

.join-btn {
    background: #f0fff7;
    border-color: var(--accent-green, #10b981);
    color: #0f6a3a;
    margin: auto;
}

.cancel-btn {
    background: #fff;
    border-color: var(--profile-border-strong, #1f2937);
}

.actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
}

.error {
    color: #b91c1c;
    font-weight: 900;
    font-size: 13px;
}

.ok {
    color: #0f7b4e;
    font-weight: 900;
    font-size: 13px;
}

/* Responsive */
@media (max-width: 480px) {
    .box {
        height: 50px;
        font-size: 20px;
    }
}
</style>
