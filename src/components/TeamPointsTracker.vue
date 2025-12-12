<template>
  <section class="team-points-tracker" v-if="displayedTeams.length">
    <!-- Re-open button when collapsed -->
    <button v-if="isCollapsed" type="button" class="reopen-btn" @click="isCollapsed = false" title="Show team scores">
      ▾
    </button>

    <!-- Sliding tracker shell -->
    <transition name="tracker-slide">
      <div v-if="!isCollapsed" class="tracker-shell">
        <!-- Main bar: [collapse+edit+fullscreen] [tabs] [ +/- ] -->
        <div class="tracker-row">
          <!-- Left stack: collapse + edit + fullscreen -->
          <div class="left-stack">
            <button type="button" class="stack-btn collapse-btn" @click="isCollapsed = true" title="Hide team bar">
              ▴
            </button>

            <button type="button" class="stack-btn edit-btn" @click="onEditClick"
              :disabled="selectedIndex < 0 || selectedIndex >= displayedTeams.length" title="Edit selected team">
              ✏
            </button>

            <button type="button" class="stack-btn fullscreen-btn" @click="toggleFullscreen"
              :aria-pressed="isFullscreen" :title="isFullscreen ? 'Close scoreboard view' : 'Open scoreboard view'">
              ⛶
            </button>
          </div>

          <!-- Center: Tabs row (hanging from above) -->
          <div class="tabs-row">
            <button v-for="(team, index) in displayedTeams" :key="team.id" class="team-tab" :class="{
              'is-selected': index === selectedIndex,
              'is-leader': index === leaderIndex
            }" type="button" @click="onTabClick(index)">
              <div class="tab-inner">
                <span class="team-name">
                  {{ team.name || `Team ${index + 1}` }}
                </span>
                <span class="team-points">
                  {{ team.points }}
                </span>

                <!-- Power-up chips -->
                <div v-if="team.powerUps && team.powerUps.length" class="team-powerups">
                  <span v-for="(pu, i) in team.powerUps" :key="`${team.id}-pu-${i}`" class="powerup-chip" :class="[
                    `tier-${pu.tier}`,
                    pu.scope === 'round' ? 'is-round' : 'is-next'
                  ]">
                    {{ shortPowerUpLabel(pu.id, pu.label) }}
                  </span>
                </div>
              </div>

              <!-- Floating crown for leader -->
              <span v-if="leaderIndex === index && showCrown" class="leader-crown" aria-label="Current leader"
                role="img">
                👑
              </span>
            </button>
          </div>

          <!-- Right: Add / Remove team controls (stacked) -->
          <div class="team-controls">
            <!-- Clear all perks button -->
            <button class="side-btn" type="button" @click="clearRoundPowerUps" title="Remove all perks from all teams">
              🚫
            </button>
            <button class="side-btn" type="button" :disabled="!canRemoveTeam" @click="removeTeam" title="Remove team">
              −
            </button>
            <button class="side-btn" type="button" :disabled="!canAddTeam" @click="addTeam" title="Add team">
              ＋
            </button>
          </div>
        </div>

        <!-- Inline edit panel under selected tab -->
        <div v-if="isEditing && selectedIndex !== -1" class="edit-panel" ref="editPanelRef">
          <div class="edit-field">
            <label>
              Team name
              <input v-model="editForm.name" type="text" maxlength="24" />
            </label>
          </div>

          <div class="edit-field">
            <label>
              Points
              <input v-model.number="editForm.points" type="number" step="1" />
            </label>
          </div>

          <div class="edit-field powerups-field" v-if="editForm.powerUps && editForm.powerUps.length">
            <label>
              Power-ups
              <div class="edit-powerups-list">
                <button v-for="(pu, i) in editForm.powerUps" :key="`edit-pu-${i}-${pu.id}`" type="button"
                  class="edit-powerup-chip" @click="removePowerUpAt(i)">
                  <span class="chip-label">
                    {{ shortPowerUpLabel(pu.id, pu.label) }}
                  </span>
                  <span class="chip-remove">✕</span>
                </button>
              </div>
            </label>
          </div>

          <div class="edit-actions">
            <button type="button" class="btn small danger" :disabled="!canRemoveTeam" @click="removeTeamFromEdit">
              Delete
            </button>
            <button type="button" class="btn small primary" @click="applyEdit">
              Save
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- FULLSCREEN SCOREBOARD MODAL (teleported to body, centered on screen) -->
    <!-- FULLSCREEN SCOREBOARD MODAL (teleported to body, centered on screen) -->
    <Teleport to="body">
      <div v-if="isFullscreen" class="fullscreen-overlay" @click.self="closeFullscreen">
        <div class="fullscreen-modal">
          <header class="fullscreen-header">
            <h2 class="fullscreen-title">
              Team Scores
            </h2>
            <button type="button" class="btn small secondary" @click="closeFullscreen">
              Close
            </button>
          </header>

          <div class="fullscreen-grid">
            <article v-for="(team, index) in displayedTeams" :key="team.id" class="fullscreen-card"
              :class="{ 'is-leader': index === leaderIndex }">
              <div v-if="index === leaderIndex && showCrown" class="fullscreen-crown" aria-label="Current leader"
                role="img">
                👑
              </div>
              <div class="fullscreen-name">
                {{ team.name || `Team ${index + 1}` }}
              </div>
              <div class="fullscreen-points">
                {{ team.points }}
              </div>
            </article>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- IMMEDIATE EFFECT OVERLAY (steal / give / etc. from Mystery Machine) -->
    <Teleport to="body">
      <div v-if="immediateEffectState" class="fullscreen-overlay" @click.self="cancelImmediateEffect">
        <div class="fullscreen-modal">
          <header class="fullscreen-header">
            <h2 class="fullscreen-title">
              {{ immediateEffectTitle }}
            </h2>
            <button type="button" class="btn small secondary" @click="cancelImmediateEffect">
              Cancel
            </button>
          </header>

          <p class="fullscreen-subtitle">
            {{ immediateEffectSubtitle }}
          </p>

          <div class="fullscreen-grid">
            <article v-for="(team, index) in displayedTeams" :key="'effect-' + team.id" class="fullscreen-card" :class="{
              'is-leader': index === leaderIndex,
              'is-disabled': index === immediateEffectState?.sourceIndex
            }" @click="onImmediateEffectTargetClick(index)">
              <div v-if="index === leaderIndex && showCrown" class="fullscreen-crown" aria-label="Current leader"
                role="img">
                👑
              </div>
              <div class="fullscreen-name">
                {{ team.name || `Team ${index + 1}` }}
              </div>
              <div class="fullscreen-points">
                {{ team.points }}
              </div>
            </article>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- RAIN OF POINTS FLASH LABEL -->
    <Teleport to="body">
      <transition name="rain-pop">
        <div v-if="showRainOverlay" class="rain-overlay">
          <div class="rain-label">
            🌧️ Rain of Points! 🌈
          </div>
        </div>
      </transition>
    </Teleport>

  </section>
