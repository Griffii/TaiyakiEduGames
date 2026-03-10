<!-- src/views/games/Battleship.vue -->
<template>
  <section class="bs-page">
    <div class="bs-game">
      <header class="bs-hud">
        <div>
          <div class="bs-title">ESL Battleship (Demo)</div>
          <div class="bs-sub">
            Phase: <b>{{ phase }}</b>
            <span class="dot">•</span>
            Turn: <b>{{ turnLabel }}</b>
            <span class="dot">•</span>
            Grid: <b>{{ size }}×{{ size }}</b>
            <span class="dot">•</span>
            Labels: <b>{{ labelSetName }}</b>
          </div>
        </div>

        <div class="hud-actions">
          <button class="btn" @click="openInGameMenu">Menu</button>
        </div>
      </header>

      <main class="bs-boards">
        <!-- LEFT: PLAYER BOARD -->
        <section class="board">
          <div class="board-head">
            <div class="section-title">Your Board</div>

            <div class="board-head-actions">
              <button class="btn" @click.stop="togglePlayerShipsMenu">
                Ships
              </button>

              <div v-if="showPlayerShipsMenu" class="ships-dropdown" @mousedown.stop>
                <div class="fleet-title">Your Fleet</div>

                <div class="fleet-list">
                  <div
                    v-for="s in playerFleet"
                    :key="s.id"
                    class="ship-row"
                    :class="{ placed: s.cells.length === s.size }"
                    :draggable="phase === 'setup'"
                    @dragstart="phase === 'setup' ? onShipDragStart($event, s.id) : null"
                    @dragend="phase === 'setup' ? onShipDragEnd : null"
                  >
                    <img
                      class="ship-img"
                      :src="shipIconFor(s.orientation)"
                      alt=""
                      :style="shipListImgStyle(s.size, s.orientation)"
                    />
                    <div class="ship-meta">
                      <div class="ship-name">{{ s.name }} ({{ s.size }})</div>
                      <div class="ship-status">{{ shipStatusText(s) }}</div>
                    </div>
                  </div>
                </div>

                <div v-if="phase === 'setup'" class="setup-hint">
                  Drag ships onto your board. Overlap is allowed while placing, but you can’t confirm if overlaps exist.
                </div>

                <div v-if="phase === 'setup' && overlapExists" class="overlap-warn">
                  Overlap detected — cannot confirm layout.
                </div>
              </div>
            </div>
          </div>

          <div class="board-wrap" ref="playerWrapEl">
            <GridBoard
              :size="size"
              :axisX="axis.x"
              :axisY="axis.y"
              :grid="playerOwnDisplay"
              mode="own"
              :showShips="true"
              :locked="phase !== 'setup'"
              variant="duelSonar"
              droppable
              :registerCellRef="registerPlayerCellRef"
              :showLabels="true"
              :angleTopLabels="false"
              @cellClick="onPlayerCellClick"
              @cellDrop="onPlayerCellDrop"
            />

            <!-- Player ships overlay -->
            <div class="ship-overlay-layer">
              <div
                v-for="s in placedPlayerShips"
                :key="s.id"
                class="ship-overlay-wrap"
                :style="playerShipOverlayWrapStyle(s.id)"
                :draggable="phase === 'setup'"
                @dragstart="phase === 'setup' ? onPlacedShipDragStart($event, s.id) : null"
                @dragend="phase === 'setup' ? onShipDragEnd : null"
              >
                <button
                  v-if="phase === 'setup'"
                  class="rotate-btn"
                  type="button"
                  @mousedown.stop
                  @click.stop="rotatePlacedShip(s.id)"
                  aria-label="Rotate ship"
                >
                  ⟳
                </button>

                <!-- IMPORTANT: no rotate() transform; swap src instead -->
                <img
                  class="ship-overlay"
                  :class="{ sunk: isPlayerShipSunk(s.id) }"
                  :src="playerShipOverlaySrc(s.id)"
                  alt=""
                  :style="shipOverlayImgBaseStyle"
                />
              </div>
            </div>

            <!-- CPU missile FX -->
            <div class="fx-layer">
              <div v-if="fxCPU.missile.active" class="missile" :style="missileStyle(fxCPU.missile.x, fxCPU.missile.y)" />
              <div
                v-if="fxCPU.impact.active"
                class="impact"
                :class="fxCPU.impact.kind"
                :style="impactStyle(fxCPU.impact.x, fxCPU.impact.y)"
              >
                <div class="burst"></div>
              </div>
            </div>
          </div>
        </section>

        <!-- RIGHT: CPU BOARD -->
        <section class="board">
          <div class="board-head">
            <div class="section-title">Enemy Board</div>

            <div class="board-head-actions">
              <button class="btn" @click.stop="toggleEnemyShipsMenu" :disabled="phase === 'setup'">
                Ships
              </button>

              <div v-if="showEnemyShipsMenu" class="ships-dropdown enemy" @mousedown.stop>
                <div class="fleet-title">Enemy Fleet</div>

                <div class="fleet-list">
                  <div v-for="s in enemyFleet" :key="s.id" class="ship-row enemy-row">
                    <img
                      class="ship-img"
                      :src="shipIconFor(s.orientation)"
                      alt=""
                      :style="shipListImgStyle(s.size, s.orientation)"
                    />
                    <div class="ship-meta">
                      <div class="ship-name">{{ s.name }} ({{ s.size }})</div>
                      <div class="ship-status">{{ shipStatusText(s) }}</div>
                    </div>
                  </div>
                </div>

                <div class="setup-hint">(v1) Enemy ship statuses are visible here for testing.</div>
              </div>
            </div>
          </div>

          <div class="board-wrap" ref="cpuWrapEl">
            <GridBoard
              :size="size"
              :axisX="axis.x"
              :axisY="axis.y"
              :grid="playerTarget"
              mode="target"
              :showShips="false"
              :locked="phase !== 'battle' || turn !== 'player'"
              variant="duelSonar"
              :registerCellRef="registerCpuCellRef"
              :showLabels="true"
              :angleTopLabels="false"
              @cellClick="onCpuCellClick"
            />

            <!-- Reveal sunk enemy ships: swap src, no rotation -->
            <div class="ship-reveal-layer">
              <img
                v-for="s in sunkEnemyShips"
                :key="s.id"
                class="enemy-ship-reveal"
                :src="shipIconFor(s.orientation)"
                alt=""
                :style="enemyShipRevealStyle(s.id)"
              />
            </div>

            <div class="fx-layer">
              <div v-if="fxPlayer.missile.active" class="missile" :style="missileStyle(fxPlayer.missile.x, fxPlayer.missile.y)" />
              <div
                v-if="fxPlayer.impact.active"
                class="impact"
                :class="fxPlayer.impact.kind"
                :style="impactStyle(fxPlayer.impact.x, fxPlayer.impact.y)"
              >
                <div class="burst"></div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <!-- Status area ABOVE input field -->
      <section class="status-bar">
        <div class="status-left">
          <span class="status-pill" :class="turn === 'player' ? 'good' : 'warn'">
            {{ turn === 'player' ? 'Your turn' : 'Computer thinking…' }}
          </span>
          <span v-if="phase === 'setup'" class="status-pill">Setup</span>
          <span v-if="phase === 'battle'" class="status-pill">Battle</span>
          <span v-if="phase === 'end'" class="status-pill end">Game Over</span>

          <button
            v-if="phase === 'setup'"
            class="confirm-inline"
            :disabled="!canConfirmLayout"
            @click="confirmLayout"
          >
            Confirm Layout
          </button>

          <span v-if="phase === 'setup' && overlapExists" class="status-warn">Overlap detected</span>
        </div>

        <div class="status-right" v-if="feedback" :class="feedback.type">
          {{ feedback.text }}
        </div>
      </section>

      <footer class="bottom-bar">
        <div class="bottom-row">
          <input
            ref="sentenceInputEl"
            class="sentence-input"
            v-model="sentence"
            :disabled="phase !== 'battle' || turn !== 'player' || devMode"
            :placeholder="devMode ? 'Dev Mode: click enemy grid to fire' : sentenceExample"
            @keydown.enter.prevent="onLaunch"
          />

          <div class="launch-wrap">
            <div class="armed-missile" :class="{ armed: canLaunch }">
              <img :src="missilePng" alt="" />
            </div>

            <button ref="launchBtnEl" class="launch-btn" :disabled="!canLaunch" @click="onLaunch">
              Launch
            </button>
          </div>
        </div>

        <div class="bottom-tools">
            <!--
          <label class="dev-toggle">
            <input type="checkbox" v-model="devMode" />
            <span>Dev Mode (click enemy grid to fire)</span>
          </label>
          -->
        </div>
      </footer>
    </div>

    <!-- MAIN MENU -->
    <div class="bs-menu" v-if="screen === 'menu'">
      <div class="menu-opaque"></div>

      <div class="menu-card">
        <div class="menu-title">Battleship ESL</div>
        <div class="menu-sub">Choose settings, place ships, then fire.</div>

        <div class="menu-settings">
          <div class="setting">
            <div class="setting-label">Grid Size</div>
            <select v-model.number="menuGridSize" class="select">
              <option v-for="n in gridSizeOptions" :key="n" :value="n">{{ n }}×{{ n }}</option>
            </select>
            <div class="setting-help">6×6: no 5-length ship · 8×8/10×10: all ships</div>
          </div>

          <div class="setting">
            <div class="setting-label">Labels</div>
            <select v-model="menuLabelSetKey" class="select">
              <option v-for="opt in labelSetOptions" :key="opt.key" :value="opt.key">
                {{ opt.name }}
              </option>
            </select>
          </div>
        </div>

        <button class="menu-btn" @click="startSolo">Play Solo</button>
        <button class="menu-btn disabled" disabled>Multiplayer (coming soon)</button>
      </div>
    </div>

    <!-- IN-GAME MENU -->
    <div class="overlay" v-if="showInGameMenu">
      <div class="overlay-bg" @click="closeInGameMenu"></div>
      <div class="overlay-card">
        <div class="overlay-title">Menu</div>

        <button class="overlay-btn" @click="resetOnly">Reset Game</button>
        <button class="overlay-btn" @click="backToMainMenu">Back to Main Menu</button>
        <button class="overlay-btn ghost" @click="closeInGameMenu">Cancel</button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";

