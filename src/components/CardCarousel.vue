<template>
  <section
    class="carousel-wrapper"
    @mouseenter="setHover(true)"
    @mouseleave="setHover(false)"
  >
    <div
      class="cards-stage"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @pointerleave="onPointerUp"
    >
      <article
        v-for="card in visibleCards"
        :key="card.originalIndex"
        class="card"
        :class="[
          `offset-${card.offset}`,
          { 'is-active': card.offset === 0 }
        ]"
        :style="{ '--card-bg': card.color || defaultCardColor }"
        @click="handleCardClick(card, $event)"
      >
        <!-- Title -->
        <header class="card-header">
          <h3 class="card-title">
            {{ card.title }}
          </h3>
        </header>

        <!-- Body: media only -->
        <div class="card-body">
          <div
            class="card-media-block"
            @mouseenter.stop="onMediaHover(true, card)"
            @mouseleave.stop="onMediaHover(false, card)"
          >
            <div
              v-if="card.image || card.video"
              class="media-inner"
              :class="{ 'has-both': card.image && card.video }"
            >
              <!-- Image layer -->
              <img
                v-if="card.image"
                :src="card.image"
                :alt="card.title"
                :style="imageStyle(card)"
                draggable="false"
                @dragstart.prevent
              />

              <!-- Video layer -->
              <video
                v-if="card.video"
                :ref="el => setVideoRef(el, card.originalIndex)"
                muted
                loop
                playsinline
                :style="videoStyle(card)"
                draggable="false"
                @dragstart.prevent
              ></video>
            </div>

            <div v-else class="media-placeholder">
              <span>NO MEDIA</span>
            </div>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import {
  computed,
  onBeforeUnmount,
  ref,
  watch,
} from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

const props = defineProps({
  items: {
    type: Array,
    required: true,
    // each: { title, link, image, video?, color? }
  },
  autoRotate: {
    type: Boolean,
    default: false,
  },
  autoRotateDelay: {
    type: Number,
    default: 5000, // ms
  },
});

const defaultCardColor = "#333a4a";

// ---------- Carousel core state ----------
const activeIndex = ref(0); // index in props.items that is "center"
const hoverActive = ref(false);
const autoTimer = ref(null);

// ---------- Helpers ----------
const normalizeIndex = (idx) => {
  const n = props.items.length;
  if (n === 0) return 0;
  return ((idx % n) + n) % n;
};

// Build the visible cards (-2..2 offsets from active)
const visibleCards = computed(() => {
  const n = props.items.length;
  if (n === 0) return [];

  const result = [];
  const maxOffsets = Math.min(2, Math.floor((n - 1) / 2)); // supports <5 items

  for (let offset = -maxOffsets; offset <= maxOffsets; offset++) {
    const idx = normalizeIndex(activeIndex.value + offset);
    const item = props.items[idx];
    result.push({
      ...item,
      originalIndex: idx,
      offset,
    });
  }
  return result;
});

// ---------- Auto-rotate ----------
const startAuto = () => {
  stopAuto();
  if (!props.autoRotate || props.items.length <= 1) return;

  autoTimer.value = setInterval(() => {
    if (!hoverActive.value && props.items.length > 1) {
      activeIndex.value = normalizeIndex(activeIndex.value + 1);
    }
  }, props.autoRotateDelay);
};

const stopAuto = () => {
  if (autoTimer.value) {
    clearInterval(autoTimer.value);
    autoTimer.value = null;
  }
};

const setHover = (val) => {
  hoverActive.value = val;
  if (val) stopAuto();
  else if (props.autoRotate) startAuto();
};

watch(
  () => [props.autoRotate, props.autoRotateDelay, props.items.length],
  () => {
    stopAuto();
    if (props.autoRotate) startAuto();
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  stopAuto();
});

// ---------- Video + media hover logic ----------
const videoRefs = ref({}); // { [originalIndex]: HTMLVideoElement }
const mediaHoverMap = ref({}); // { [originalIndex]: boolean }

const setVideoRef = (el, originalIndex) => {
  if (!el) {
    delete videoRefs.value[originalIndex];
  } else {
    videoRefs.value[originalIndex] = el;
  }
};

const playVideo = (originalIndex) => {
  const v = videoRefs.value[originalIndex];
  if (v) {
    v.play().catch(() => {});
  }
};

const stopVideo = (originalIndex) => {
  const v = videoRefs.value[originalIndex];
  if (v) {
    v.pause();
    v.currentTime = 0;
  }
};

