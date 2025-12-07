<!-- src/components/UserLevels.vue -->
<script setup lang="ts">
import { onMounted, onBeforeUnmount, reactive, ref, computed, watch, defineExpose } from 'vue'
import { supabase } from '@/lib/supabase'
import { useUserStore } from '@/stores/users'

/* Sounds (adjust paths as needed) */
import s_tick from '@/assets/sounds/Type_Click.ogg'                    // tick while number counts
import s_fill from '@/assets/sounds/arcade_beep_01.mp3'                // sustained while bars fill (we pitch it)
import s_levelup_main from '@/assets/sounds/level-up-glisando.mp3'     // main level up
import s_skillup from '@/assets/sounds/level-ding.mp3'                 // skill level up
import s_complete from '@/assets/sounds/Wood_Block.ogg'                // number finished

type SkillKey = 'reading' | 'writing' | 'listening'
type Inc = { reading: number; writing: number; listening: number; other: number }

/* ---------------- Props ---------------- */
const props = withDefaults(defineProps<{
  overlay?: boolean,
  showDevTools?: boolean,
  userId?: string | null,
}>(), {
  overlay: false,
  showDevTools: false,
  userId: null,
})

const userStore = useUserStore()

/* Resolve the *target* user this component operates on */
const targetUserId = computed<string | null>(() => {
  if (props.userId) return props.userId
  return userStore?.profile?.id ?? null
})

/* ---------------- Timing ---------------- */
const DUR = {
  numMin: 500,
  numPerXp: 7,
  numCap: 2200,

  barMin: 400,
  barPerXp: 6,
  barCap: 1800,

  tweenToServer: 700,
  levelPause: 500,
  beatShort: 280,
  bounce: 700,
}

/* ---------------- Sounds ---------------- */
const sfx = {
  tick: new Audio(s_tick),
  fill: new Audio(s_fill),
  levelupMain: new Audio(s_levelup_main),
  skillup: new Audio(s_skillup),
  complete: new Audio(s_complete),
}
sfx.tick.volume = 0.7
sfx.fill.volume = 0.35
sfx.levelupMain.volume = 0.7
sfx.skillup.volume = 0.65
sfx.complete.volume = 0.6

/* tick controller (rate ≠ frame rate) */
let tickTimer: number | null = null
function startTick(rateMs = 55) {
  if (tickTimer != null) return
  tickTimer = window.setInterval(() => {
    try { sfx.tick.currentTime = 0; sfx.tick.play() } catch { }
  }, rateMs)
}
function stopTick() {
  if (tickTimer != null) { clearInterval(tickTimer); tickTimer = null }
}

/* fill sustain controller (pitch up over time) */
let fillTimer: number | null = null
let fillPitchT0 = 0
function startFillSustain() {
  if (fillTimer != null) return
  fillPitchT0 = performance.now()
  sfx.fill.loop = false
  fillTimer = window.setInterval(() => {
    const t = Math.min(1, (performance.now() - fillPitchT0) / 1500) // 1.5s to max pitch
    const rate = 1 + t * 0.6
    try { sfx.fill.playbackRate = rate; sfx.fill.currentTime = 0; sfx.fill.play() } catch { }
  }, 90)
}
function stopFillSustain() {
  if (fillTimer != null) { clearInterval(fillTimer); fillTimer = null }
}

/* ---------------- Visibility / overlay control ---------------- */
const visible = ref<boolean>(!props.overlay)
const busy = ref(false)
const loading = ref(true)
const refreshHint = ref<string>('')

function open() {
  if (!props.overlay) return
  visible.value = true
  document.documentElement.style.overflow = 'hidden'
}
function close() {
  if (!props.overlay) return
  visible.value = false
  document.documentElement.style.overflow = ''
}

function handleJustOpen() { if (props.overlay) open() }
function onKeydown(e: KeyboardEvent) {
  if (!props.overlay || !visible.value) return
  if (e.key === 'Escape') { e.preventDefault(); close() }
}
onMounted(() => {
  window.addEventListener('user-levels:show', handleJustOpen)
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  window.removeEventListener('user-levels:show', handleJustOpen)
  window.removeEventListener('keydown', onKeydown)
  stopTick()
  stopFillSustain()
})

/* ---------------- State ---------------- */
const isGuest = computed(() => !targetUserId.value)

const level = ref<number>(1)
const levelReading = ref<number>(1)
const levelWriting = ref<number>(1)
const levelListening = ref<number>(1)

const vPctProgress = ref<number>(0)
const vPctReading = ref<number>(0)
const vPctWriting = ref<number>(0)
const vPctListening = ref<number>(0)

const abs = reactive({ total: 0, reading: 0, writing: 0, listening: 0, other: 0 })

const bounds = reactive({
  levelMin: 0, levelNext: 1,
  readingMin: 0, readingNext: 1,
  writingMin: 0, writingNext: 1,
  listeningMin: 0, listeningNext: 1,
})

/* Guest-mode constants & helpers */
const GUEST_PER_LEVEL = 200
function guestBandForLevel(lvl: number) {
  const min = Math.max(0, (lvl - 1) * GUEST_PER_LEVEL)
  return { min, next: min + GUEST_PER_LEVEL }
}
function guestPctFromAbs(absVal: number, lvl: number) {
  const band = guestBandForLevel(lvl)
  return pctFor(absVal, band)
}

/* Track chip animation keys (force slide out/in via key change) */
const chipKey = reactive({ reading: 0, writing: 0, listening: 0 })

/* Pulse main level text when it changes — gated by suppression flag */
const mainLevelPulse = ref(false)
const suppressLevelPulse = ref(false)
watch(level, async () => {
  if (suppressLevelPulse.value) return
  mainLevelPulse.value = false
  await Promise.resolve() // next microtask
  mainLevelPulse.value = true
  setTimeout(() => { mainLevelPulse.value = false }, DUR.levelPause + 200)
})

