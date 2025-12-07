<template>
  <div class="clock-wrap">
    <svg
      ref="svgEl"
      :width="sizePx"
      :height="sizePx"
      :viewBox="`0 0 ${sizePx} ${sizePx}`"
      class="clock"
      @pointerdown="onPointerDown"
    >
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,.18)" />
        </filter>
      </defs>

      <circle :cx="r" :cy="r" :r="r-6" class="face" filter="url(#shadow)" />

      <!-- minute ticks -->
      <line
        v-for="i in 60"
        :key="i"
        :x1="tickXY(i-1, true).x"  :y1="tickXY(i-1, true).y"
        :x2="tickXY(i-1, false).x" :y2="tickXY(i-1, false).y"
        :class="(i-1)%5===0 ? 'tick major' : 'tick minor'"
      />

      <!-- numerals -->
      <text v-for="i in 12" :key="i"
        :x="numXY(i%12).x" :y="numXY(i%12).y"
        class="num" text-anchor="middle" dominant-baseline="central">
        {{ i===12 ? 12 : i }}
      </text>

      <!-- hands -->
      <g :transform="`rotate(${hAngle} ${r} ${r})`" class="hand hour">
        <line :x1="r" :y1="r" :x2="r" :y2="r-100" />
      </g>
      <g :transform="`rotate(${mAngle} ${r} ${r})`" class="hand minute">
        <line :x1="r" :y1="r" :x2="r" :y2="r-150" />
      </g>
      <circle :cx="r" :cy="r" r="6" class="pin" />
    </svg>

    <!-- Sliders (only if enabled) -->
    <div v-if="withSliders" class="sliders" :style="{ width: sizePx + 'px' }">
      <div class="slider-group">
        <div class="slider-head">
          <span class="slider-title">Hour</span>
        </div>
        <input
          type="range"
          min="0" max="360" step="30"
          v-model.number="hourSliderDeg"
          @input="onHourSliderInput"
          class="range hour"
        />
      </div>

      <div class="slider-group">
        <div class="slider-head">
          <span class="slider-title">Minute</span>
        </div>
        <input
          type="range"
          min="0" max="360" :step="minuteStepDeg"
          v-model.number="minuteSliderDeg"
          @input="onMinuteSliderInput"
          class="range minute"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch, computed } from 'vue'
import randomizeSfx from '@/assets/sounds/cards-shuffle-sfx-01.mp3'
import tickUrl from '@/assets/sounds/Type_Click.ogg'

const props = withDefaults(defineProps<{
  hour: number
  minute: number
  size?: number
  interactive?: boolean
  spinOnClick?: boolean
  step?: number                  // minute snap
  withSliders?: boolean          // show hour/minute sliders
}>(), {
  size: 400,
  interactive: false,
  spinOnClick: false,
  step: 1,
  withSliders: true,
})

const emit = defineEmits<{
  (e: 'update-time', h: number, m: number): void
  (e: 'spin-finished', h: number, m: number): void
}>()

const sizePx = computed<number>(() => props.size)
const r = computed<number>(() => sizePx.value / 2)

const svgEl = ref<SVGSVGElement|null>(null)
const dragging = ref<null|'minute'|'hour'>(null)

const h = ref<number>(props.hour)
const m = ref<number>(props.minute)
watch(() => props.hour, v => (h.value = v))
watch(() => props.minute, v => (m.value = v))

/* Angles */
const mAngle = computed<number>(() => (m.value % 60) * 6)
const hAngle = computed<number>(() => ((h.value % 12) + (m.value % 60)/60) * 30)

/* SFX */
const shuffle = new Audio(randomizeSfx)
shuffle.preload = 'auto'
function playShuffle(){ try{ shuffle.currentTime = 0; shuffle.play() } catch {} }

const tick = new Audio(tickUrl)
tick.preload = 'auto'
function playTick(){ 
  try { 
    // restart quickly for rapid snaps
    tick.currentTime = 0
    tick.play()
  } catch {} 
}

/* Track last snapped positions to gate tick sfx */
let lastHourIdx = (h.value % 12 + 12) % 12
let lastMinute = m.value % 60

/* Sliders */
const minuteStepDeg = computed(() => (props.step ?? 1) * 6)
const hourSliderDeg = ref<number>( ((h.value % 12 + 12) % 12) * 30 )
const minuteSliderDeg = ref<number>( (m.value % 60) * 6 )
watch([h,m], () => {
  hourSliderDeg.value = ((h.value % 12 + 12) % 12) * 30
  minuteSliderDeg.value = (m.value % 60) * 6
})