</template>


<script setup lang="ts">
import {
  computed,
  reactive,
  ref,
  watch,
  onMounted,
  onBeforeUnmount,
} from "vue";

interface HeldPower {
  id: string; // e.g. "t1_flip2_pick1", "t1_reflip", etc.
  label: string;
  tier: number;
  source?: string;
  wager?: number;
  scope?: "next-card" | "round";
}

interface Team {
  id: number;
  name: string;
  points: number;
  powerUps?: HeldPower[];
}

interface PrizePayload {
  id: string;
  tier: number;
  label: string;
  source: "mystery";
  wager: number;
}

const props = defineProps<{
  teams?: Team[];
  /** Max number of teams (hard cap 8). */
  maxTeams?: number;
}>();

const emit = defineEmits<{
  (e: "update:teams", teams: Team[]): void;
  (e: "team-selected", team: Team | null): void;
}>();

// Max 8, min 1; default max is 8.
const maxTeamsClamped = computed(() => {
  const raw = props.maxTeams ?? 8;
  return Math.min(Math.max(raw, 1), 8);
});

const localTeams = ref<Team[]>([]);
const selectedIndex = ref(-1);
const isEditing = ref(false);
const isFullscreen = ref(false);
const isCollapsed = ref(true);
const showRainOverlay = ref(false);

const editForm = reactive<{
  name: string;
  points: number;
  powerUps: HeldPower[];
}>({
  name: "",
  points: 0,
  powerUps: [],
});


const editPanelRef = ref<HTMLElement | null>(null);