/* ---------------- Big XP number (center) ---------------- */
const xpNum = reactive({
  visible: false,
  value: 0,
  target: 0,
  color: 'var(--accent-primary)' as string, // tokenized default
  bouncing: false,
})

/* Easing / utils */
function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3) }
function easeInOutCubic(t: number) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 }
function clamp01(v: number) { return Math.max(0, Math.min(1, v)) }
const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

/* tween a numeric ref 0..100 */
function animatePct(refVal: { value: number }, from: number, to: number, duration: number, withFill = true) {
  const t0 = performance.now()
  if (withFill) startFillSustain()
  return new Promise<void>((resolve) => {
    const loop = () => {
      const p = Math.max(0, Math.min(1, (performance.now() - t0) / duration))
      const e = easeInOutCubic(p)
      refVal.value = from + (to - from) * e
      if (p < 1) requestAnimationFrame(loop)
      else { refVal.value = to; if (withFill) stopFillSustain(); resolve() }
    }
    requestAnimationFrame(loop)
  })
}

/* animate the center number (ticks + complete at the end) */
async function animateNumber(amount: number, color: string) {
  if (amount <= 0) return
  const duration = Math.min(DUR.numCap, Math.max(DUR.numMin, amount * DUR.numPerXp))

  xpNum.visible = true
  xpNum.value = 0
  xpNum.target = amount
  xpNum.color = color
  xpNum.bouncing = false

  startTick()
  const t0 = performance.now()
  await new Promise<void>((resolve) => {
    const loop = () => {
      const p = Math.max(0, Math.min(1, (performance.now() - t0) / duration))
      const e = easeOutCubic(p)
      xpNum.value = Math.floor(amount * e)
      if (p < 1) requestAnimationFrame(loop)
      else resolve()
    }
    requestAnimationFrame(loop)
  })
  stopTick()
  try { sfx.complete.currentTime = 0; sfx.complete.play() } catch { }
  xpNum.bouncing = true
  await wait(DUR.bounce)
  xpNum.bouncing = false
  xpNum.visible = false
}

/* ---------------- Data I/O ---------------- */
type ProgressRow = {
  user_id: string
  xp_total: number | null
  level: number | null
  level_min_xp: number | null
  next_level_min_xp: number | null
  pct_progress: number | null
  reading_level: number | null
  writing_level: number | null
  listening_level: number | null
  reading_pct: number | null
  writing_pct: number | null
  listening_pct: number | null
  reading_min_xp?: number | null
  reading_next_min_xp?: number | null
  writing_min_xp?: number | null
  writing_next_min_xp?: number | null
  listening_min_xp?: number | null
  listening_next_min_xp?: number | null
}

/** Return the target user id; null if none (guest preview). */
async function resolveTarget(): Promise<string | null> {
  if (targetUserId.value) return targetUserId.value
  const { data } = await supabase.auth.getUser()
  return data?.user?.id ?? null
}

// helper used when adjusting another user vs self
async function getViewerId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id ?? null
}

async function loadCurrent(opts?: { skipMainRing?: boolean, noMainLevelUpdate?: boolean }) {
  const uid = await resolveTarget()
  if (!uid) {
    // guest: keep simple default values; UI will show login message instead
    if (!opts?.noMainLevelUpdate) level.value = 1
    levelReading.value = 1
    levelWriting.value = 1
    levelListening.value = 1

    if (!opts?.skipMainRing) {
      vPctProgress.value = guestPctFromAbs(abs.total, level.value)
    }
    vPctReading.value = guestPctFromAbs(abs.reading, levelReading.value)
    vPctWriting.value = guestPctFromAbs(abs.writing, levelWriting.value)
    vPctListening.value = guestPctFromAbs(abs.listening, levelListening.value)

    const m = guestBandForLevel(level.value)
    bounds.levelMin = m.min; bounds.levelNext = m.next
    const rB = guestBandForLevel(levelReading.value)
    bounds.readingMin = rB.min; bounds.readingNext = rB.next
    const wB = guestBandForLevel(levelWriting.value)
    bounds.writingMin = wB.min; bounds.writingNext = wB.next
    const lB = guestBandForLevel(levelListening.value)
    bounds.listeningMin = lB.min; bounds.listeningNext = lB.next
    return
  }

  const { data: vp } = await supabase
    .from('v_profile_progress')
    .select(`
      user_id, xp_total, level, level_min_xp, next_level_min_xp, pct_progress,
      reading_level, writing_level, listening_level,
      reading_pct, writing_pct, listening_pct,
      reading_min_xp, reading_next_min_xp,
      writing_min_xp, writing_next_min_xp,
      listening_min_xp, listening_next_min_xp
    `)
    .eq('user_id', uid)
    .maybeSingle<ProgressRow>()

  const { data: ux } = await supabase
    .from('user_xp_total')
    .select('reading_xp, writing_xp, listening_xp, other_xp, xp_total')
    .eq('user_id', uid)
    .maybeSingle()

  if (!opts?.noMainLevelUpdate) {
    level.value = Number(vp?.level ?? 1)
  }
  levelReading.value = Number(vp?.reading_level ?? 1)
  levelWriting.value = Number(vp?.writing_level ?? 1)
  levelListening.value = Number(vp?.listening_level ?? 1)

  bounds.levelMin = Number(vp?.level_min_xp ?? 0)
  bounds.levelNext = Number(vp?.next_level_min_xp ?? (bounds.levelMin + 1))
  bounds.readingMin = Number(vp?.reading_min_xp ?? 0)
  bounds.readingNext = Number(vp?.reading_next_min_xp ?? (bounds.readingMin + 1))
  bounds.writingMin = Number(vp?.writing_min_xp ?? 0)
  bounds.writingNext = Number(vp?.writing_next_min_xp ?? (bounds.writingMin + 1))
  bounds.listeningMin = Number(vp?.listening_min_xp ?? 0)
  bounds.listeningNext = Number(vp?.listening_next_min_xp ?? (bounds.listeningMin + 1))

  abs.total = Number(ux?.xp_total ?? 0)
  abs.reading = Number(ux?.reading_xp ?? 0)
  abs.writing = Number(ux?.writing_xp ?? 0)
  abs.listening = Number(ux?.listening_xp ?? 0)
  abs.other = Number(ux?.other_xp ?? 0)

  if (!opts?.skipMainRing) {
    vPctProgress.value = clamp01(Number(vp?.pct_progress ?? 0)) * 100
  }
  vPctReading.value = clamp01(Number(vp?.reading_pct ?? 0)) * 100
  vPctWriting.value = clamp01(Number(vp?.writing_pct ?? 0)) * 100
  vPctListening.value = clamp01(Number(vp?.listening_pct ?? 0)) * 100
}