/* Slider handlers */
function onHourSliderInput(){
  const idx = Math.round((hourSliderDeg.value % 360) / 30) % 12
  const curIdx = (h.value % 12 + 12) % 12
  if (idx !== curIdx) {
    // smooth wrap direction
    let delta = idx - curIdx
    if (delta > 6) delta -= 12
    if (delta < -6) delta += 12
    h.value = (h.value + delta + 24) % 24
    if (idx !== lastHourIdx) { playTick(); lastHourIdx = idx }
    emit('update-time', h.value, m.value)
  }
}
function onMinuteSliderInput(){
  const oldM = m.value
  const nearest = Math.round((minuteSliderDeg.value % 360) / 6) % 60
  const step = props.step ?? 1
  const snapped = (Math.round(nearest / step) * step) % 60
  if (snapped !== m.value) {
    m.value = snapped
    // hour carry
    if (Math.abs(m.value - oldM) > 30) {
      h.value = (m.value < oldM) ? (h.value + 1 + 24) % 24 : (h.value - 1 + 24) % 24
      lastHourIdx = (h.value % 12 + 12) % 12 // keep hour tracker sane
    }
    if (snapped !== lastMinute) { playTick(); lastMinute = snapped }
    emit('update-time', h.value, m.value)
  }
}

/* Math helpers */
function polarToDeg (x:number, y:number): number {
  const ang = Math.atan2(y, x)
  return (ang * 180 / Math.PI + 360) % 360
}
function posToMinute (cx:number, cy:number, px:number, py:number): number {
  const dx = px - cx, dy = py - cy
  const deg = polarToDeg(dx, dy)
  const a = (450 - deg) % 360
  return Math.round(a / 6) % 60
}
function snapMinute (val:number): number {
  const step = props.step ?? 1
  return (Math.round(val / step) * step) % 60
}
function minuteToHourCarry (oldM:number, newM:number, curH:number): number {
  if (Math.abs(newM - oldM) > 30) return (newM < oldM) ? (curH + 1 + 24) % 24 : (curH - 1 + 24) % 24
  return curH
}

/* Hand hit-test */
function distancePointToSegment(px:number, py:number, x1:number, y1:number, x2:number, y2:number): number {
  const vx = x2 - x1, vy = y2 - y1
  const wx = px - x1, wy = py - y1
  const c1 = vx*wx + vy*wy
  if (c1 <= 0) return Math.hypot(px - x1, py - y1)
  const c2 = vx*vx + vy*vy
  const t = Math.min(1, Math.max(0, c1 / c2))
  const projx = x1 + t * vx
  const projy = y1 + t * vy
  return Math.hypot(px - projx, py - projy)
}
function handAtPoint(clientX:number, clientY:number): null|'minute'|'hour' {
  const rect = svgEl.value!.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const rad = Math.PI / 180
  const mLen = 130, hLen = 90

  const mRad = mAngle.value * rad
  const mx2 = cx + mLen * Math.sin(mRad)
  const my2 = cy - mLen * Math.cos(mRad)

  const hRad = hAngle.value * rad
  const hx2 = cx + hLen * Math.sin(hRad)
  const hy2 = cy - hLen * Math.cos(hRad)

  const thresh = 10
  const dm = distancePointToSegment(clientX, clientY, cx, cy, mx2, my2)
  if (dm <= thresh) return 'minute'
  const dh = distancePointToSegment(clientX, clientY, cx, cy, hx2, hy2)
  if (dh <= thresh) return 'hour'
  return null
}

/* Pointer interactions */
function onPointerDown (e: PointerEvent): void {
  if (!props.interactive && !props.spinOnClick) return
  const which = props.interactive ? handAtPoint(e.clientX, e.clientY) : null
  if (which) {
    dragging.value = which
    ;(e.target as Element).setPointerCapture(e.pointerId)
    return
  }
  if (props.spinOnClick && !props.interactive) {
    playShuffle()
    spinToRandom()
  }
}
function onPointerMove (e: PointerEvent): void {
  if (!props.interactive || !dragging.value) return
  const rect = svgEl.value!.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2

  if (dragging.value === 'minute') {
    const oldM = m.value
    const minAt = posToMinute(cx, cy, e.clientX, e.clientY)
    const snapped = snapMinute(minAt)
    if (snapped !== m.value) {
      m.value = snapped
      if (Math.abs(m.value - oldM) > 30) {
        h.value = minuteToHourCarry(oldM, m.value, h.value)
        lastHourIdx = (h.value % 12 + 12) % 12
      }
      if (snapped !== lastMinute) { playTick(); lastMinute = snapped }
    }
  } else { // hour
    const dx = e.clientX - cx
    const dy = e.clientY - cy
    const deg = polarToDeg(dx, dy)
    const a = (450 - deg) % 360
    const idx = Math.round(a / 30) % 12
    const curIdx = (h.value % 12 + 12) % 12
    if (idx !== curIdx) {
      let delta = idx - curIdx
      if (delta > 6) delta -= 12
      if (delta < -6) delta += 12
      h.value = (h.value + delta + 24) % 24
      if (idx !== lastHourIdx) { playTick(); lastHourIdx = idx }
    }
  }

  // Sliders follow
  hourSliderDeg.value = ((h.value % 12 + 12) % 12) * 30
  minuteSliderDeg.value = (m.value % 60) * 6

  emit('update-time', h.value, m.value)
}
function onPointerUp (): void {
  if (dragging.value) emit('update-time', h.value, m.value)
  dragging.value = null
}