/* ---- Sync from props.teams and initialize ---- */
watch(
  () => props.teams,
  (newVal: Team[] | undefined) => {
    if (Array.isArray(newVal) && newVal.length > 0) {
      localTeams.value = newVal
        .slice(0, maxTeamsClamped.value)
        .map((t: Team, i: number) => ({
          id: t.id ?? i,
          name: t.name ?? `Team ${i + 1}`,
          points: Number.isFinite(t.points) ? t.points : 0,
          powerUps: Array.isArray(t.powerUps) ? [...t.powerUps] : [],
        }));
    } else if (!localTeams.value.length) {
      const defaultCount = Math.min(4, maxTeamsClamped.value);
      localTeams.value = Array.from({ length: defaultCount }).map(
        (_: unknown, i: number) => ({
          id: i,
          name: `Team ${i + 1}`,
          points: 0,
          powerUps: [],
        }),
      );
    }
  },
  { immediate: true, deep: true },
);

const displayedTeams = computed(() =>
  localTeams.value.slice(0, maxTeamsClamped.value),
);

/* ---- Helpers ---- */
function getTeamAt(index: number): Team | null {
  if (index < 0 || index >= localTeams.value.length) return null;
  return localTeams.value[index];
}

function updateTeamAt(index: number, team: Team): void {
  const updated = [...localTeams.value];
  updated[index] = team;
  localTeams.value = updated;
  emit("update:teams", updated);
}

/* ---- Tab selection / deselection ---- */
function onTabClick(index: number): void {
  if (selectedIndex.value === index) {
    selectedIndex.value = -1;
    isEditing.value = false;
    emit("team-selected", null);
  } else {
    selectedIndex.value = index;
    isEditing.value = false;
    emit("team-selected", displayedTeams.value[index] ?? null);
  }
}

/* ---- Edit button ---- */
function onEditClick(): void {
  const idx = selectedIndex.value;
  if (idx < 0 || idx >= displayedTeams.value.length) return;

  isEditing.value = !isEditing.value;
  if (isEditing.value) {
    const team = displayedTeams.value[idx];
    editForm.name = team.name;
    editForm.points = team.points;
    editForm.powerUps = Array.isArray(team.powerUps)
      ? [...team.powerUps]
      : [];
  }
}


function applyEdit(): void {
  if (
    selectedIndex.value < 0 ||
    selectedIndex.value >= displayedTeams.value.length
  ) {
    return;
  }

  const idx = selectedIndex.value;
  const updated = [...localTeams.value];

  const cleanPoints = Number.isFinite(editForm.points)
    ? Math.round(editForm.points)
    : 0;

  const existing = updated[idx];
  updated[idx] = {
    ...existing,
    name: editForm.name.trim() || `Team ${idx + 1}`,
    points: cleanPoints,
    powerUps: [...editForm.powerUps], // ← use edited chips
  };

  localTeams.value = updated;
  emit("update:teams", updated);
  isEditing.value = false;
}


// Close edit panel when clicking outside of it
function onGlobalPointerDown(evt: PointerEvent): void {
  if (!isEditing.value) return;
  const panel = editPanelRef.value;
  if (!panel) return;

  const target = evt.target as Node | null;
  if (!target) return;

  if (!panel.contains(target)) {
    isEditing.value = false;
  }
}

/* ----- Leader logic ----- */
const leaderIndex = computed(() => {
  const teams = displayedTeams.value;
  if (!teams.length) return -1;

  let max = -Infinity;
  let maxIndex = -1;
  teams.forEach((team: Team, i: number) => {
    if (team.points > max) {
      max = team.points;
      maxIndex = i;
    }
  });

  if (max <= 0) return -1;
  return maxIndex;
});

const showCrown = computed(() => leaderIndex.value !== -1);

/* -------- Add / Remove Team logic (max 8) -------- */

const canAddTeam = computed(
  () => localTeams.value.length < maxTeamsClamped.value,
);
const canRemoveTeam = computed(() => localTeams.value.length > 1);

function addTeam(): void {
  if (!canAddTeam.value) return;

  const current = [...localTeams.value];
  const nextIndex = current.length;
  const maxExistingId =
    current.length > 0 ? Math.max(...current.map((t: Team) => t.id)) : -1;

  const newTeam: Team = {
    id: maxExistingId + 1,
    name: `Team ${nextIndex + 1}`,
    points: 0,
    powerUps: [],
  };

  current.push(newTeam);
  localTeams.value = current;
  selectedIndex.value = nextIndex;
  isEditing.value = false;

  emit("update:teams", current);
  emit("team-selected", newTeam);
}

function removeTeam(): void {
  if (!canRemoveTeam.value) return;
  const idx = selectedIndex.value;
  if (idx < 0) return;
  removeTeamByIndex(idx);
}