/* Write deltas — guest: local only; logged-in: DB for the target user */
async function applyXpToDb(inc: Inc) {
  const target = await resolveTarget()
  if (!target) {
    abs.reading = Math.max(0, abs.reading + Math.max(0, inc.reading || 0))
    abs.writing = Math.max(0, abs.writing + Math.max(0, inc.writing || 0))
    abs.listening = Math.max(0, abs.listening + Math.max(0, inc.listening || 0))
    abs.other = Math.max(0, abs.other + Math.max(0, inc.other || 0))
    abs.total = Math.max(0, abs.reading + abs.writing + abs.listening + abs.other)
    return
  }

  const viewer = await getViewerId()
  const isSelf = viewer && viewer === target

  const dR = Math.max(0, inc.reading || 0)
  const dW = Math.max(0, inc.writing || 0)
  const dL = Math.max(0, inc.listening || 0)
  const dO = Math.max(0, inc.other || 0)

  if (isSelf) {
    const { data: cur } = await supabase
      .from('user_xp_total')
      .select('reading_xp, writing_xp, listening_xp, other_xp, xp_total')
      .eq('user_id', target)
      .maybeSingle()

    if (cur) {
      const nextVals = {
        reading_xp: Math.max(0, Number(cur.reading_xp || 0) + dR),
        writing_xp: Math.max(0, Number(cur.writing_xp || 0) + dW),
        listening_xp: Math.max(0, Number(cur.listening_xp || 0) + dL),
        other_xp: Math.max(0, Number(cur.other_xp || 0) + dO),
      }
      const { data: upd } = await supabase
        .from('user_xp_total')
        .update(nextVals)
        .eq('user_id', target)
        .select('reading_xp, writing_xp, listening_xp, other_xp, xp_total')
        .maybeSingle()
      abs.reading = Number(upd?.reading_xp ?? nextVals.reading_xp)
      abs.writing = Number(upd?.writing_xp ?? nextVals.writing_xp)
      abs.listening = Number(upd?.listening_xp ?? nextVals.listening_xp)
      abs.other = Number(upd?.other_xp ?? nextVals.other_xp)
      abs.total = Number(upd?.xp_total ?? (abs.reading + abs.writing + abs.listening + abs.other))
    } else {
      const name = userStore?.profile?.name || userStore?.profile?.display_name || 'User'
      const { data: ins } = await supabase
        .from('user_xp_total')
        .insert({ user_id: target, user_name: name, reading_xp: dR, writing_xp: dW, listening_xp: dL, other_xp: dO })
        .select('reading_xp, writing_xp, listening_xp, other_xp, xp_total')
        .maybeSingle()
      abs.reading = Number(ins?.reading_xp ?? dR)
      abs.writing = Number(ins?.writing_xp ?? dW)
      abs.listening = Number(ins?.listening_xp ?? dL)
      abs.other = Number(ins?.other_xp ?? dO)
      abs.total = Number(ins?.xp_total ?? (abs.reading + abs.writing + abs.listening + abs.other))
    }
    return
  }

  // ----- Editing ANOTHER USER: use RPCs -----
  if (dR > 0) { await supabase.rpc('dev_adjust_skill_xp', { target_user: target, skill: 'reading', delta: dR }) }
  if (dW > 0) { await supabase.rpc('dev_adjust_skill_xp', { target_user: target, skill: 'writing', delta: dW }) }
  if (dL > 0) { await supabase.rpc('dev_adjust_skill_xp', { target_user: target, skill: 'listening', delta: dL }) }
  if (dO > 0) { await supabase.rpc('dev_adjust_other_xp', { user_id: target, delta: dO }) }

  const { data: ux } = await supabase
    .from('user_xp_total')
    .select('reading_xp, writing_xp, listening_xp, other_xp, xp_total')
    .eq('user_id', target)
    .maybeSingle()
  abs.reading = Number(ux?.reading_xp ?? 0)
  abs.writing = Number(ux?.writing_xp ?? 0)
  abs.listening = Number(ux?.listening_xp ?? 0)
  abs.other = Number(ux?.other_xp ?? 0)
  abs.total = Number(ux?.xp_total ?? abs.reading + abs.writing + abs.listening + abs.other)
}


/* -------------- Bands & helpers -------------- */
type Band = { min: number; next: number }
function pctFor(absV: number, band: Band) {
  const f = (absV - band.min) / Math.max(1, band.next - band.min)
  return clamp01(f) * 100
}