import missilePng from "@/assets/games/battleship/missile.png";

// NEW: two ship icon variants
import shipIconH from "@/assets/games/battleship/ship-h.png";
import shipIconV from "@/assets/games/battleship/ship-v.png";

import launchSfxUrl from "@/assets/games/battleship/launch.mp3";
import explosionSfxUrl from "@/assets/games/battleship/explosion.mp3";
import splashSfxUrl from "@/assets/games/battleship/splash.mp3";

import GridBoard from "@/assets/games/battleship/GridBoard.vue";

import {
  DEFAULT_GRID_SIZE,
  DEFAULT_LABEL_SET,
  GRID_SIZE_OPTIONS,
  LABEL_SETS,
  axisForGridSizeAndLabelSet,
  fleetForGridSize,
  parseShotSentence,
  assignRandomShipNames,
} from "@/assets/games/battleship/content.js";

import {
  aiPickRandomGuess,
  aiPlaceFleetRandom,
  allShipsPlaced,
  allShipsSunk,
  canPlaceShip,
  createEmptyGrid,
  createFleetRuntime,
  getShipById,
  placeShip,
  removeShip,
  removeShipAtCell,
  resolveGuess,
  shipStatus,
} from "@/assets/games/battleship/engine.js";

/* -----------------------------
   SFX helper (safe + concurrent)
-------------------------------- */
function createSfxPlayer(src, { volume = 0.85 } = {}) {
  const base = new Audio(src);
  base.preload = "auto";
  base.volume = volume;

  return {
    play() {
      try {
        const a = base.cloneNode(true);
        a.volume = base.volume;
        a.play().catch(() => {});
      } catch {}
    },
  };
}