function removeTeamFromEdit(): void {
  if (!canRemoveTeam.value) return;
  if (
    selectedIndex.value < 0 ||
    selectedIndex.value >= displayedTeams.value.length
  ) {
    return;
  }
  removeTeamByIndex(selectedIndex.value);
}

function removeTeamByIndex(idx: number): void {
  const current = [...localTeams.value];
  if (idx < 0 || idx >= current.length) return;

  current.splice(idx, 1);

  const newIndex = Math.min(idx, current.length - 1);
  selectedIndex.value = current.length ? Math.max(newIndex, 0) : -1;
  isEditing.value = false;

  localTeams.value = current;
  emit("update:teams", current);
  emit("team-selected", current[selectedIndex.value] ?? null);
}

function removePowerUpAt(puIndex: number): void {
  if (puIndex < 0 || puIndex >= editForm.powerUps.length) return;
  editForm.powerUps.splice(puIndex, 1);
}


/* -------- Fullscreen helpers -------- */

function toggleFullscreen(): void {
  isFullscreen.value = !isFullscreen.value;
}

function closeFullscreen(): void {
  isFullscreen.value = false;
}

/* -------- Exposed helpers for RandomPoints / scoring -------- */

/**
 * Simple: just add delta to the selected team.
 * Powers do NOT change scoring (cosmetic only).
 */
function applyDeltaToSelected(delta: number): void {
  if (!displayedTeams.value.length || !Number.isFinite(delta)) return;

  const idx = selectedIndex.value;
  if (idx < 0 || idx >= displayedTeams.value.length) return;

  const team = getTeamAt(idx);
  if (!team) return;

  const finalDelta = Math.round(delta);

  const updatedTeam: Team = {
    ...team,
    points: (team.points ?? 0) + finalDelta,
    powerUps: team.powerUps ?? [],
  };
  updateTeamAt(idx, updatedTeam);
}

function addPoints(teamIndex: number, delta: number): void {
  if (teamIndex < 0 || teamIndex >= localTeams.value.length) return;
  if (!Number.isFinite(delta)) return;

  const team = getTeamAt(teamIndex);
  if (!team) return;

  const updatedTeam: Team = {
    ...team,
    points: team.points + Math.round(delta),
    powerUps: team.powerUps ?? [],
  };
  updateTeamAt(teamIndex, updatedTeam);
}

function setPoints(teamIndex: number, value: number): void {
  if (teamIndex < 0 || teamIndex >= localTeams.value.length) return;

  const team = getTeamAt(teamIndex);
  if (!team) return;

  const updatedTeam: Team = {
    ...team,
    points: Math.round(value),
    powerUps: team.powerUps ?? [],
  };
  updateTeamAt(teamIndex, updatedTeam);
}

/* ----- Power-up helpers (chips) ----- */

function addHeldPowerUp(
  teamIndex: number,
  effectId: string,
  tier: number,
  label: string,
  scope: "next-card" | "round",
): void {
  if (teamIndex < 0 || teamIndex >= localTeams.value.length) return;
  const team = getTeamAt(teamIndex);
  if (!team) return;

  const existing = team.powerUps ?? [];
  const next: HeldPower[] = [...existing, { id: effectId, tier, label, scope }];

  const updatedTeam: Team = {
    ...team,
    powerUps: next,
  };
  updateTeamAt(teamIndex, updatedTeam);
}

/**
 * For now, all stored powers are treated as round-based chips.
 * On New Round, all chips are cleared.
 */
function addPrizeToSelected(prize: PrizePayload): void {
  const idx = selectedIndex.value;
  if (idx < 0 || idx >= displayedTeams.value.length) return;

  addHeldPowerUp(
    idx,
    prize.id,
    prize.tier,
    prize.label,
    "round", // show dashed border and clear on New Round
  );
}

/**
 * Return a COPY of the held powers for the currently selected team.
 */
function getHeldPowersForSelected(): HeldPower[] {
  const idx = selectedIndex.value;
  if (idx < 0 || idx >= localTeams.value.length) return [];
  const team = localTeams.value[idx];
  return Array.isArray(team.powerUps) ? [...team.powerUps] : [];
}

/**
 * Consume a power by id.
 */
function consumeHeldPower(id: string): void {
  const idx = selectedIndex.value;
  if (idx < 0 || idx >= localTeams.value.length) return;

  const team = getTeamAt(idx);
  if (!team) return;

  const powers = Array.isArray(team.powerUps) ? [...team.powerUps] : [];
  const removeIndex = powers.findIndex((p: HeldPower) => p.id === id);
  if (removeIndex === -1) return;

  powers.splice(removeIndex, 1);

  const updatedTeam: Team = {
    ...team,
    powerUps: powers,
  };
  updateTeamAt(idx, updatedTeam);
}