async function fetchBandBounds(which: 'main' | SkillKey): Promise<Band | null> {
  const uid = await resolveTarget()
  if (!uid) {
    if (which === 'main') return guestBandForLevel(level.value)
    if (which === 'reading') return guestBandForLevel(levelReading.value)
    if (which === 'writing') return guestBandForLevel(levelWriting.value)
    return guestBandForLevel(levelListening.value)
  }

  if (which === 'main') {
    const { data } = await supabase
      .from('v_profile_progress')
      .select('level_min_xp,next_level_min_xp')
      .eq('user_id', uid).maybeSingle()
    return data ? { min: Number(data.level_min_xp ?? 0), next: Number(data.next_level_min_xp ?? 1) } : null
  } else if (which === 'reading') {
    const { data } = await supabase
      .from('v_profile_progress')
      .select('reading_min_xp,reading_next_min_xp')
      .eq('user_id', uid).maybeSingle()
    return data ? { min: Number(data.reading_min_xp ?? 0), next: Number(data.reading_next_min_xp ?? 1) } : null
  } else if (which === 'writing') {
    const { data } = await supabase
      .from('v_profile_progress')
      .select('writing_min_xp,writing_next_min_xp')
      .eq('user_id', uid).maybeSingle()
    return data ? { min: Number(data.writing_min_xp ?? 0), next: Number(data.writing_next_min_xp ?? 1) } : null
  } else {
    const { data } = await supabase
      .from('v_profile_progress')
      .select('listening_min_xp,listening_next_min_xp')
      .eq('user_id', uid).maybeSingle()
    return data ? { min: Number(data.listening_min_xp ?? 0), next: Number(data.listening_next_min_xp ?? 1) } : null
  }
}

/* Skill bands from the table (fresh) */
async function fetchSkillBandFromTable(skill: SkillKey, lvl: number): Promise<Band> {
  const uid = await resolveTarget()
  if (!uid) {
    return guestBandForLevel(lvl)
  }

  const { data } = await supabase
    .from('skill_levels')
    .select('level,min_xp')
    .eq('skill', skill)
    .in('level', [lvl, lvl + 1])
    .order('level', { ascending: true })
  if (!data?.length) {
    const b = await fetchBandBounds(skill)
    return b ?? { min: 0, next: 1 }
  }
  const cur = data.find(d => d.level === lvl)
  const nxt = data.find(d => d.level === lvl + 1)
  const min = Number(cur?.min_xp ?? 0)
  const next = Number(nxt?.min_xp ?? (min + 1))
  return { min, next }
}

/* ---------------- Skill animation (visual + DB) ---------------- */
async function animateSkillGain(key: SkillKey, amount: number) {
  if (amount <= 0) return

  const uid = await resolveTarget()
  if (uid) {
    await loadCurrent({ skipMainRing: true, noMainLevelUpdate: true })
  }

  const lvlRef = key === 'reading' ? levelReading : key === 'writing' ? levelWriting : levelListening
  const pctRef = key === 'reading' ? vPctReading : key === 'writing' ? vPctWriting : vPctListening
  const absStart = key === 'reading' ? abs.reading : key === 'writing' ? abs.writing : abs.listening
  let absNow = absStart
  const absTarget = absStart + amount

  let band = await fetchSkillBandFromTable(key, lvlRef.value)

  pctRef.value = pctFor(absNow, band)

  const EPS = 1e-6
  let safety = 0
  while (absNow < absTarget - EPS) {
    if (++safety > 5000) { console.warn('[skill tween] safety break'); break }

    const edge = band.next
    const toEdge = Math.max(0, edge - absNow)
    const remaining = absTarget - absNow
    const slice = Math.min(toEdge, remaining)

    await applyXpToDb({
      reading: key === 'reading' ? slice : 0,
      writing: key === 'writing' ? slice : 0,
      listening: key === 'listening' ? slice : 0,
      other: 0,
    })
    absNow += slice

    const fromPct = pctRef.value
    const toPct = pctFor(absNow, band)
    const dur = Math.min(DUR.barCap, Math.max(DUR.barMin, slice * DUR.barPerXp))
    await animatePct(pctRef, fromPct, toPct, dur, true)

    if (Math.abs(absNow - edge) < EPS) {
      try { sfx.skillup.currentTime = 0; sfx.skillup.play() } catch { }
      if (key === 'reading') chipKey.reading++
      if (key === 'writing') chipKey.writing++
      if (key === 'listening') chipKey.listening++
      lvlRef.value = lvlRef.value + 1

      await wait(DUR.levelPause)
      if (uid) {
        await loadCurrent({ skipMainRing: true, noMainLevelUpdate: true })
      }

      band = await fetchSkillBandFromTable(key, lvlRef.value)
      pctRef.value = pctFor(absNow, band)
      await wait(DUR.beatShort)
    }
  }
}

/* ---------------- Main ring animation from consolidated gain ---------------- */
function durFromPctDistance(distPct: number) {
  const approxAbs = distPct
  return Math.min(DUR.barCap, Math.max(DUR.barMin, approxAbs * DUR.barPerXp))
}

async function animateMainRingFromAfterSkills(startLevel: number, startPct: number, finalLevel: number, finalPct: number) {
  vPctProgress.value = startPct
  suppressLevelPulse.value = true

  const levelsCrossed = Math.max(0, finalLevel - startLevel)

  if (levelsCrossed === 0) {
    const dur = durFromPctDistance(Math.abs(finalPct - startPct))
    await animatePct(vPctProgress, startPct, finalPct, dur, true)
    suppressLevelPulse.value = false
    return
  }

  let currentPct = startPct
  for (let i = 0; i < levelsCrossed; i++) {
    const durEdge = durFromPctDistance(100 - currentPct)
    await animatePct(vPctProgress, currentPct, 100, durEdge, true)
    vPctProgress.value = 100
    await wait(140)

    try { sfx.levelupMain.currentTime = 0; void sfx.levelupMain.play() } catch { }
    try { window.dispatchEvent(new CustomEvent('confetti:burst', { detail: { power: 'levelup' } })) } catch { }

    const nextDisplayed = (level.value || 1) + 1
    level.value = nextDisplayed
    mainLevelPulse.value = false
    await Promise.resolve()
    mainLevelPulse.value = true
    setTimeout(() => { mainLevelPulse.value = false }, DUR.levelPause + 200)

    await wait(DUR.levelPause)
    vPctProgress.value = 0
    currentPct = 0
    await wait(DUR.beatShort)
  }

  const durFinal = durFromPctDistance(finalPct)
  await animatePct(vPctProgress, 0, finalPct, durFinal, true)

  level.value = finalLevel
  suppressLevelPulse.value = false
}