const sfx = {
  launch: createSfxPlayer(launchSfxUrl, { volume: 0.8 }),
  explosion: createSfxPlayer(explosionSfxUrl, { volume: 0.9 }),
  splash: createSfxPlayer(splashSfxUrl, { volume: 0.9 }),
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/* MENU SETTINGS */
const gridSizeOptions = GRID_SIZE_OPTIONS;
const labelSetOptions = Object.entries(LABEL_SETS).map(([key, v]) => ({ key, name: v.name }));

const menuGridSize = ref(DEFAULT_GRID_SIZE);
const menuLabelSetKey = ref(DEFAULT_LABEL_SET);

/* state */
const screen = ref("menu");
const phase = ref("setup");
const turn = ref("player");

const size = ref(DEFAULT_GRID_SIZE);
const labelSetKey = ref(DEFAULT_LABEL_SET);
const labelSetName = computed(() => (LABEL_SETS[labelSetKey.value]?.name ?? "Unknown"));

const axis = reactive({
  x: [],
  y: [],
  meta: null,
  example: "",
});

const sentenceExample = ref("");
const sentence = ref("");
const sentenceInputEl = ref(null); // NEW

const devMode = ref(false);
const selectedEnemyCell = ref(null);

const feedback = ref(null);
function setFeedback(type, text) {
  feedback.value = { type, text };
}

/* NEW: choose icon by orientation */
function shipIconFor(orientation) {
  return orientation === "V" ? shipIconV : shipIconH;
}

const shipOverlayImgBaseStyle = {
  width: "100%",
  height: "100%",
  objectFit: "fill",
};

/* in-game menu */
const showInGameMenu = ref(false);
function openInGameMenu() { showInGameMenu.value = true; }
function closeInGameMenu() { showInGameMenu.value = false; }
function resetOnly() {
  closeInGameMenu();
  resetGameState();
  setFeedback("ok", "Reset. Place ships again.");
}
function backToMainMenu() {
  closeInGameMenu();
  screen.value = "menu";
}

/* ships dropdown toggles */
const showPlayerShipsMenu = ref(false);
const showEnemyShipsMenu = ref(false);

function togglePlayerShipsMenu() {
  showPlayerShipsMenu.value = !showPlayerShipsMenu.value;
  if (showPlayerShipsMenu.value) showEnemyShipsMenu.value = false;
}
function toggleEnemyShipsMenu() {
  if (phase.value === "setup") return;
  showEnemyShipsMenu.value = !showEnemyShipsMenu.value;
  if (showEnemyShipsMenu.value) showPlayerShipsMenu.value = false;
}

/* grids */
const playerOwn = ref(createEmptyGrid(size.value));
const enemyOwn = ref(createEmptyGrid(size.value));
const playerTarget = ref(createEmptyGrid(size.value));
const enemyTarget = ref(createEmptyGrid(size.value)); // CPU guesses at player board

const playerOwnDisplay = computed(() => {
  const n = size.value;
  const out = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => ({ guessed: false, hit: false, shipId: null }))
  );

  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      out[y][x] = {
        shipId: playerOwn.value[y][x].shipId,
        guessed: enemyTarget.value[y][x].guessed,
        hit: enemyTarget.value[y][x].hit,
      };
    }
  }
  return out;
});

/* fleets */
const playerFleet = ref(createFleetRuntime(fleetForGridSize(size.value)));
const enemyFleet = ref(createFleetRuntime(fleetForGridSize(size.value)));

/* Overlap detection */
function fleetHasOverlap(fleet) {
  const seen = new Set();
  for (const ship of fleet) {
    for (const c of ship.cells) {
      const key = `${c.x},${c.y}`;
      if (seen.has(key)) return true;
      seen.add(key);
    }
  }
  return false;
}

const overlapExists = computed(() => fleetHasOverlap(playerFleet.value));
const canConfirmLayout = computed(() => allShipsPlaced(playerFleet.value) && !overlapExists.value);

const turnLabel = computed(() => (turn.value === "player" ? "Player" : "Computer"));

const canLaunch = computed(() => {
  if (phase.value !== "battle") return false;
  if (turn.value !== "player") return false;

  if (devMode.value) {
    if (!selectedEnemyCell.value) return false;
    const { x, y } = selectedEnemyCell.value;
    return !playerTarget.value[y][x].guessed;
  }
  return sentence.value.trim().length > 0;
});

/* ship list */
function shipStatusText(ship) { return shipStatus(ship); }

/* UPDATED: list image style depends on orientation */
function shipListImgStyle(shipSize, orientation) {
  const long = 20 + shipSize * 14;
  const thick = 16;

  // if vertical icon, we want a tall thumbnail; keep it readable
  if (orientation === "V") {
    return { width: `${thick}px`, height: `${long}px`, objectFit: "fill", opacity: 0.95 };
  }
  return { width: `${long}px`, height: `${thick}px`, objectFit: "fill", opacity: 0.95 };
}

function isPlayerShipSunk(shipId) {
  const s = getShipById(playerFleet.value, shipId);
  return !!s && s.cells.length && s.hits >= s.size;
}

/* Overlay ship src swap */
function playerShipOverlaySrc(shipId) {
  const ship = getShipById(playerFleet.value, shipId);
  if (!ship) return shipIconH;
  return shipIconFor(ship.orientation);
}

/* Drag payload */
function makeDragPayload({ shipId, source }) {
  return JSON.stringify({ shipId, source });
}
function parseDragPayload(raw) {
  try {
    const o = JSON.parse(raw);
    if (!o?.shipId) return null;
    return o;
  } catch {
    return null;
  }
}