/**
 * Clear ALL power-ups from every team when New Round is pressed.
 */
function clearRoundPowerUps(): void {
  const updated = localTeams.value.map((t: Team) => ({
    ...t,
    powerUps: [],
  }));
  localTeams.value = updated;
  emit("update:teams", updated);
}

/* ----- IMMEDIATE MYSTERY EFFECTS (steal / give / etc.) ----- */

type ImmediateMode =
  | "steal40_one"
  | "give40_one"
  | "swap_any_team";

interface ImmediateEffectState {
  mode: ImmediateMode;
  prize: PrizePayload;
  sourceIndex: number; // the team that won the prize
}

const immediateEffectState = ref<ImmediateEffectState | null>(null);

const immediateEffectTitle = computed(() => {
  const s = immediateEffectState.value;
  if (!s) return "";
  switch (s.mode) {
    case "steal40_one":
      return "Steal 40 points";
    case "give40_one":
      return "Give 40 points";
    case "swap_any_team":
      return "Swap scores with a team";
  }
});

const immediateEffectSubtitle = computed(() => {
  const s = immediateEffectState.value;
  if (!s) return "";
  switch (s.mode) {
    case "steal40_one":
      return "Click a team to steal 40 points from them.";
    case "give40_one":
      return "Click a team to give them 40 points.";
    case "swap_any_team":
      return "Click a team to swap total scores with them.";
  }
});

function triggerRainOfPoints(src: number): void {
  const teams = localTeams.value;
  if (!teams.length) return;

  // Show big label
  showRainOverlay.value = true;

  // After a short delay, apply the points and hide label
  window.setTimeout(() => {
    teams.forEach((_team, i) => {
      if (i === src) {
        // Team that drew the card
        addPoints(i, 80);
      } else {
        // All other teams
        addPoints(i, 40);
      }
    });

    showRainOverlay.value = false;
  }, 900); // tweak duration if you want
}


/**
 * Entry point called from RandomPoints / MysteryMachine:
 * opens the correct selection overlay or applies auto effects.
 */
function resolveImmediateMysteryEffect(prize: PrizePayload): void {
  const src = selectedIndex.value;
  if (src < 0 || src >= displayedTeams.value.length) return;

  switch (prize.id) {
    case "t2_steal40_one":
      immediateEffectState.value = {
        mode: "steal40_one",
        prize,
        sourceIndex: src,
      };
      return;

    case "t2_give40_one":
      immediateEffectState.value = {
        mode: "give40_one",
        prize,
        sourceIndex: src,
      };
      return;

    case "t3_swap_any_team":
      // Swap total scores with any one team.
      immediateEffectState.value = {
        mode: "swap_any_team",
        prize,
        sourceIndex: src,
      };
      return;

    case "t3_rain_of_points": {
      // NEW: automatic, affects all teams
      triggerRainOfPoints(src);
      return;
    }

    case "t3_steal20_each": {
      // Immediate effect, no choice: steal 20 from every other team.
      const teams = localTeams.value;
      if (teams.length <= 1) return;

      let totalStolen = 0;
      teams.forEach((_, i) => {
        if (i === src) return;
        addPoints(i, -20);
        totalStolen += 20;
      });
      if (totalStolen !== 0) {
        addPoints(src, totalStolen);
      }
      return;
    }

    default:
      // Other prizes are stored as chips elsewhere.
      return;
  }
}


function cancelImmediateEffect(): void {
  immediateEffectState.value = null;
}

/**
 * When a team is clicked in the immediate effect overlay.
 */
function onImmediateEffectTargetClick(targetIndex: number): void {
  const s = immediateEffectState.value;
  if (!s) return;

  const src = s.sourceIndex;
  if (targetIndex < 0 || targetIndex >= localTeams.value.length) return;

  // For all of these modes, you cannot select yourself as the target.
  if (targetIndex === src) return;

  switch (s.mode) {
    case "steal40_one": {
      addPoints(targetIndex, -40);
      addPoints(src, 40);
      break;
    }
    case "give40_one": {
      // Give +40 to the chosen team; does NOT cost the source team.
      addPoints(targetIndex, 40);
      break;
    }
    case "swap_any_team": {
      const srcTeam = getTeamAt(src);
      const dstTeam = getTeamAt(targetIndex);
      if (!srcTeam || !dstTeam) break;
      const srcPoints = srcTeam.points;
      const dstPoints = dstTeam.points;
      setPoints(src, dstPoints);
      setPoints(targetIndex, srcPoints);
      break;
    }
  }

  immediateEffectState.value = null;
}