/* ---------------- Main ring animation (compute final state & call driver) ---------------- */
async function animateMainRingToCurrent() {
  const uid = await resolveTarget()

  if (!uid) {
    const total = abs.total
    const finalLevel = Math.floor(total / GUEST_PER_LEVEL) + 1
    const band = guestBandForLevel(finalLevel)
    const finalPct = pctFor(total, band) // 0..100
    const startLevel = level.value
    const startPct = vPctProgress.value
    await animateMainRingFromAfterSkills(startLevel, startPct, finalLevel, finalPct)
    return
  }

  const { data: vp } = await supabase
    .from('v_profile_progress')
    .select('level, level_min_xp, next_level_min_xp, pct_progress')
    .eq('user_id', uid as string)
    .maybeSingle()

  const finalLevel = Number(vp?.level ?? level.value)
  const finalPct = clamp01(Number(vp?.pct_progress ?? 0)) * 100

  const startLevel = level.value
  const startPct = vPctProgress.value

  await animateMainRingFromAfterSkills(startLevel, startPct, finalLevel, finalPct)
}

/* ---------------- Orchestrator ---------------- */
async function grantSkillXpFlow(key: SkillKey, amount: number) {
  if (amount <= 0) return

  const startLevel = level.value
  const startRingPct = vPctProgress.value

  // Tokenized XP number color
  const color =
    key === 'reading'   ? 'var(--level-reading)'   :
    key === 'writing'   ? 'var(--accent-success)'  :
    /* listening */        'var(--level-listening)'

  await animateNumber(amount, color)

  suppressLevelPulse.value = true
  await animateSkillGain(key, amount)

  const uid = await resolveTarget()
  if (uid) {
    await loadCurrent({ skipMainRing: true, noMainLevelUpdate: true })
  } else {
    vPctProgress.value = guestPctFromAbs(abs.total, level.value)
  }

  if (uid) {
    const { data: vp } = await supabase
      .from('v_profile_progress')
      .select('level, pct_progress')
      .eq('user_id', uid as string)
      .maybeSingle()
    const dbFinalLevel = Number(vp?.level ?? startLevel)
    const dbFinalPct = clamp01(Number(vp?.pct_progress ?? 0)) * 100
    await animateMainRingFromAfterSkills(startLevel, startRingPct, dbFinalLevel, dbFinalPct)
  } else {
    const finalLevel = Math.floor(abs.total / GUEST_PER_LEVEL) + 1
    const finalPct = pctFor(abs.total, guestBandForLevel(finalLevel))
    await animateMainRingFromAfterSkills(startLevel, startRingPct, finalLevel, finalPct)
  }

  suppressLevelPulse.value = false
}

async function grantBonusXpFlow(amount: number) {
  if (amount <= 0) return

  const startLevel = level.value
  const startRingPct = vPctProgress.value

  // Bonus XP number uses primary accent
  await animateNumber(amount, 'var(--accent-primary)')

  suppressLevelPulse.value = true
  await applyXpToDb({ reading: 0, writing: 0, listening: 0, other: amount })

  const uid = await resolveTarget()
  if (uid) {
    await loadCurrent({ skipMainRing: true, noMainLevelUpdate: true })
    const { data: vp } = await supabase
      .from('v_profile_progress')
      .select('level, pct_progress')
      .eq('user_id', uid as string)
      .maybeSingle()
    const dbFinalLevel = Number(vp?.level ?? startLevel)
    const dbFinalPct = clamp01(Number(vp?.pct_progress ?? 0)) * 100
    await animateMainRingFromAfterSkills(startLevel, startRingPct, dbFinalLevel, dbFinalPct)
  } else {
    const finalLevel = Math.floor(abs.total / GUEST_PER_LEVEL) + 1
    const finalPct = pctFor(abs.total, guestBandForLevel(finalLevel))
    await animateMainRingFromAfterSkills(startLevel, startRingPct, finalLevel, finalPct)
  }

  suppressLevelPulse.value = false
}

/* ---------------- Queue ---------------- */
const queue: Array<() => Promise<void>> = []
let processing = false
async function enqueue(fn: () => Promise<void>) {
  queue.push(fn)
  if (processing) return
  processing = true
  busy.value = true
  try {
    while (queue.length) {
      const job = queue.shift()!
      await job()
    }
  } finally {
    processing = false
    busy.value = false
  }
}

/* ---------------- Public API ---------------- */
async function addReadingXp(amount: number) { await enqueue(() => grantSkillXpFlow('reading', amount)) }
async function addWritingXp(amount: number) { await enqueue(() => grantSkillXpFlow('writing', amount)) }
async function addListeningXp(amount: number) { await enqueue(() => grantSkillXpFlow('listening', amount)) }
async function addBonusXp(amount: number) { await enqueue(() => grantBonusXpFlow(amount)) }

/* ---- Manual hard refresh from DB ---- */
async function refreshFromDb() {
  if (busy.value) return
  loading.value = true
  const from = { prog: vPctProgress.value, r: vPctReading.value, w: vPctWriting.value, l: vPctListening.value }
  try {
    await loadCurrent({ skipMainRing: true })
    await tween(from, { prog: vPctProgress.value, r: vPctReading.value, w: vPctWriting.value, l: vPctListening.value })
    refreshHint.value = 'Refreshed'
    setTimeout(() => { refreshHint.value = '' }, 1500)
  } catch (e) {
    console.error('[UserLevels] refreshFromDb error:', e)
    refreshHint.value = 'Refresh failed'
    setTimeout(() => { refreshHint.value = '' }, 2000)
  } finally {
    loading.value = false
  }
}