function onShipDragStart(e, shipId) {
  if (phase.value !== "setup") return;
  e.dataTransfer?.setData("text/plain", makeDragPayload({ shipId, source: "list" }));
  e.dataTransfer?.setDragImage?.(e.currentTarget, 20, 10);
}
function onPlacedShipDragStart(e, shipId) {
  if (phase.value !== "setup") return;
  e.dataTransfer?.setData("text/plain", makeDragPayload({ shipId, source: "placed" }));
  e.dataTransfer?.setDragImage?.(e.currentTarget, 20, 10);
}
function onShipDragEnd() {}

/* cell refs */
function makeCellElGrid(n) {
  return Array.from({ length: n }, () => Array.from({ length: n }, () => null));
}

const playerWrapEl = ref(null);
const cpuWrapEl = ref(null);
const launchBtnEl = ref(null);

const playerCellEls = ref(makeCellElGrid(size.value));
const cpuCellEls = ref(makeCellElGrid(size.value));

function registerPlayerCellRef(el, x, y) {
  if (!el) return;
  playerCellEls.value[y][x] = el;
}
function registerCpuCellRef(el, x, y) {
  if (!el) return;
  cpuCellEls.value[y][x] = el;
}

/* Setup interactions */
function onPlayerCellClick({ x, y }) {
  if (phase.value !== "setup") return;
  const removed = removeShipAtCell(playerOwn.value, playerFleet.value, x, y);
  if (removed) {
    setFeedback("ok", "Ship removed.");
    scheduleOverlayRecalc();
  }
}

function onPlayerCellDrop({ x, y, data }) {
  if (phase.value !== "setup") return;

  const payload = parseDragPayload((data || "").trim());
  if (!payload) {
    setFeedback("bad", "Drop failed: invalid payload.");
    return;
  }

  const ship = getShipById(playerFleet.value, payload.shipId);
  if (!ship) {
    setFeedback("bad", "Drop failed: ship not found.");
    return;
  }

  const useOrientation = ship.orientation ?? "H";

  const wasPlaced = ship.cells.length > 0;
  const prevCells = ship.cells.map((c) => ({ ...c }));
  const prevOrientation = ship.orientation;

  if (wasPlaced) removeShip(playerOwn.value, playerFleet.value, ship.id);

  const check = canPlaceShip(playerOwn.value, ship, x, y, useOrientation);
  if (!check.ok) {
    if (wasPlaced && prevCells.length) {
      const start = prevCells[0];
      placeShip(playerOwn.value, playerFleet.value, ship.id, start.x, start.y, prevOrientation);
    }
    setFeedback("bad", `Can't place ${ship.name}: ${check.reason}`);
    scheduleOverlayRecalc();
    return;
  }

  const placed = placeShip(playerOwn.value, playerFleet.value, ship.id, x, y, useOrientation);
  if (!placed.ok) {
    if (wasPlaced && prevCells.length) {
      const start = prevCells[0];
      placeShip(playerOwn.value, playerFleet.value, ship.id, start.x, start.y, prevOrientation);
    }
    setFeedback("bad", placed.reason);
    scheduleOverlayRecalc();
    return;
  }

  setFeedback("ok", overlapExists.value ? "Placed (overlap exists)." : `Placed ${ship.name}.`);
  scheduleOverlayRecalc();
}

function rotatePlacedShip(shipId) {
  if (phase.value !== "setup") return;

  const ship = getShipById(playerFleet.value, shipId);
  if (!ship || !ship.cells.length) return;

  const start = ship.cells[0];
  const nextOri = ship.orientation === "H" ? "V" : "H";

  const prevOri = ship.orientation;
  removeShip(playerOwn.value, playerFleet.value, shipId);

  const check = canPlaceShip(playerOwn.value, ship, start.x, start.y, nextOri);
  if (!check.ok) {
    placeShip(playerOwn.value, playerFleet.value, shipId, start.x, start.y, prevOri);
    setFeedback("bad", "Cannot rotate here (out of bounds).");
    scheduleOverlayRecalc();
    return;
  }

  placeShip(playerOwn.value, playerFleet.value, shipId, start.x, start.y, nextOri);
  setFeedback("ok", overlapExists.value ? "Rotated (overlap exists)." : "Rotated.");
  scheduleOverlayRecalc();
}

/* confirm layout */
async function confirmLayout() {
  if (!canConfirmLayout.value) return;

  enemyOwn.value = createEmptyGrid(size.value);
  enemyFleet.value = createFleetRuntime(fleetForGridSize(size.value));
  assignRandomShipNames(enemyFleet.value);
  aiPlaceFleetRandom(enemyOwn.value, enemyFleet.value);

  enemyTarget.value = createEmptyGrid(size.value);

  phase.value = "battle";
  turn.value = "player";
  selectedEnemyCell.value = null;

  setFeedback("ok", "Layout locked. Fire at the enemy board (right).");
  scheduleEnemyRevealRecalc();

  // NEW: focus typing immediately
  await focusSentenceInput();
}

/* enemy board click */
function onCpuCellClick({ x, y }) {
  if (phase.value !== "battle" || turn.value !== "player") return;
  selectedEnemyCell.value = { x, y };
  if (devMode.value) void launchAtEnemy(x, y);
}

/* FX */
function makeFx() {
  return reactive({
    missile: { active: false, x: 0, y: 0 },
    impact: { active: false, x: 0, y: 0, kind: "miss" },
  });
}
const fxPlayer = makeFx();
const fxCPU = makeFx();

function clearFx(fx) { fx.missile.active = false; fx.impact.active = false; }
function missileStyle(x, y) { return { left: `${x}px`, top: `${y}px`, backgroundImage: `url(${missilePng})` }; }
function impactStyle(x, y) { return { left: `${x}px`, top: `${y}px` }; }
function toLocal(wrapRect, absX, absY) { return { x: absX - wrapRect.left, y: absY - wrapRect.top }; }

