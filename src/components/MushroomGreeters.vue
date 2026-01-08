<template>
  <!-- Decorative mascots + anchored speech bubble -->
  <div class="banner-mascots" aria-hidden="false" ref="bannerEl">
    <!-- Anchored speech bubble -->
    <div
      v-if="bubbleOpen"
      class="talk-bubble"
      role="status"
      aria-live="polite"
      :style="{ left: bubbleLeft + 'px', top: bubbleTop + 'px' }"
    >
      {{ bubbleText }}
    </div>

    <!-- Mushroom row -->
    <div class="shroom-row" ref="shroomRowEl">
      <img
        v-for="(src, i) in shroomSrcs"
        :key="i"
        class="shroom"
        :src="src"
        alt=""
        role="button"
        tabindex="0"
        :ref="el => (shroomEls[i] = el as HTMLImageElement)"
        @click="onShroomClick(i)"
        @keydown.enter.prevent="onShroomClick(i)"
        @keydown.space.prevent="onShroomClick(i)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue';

/* Props:
   - actionsEl: pass the header's actions/nav element so we can avoid overlap */
const props = defineProps<{ actionsEl?: HTMLElement | null }>();

/* Assets */
import redShroom from '@/assets/images/mushrooms/red-mushroom-sticker.png';
import blueShroom from '@/assets/images/mushrooms/blue-mushroom-sticker.png';
import greenShroom from '@/assets/images/mushrooms/green-mushroom-sticker.png';

/* Sources & phrases */
const shroomSrcs = [redShroom, greenShroom, blueShroom];

/** Theme-driven phrases (fallbacks if theme doesn't provide them) */
const defaultPhrases = ['Nice! Keep going! ✨', 'がんばって！🔥', 'ϵ( \'Θ\' )϶'];
const themePhrases = ref<string[]>(defaultPhrases);

function readCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function parseThemePhrases(raw: string): string[] {
  if (!raw) return [];
  // Try JSON first
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map(x => String(x)).filter(Boolean);
    }
  } catch { /* ignore */ }
  // Fallback: split by |
  const parts = raw.split('|').map(s => s.trim()).filter(Boolean);
  return parts;
}

function loadThemePhrases() {
  const raw = readCssVar('--greeter-phrases');
  const list = parseThemePhrases(raw);
  if (list.length) themePhrases.value = list;
}

/* Element refs */
const bannerEl = ref<HTMLElement | null>(null);
const shroomRowEl = ref<HTMLElement | null>(null);
const shroomEls = ref<HTMLImageElement[]>([]);

/* Talk bubble state */
const bubbleOpen = ref(false);
const bubbleText = ref('');
const bubbleLeft = ref(0);
const bubbleTop = ref(0);
let bubbleTimer: number | null = null;

/* Click -> show bubble anchored above the clicked shroom */
function onShroomClick(idx: number) {
  const phrases = themePhrases.value.length ? themePhrases.value : defaultPhrases;
  bubbleText.value = phrases[idx % phrases.length];
  const sh = shroomEls.value[idx];
  const banner = bannerEl.value;
  if (sh && banner) {
    const r = sh.getBoundingClientRect();
    const b = banner.getBoundingClientRect();
    bubbleLeft.value = (r.left - b.left) + r.width / 2;
    bubbleTop.value = (r.top - b.top) - 8;
  }
  bubbleOpen.value = true;
  if (bubbleTimer) window.clearTimeout(bubbleTimer);
  bubbleTimer = window.setTimeout(() => { bubbleOpen.value = false; bubbleTimer = null; }, 1600);
}

/* Shift mushrooms left if they would overlap the actions menu */
function updateShroomShift() {
  const actions = props.actionsEl;
  const row = shroomRowEl.value;
  if (!actions || !row) return;
  const actionsRect = actions.getBoundingClientRect();
  const rowRect = row.getBoundingClientRect();
  const vw = window.innerWidth;
  const centerX = vw / 2;
  const defaultRight = centerX + rowRect.width / 2;
  const actionsLeft = actionsRect.left;
  const gap = 12;
  const overlap = defaultRight - (actionsLeft - gap);
  const shift = overlap > 0 ? -overlap : 0;
  row.style.setProperty('--shroom-shift', `${shift}px`);
}