/* Tween helper to smoothly sync bars to DB when needed */
function tween(from: { prog: number, r: number, w: number, l: number }, to: { prog: number, r: number, w: number, l: number }) {
  const t0 = performance.now()
  const dur = DUR.tweenToServer
  return new Promise<void>((resolve) => {
    const loop = () => {
      const p = Math.max(0, Math.min(1, (performance.now() - t0) / dur))
      const e = easeInOutCubic(p)
      vPctProgress.value = from.prog + (to.prog - from.prog) * e
      vPctReading.value = from.r + (to.r - from.r) * e
      vPctWriting.value = from.w + (to.w - from.w) * e
      vPctListening.value = from.l + (to.l - from.l) * e
      if (p < 1) requestAnimationFrame(loop)
      else { vPctProgress.value = to.prog; vPctReading.value = to.r; vPctWriting.value = to.w; vPctListening.value = to.l; resolve() }
    }
    requestAnimationFrame(loop)
  })
}

/* ---------------- Dev input controls ---------------- */
const dev = reactive({ r: 100, w: 60, l: 40, b: 25 })
async function addSequential() {
  const jobs: Array<() => Promise<void>> = []
  if (dev.r > 0) jobs.push(() => addReadingXp(dev.r))
  if (dev.w > 0) jobs.push(() => addWritingXp(dev.w))
  if (dev.l > 0) jobs.push(() => addListeningXp(dev.l))
  if (dev.b > 0) jobs.push(() => addBonusXp(dev.b))
  for (const j of jobs) { await j() }
}

/* ---------------- Mount & reactive updates ---------------- */
onMounted(async () => {
  loading.value = true
  await loadCurrent()
  loading.value = false
})

/* Reload when the target user changes (e.g., dev opens a different profile) */
watch(targetUserId, async () => {
  loading.value = true
  vPctProgress.value = 0
  vPctReading.value = 0
  vPctWriting.value = 0
  vPctListening.value = 0
  await loadCurrent()
  loading.value = false
})

/* ---------------- Expose ---------------- */
defineExpose({
  open, close,
  addReadingXp, addWritingXp, addListeningXp, addBonusXp, refreshFromDb
})
</script>

<template>
  <transition name="ul-fade-zoom">
    <div
      v-if="(props.overlay ? visible : true)"
      :class="['ul-root', props.overlay ? 'is-overlay' : 'is-embedded']"
      role="region"
      aria-label="User Levels"
    >
      <div v-if="props.overlay" class="ul-backdrop" @click="close" />

      <div class="ul-panel">
        <button
          v-if="props.overlay"
          class="close-x"
          type="button"
          aria-label="Close"
          title="Close"
          @click="close"
        >
          ×
        </button>

        <section class="body">
          <!-- Loading -->
          <template v-if="loading">
            <div class="loading">Loading current progress…</div>
          </template>

          <!-- Guest / not logged in -->
          <template v-else-if="isGuest">
            <div class="guest-msg">
              Please log in or sign up to track levels and progress.
            </div>
          </template>

          <!-- Normal levels UI -->
          <template v-else>
            <!-- Main level circle -->
            <div class="level-wrap">
              <div class="level-circle">
                <svg viewBox="0 0 120 120">
                  <defs>
                    <!-- Gradient driven by theme tokens (rainbow-ish but tokenized) -->
                    <linearGradient id="ringRainbow" x1="0%" y1="0%" x2="100%">
                      <stop offset="0%"   style="stop-color: var(--level-reading)" />
                      <stop offset="33%"  style="stop-color: var(--accent-warning)" />
                      <stop offset="66%"  style="stop-color: var(--accent-success)" />
                      <stop offset="100%" style="stop-color: var(--level-listening)" />
                    </linearGradient>
                  </defs>
                  <circle cx="60" cy="60" r="50" class="trk" />
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    class="prg"
                    :style="{
                      strokeDasharray: 2 * Math.PI * 50 + ' ' + 2 * Math.PI * 50,
                      strokeDashoffset: (2 * Math.PI * 50) * (1 - vPctProgress / 100)
                    }"
                    :stroke="'url(#ringRainbow)'"
                  />
                  <text
                    x="60"
                    y="60"
                    class="lvl"
                    :class="{ 'lvl-pulse': mainLevelPulse }"
                    dominant-baseline="middle"
                    text-anchor="middle"
                  >
                    Lv {{ level }}
                  </text>
                </svg>
              </div>
            </div>

            <!-- Skill bars with animated chips -->
            <div class="bars">
              <div class="bar">
                <div class="label">
                  Reading
                  <span class="lvlchip chip-red">
                    <transition name="chip-slide" mode="out-in">
                      <span :key="chipKey.reading">Lv {{ levelReading }}</span>
                    </transition>
                  </span>
                </div>
                <div class="track">
                  <div class="fill reading" :style="{ width: vPctReading + '%' }" />
                </div>
              </div>

              <div class="bar">
                <div class="label">
                  Writing
                  <span class="lvlchip chip-green">
                    <transition name="chip-slide" mode="out-in">
                      <span :key="chipKey.writing">Lv {{ levelWriting }}</span>
                    </transition>
                  </span>
                </div>
                <div class="track">
                  <div class="fill writing" :style="{ width: vPctWriting + '%' }" />
                </div>
              </div>

              <div class="bar">
                <div class="label">
                  Listening
                  <span class="lvlchip chip-blue">
                    <transition name="chip-slide" mode="out-in">
                      <span :key="chipKey.listening">Lv {{ levelListening }}</span>
                    </transition>
                  </span>
                </div>
                <div class="track">
                  <div class="fill listening" :style="{ width: vPctListening + '%' }" />
                </div>
              </div>
            </div>
          </template>
        </section>

        <!-- Centered XP number overlay (no extra top spacing) -->
        <div class="xp-holder" aria-live="polite">
          <transition name="xpnum">
            <div
              v-if="xpNum.visible"
              class="xp-big"
              :class="{ bounce: xpNum.bouncing }"
              :style="{ color: xpNum.color }"
            >
              +{{ xpNum.value }} XP
            </div>
          </transition>
        </div>

        <!-- DEV -->
        <section v-if="showDevTools" class="dev-toolbar">
          <div class="dev-row">
            <label>Reading</label>
            <input class="nb" type="number" v-model.number="dev.r" min="0" />
            <label>Writing</label>
            <input class="nb" type="number" v-model.number="dev.w" min="0" />
            <label>Listening</label>
            <input class="nb" type="number" v-model.number="dev.l" min="0" />
            <label>Bonus</label>
            <input class="nb" type="number" v-model.number="dev.b" min="0" />
          </div>
          <div class="dev-row">
            <button class="btn" :disabled="busy" @click="addSequential()">Add XP (Sequential)</button>
            <button class="btn gray" :disabled="busy" @click="refreshFromDb()">Refresh (DB)</button>
            <span class="hint">{{ refreshHint }}</span>
            <button v-if="props.overlay" class="btn danger" @click="close">Close</button>
          </div>
        </section>
      </div>
    </div>
  </transition>