async function animateMissileFromRectToCell({ startRect, wrapEl, cellEl, fx }) {
  if (!startRect || !wrapEl || !cellEl) return null;

  clearFx(fx);
  await nextTick();

  const wrapRect = wrapEl.getBoundingClientRect();
  const cellRect = cellEl.getBoundingClientRect();

  const startAbsX = startRect.left + startRect.width / 2;
  const startAbsY = startRect.top + startRect.height / 2;

  const endAbsX = cellRect.left + cellRect.width / 2;
  const endAbsY = cellRect.top + cellRect.height / 2;

  const start = toLocal(wrapRect, startAbsX, startAbsY);
  const end = toLocal(wrapRect, endAbsX, endAbsY);

  fx.missile.active = true;
  fx.missile.x = start.x;
  fx.missile.y = start.y;

  await new Promise((r) => requestAnimationFrame(() => r()));

  const duration = 560;
  const t0 = performance.now();

  await new Promise((resolve) => {
    function step(t) {
      const p = Math.min(1, (t - t0) / duration);
      const ease = 1 - Math.pow(1 - p, 3);
      fx.missile.x = start.x + (end.x - start.x) * ease;
      fx.missile.y = start.y + (end.y - start.y) * ease;
      if (p < 1) requestAnimationFrame(step);
      else resolve();
    }
    requestAnimationFrame(step);
  });

  fx.missile.active = false;
  return end;
}

async function playImpact(fx, end, hit) {
  fx.impact.active = true;
  fx.impact.kind = hit ? "hit" : "miss";
  fx.impact.x = end.x;
  fx.impact.y = end.y;

  if (hit) sfx.explosion.play();
  else sfx.splash.play();

  await sleep(520);
  fx.impact.active = false;
}

/* enemy reveal overlays */
const enemyRevealRects = reactive({});
const sunkEnemyShips = computed(() => enemyFleet.value.filter((s) => s.cells.length && s.hits >= s.size));

function enemyShipRevealStyle(shipId) {
  const r = enemyRevealRects[shipId];
  if (!r) return { display: "none" };
  // IMPORTANT: no rotate transform anymore
  return {
    left: `${r.left}px`,
    top: `${r.top}px`,
    width: `${r.width}px`,
    height: `${r.height}px`,
  };
}

function recomputeEnemyRevealRects() {
  const wrap = cpuWrapEl.value;
  if (!wrap) return;
  const wrapRect = wrap.getBoundingClientRect();

  for (const k of Object.keys(enemyRevealRects)) delete enemyRevealRects[k];

  for (const s of sunkEnemyShips.value) {
    const first = s.cells[0];
    const last = s.cells[s.cells.length - 1];

    const elA = cpuCellEls.value[first.y]?.[first.x];
    const elB = cpuCellEls.value[last.y]?.[last.x];
    if (!elA || !elB) continue;

    const a = elA.getBoundingClientRect();
    const b = elB.getBoundingClientRect();

    const left = Math.min(a.left, b.left) - wrapRect.left;
    const top = Math.min(a.top, b.top) - wrapRect.top;
    const right = Math.max(a.right, b.right) - wrapRect.left;
    const bottom = Math.max(a.bottom, b.bottom) - wrapRect.top;

    enemyRevealRects[s.id] = { left, top, width: right - left, height: bottom - top };
  }
}

let enemyRevealRaf = 0;
function scheduleEnemyRevealRecalc() {
  if (enemyRevealRaf) cancelAnimationFrame(enemyRevealRaf);
  enemyRevealRaf = requestAnimationFrame(async () => {
    await nextTick();
    recomputeEnemyRevealRects();
  });
}

/* player overlays */
const playerOverlayRects = reactive({});
const placedPlayerShips = computed(() => playerFleet.value.filter((s) => s.cells.length === s.size));