let ro: ResizeObserver | null = null;
function attachObservers() {
  updateShroomShift();
  ro = new ResizeObserver(() => updateShroomShift());
  if (props.actionsEl) ro.observe(props.actionsEl);
  if (shroomRowEl.value) ro.observe(shroomRowEl.value);
  window.addEventListener('resize', updateShroomShift);
}

/* Hover animation: play to completion even if pointer leaves */
function attachShroomHoverHandlers() {
  nextTick(() => {
    shroomEls.value.forEach((el) => {
      if (!el) return;
      const play = () => {
        el.classList.remove('play-bounce');
        // reflow to restart animation
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        el.offsetWidth;
        el.classList.add('play-bounce');
      };
      el.addEventListener('pointerenter', play);
      el.addEventListener('focus', play);
      el.addEventListener('animationend', (e: AnimationEvent) => {
        if (e.animationName === 'shroom-bounce') el.classList.remove('play-bounce');
      });
    });
  });
}

onMounted(() => {
  loadThemePhrases();
  attachObservers();
  attachShroomHoverHandlers();
});

onBeforeUnmount(() => {
  if (bubbleTimer) { window.clearTimeout(bubbleTimer); bubbleTimer = null; }
  window.removeEventListener('resize', updateShroomShift);
  ro?.disconnect(); ro = null;
});

/* If the parent swaps actionsEl (rare), reattach observers */
watch(() => props.actionsEl, async () => {
  ro?.disconnect(); ro = null;
  await nextTick();
  attachObservers();
});
</script>

<style scoped>
.banner-mascots { position: relative; inset: 0; z-index: 3; pointer-events: none; }

/* Theme-driven speech bubble (all tokens overrideable) */
.talk-bubble {
  /* overridable design tokens for the bubble */
  --bubble-font: var(--greeter-bubble-font-size, 12px);
  --bubble-pad-y: var(--greeter-bubble-pad-y, 6px);
  --bubble-pad-x: var(--greeter-bubble-pad-x, 8px);
  --bubble-radius: var(--greeter-bubble-radius, 10px);
  --bubble-raise: var(--greeter-bubble-raise, -40%);

  position: absolute;
  transform: translate(-50%, var(--bubble-raise));
  max-width: min(80vw, 260px);

  background: var(--greeter-bubble-bg, var(--surface-main, #fff));
  color: var(--greeter-bubble-on, var(--text-main, #0f172a));
  padding: var(--bubble-pad-y) var(--bubble-pad-x);
  border-radius: var(--bubble-radius);
  border: 1.5px solid var(--greeter-bubble-border, var(--border-main-strong, #0b111e));
  /* If theme provides a complex shadow token, use it; else fallback */
  box-shadow: var(--greeter-bubble-shadow, var(--shadow-main, 0 8px 18px rgba(0,0,0,0.16)));

  font-weight: 800;
  font-size: var(--bubble-font);
  line-height: 1.15;
  text-align: center;
  animation: bubblePop 160ms cubic-bezier(.2,.8,.2,1);
  pointer-events: none;
}
@keyframes bubblePop {
  from { transform: translate(-50%, calc(var(--bubble-raise) + 8%)) scale(.98); filter: blur(1px); opacity: 0; }
  to   { transform: translate(-50%, var(--bubble-raise)) scale(1);   filter: none;     opacity: 1; }
}

/* Shrooms: play animation via class so it completes regardless of hover state */
.shroom-row{
  display:flex; 
  gap: clamp(2px, 2vw, 10px);
  pointer-events:auto; will-change:transform;
}
.shroom{
  width:clamp(58px,10vw,72px);
  filter:drop-shadow(0 3px 0 rgba(11,22,46,.35)) drop-shadow(0 12px 16px rgba(0,0,0,.22));
  cursor:pointer; transition:transform 160ms ease;
}
.shroom.play-bounce{
  animation: shroom-bounce 520ms cubic-bezier(.2,.8,.2,1);
  animation-fill-mode: forwards;
}
@keyframes shroom-bounce{
  0%{transform:translateY(0) scale(1);}
  35%{transform:translateY(-10px) scale(1.03);}
  60%{transform:translateY(0) scale(1);}
  80%{transform:translateY(-5px) scale(1.01);}
  100%{transform:translateY(0) scale(1);}
}
</style>