/* Randomize animation — shuffle SFX ONCE at start (no tick spam) */
function spinToRandom (): void {
  const step = props.step ?? 1
  const tgtH = Math.floor(Math.random() * 24)
  const stepsPerHour = 60 / step
  const mStep = Math.floor(Math.random() * stepsPerHour)
  const tgtM = (mStep * step) % 60

  const startH = h.value
  const startM = m.value
  const start = performance.now()
  const dur = 900
  const extraTurns = 2

  function stepFn (t:number) {
    const p = Math.min(1, (t - start) / dur)
    const eased = 1 - Math.pow(1 - p, 3)
    const curMinFloat =
      (startH * 60 + startM) +
      eased * ((tgtH * 60 + tgtM) - (startH * 60 + startM) + extraTurns * 720)

    const curMin = Math.floor(curMinFloat)
    const H = Math.floor((curMin / 60) % 24)
    const M = Math.floor(curMin % 60)

    h.value = (H + 24) % 24
    m.value = M

    // keep sliders synced during animation
    hourSliderDeg.value = ((h.value % 12 + 12) % 12) * 30
    minuteSliderDeg.value = (m.value % 60) * 6

    if (p < 1) requestAnimationFrame(stepFn)
    else {
      // update trackers after animation ends (no tick during spin)
      lastHourIdx = (h.value % 12 + 12) % 12
      lastMinute = m.value % 60
      emit('spin-finished', h.value, m.value)
      emit('update-time', h.value, m.value)
    }
  }

  playShuffle()
  requestAnimationFrame(stepFn)
}

onMounted(() => {
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  // initialize trackers
  lastHourIdx = (h.value % 12 + 12) % 12
  lastMinute = m.value % 60
})
onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
})

/* SVG helpers */
function tickXY (i:number, inner:boolean): {x:number,y:number} {
  const R = r.value
  const ang = i * 6 * Math.PI / 180
  const innerLen = (i % 5 === 0 ? 16 : 8)
  const innerR = R - innerLen - 12
  const outerR = R - 12
  const rr = inner ? innerR : outerR
  return { x: R + rr * Math.sin(ang), y: R - rr * Math.cos(ang) }
}
function numXY (i:number): {x:number,y:number} {
  const R = r.value
  const ang = (i * 30) * Math.PI / 180
  const rad = R - 46
  return { x: R + rad * Math.sin(ang), y: R - rad * Math.cos(ang) }
}

/* Expose spin method so quiz can trigger it on each question reset */
defineExpose({ spinToRandom })
</script>

<style scoped>
.clock-wrap { display:flex; flex-direction:column; gap:14px; align-items:center; }
.clock { cursor: crosshair; display:block; }

/* White face */
.face { fill: #ffffff; stroke: #d6d6d6; stroke-width: 2px; }

/* Dark gray ticks + stronger hour marks */
.tick { stroke: #6b7280; stroke-linecap: round; opacity: .9; }
.tick.major { stroke-width: 2.5; }
.tick.minor { stroke-width: 1.25; opacity: .55; }

/* Black numerals */
.num { fill: #111827; font-size: 16px; font-weight: 800; }

/* Hands: bright contrasting colors */
.hand line { stroke-linecap: round; }
.hand.hour line { stroke: #ef4444; stroke-width: 6; }   /* red */
.hand.minute line { stroke: #2563eb; stroke-width: 4; } /* blue */

/* Center pin */
.pin { fill: #111827; stroke: #111827; stroke-width: 0; }

/* Sliders */
.sliders { display:grid; gap:18px; }
.slider-group { display:flex; flex-direction:column; gap:8px; }
.slider-head { display:flex; justify-content:flex-start; }
.slider-title { font-weight:900; color:#ffffff; text-shadow: 0 1px 0 rgba(0,0,0,.22); }

input.range {
  -webkit-appearance: none; appearance: none; width:100%;
  background: transparent; height: 28px;
}
input.range:focus { outline:none; }

input.range::-webkit-slider-runnable-track {
  height: 10px; border-radius: 999px; background: #e5e7eb;
}
input.range::-moz-range-track {
  height: 10px; border-radius: 999px; background: #e5e7eb;
}

/* thumbs */
input.range.hour::-webkit-slider-thumb {
  -webkit-appearance:none; width:22px; height:22px; border-radius:50%;
  background:#ef4444; border:2px solid #b91c1c; margin-top:-6px; cursor:grab;
}
input.range.hour::-moz-range-thumb {
  width:22px; height:22px; border-radius:50%;
  background:#ef4444; border:2px solid #b91c1c; cursor:grab;
}
input.range.minute::-webkit-slider-thumb {
  -webkit-appearance:none; width:22px; height:22px; border-radius:50%;
  background:#2563eb; border:2px solid #1e40af; margin-top:-6px; cursor:grab;
}
input.range.minute::-moz-range-thumb {
  width:22px; height:22px; border-radius:50%;
  background:#2563eb; border:2px solid #1e40af; cursor:grab;
}
</style>