</template>

<style scoped>
/* =========================
   UserLevels.vue — responsive layout
   ========================= */
/* Root variants */
.ul-root.is-overlay {
  position: fixed;
  inset: 0;
  z-index: 9001;
  display: grid;
  place-items: center;
}

/* Embedded: respect container width */
.ul-root.is-embedded {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  max-width: 100%;
}

/* Backdrop uses modal overlay tokens */
.ul-backdrop {
  position: absolute;
  inset: 0;
  background: var(--modal-overlay-bg);
  backdrop-filter: var(--modal-overlay-filter);
}

/* Panel — now uses AppHeader border color */
.ul-panel {
  position: relative;
  border-radius: var(--modal-radius);
  border: 3px solid var(--header-border-color);
  background: linear-gradient(
    180deg,
    var(--modal-surface) 0%,
    color-mix(in srgb, var(--accent-primary) 30%, var(--modal-surface)) 60%,
    color-mix(in srgb, var(--accent-primary) 60%, var(--modal-surface)) 100%
  );
  box-shadow: var(--modal-shadow);
  padding: 18px;
  color: var(--modal-on-surface);
  box-sizing: border-box;
  max-height: 90vh;
  overflow: visible;

  /* container query target */
  container-type: inline-size;
  container-name: userlevels;
}

/* Width rules by mode */

/* Overlay: big modal centered on screen */
.ul-root.is-overlay .ul-panel {
  width: min(760px, 94vw);
  max-width: 94vw;
  margin-inline: auto;
}

/* Embedded: fill parent BUT cap at 600px and center */
.ul-root.is-embedded .ul-panel {
  width: 100%;
  max-width: 600px;      /* max size inside side panel */
  margin-inline: auto;
}

/* close button (uses modal close tokens) */
.close-x {
  position: absolute;
  top: -16px;
  right: -16px;
  z-index: 2;
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 9999px;
  border: 3px solid var(--modal-close-border);
  background: var(--modal-close-bg);
  color: var(--modal-close-on);
  font-size: 24px;
  font-weight: 900;
  line-height: 1;
  cursor: pointer;
  transition: transform 120ms ease, filter 120ms ease, opacity 120ms ease;
}
.close-x:hover { filter: brightness(1.05); transform: scale(1.04); }
.close-x:active { transform: scale(0.98); }
.close-x:focus-visible {
  outline: 3px dashed var(--modal-border);
  outline-offset: 3px;
}

/* overlay entrance */
.ul-fade-zoom-enter-from,
.ul-fade-zoom-leave-to { opacity: 0; }
.ul-fade-zoom-enter-active,
.ul-fade-zoom-leave-active { transition: opacity 180ms ease; }

.ul-root.is-overlay .ul-panel {
  transform: scale(.98) translateY(8px);
  animation: ul-pop 240ms cubic-bezier(.2, .9, .2, 1) forwards;
}
@keyframes ul-pop { to { transform: scale(1) translateY(0); } }

/* Centered XP number overlay (tokenized box + shadow) */
.xp-holder {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
  z-index: 3;
}
.xp-big {
  pointer-events: none;
  font-weight: 900;
  font-size: 38px;
  letter-spacing: .3px;
  text-shadow: 0 1px 0 var(--neutral-0);
  background: var(--modal-surface);
  color: var(--modal-on-surface);
  border: 3px solid var(--modal-border);
  border-radius: var(--radius-md);
  padding: 10px 16px;
  box-shadow: var(--elevation-2);
}
.xp-big.bounce { animation: xp-bounce 700ms ease-out both; }
@keyframes xp-bounce {
  0% { transform: scale(1) }
  35% { transform: scale(1.14) }
  100% { transform: scale(1) }
}

/* number transition */
.xpnum-enter-from { opacity: 0; transform: translateY(-6px) scale(.96); }
.xpnum-enter-active { transition: all 160ms ease-out; }
.xpnum-leave-to { opacity: 0; transform: translateY(-8px) scale(.94); }
.xpnum-leave-active { transition: all 200ms ease-in; }

/* ---------------- Layout ---------------- */

/* Two-column layout that collapses when narrow */
.body {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  gap: clamp(12px, 2vw, 20px);
  align-items: center;
  min-width: 0;
}

/* Guest login message */
.guest-msg {
  grid-column: 1 / -1;
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

/* Circle wrapper and sizing */
.level-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 0;
}

/* Main level circle: responsive size */
.level-circle {
  width: clamp(100px, 20vw, 220px);
  max-width: 100%;
  aspect-ratio: 1 / 1;
}

svg { width: 100%; height: 100%; }