const onMediaHover = (isHovering, card) => {
  const idx = card.originalIndex;
  const hasBoth = !!card.image && !!card.video;
  if (!hasBoth) return;

  mediaHoverMap.value[idx] = isHovering;
  if (isHovering) playVideo(idx);
  else stopVideo(idx);
};

const isMediaHovered = (card) => {
  return !!mediaHoverMap.value[card.originalIndex];
};

const imageStyle = (card) => {
  if (card.image && card.video) {
    // With both: fade out image when hovered
    return {
      opacity: isMediaHovered(card) ? 0 : 1,
    };
  }
  // Image only
  return { opacity: 1 };
};

const videoStyle = (card) => {
  if (!card.video) return {};
  if (card.image && card.video) {
    // With both: fade in video on hover
    return {
      opacity: isMediaHovered(card) ? 1 : 0,
    };
  }
  // Video only
  return { opacity: 1 };
};

// ---------- Drag-to-navigate logic ----------
const dragState = ref({
  isDown: false,
  startX: 0,
  deltaX: 0,
  wasDragging: false,
});

const DRAG_THRESHOLD = 60; // how far to drag to trigger slide
const DRAG_IGNORE_CLICK = 10; // minimal movement before we consider it a drag

const onPointerDown = (event) => {
  dragState.value.isDown = true;
  dragState.value.startX =
    event.clientX ?? event.touches?.[0]?.clientX ?? 0;
  dragState.value.deltaX = 0;
  dragState.value.wasDragging = false;

  // pause autoplay while dragging
  stopAuto();
};

const onPointerMove = (event) => {
  if (!dragState.value.isDown) return;
  const currentX =
    event.clientX ?? event.touches?.[0]?.clientX ?? 0;
  dragState.value.deltaX = currentX - dragState.value.startX;

  if (Math.abs(dragState.value.deltaX) > DRAG_IGNORE_CLICK) {
    dragState.value.wasDragging = true;
  }
};

const onPointerUp = () => {
  if (!dragState.value.isDown) return;

  const total = dragState.value.deltaX;
  dragState.value.isDown = false;
  dragState.value.deltaX = 0;

  if (Math.abs(total) > DRAG_THRESHOLD && props.items.length > 1) {
    // swipe left -> next, swipe right -> previous
    if (total < 0) {
      activeIndex.value = normalizeIndex(activeIndex.value + 1);
    } else {
      activeIndex.value = normalizeIndex(activeIndex.value - 1);
    }
  }

  // resume autoplay if enabled and not hovered
  if (props.autoRotate && !hoverActive.value) {
    startAuto();
  }
};

// ---------- Click behavior ----------
const navigateTo = (item) => {
  if (!item || !item.link) return;

  const link = item.link;

  // If absolute URL, leave the app
  if (/^https?:\/\//i.test(link)) {
    window.location.href = link;
  } else {
    // Let vue-router handle base (/TaiyakiEduGames/) correctly
    router.push(link);
  }
};

const handleCardClick = (card, event) => {
  // If there was a drag, ignore the click that fires after
  if (dragState.value.wasDragging) {
    dragState.value.wasDragging = false;
    return;
  }

  if (card.offset === 0) {
    // Center card → open link
    navigateTo(card);
    return;
  }

  // Side card → make it center (will animate thanks to CSS transitions)
  activeIndex.value = card.originalIndex;
};
</script>



<style scoped>
.carousel-wrapper {
    width: 100%;
    max-width: 1800px;
    margin: 20px auto;
}

/* Stage area tall enough for animation without clipping */
.cards-stage {
    position: relative;
    height: 380px;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: visible;

    perspective: 1600px;
}

/* Base card style — 4:3 ratio, center is ~400x300 */
.card {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 400px;
    height: 300px;
    border-radius: 18px;
    background: radial-gradient(circle at top left, rgba(255, 255, 255, 0.12), transparent 55%),
        var(--card-bg, #333a4a);
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.65);

    /* tighter top padding so title sits closer to top */
    padding: 6px 9px 8px;

    display: flex;
    flex-direction: column;
    overflow: hidden;

    /* animation & hover scale support */
    --scale: 1;
    transition:
        transform 0.3s ease,
        filter 0.3s ease,
        box-shadow 0.3s ease,
        z-index 0.3s ease;

    /* Disable text selection inside cards + pointer cursor */
    user-select: none;
    cursor: pointer;
}

/* Prevent text being selected inside cards */
.card * {
    user-select: none;
}

