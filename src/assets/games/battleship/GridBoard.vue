<!-- src/assets/games/battleship/GridBoard.vue -->
<template>
  <div class="gb" :style="rootStyle" ref="rootEl">
    <!-- Top labels -->
    <div v-if="showLabels" class="gb-top">
      <div class="gb-corner"></div>

      <div class="gb-top-labels">
        <div
          v-for="(lab, x) in axisX"
          :key="'tx' + x"
          class="gb-top-label"
          :style="{ width: cellPx + 'px', height: labelHeightPx + 'px' }"
        >
          <span>{{ lab }}</span>
        </div>
      </div>
    </div>

    <!-- Left labels + grid -->
    <div class="gb-body">
      <div v-if="showLabels" class="gb-left">
        <div
          v-for="(lab, y) in axisY"
          :key="'ly' + y"
          class="gb-left-label"
          :style="{ width: labelColPx + 'px', height: cellPx + 'px' }"
        >
          <span>{{ lab }}</span>
        </div>
      </div>

      <div class="gb-grid" :style="gridStyle">
        <div
          v-for="y in size"
          :key="'r' + (y - 1)"
          class="gb-row"
          :style="{ height: cellPx + 'px' }"
        >
          <div
            v-for="x in size"
            :key="'c' + (y - 1) + '-' + (x - 1)"
            class="gb-cell"
            :style="{ width: cellPx + 'px', height: cellPx + 'px' }"
            :class="cellClass(x - 1, y - 1)"
            @click="handleCellClick(x - 1, y - 1)"
            @dragover.prevent="handleDragOver"
            @drop.prevent="handleDrop($event, x - 1, y - 1)"
            :ref="(el) => registerCellRef?.(el, x - 1, y - 1)"
          >
            <!-- X / O marker -->
            <div v-if="grid[y - 1][x - 1].guessed" class="mark">
              {{ grid[y - 1][x - 1].hit ? "X" : "O" }}
            </div>

            <!-- Optional: ship presence dot (kept subtle) -->
            <div v-if="showShips && grid[y - 1][x - 1].shipId" class="ship-dot"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { getGridVariant } from "@/assets/games/battleship/gridStyles.js";

const props = defineProps({
  size: { type: Number, required: true },
  axisX: { type: Array, required: true },
  axisY: { type: Array, required: true },
  grid: { type: Array, required: true },

  mode: { type: String, default: "target" }, // "own" or "target"
  showShips: { type: Boolean, default: false },
  locked: { type: Boolean, default: false },

  showLabels: { type: Boolean, default: true },
  angleTopLabels: { type: Boolean, default: false }, // ignored

  variant: { type: String, default: "duelSonar" },

  droppable: { type: Boolean, default: false },
  registerCellRef: { type: Function, default: null },
});

const emit = defineEmits(["cellClick", "cellDrop"]);

const v = computed(() => getGridVariant(props.variant));

const labelColPx = computed(() => v.value.labelColPx);
const labelHeightPx = computed(() => v.value.labelHeightPx);
const gapPx = computed(() => v.value.gapPx);
const cellMinPx = computed(() => v.value.cellMinPx);
const cellMaxPx = computed(() => v.value.cellMaxPx);

const rootEl = ref(null);
const measuredW = ref(0);
const measuredH = ref(0);

let ro = null;

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function measure() {
  const el = rootEl.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  measuredW.value = rect.width;
  measuredH.value = rect.height;
}

const cellPx = computed(() => {
  const n = props.size;
  if (!measuredW.value || !measuredH.value) return clamp(cellMinPx.value, cellMinPx.value, cellMaxPx.value);

  const w = measuredW.value - (props.showLabels ? labelColPx.value : 0);
  const h = measuredH.value - (props.showLabels ? labelHeightPx.value : 0);

  const gaps = gapPx.value * (n - 1);
  const maxCellFromW = Math.floor((w - gaps) / n);
  const maxCellFromH = Math.floor((h - gaps) / n);

  const raw = Math.min(maxCellFromW, maxCellFromH);
  return clamp(raw, cellMinPx.value, cellMaxPx.value);
});