function playerShipOverlayWrapStyle(shipId) {
  const r = playerOverlayRects[shipId];
  if (!r) return { display: "none" };
  return { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` };
}

function recomputePlayerOverlayRects() {
  const wrap = playerWrapEl.value;
  if (!wrap) return;
  const wrapRect = wrap.getBoundingClientRect();

  for (const k of Object.keys(playerOverlayRects)) delete playerOverlayRects[k];

  for (const s of placedPlayerShips.value) {
    const first = s.cells[0];
    const last = s.cells[s.cells.length - 1];

    const elA = playerCellEls.value[first.y]?.[first.x];
    const elB = playerCellEls.value[last.y]?.[last.x];
    if (!elA || !elB) continue;

    const a = elA.getBoundingClientRect();
    const b = elB.getBoundingClientRect();

    const left = Math.min(a.left, b.left) - wrapRect.left;
    const top = Math.min(a.top, b.top) - wrapRect.top;
    const right = Math.max(a.right, b.right) - wrapRect.left;
    const bottom = Math.max(a.bottom, b.bottom) - wrapRect.top;

    playerOverlayRects[s.id] = { left, top, width: right - left, height: bottom - top };
  }
}

let playerOverlayRaf = 0;
function scheduleOverlayRecalc() {
  if (playerOverlayRaf) cancelAnimationFrame(playerOverlayRaf);
  playerOverlayRaf = requestAnimationFrame(async () => {
    await nextTick();
    recomputePlayerOverlayRects();
  });
}

/* NEW: focus helper */
async function focusSentenceInput() {
  // only focus when it makes sense to type
  if (phase.value !== "battle") return;
  if (turn.value !== "player") return;
  if (devMode.value) return;

  await nextTick();
  // Wait one more frame so focus doesn't fight with click/animation
  await new Promise((r) => requestAnimationFrame(() => r()));
  sentenceInputEl.value?.focus();
  // Optional: select existing text if any
  sentenceInputEl.value?.select?.();
}

/* Launching */
async function launchAtEnemy(x, y) {
  if (playerTarget.value[y][x].guessed) {
    setFeedback("bad", "Already guessed that cell.");
    return;
  }

  const res = resolveGuess(enemyOwn.value, enemyFleet.value, playerTarget.value, x, y);

  sfx.launch.play();

  const btnRect = launchBtnEl.value?.getBoundingClientRect();
  const startY = btnRect ? btnRect.top + btnRect.height / 2 : window.innerHeight * 0.85;
  const startRect = { left: -60, top: startY - 10, width: 20, height: 20 };

  const cellEl = cpuCellEls.value[y]?.[x];
  const end = await animateMissileFromRectToCell({ startRect, wrapEl: cpuWrapEl.value, cellEl, fx: fxPlayer });

  if (end) await playImpact(fxPlayer, end, res.hit);

  setFeedback("ok", res.hit ? "HIT!" : "Miss.");

  if (allShipsSunk(enemyFleet.value)) {
    phase.value = "end";
    setFeedback("ok", "You win. All enemy ships destroyed.");
    scheduleEnemyRevealRecalc();
    return;
  }

  turn.value = "ai";
  await sleep(res.hit ? 4000 : 2000);
  await cpuTurn();
}

async function onLaunch() {
  if (!canLaunch.value) return;

  if (devMode.value) {
    const c = selectedEnemyCell.value;
    if (!c) return;
    await launchAtEnemy(c.x, c.y);
    // dev mode: no refocus needed
    return;
  }

  const parsed = parseShotSentence(sentence.value, axis);
  if (!parsed.ok) {
    setFeedback("bad", `${parsed.error} Expected: ${parsed.expected}`);
    // keep focus so they can fix it immediately
    await focusSentenceInput();
    return;
  }

  sentence.value = "";
  selectedEnemyCell.value = { x: parsed.x, y: parsed.y };

  await launchAtEnemy(parsed.x, parsed.y);

  // NEW: reselect input after firing (you asked: after hitting enter each time)
  await focusSentenceInput();
}

async function cpuTurn() {
  const pick = aiPickRandomGuess(enemyTarget.value);
  if (!pick) {
    phase.value = "end";
    setFeedback("ok", "Draw. No cells left.");
    return;
  }

  const res = resolveGuess(playerOwn.value, playerFleet.value, enemyTarget.value, pick.x, pick.y);

  sfx.launch.play();

  const btnRect = launchBtnEl.value?.getBoundingClientRect();
  const startY = btnRect ? btnRect.top + btnRect.height / 2 : window.innerHeight * 0.85;
  const startRect = { left: window.innerWidth + 60, top: startY - 10, width: 20, height: 20 };

  const cellEl = playerCellEls.value[pick.y]?.[pick.x];
  const end = await animateMissileFromRectToCell({ startRect, wrapEl: playerWrapEl.value, cellEl, fx: fxCPU });

  if (end) await playImpact(fxCPU, end, res.hit);

  setFeedback(res.hit ? "bad" : "ok", res.hit ? "Computer HIT!" : "Computer missed.");

  if (allShipsSunk(playerFleet.value)) {
    phase.value = "end";
    setFeedback("bad", "You lose. All your ships destroyed.");
    return;
  }

  turn.value = "player";

  // NEW: focus input when player's turn returns
  await focusSentenceInput();
}

/* settings + reset */
function applySettings(newSize, newLabelSetKey) {
  size.value = newSize;
  labelSetKey.value = newLabelSetKey;

  const ax = axisForGridSizeAndLabelSet(newSize, newLabelSetKey);
  axis.x = ax.x;
  axis.y = ax.y;
  axis.meta = ax.meta;
  axis.example = ax.example;

  sentenceExample.value = ax.example;

  playerCellEls.value = makeCellElGrid(newSize);
  cpuCellEls.value = makeCellElGrid(newSize);
}

function resetGameState() {
  phase.value = "setup";
  turn.value = "player";
  sentence.value = "";
  feedback.value = null;
  selectedEnemyCell.value = null;

  showPlayerShipsMenu.value = false;
  showEnemyShipsMenu.value = false;

  playerOwn.value = createEmptyGrid(size.value);
  enemyOwn.value = createEmptyGrid(size.value);
  playerTarget.value = createEmptyGrid(size.value);
  enemyTarget.value = createEmptyGrid(size.value);

  playerFleet.value = createFleetRuntime(fleetForGridSize(size.value));
  enemyFleet.value = createFleetRuntime(fleetForGridSize(size.value));

  assignRandomShipNames(playerFleet.value);
  assignRandomShipNames(enemyFleet.value);

  clearFx(fxPlayer);
  clearFx(fxCPU);

  scheduleOverlayRecalc();
  scheduleEnemyRevealRecalc();
}

function startSolo() {
  applySettings(menuGridSize.value, menuLabelSetKey.value);
  screen.value = "game";
  resetGameState();
  setFeedback("ok", "Setup: open Ships → place ships → fix overlaps → Confirm Layout.");
}

/* outside click closes dropdowns */
function onDocMouseDown() {
  if (showPlayerShipsMenu.value) showPlayerShipsMenu.value = false;
  if (showEnemyShipsMenu.value) showEnemyShipsMenu.value = false;
}

onMounted(() => {
  applySettings(size.value, labelSetKey.value);

  window.addEventListener("resize", scheduleOverlayRecalc);
  window.addEventListener("resize", scheduleEnemyRevealRecalc);
  document.addEventListener("mousedown", onDocMouseDown);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", scheduleOverlayRecalc);
  window.removeEventListener("resize", scheduleEnemyRevealRecalc);
  document.removeEventListener("mousedown", onDocMouseDown);
});

watch([phase, playerFleet, playerOwn], () => scheduleOverlayRecalc(), { deep: true });
watch([enemyFleet, playerTarget], () => scheduleEnemyRevealRecalc(), { deep: true });

// Optional: if devMode toggles OFF during battle+player turn, refocus immediately
watch(devMode, async (v) => {
  if (!v) await focusSentenceInput();
});
</script>



<style scoped>
/* unchanged styling from your last file (kept as-is) */
.bs-page {
  min-height: 100vh;
  background: radial-gradient(circle at 30% 20%, rgba(80,255,190,0.08), rgba(0,0,0,0.0) 45%),
              linear-gradient(180deg, #051723, #021018);
  overflow: hidden;
  color: rgba(200, 255, 235, 0.95);
}

.bs-game {
  min-height: 100vh;
  padding: 12px;
  max-width: 1500px;
  margin: 0 auto;
  display: grid;
  grid-template-rows: auto 1fr auto auto;
  gap: 10px;
}

.bs-hud { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
.bs-title { font-size: 18px; font-weight: 1000; }
.bs-sub { font-size: 12px; opacity: 0.85; margin-top: 2px; }
.dot { padding: 0 6px; opacity: 0.6; }

.btn {
  height: 34px;
  padding: 0 10px;
  border: 2px solid rgba(80,255,190,0.45);
  background: rgba(5, 25, 35, 0.55);
  color: rgba(200, 255, 235, 0.95);
  border-radius: 0;
  cursor: pointer;
  font-weight: 900;
}
.btn:disabled { opacity: 0.55; cursor: not-allowed; }

.bs-boards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  align-items: start;
  min-height: 0;
}

.board {
  border: 2px solid rgba(80,255,190,0.30);
  background: rgba(5, 25, 35, 0.30);
  padding: 10px;
  min-height: 0;
  position: relative;
}

.board-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.section-title { font-weight: 1000; }

.board-head-actions {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
}

.board-wrap {
  position: relative;
  border: 2px solid rgba(80,255,190,0.20);
  background: rgba(5, 25, 35, 0.28);
  padding: 10px;
  height: min(66vh, 720px);
}

/* Ships dropdown opens RIGHT of button */
.ships-dropdown {
  position: absolute;
  left: calc(100% + 10px);
  top: 0;
  width: 360px;
  max-height: 420px;
  overflow: auto;
  z-index: 60;
  border: 2px solid rgba(80,255,190,0.30);
  background: rgba(5, 25, 35, 0.92);
  padding: 10px;
}

.fleet-title { font-weight: 1000; margin-bottom: 8px; }
.fleet-list { display: grid; gap: 8px; margin-bottom: 10px; }

.ship-row {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  align-items: center;
  padding: 8px;
  border: 2px solid rgba(80,255,190,0.18);
  background: rgba(5, 25, 35, 0.35);
  cursor: grab;
}
.ship-row.placed { opacity: 0.85; }
.ship-row:active { cursor: grabbing; }

.ship-meta { display: grid; gap: 2px; }
.ship-name { font-weight: 1000; font-size: 13px; }
.ship-status { font-size: 12px; opacity: 0.9; }

.setup-controls {
  border: 2px solid rgba(80,255,190,0.22);
  background: rgba(5, 25, 35, 0.35);
  padding: 8px;
  margin-bottom: 10px;
}
.setup-row { display: flex; justify-content: space-between; gap: 10px; font-size: 13px; margin-bottom: 6px; }
.setup-hint { font-size: 12px; opacity: 0.9; }

.overlap-warn {
  margin-top: 8px;
  border: 2px solid rgba(255, 140, 140, 0.55);
  background: rgba(120, 20, 20, 0.35);
  padding: 6px 8px;
  font-weight: 1000;
  font-size: 12px;
}

.confirm-btn {
  width: 100%;
  height: 42px;
  border: 2px solid rgba(80,255,190,0.35);
  background: rgba(5, 55, 45, 0.55);
  color: rgba(220, 255, 245, 1);
  cursor: pointer;
  font-weight: 1000;
}
.confirm-btn:disabled { opacity: 0.55; cursor: not-allowed; }

/* FX */
.fx-layer {
  pointer-events: none;
  position: absolute;
  inset: 10px;
  z-index: 40;
}

.missile {
  position: absolute;
  width: 26px;
  height: 26px;
  transform: translate(-50%, -50%);
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}

.impact {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 18px;
  height: 18px;
}
.impact .burst {
  width: 100%;
  height: 100%;
  border: 2px solid rgba(80,255,190,0.55);
  animation: burst 520ms ease-out forwards;
}
.impact.hit .burst { background: rgba(255, 255, 255, 0.12); border-color: rgba(255,255,255,0.55); }
.impact.miss .burst { background: rgba(80,255,190,0.10); }

@keyframes burst {
  0% { transform: scale(0.6); opacity: 1; border-radius: 0; }
  70% { transform: scale(3.0); opacity: 0.9; border-radius: 18px; }
  100% { transform: scale(3.6); opacity: 0; border-radius: 28px; }
}

/* Player ship overlay wrapper */
.ship-overlay-layer {
  pointer-events: none;
  position: absolute;
  inset: 10px;
  z-index: 20;
}
.ship-overlay-wrap {
  pointer-events: auto;
  position: absolute;
  cursor: grab;
}
.ship-overlay {
  width: 100%;
  height: 100%;
  opacity: 0.85;
  transition: opacity 600ms ease;
}
.ship-overlay.sunk { opacity: 0.22; }

/* Rotate button hovering top-left */
.rotate-btn {
  position: absolute;
  left: -10px;
  top: -10px;
  z-index: 5;
  width: 28px;
  height: 28px;
  border-radius: 0;
  border: 2px solid rgba(80,255,190,0.45);
  background: rgba(2, 12, 18, 0.85);
  color: rgba(200,255,235,0.95);
  font-weight: 1000;
  cursor: pointer;
}
.rotate-btn:active { transform: translateY(1px); }

/* Enemy reveal overlay */
.ship-reveal-layer {
  pointer-events: none;
  position: absolute;
  inset: 10px;
  z-index: 20;
}
.enemy-ship-reveal {
  position: absolute;
  object-fit: fill;
  opacity: 0.0;
  animation: reveal 900ms ease forwards;
}
@keyframes reveal {
  0% { opacity: 0.0; }
  100% { opacity: 0.85; }
}

/* Status bar */
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 2px solid rgba(80,255,190,0.20);
  background: rgba(5, 25, 35, 0.35);
  padding: 10px;
}
.status-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.status-pill {
  border: 2px solid rgba(80,255,190,0.22);
  background: rgba(2, 12, 18, 0.55);
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 1000;
}
.status-pill.good { border-color: rgba(80,255,190,0.35); }
.status-pill.warn { border-color: rgba(255, 210, 120, 0.35); }
.status-pill.end { border-color: rgba(255, 140, 140, 0.35); }

.status-right {
  font-size: 13px;
  font-weight: 1000;
}
.status-right.bad { color: rgba(255, 190, 190, 0.95); }

/* Bottom input */
.bottom-bar {
  border: 2px solid rgba(80,255,190,0.20);
  background: rgba(5, 25, 35, 0.35);
  padding: 12px;
}
.bottom-row {
  display: grid;
  grid-template-columns: minmax(360px, 820px) 240px;
  justify-content: center;
  gap: 12px;
  align-items: center;
}

.sentence-input {
  height: 56px;
  border: 2px solid rgba(255,255,255,0.35);
  background: rgba(0, 0, 0, 0.55);
  color: rgba(240, 255, 250, 0.98);
  padding: 0 14px;
  font-size: 16px;
  font-weight: 700;
}

.launch-wrap { position: relative; height: 56px; }

.launch-btn {
  position: relative;
  z-index: 2;
  width: 100%;
  height: 56px;
  border: 2px solid rgba(255, 120, 120, 0.65);
  background: rgba(200, 30, 30, 0.85);
  color: rgba(255, 255, 255, 0.98);
  font-weight: 1000;
  cursor: pointer;
}
.launch-btn:disabled { opacity: 0.55; cursor: not-allowed; }

.armed-missile {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: grid;
  align-items: center;
  justify-items: start;
  overflow: hidden;
  pointer-events: none;
}
.armed-missile img {
  width: 38px;
  height: 38px;
  transform: translateX(-70px);
  opacity: 0;
  transition: transform 900ms ease, opacity 900ms ease;
}
.armed-missile.armed img {
  transform: translateX(10px);
  opacity: 1;
}

.bottom-tools {
  display: flex;
  justify-content: center;
  margin-top: 10px;
}
.dev-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 900;
}

/* MAIN MENU opaque backdrop */
.bs-menu {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  z-index: 200;
}
.menu-opaque {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.92);
}
.menu-card {
  position: relative;
  width: min(520px, 92vw);
  border: 2px solid rgba(80,255,190,0.35);
  background: rgba(5, 25, 35, 0.75);
  padding: 18px;
  display: grid;
  gap: 12px;
}
.menu-title { font-weight: 1000; font-size: 22px; }
.menu-sub { font-size: 13px; opacity: 0.85; }

.menu-settings {
  display: grid;
  gap: 10px;
  border: 2px solid rgba(80,255,190,0.20);
  background: rgba(5, 25, 35, 0.35);
  padding: 10px;
}
.setting-label { font-weight: 1000; margin-bottom: 4px; }
.setting-help { font-size: 12px; opacity: 0.85; margin-top: 4px; }

.select {
  width: 100%;
  height: 40px;
  border: 2px solid rgba(80,255,190,0.25);
  background: rgba(2, 12, 18, 0.65);
  color: rgba(200, 255, 235, 0.95);
  padding: 0 10px;
  font-weight: 900;
}

.menu-btn {
  height: 44px;
  border: 2px solid rgba(80,255,190,0.35);
  background: rgba(5, 55, 45, 0.55);
  color: rgba(220, 255, 245, 1);
  font-weight: 1000;
  cursor: pointer;
}
.menu-btn.disabled { opacity: 0.5; cursor: not-allowed; }

/* In-game menu overlay */
.overlay {
  position: fixed;
  inset: 0;
  z-index: 250;
  display: grid;
  place-items: center;
}
.overlay-bg {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.70);
}
.overlay-card {
  position: relative;
  width: min(360px, 92vw);
  border: 2px solid rgba(80,255,190,0.35);
  background: rgba(5, 25, 35, 0.90);
  padding: 14px;
  display: grid;
  gap: 10px;
}
.overlay-title {
  font-weight: 1000;
  font-size: 18px;
  margin-bottom: 4px;
}
.overlay-btn {
  height: 44px;
  border: 2px solid rgba(80,255,190,0.35);
  background: rgba(5, 55, 45, 0.55);
  color: rgba(220, 255, 245, 1);
  font-weight: 1000;
  cursor: pointer;
}
.overlay-btn.ghost { background: rgba(2, 12, 18, 0.55); }



/* Make enemy dropdown open left so it doesn’t cover enemy board as badly */
.ships-dropdown.enemy {
  left: auto;
  right: calc(100% + 10px);
}

.confirm-inline {
  height: 30px;
  padding: 0 10px;
  border: 2px solid rgba(80, 255, 190, 0.35);
  background: rgba(5, 55, 45, 0.55);
  color: rgba(220, 255, 245, 1);
  font-weight: 1000;
  cursor: pointer;
}
.confirm-inline:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.status-warn {
  font-size: 12px;
  font-weight: 1000;
  color: rgba(255, 190, 190, 0.95);
  border: 2px solid rgba(255, 140, 140, 0.45);
  background: rgba(120, 20, 20, 0.25);
  padding: 2px 8px;
}

/* Enemy dropdown open opposite direction (keeps board visible) */
.ships-dropdown.enemy {
  left: auto;
  right: calc(100% + 10px);
}

/* Ship list thumbnails: allow tall thumbnails without breaking layout */
.ship-img {
  display: block;
}

/* IMPORTANT: remove any rotate-based styling on overlays/reveals if you still have it elsewhere */
.ship-overlay {
  width: 100%;
  height: 100%;
  object-fit: fill;
  opacity: 0.85;
  transition: opacity 600ms ease;
}
.ship-overlay.sunk {
  opacity: 0.22;
}
</style>