/* ---- label helper for chips ---- */
function shortPowerUpLabel(id: string, fallback: string): string {
  switch (id) {
    case "t1_reflip":
      return "Re-flip";
    case "t1_flip2_pick1":
      return "2→1";
    case "t1_shield":
      return "Shield";
    case "t2_double_next":
      return "x2";
    case "t3_triple_next":
      return "x3";
    case "t2_steal40_one":
      return "Steal 40";
    case "t2_give40_one":
      return "Give 40";
    case "t3_steal20_each":
      return "Steal 20 each";
    case "t3_swap_any_team":
      return "Swap";
    case "t3_rain_of_points":
      return "Rain";
    default:
      return fallback;
  }
}

defineExpose({
  addPoints,
  setPoints,
  applyDeltaToSelected,
  addPrizeToSelected,
  getHeldPowersForSelected,
  consumeHeldPower,
  clearRoundPowerUps,
  resolveImmediateMysteryEffect,
});

/* ---- lifecycle ---- */
onMounted(() => {
  window.addEventListener("pointerdown", onGlobalPointerDown, {
    capture: true,
  });
});

onBeforeUnmount(() => {
  window.removeEventListener("pointerdown", onGlobalPointerDown, {
    capture: true,
  });
});
</script>


<style scoped>
/* Root is overlayed; tabs start above the top of the viewport. */
.team-points-tracker {
  position: fixed;
  top: -40px;
  /* tab tops stay off-screen even when selected */
  left: 0;
  width: 100%;
  z-index: 500;
  /* above card grid */
  display: flex;
  justify-content: center;
}

/* Inner shell that participates in slide animation */
.tracker-shell {
  width: 100%;
  max-width: 1100px;
  margin-top: 16px;
  /* pulls visible part slightly down */
}

/* Slide animation for open/close */
.tracker-slide-enter-active,
.tracker-slide-leave-active {
  transition:
    transform 200ms ease,
    opacity 200ms ease;
}

.tracker-slide-enter-from,
.tracker-slide-leave-to {
  transform: translateY(-40px);
  opacity: 0;
}

.tracker-slide-enter-to,
.tracker-slide-leave-from {
  transform: translateY(0);
  opacity: 1;
}

/* Reopen button when collapsed */
.reopen-btn {
  position: fixed;
  top: 4px;
  left: 50%;
  transform: translateX(-50%);
  border-radius: 999px;
  border: 1px solid var(--btn-ghost-border);
  background: var(--btn-ghost-bg);
  color: var(--btn-ghost-on);
  padding: 2px 10px;
  font-size: 0.9rem;
  cursor: pointer;
  box-shadow: var(--elevation-1);
  z-index: 1004;
}

/* Row that holds left stack, tabs, and +/- buttons */
.tracker-row {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 0.6rem;
}

/* Left stack: collapse + edit + fullscreen */
.left-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

/* Stack buttons (collapse, edit, fullscreen) */
.stack-btn {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  border: 1px solid var(--btn-ghost-border);
  background: var(--btn-ghost-bg);
  color: var(--btn-ghost-on);
  display: grid;
  place-items: center;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--elevation-1);
  transition:
    background 140ms ease,
    box-shadow 140ms ease,
    transform 100ms ease,
    opacity 100ms ease;
}

.stack-btn:hover:enabled {
  background: var(--table-row-hover);
  box-shadow: var(--elevation-2);
  transform: translateY(-1px);
}

.stack-btn:disabled {
  opacity: 0.45;
  cursor: default;
  box-shadow: none;
}

.tabs-row {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 0.8rem;
}

/* Add/Remove controls (stacked on the right) */
.team-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.side-btn {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  border: 1px solid var(--btn-ghost-border);
  background: var(--btn-ghost-bg);
  color: var(--btn-ghost-on);
  display: grid;
  place-items: center;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--elevation-1);
  transition:
    background 140ms ease,
    box-shadow 140ms ease,
    transform 100ms ease,
    opacity 100ms ease;
}

.side-btn:hover:enabled {
  background: var(--table-row-hover);
  box-shadow: var(--elevation-2);
  transform: translateY(-1px);
}

.side-btn:disabled {
  opacity: 0.45;
  cursor: default;
  box-shadow: none;
}