const rootStyle = computed(() => ({
  "--label-col": `${labelColPx.value}px`,
  "--label-h": `${labelHeightPx.value}px`,
  "--gap": `${gapPx.value}px`,
  "--cell": `${cellPx.value}px`,
}));

const gridStyle = computed(() => ({
  display: "grid",
  gridTemplateRows: `repeat(${props.size}, ${cellPx.value}px)`,
  gap: `${gapPx.value}px`,
}));

function cellClass(x, y) {
  const c = props.grid[y][x];
  const shipHit = !!c.shipId && !!c.guessed && !!c.hit; // important for own-board red fill
  return {
    guessed: !!c.guessed,
    hit: !!c.hit,
    miss: c.guessed && !c.hit,
    locked: props.locked,
    shipHit,
  };
}

function handleCellClick(x, y) {
  if (props.locked) return;
  emit("cellClick", { x, y });
}

function handleDragOver(e) {
  if (!props.droppable || props.locked) return;
  e.dataTransfer.dropEffect = "move";
}

function handleDrop(e, x, y) {
  if (!props.droppable || props.locked) return;
  const data = e.dataTransfer?.getData("text/plain") ?? "";
  emit("cellDrop", { x, y, data });
}

onMounted(() => {
  measure();
  if ("ResizeObserver" in window) {
    ro = new ResizeObserver(() => measure());
    if (rootEl.value) ro.observe(rootEl.value);
  } else {
    window.addEventListener("resize", measure);
  }
});

onBeforeUnmount(() => {
  if (ro && rootEl.value) ro.unobserve(rootEl.value);
  ro = null;
  window.removeEventListener("resize", measure);
});
</script>

<style scoped>
.gb {
  display: grid;
  gap: 8px;
  user-select: none;
  width: 100%;
  height: 100%;
}

/* Top labels */
.gb-top {
  display: grid;
  grid-template-columns: var(--label-col) 1fr;
  align-items: end;
}
.gb-corner {
  width: var(--label-col);
  height: var(--label-h);
}
.gb-top-labels {
  display: flex;
  gap: var(--gap);
  align-items: flex-end;
}
.gb-top-label {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 1000;
  font-size: 14px;
  color: rgba(180, 255, 235, 0.95);
  opacity: 0.95;
}

/* Left + grid body */
.gb-body {
  display: grid;
  grid-template-columns: var(--label-col) 1fr;
  gap: 8px;
  align-items: start;
}

/* Left labels */
.gb-left {
  display: grid;
  gap: var(--gap);
}
.gb-left-label {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 8px;
  font-weight: 1000;
  font-size: 14px;
  color: rgba(180, 255, 235, 0.95);
  opacity: 0.95;
}

/* Grid */
.gb-row {
  display: flex;
  gap: var(--gap);
}

.gb-cell {
  position: relative;
  background: rgba(2, 12, 18, 0.55);
  border: 2px solid rgba(80, 255, 190, 0.22);
  border-radius: 0;
  cursor: pointer;
}
.gb-cell.locked {
  cursor: default;
}

/* Own-board ship-hit: fill the cell slightly red */
.gb-cell.shipHit {
  background: rgba(255, 40, 40, 0.14);
}

/* Enemy + player targeting colors */
.gb-cell.guessed.hit {
  border-color: rgba(255, 90, 90, 0.80);
}
.gb-cell.guessed.miss {
  border-color: rgba(90, 160, 255, 0.85);
}

/* Marks (X/O) above everything */
.mark {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 18px;
  font-weight: 1000;
  z-index: 50;
  pointer-events: none;
  color: rgba(220, 255, 245, 0.95);
}

.gb-cell.guessed.hit .mark {
  color: rgba(255, 90, 90, 0.95);
}
.gb-cell.guessed.miss .mark {
  color: rgba(90, 160, 255, 0.95);
}

/* subtle ship dot (optional) */
.ship-dot {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 6px;
  height: 6px;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.35);
  pointer-events: none;
  z-index: 10;
}
</style>