/* Ring tokens */
.trk {
  fill: none;
  stroke: var(--level-ring-track);
  stroke-width: 14;
}
.prg {
  fill: none;
  stroke-linecap: round;
  stroke-width: 14;
  transform-origin: 60px 60px;
  transform: rotate(-90deg);
  transition: stroke-dashoffset 200ms ease;
}

/* Main level text + pulse — tokenized accents */
.lvl {
  font-size: 26px;
  font-weight: 900;
  fill: var(--modal-on-surface);
  paint-order: normal;
  stroke: none;
  transform-box: fill-box;
  transform-origin: center;
}
.lvl-pulse { animation: lvl-pulse-colors 800ms ease, lvl-grow 800ms ease; }
@keyframes lvl-grow {
  0% { transform: scale(1) }
  35% { transform: scale(1.35) }
  100% { transform: scale(1) }
}
@keyframes lvl-pulse-colors {
  0%   { fill: var(--modal-on-surface) }
  25%  { fill: var(--level-reading) }
  50%  { fill: var(--accent-warning) }
  75%  { fill: var(--accent-success) }
  100% { fill: var(--modal-on-surface) }
}

/* Bars */
.bars {
  display: grid;
  gap: 12px;
  min-width: 0; /* allow shrinking in tight containers */
}
.bar { display: grid; gap: 6px; }
.label {
  font-weight: 900;
  color: var(--modal-on-surface);
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Level chip (tokenized) */
.lvlchip {
  position: relative;
  overflow: hidden;
  min-width: 64px;
  display: inline-block;
  text-align: center;
  font-size: 12px;
  font-weight: 900;
  color: var(--modal-on-surface);
  background: var(--modal-surface);
  border: 2px solid var(--modal-border);
  border-radius: 999px;
  padding: 2px 8px;
}

/* chip color variants via theme accents */
.chip-red   { background: color-mix(in srgb, var(--level-reading) 18%,  var(--neutral-0) 82%);  border-color: var(--level-reading);   color: color-mix(in srgb, var(--level-reading) 60%,  #000 40%); }
.chip-green { background: color-mix(in srgb, var(--accent-success) 18%, var(--neutral-0) 82%);  border-color: var(--accent-success); color: color-mix(in srgb, var(--accent-success) 55%, #000 45%); }
.chip-blue  { background: color-mix(in srgb, var(--level-listening) 18%, var(--neutral-0) 82%); border-color: var(--level-listening); color: color-mix(in srgb, var(--level-listening) 55%, #000 45%); }

/* chip slide */
.chip-slide-enter-from { transform: translateX(100%); opacity: 0; }
.chip-slide-enter-active,
.chip-slide-leave-active { transition: transform 220ms ease, opacity 220ms ease; }
.chip-slide-enter-to { transform: translateX(0%); opacity: 1; }
.chip-slide-leave-from { transform: translateX(0%); opacity: 1; position: absolute; left: 8px; right: 8px; }
.chip-slide-leave-to { transform: translateX(-100%); opacity: 0; }

/* Progress tracks & fills — use level tokens */
.track {
  position: relative;
  height: 16px;
  border: 2px solid var(--modal-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--neutral-100) 70%, var(--modal-surface) 30%);
  overflow: hidden;
}
.fill {
  position: absolute;
  inset: 0 auto 0 0;
  width: 0%;
  transition: width 220ms ease;
  border-right: 2px solid color-mix(in srgb, var(--modal-on-surface) 46%, transparent);
}
.fill.reading   { background: var(--level-reading); }
.fill.writing   { background: var(--accent-success); }
.fill.listening { background: var(--level-listening); }

/* States */
.loading {
  text-align: center;
  padding: 20px 0;
  font-weight: 700;
  color: var(--modal-on-surface-muted);
}

/* Dev tools (tokenized) */
.dev-toolbar {
  position: sticky;
  bottom: 0;
  display: grid;
  gap: 10px;
  padding-top: 12px;
  margin-top: 16px;
  border-top: 2px dashed var(--modal-border);
  background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--neutral-100) 70%, var(--modal-surface) 30%));
}
.dev-row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }

.nb {
  width: 90px;
  border: 2px solid var(--modal-border);
  border-radius: var(--radius-sm);
  padding: 6px 8px;
  font-weight: 800;
  color: var(--modal-on-surface);
  background: var(--modal-surface);
}

.btn {
  appearance: none;
  cursor: pointer;
  font-weight: 900;
  border: 3px solid var(--btn-primary-border);
  border-radius: 999px;
  padding: 8px 14px;
  background: var(--btn-success-bg);
  color: var(--btn-success-on);
  box-shadow: var(--elevation-1);
  transition: transform 120ms ease, box-shadow 120ms ease, opacity 120ms ease;
}
.btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--elevation-2);
}
.btn.danger { background: color-mix(in srgb, var(--accent-danger) 28%, var(--neutral-0) 72%); color: var(--btn-danger-on); border-color: var(--btn-danger-border); }
.btn.gray   { background: color-mix(in srgb, var(--accent-primary) 24%, var(--neutral-0) 76%); color: var(--btn-primary-on); border-color: var(--btn-primary-border); }

.hint {
  font-size: 12px;
  color: var(--modal-on-surface-soft);
  min-width: 70px;
}

/* Spinner uses primary accent */
.spinner {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 3px solid var(--modal-border);
  border-top-color: var(--accent-primary);
  animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg) } }

/* ---------------- Responsive tweaks ---------------- */

/* Stack when the *panel* itself is narrow, not the whole screen */
@container userlevels (max-width: 480px) {
  .body {
    grid-template-columns: 1fr; /* circle on top, bars/message below */
  }

  .level-wrap {
    justify-content: center;
  }

  .level-circle {
    /* slightly smaller in tight spaces */
    width: clamp(120px, 70cqw, 180px);
  }

  .track {
    height: 14px;
  }

  .ul-panel {
    padding: 14px;
  }
}
</style>