/* Big hanging tabs */
.team-tab {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-width: 140px;
  max-width: 190px;
  min-height: 120px;
  padding: 0 8px 12px;
  border-radius: var(--radius-xl);
  border: 3px solid var(--header-border-color);
  background: var(--table-surface);
  color: var(--table-on-surface);
  box-shadow: var(--table-shadow);
  cursor: pointer;
  transform-origin: center top;
  transform: translateY(-16px);
  transition:
    background 150ms ease,
    transform 170ms ease,
    box-shadow 170ms ease,
    border-color 170ms ease,
    color 170ms ease;
}

/* Inner container: text anchored very close to bottom edge */
.tab-inner {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-items: flex-end;
  gap: 1px;
  padding-bottom: 2px;
  /* tiny gap from bottom edge */
}

.team-tab:hover {
  box-shadow: var(--elevation-2);
}

/* Selected tab: pulled a bit further into view, scaled up */
.team-tab.is-selected {
  background: color-mix(in srgb,
      var(--accent-primary) 13%,
      var(--table-surface) 87%);
  border-color: var(--header-border-color);
  transform: translateY(-6px) scale(1.08);
  z-index: 1004;
}

.team-tab.is-leader {
  box-shadow: 0 0 20px color-mix(in srgb,
      var(--accent-warning) 60%,
      #000 40%);
}

.team-name {
  letter-spacing: 0.02em;
  max-width: 10.5rem;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  font-size: 1.02rem;
  font-weight: 800;
}

/* More readable points: bigger + bolder */
.team-points {
  font-variant-numeric: tabular-nums;
  font-size: 1.25rem;
  font-weight: 900;
  color: var(--accent-primary);
}

/* Floating crown on the tab */
.leader-crown {
  position: absolute;
  bottom: -1.1rem;
  left: 50%;
  transform: translateX(-50%);
  font-size: 1.35rem;
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.85);
  animation: crown-bob 1.6s ease-in-out infinite;
  pointer-events: none;
}

@keyframes crown-bob {

  0%,
  100% {
    transform: translateX(-50%) translateY(0);
  }

  50% {
    transform: translateX(-50%) translateY(-4px);
  }
}

/* Edit panel */
.edit-panel {
  margin-top: 10px;
  margin-inline: auto;
  max-width: 580px;
  padding: 10px 12px 12px;
  border-radius: var(--modal-radius);
  background: var(--modal-surface);
  color: var(--modal-on-surface);
  border: 1px solid var(--modal-border);
  box-shadow: var(--modal-shadow);
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px 12px;
  align-items: end;
}

.edit-field label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.8rem;
  color: var(--modal-on-surface-soft);
}

.edit-field input {
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--table-border);
  background: var(--neutral-50);
  color: var(--modal-on-surface);
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}

.edit-field input:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: var(--focus-ring);
  background: var(--neutral-0);
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 2px;
}

.btn {
  border-radius: 999px;
  border: 1px solid transparent;
  padding: 4px 12px;
  font-size: 0.8rem;
  cursor: pointer;
  transition:
    background 150ms ease,
    border-color 150ms ease,
    transform 100ms ease,
    box-shadow 120ms ease;
  font-weight: 600;
}

.btn.small {
  font-size: 0.78rem;
}

.btn.primary {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-on);
  border-color: var(--btn-primary-border);
  box-shadow: var(--elevation-1);
}

.btn.primary:hover {
  transform: translateY(-1px);
  box-shadow: var(--elevation-2);
}

.btn.secondary {
  background: var(--btn-ghost-bg);
  color: var(--btn-ghost-on);
  border-color: var(--btn-ghost-border);
}

.btn.secondary:hover {
  background: var(--table-row-hover);
}

/* Danger button (delete) */
.btn.danger {
  background: var(--btn-danger-bg);
  color: var(--btn-danger-on);
  border-color: var(--btn-danger-border);
  box-shadow: var(--elevation-1);
}

.btn.danger:hover:enabled {
  transform: translateY(-1px);
  box-shadow: var(--elevation-2);
}

.btn.danger:disabled {
  opacity: 0.5;
  cursor: default;
  box-shadow: none;
}

/* FULLSCREEN SCOREBOARD MODAL (centered, blurred backdrop) */
.fullscreen-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: var(--modal-overlay-bg);
  backdrop-filter: var(--modal-overlay-filter);
  display: flex;
  align-items: center;
  /* vertical center */
  justify-content: center;
  /* horizontal center */
}