/* Hover scale on EVERY card */
.card:hover {
    --scale: 1.06;
    box-shadow: 0 24px 50px rgba(0, 0, 0, 0.8);
}

/* ---------- Title area ---------- */
.card-header {
    flex: 0 0 auto;
    margin-top: 4px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.card-title {
    font-size: clamp(1.25rem, 2.3vw, 1.7rem);
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #ffeefc;
    text-shadow:
        0 0 0 #ffeefc,
        0.08em 0.08em 0 #ff3a8d,
        0.12em 0.12em 8px rgba(0, 0, 0, 0.7);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
    padding: 10px;
}

/* ---------- Body layout ---------- */
.card-body {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* Media block takes most of the remaining space */
.card-media-block {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* 16:9 media box inside a 4:3 card */
.media-inner,
.media-placeholder {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    border-radius: 14px;
    overflow: hidden;
    background: #222;
    box-shadow: inset 0 0 0 2px rgba(0, 0, 0, 0.4);
}

/* Layers for image+video */
.media-inner.has-both img,
.media-inner.has-both video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: opacity 0.25s ease;
}

/* Image-only or video-only */
.media-inner:not(.has-both) img,
.media-inner:not(.has-both) video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
}

/* Placeholder text */
.media-placeholder span {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    letter-spacing: 0.12em;
    color: #f2f2f7;
}

/* ---------- Depth & positioning ---------- */
/* Center card */
.offset-0 {
    transform: translate(-50%, -50%) scale(var(--scale)) rotateY(0deg);
    z-index: 5;
    filter: brightness(1);
}

/* Left neighbor — rotated OUTWARD */
.offset--1 {
    transform: translate(calc(-50% - 175px), -52%)
        scale(calc(0.9 * var(--scale)))
        rotateY(-18deg);     /* reversed */
    z-index: 4;
    filter: brightness(0.95);
}

/* Right neighbor — rotated OUTWARD */
.offset-1 {
    transform: translate(calc(-50% + 175px), -52%)
        scale(calc(0.9 * var(--scale)))
        rotateY(18deg);      /* reversed */
    z-index: 4;
    filter: brightness(0.95);
}

/* Far left — more rotation OUTWARD */
.offset--2 {
    transform: translate(calc(-50% - 300px), -54%)
        scale(calc(0.8 * var(--scale)))
        rotateY(-32deg);     /* reversed */
    z-index: 3;
    filter: brightness(0.75);
}

/* Far right — more rotation OUTWARD */
.offset-2 {
    transform: translate(calc(-50% + 300px), -54%)
        scale(calc(0.8 * var(--scale)))
        rotateY(32deg);      /* reversed */
    z-index: 3;
    filter: brightness(0.75);
}

/* ---------- Responsive adjustments ---------- */
@media (max-width: 1200px) {
    /* Neighbors closer, slightly less rotation */
    .offset--1 {
        transform: translate(calc(-50% - 130px), -52%)
            scale(calc(0.9 * var(--scale)))
            rotateY(-14deg);
    }

    .offset-1 {
        transform: translate(calc(-50% + 130px), -52%)
            scale(calc(0.9 * var(--scale)))
            rotateY(14deg);
    }

    /* Far cards also pulled in tighter */
    .offset--2 {
        transform: translate(calc(-50% - 200px), -54%)
            scale(calc(0.8 * var(--scale)))
            rotateY(-26deg);
    }

    .offset-2 {
        transform: translate(calc(-50% + 200px), -54%)
            scale(calc(0.8 * var(--scale)))
            rotateY(26deg);
    }
}

@media (max-width: 900px) {
    .cards-stage {
        height: 340px;
    }

    .card {
        width: 300px;
        height: 225px;
    }

    /* Very tight spacing for mobile */
    .offset--1 {
        transform: translate(calc(-50% - 110px), -52%)
            scale(calc(0.9 * var(--scale)))
            rotateY(-12deg);
    }

    .offset-1 {
        transform: translate(calc(-50% + 110px), -52%)
            scale(calc(0.9 * var(--scale)))
            rotateY(12deg);
    }

    /* Outer layer pulled in as well */
    .offset--2 {
        transform: translate(calc(-50% - 170px), -54%)
            scale(calc(0.8 * var(--scale)))
            rotateY(-22deg);
    }

    .offset-2 {
        transform: translate(calc(-50% + 170px), -54%)
            scale(calc(0.8 * var(--scale)))
            rotateY(22deg);
    }
}

</style>