.fullscreen-modal {
  background: var(--modal-surface);
  color: var(--modal-on-surface);
  border-radius: var(--modal-radius);
  box-shadow: var(--modal-shadow);
  border: 1px solid var(--modal-border);
  width: min(960px, 96vw);
  max-height: 90vh;
  padding: 18px 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.fullscreen-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.fullscreen-title {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 800;
}

/* Grid of big cards */
.fullscreen-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 14px;
  padding-top: 4px;
}

.fullscreen-card {
  position: relative;
  border-radius: var(--radius-lg);
  border: 2px solid var(--header-border-color);
  background: var(--table-surface);
  box-shadow: var(--table-shadow);
  padding: 18px 14px 22px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.fullscreen-card.is-leader {
  border-color: color-mix(in srgb,
      var(--accent-warning) 60%,
      #000 40%);
  box-shadow: 0 0 20px color-mix(in srgb,
      var(--accent-warning) 55%,
      #000 45%);
}

.fullscreen-crown {
  position: absolute;
  top: -16px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 1.7rem;
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.85);
  animation: crown-bob 1.6s ease-in-out infinite;
}

.fullscreen-name {
  font-size: 1.1rem;
  font-weight: 800;
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Big readable points */
.fullscreen-points {
  font-size: 2.6rem;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  color: var(--accent-primary);
}

.team-powerups {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
  justify-content: center;
}

.powerup-chip {
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 999px;
  border: 1px solid var(--btn-ghost-border);
  background: var(--btn-ghost-bg);
  color: var(--btn-ghost-on);
  font-weight: 700;
  line-height: 1.1;
}

.powerup-chip.tier-1 {
  background: color-mix(in srgb,
      var(--accent-success) 18%,
      var(--neutral-0) 82%);
}

.powerup-chip.tier-2 {
  background: color-mix(in srgb,
      var(--accent-warning) 18%,
      var(--neutral-0) 82%);
}

.powerup-chip.tier-3 {
  background: color-mix(in srgb,
      var(--accent-danger) 18%,
      var(--neutral-0) 82%);
}

.powerup-chip.is-round {
  border-style: dashed;
}

.fullscreen-subtitle {
  margin: 4px 0 10px;
  font-size: 0.95rem;
  color: var(--modal-on-surface-soft);
}

/* Disable clicking the source team in the effect overlay */
.fullscreen-card.is-disabled {
  opacity: 0.4;
  cursor: default;
  pointer-events: none;
}

.powerups-field {
  grid-column: 1 / -1;
  /* stretch across panel if there are multiple columns */
}

.edit-powerups-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.edit-powerup-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--btn-ghost-border);
  background: var(--btn-ghost-bg);
  color: var(--btn-ghost-on);
  font-size: 0.7rem;
  font-weight: 700;
  cursor: pointer;
  line-height: 1.1;
  transition:
    background 120ms ease,
    transform 80ms ease,
    box-shadow 120ms ease;
}

.edit-powerup-chip:hover {
  background: var(--table-row-hover);
  box-shadow: var(--elevation-1);
  transform: translateY(-1px);
}

.chip-label {
  white-space: nowrap;
}

.chip-remove {
  font-size: 0.75rem;
  opacity: 0.8;
}

/* Rain of Points overlay */
.rain-overlay {
  position: fixed;
  inset: 0;
  z-index: 1400;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none; /* doesn't block clicks */
}

.rain-label {
  padding: 18px 26px;
  border-radius: 999px;
  background:
    radial-gradient(circle at top,
      color-mix(in srgb, var(--accent-primary) 35%, transparent),
      color-mix(in srgb, var(--accent-warning) 55%, var(--neutral-900) 45%));
  color: var(--neutral-0);
  font-size: clamp(1.8rem, 4vw, 2.6rem);
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-align: center;
  text-shadow: 0 0 10px rgba(0, 0, 0, 0.9);
  box-shadow: 0 0 40px color-mix(in srgb, var(--accent-primary) 60%, #000 40%);
  border: 2px solid color-mix(in srgb, var(--accent-primary) 70%, #fff 30%);
}

/* Simple pop-in / pop-out animation */
.rain-pop-enter-active,
.rain-pop-leave-active {
  transition:
    opacity 260ms ease,
    transform 260ms ease;
}

.rain-pop-enter-from,
.rain-pop-leave-to {
  opacity: 0;
  transform: scale(0.7);
}

.rain-pop-enter-to,
.rain-pop-leave-from {
  opacity: 1;
  transform: scale(1);
}

</style>
