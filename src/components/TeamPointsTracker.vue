<!-- src/components/TeamPointsTracker.vue -->
<template>
  <section class="team-points-tracker" v-if="displayedTeams.length">
    <!-- Re-open button when collapsed -->
    <button
      v-if="isCollapsed"
      type="button"
      class="reopen-btn"
      @click="isCollapsed = false"
      title="Show team scores"
    >
      ▾
    </button>

    <!-- Sliding tracker shell -->
    <transition name="tracker-slide">
      <div v-if="!isCollapsed" class="tracker-shell">
        <!-- Main bar: [collapse+edit+fullscreen] [tabs] [ +/- ] -->
        <div class="tracker-row">
          <!-- Left stack: collapse + edit + fullscreen -->
          <div class="left-stack">
            <button
              type="button"
              class="stack-btn collapse-btn"
              @click="isCollapsed = true"
              title="Hide team bar"
            >
              ▴
            </button>

            <button
              type="button"
              class="stack-btn edit-btn"
              @click="onEditClick"
              :disabled="selectedIndex < 0 || selectedIndex >= displayedTeams.length"
              title="Edit selected team"
            >
              ✏
            </button>

            <button
              type="button"
              class="stack-btn fullscreen-btn"
              @click="toggleFullscreen"
              :aria-pressed="isFullscreen"
              :title="isFullscreen ? 'Close scoreboard view' : 'Open scoreboard view'"
            >
              ⛶
            </button>
          </div>

          <!-- Center: Tabs row (hanging from above) -->
          <div class="tabs-row">
            <button
              v-for="(team, index) in displayedTeams"
              :key="team.id"
              class="team-tab"
              :class="{
                'is-selected': index === selectedIndex,
                'is-leader': index === leaderIndex
              }"
              type="button"
              @click="onTabClick(index)"
            >
              <div class="tab-inner">
                <span class="team-name">
                  {{ team.name || `Team ${index + 1}` }}
                </span>
                <span class="team-points">
                  {{ team.points }}
                </span>
              </div>

              <!-- Floating crown for leader -->
              <span
                v-if="leaderIndex === index && showCrown"
                class="leader-crown"
                aria-label="Current leader"
                role="img"
              >
                👑
              </span>
            </button>
          </div>

          <!-- Right: Add / Remove team controls (stacked) -->
          <div class="team-controls">
            <button
              class="side-btn"
              type="button"
              :disabled="!canRemoveTeam"
              @click="removeTeam"
              title="Remove team"
            >
              −
            </button>
            <button
              class="side-btn"
              type="button"
              :disabled="!canAddTeam"
              @click="addTeam"
              title="Add team"
            >
              ＋
            </button>
          </div>
        </div>

        <!-- Inline edit panel under selected tab -->
        <div
          v-if="isEditing && selectedIndex !== -1"
          class="edit-panel"
          ref="editPanelRef"
        >
          <div class="edit-field">
            <label>
              Team name
              <input
                v-model="editForm.name"
                type="text"
                maxlength="24"
              />
            </label>
          </div>

          <div class="edit-field">
            <label>
              Points
              <input
                v-model.number="editForm.points"
                type="number"
                step="1"
              />
            </label>
          </div>

          <div class="edit-actions">
            <button
              type="button"
              class="btn small danger"
              :disabled="!canRemoveTeam"
              @click="removeTeamFromEdit"
            >
              Delete
            </button>
            <button
              type="button"
              class="btn small primary"
              @click="applyEdit"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- FULLSCREEN SCOREBOARD MODAL (teleported to body, centered on screen) -->
    <Teleport to="body">
      <div
        v-if="isFullscreen"
        class="fullscreen-overlay"
        @click.self="isFullscreen = false"
      >
        <div class="fullscreen-modal">
          <header class="fullscreen-header">
            <h2 class="fullscreen-title">Team Scores</h2>
            <button
              type="button"
              class="btn small secondary"
              @click="isFullscreen = false"
            >
              Close
            </button>
          </header>

          <div class="fullscreen-grid">
            <article
              v-for="(team, index) in displayedTeams"
              :key="team.id"
              class="fullscreen-card"
              :class="{ 'is-leader': index === leaderIndex }"
            >
              <div
                v-if="index === leaderIndex && showCrown"
                class="fullscreen-crown"
                aria-label="Current leader"
                role="img"
              >
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

interface Team {
  id: number;
  name: string;
  points: number;
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

const editForm = reactive({
  name: "",
  points: 0,
});

const editPanelRef = ref<HTMLElement | null>(null);

/* ---- Sync from props.teams and initialize ---- */
watch(
  () => props.teams,
  (newVal) => {
    if (Array.isArray(newVal) && newVal.length > 0) {
      localTeams.value = newVal
        .slice(0, maxTeamsClamped.value)
        .map((t, i) => ({
          id: t.id ?? i,
          name: t.name ?? `Team ${i + 1}`,
          points: Number.isFinite(t.points) ? t.points : 0,
        }));
    } else if (!localTeams.value.length) {
      // Initialize defaults (up to 4, but never above maxTeams)
      const defaultCount = Math.min(4, maxTeamsClamped.value);
      localTeams.value = Array.from({ length: defaultCount }).map((_, i) => ({
        id: i,
        name: `Team ${i + 1}`,
        points: 0,
      }));
    }
  },
  { immediate: true, deep: true },
);

const displayedTeams = computed(() =>
  localTeams.value.slice(0, maxTeamsClamped.value),
);

/* ---- Tab selection / deselection ---- */
function onTabClick(index: number) {
  if (selectedIndex.value === index) {
    // Deselect current tab
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
function onEditClick() {
  const idx = selectedIndex.value;
  if (idx < 0 || idx >= displayedTeams.value.length) return;

  // Toggle edit panel
  isEditing.value = !isEditing.value;
  if (isEditing.value) {
    const team = displayedTeams.value[idx];
    editForm.name = team.name;
    editForm.points = team.points;
  }
}

function applyEdit() {
  if (
    selectedIndex.value < 0 ||
    selectedIndex.value >= displayedTeams.value.length
  )
    return;

  const idx = selectedIndex.value;
  const updated = [...localTeams.value];

  const cleanPoints = Number.isFinite(editForm.points)
    ? Math.round(editForm.points)
    : 0;

  updated[idx] = {
    ...updated[idx],
    name: editForm.name.trim() || `Team ${idx + 1}`,
    points: cleanPoints,
  };

  localTeams.value = updated;
  emit("update:teams", updated);
  isEditing.value = false;
}

// Close edit panel when clicking outside of it
function onGlobalPointerDown(evt: PointerEvent) {
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
  teams.forEach((team, i) => {
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

function addTeam() {
  if (!canAddTeam.value) return;

  const current = [...localTeams.value];
  const nextIndex = current.length;
  const maxExistingId =
    current.length > 0 ? Math.max(...current.map((t) => t.id)) : -1;

  const newTeam: Team = {
    id: maxExistingId + 1,
    name: `Team ${nextIndex + 1}`,
    points: 0,
  };

  current.push(newTeam);
  localTeams.value = current;
  selectedIndex.value = nextIndex;
  isEditing.value = false;

  emit("update:teams", current);
  emit("team-selected", newTeam);
}

function removeTeam() {
  if (!canRemoveTeam.value) return;
  const idx = selectedIndex.value;
  if (idx < 0) return; // no selection -> do nothing
  removeTeamByIndex(idx);
}

function removeTeamFromEdit() {
  if (!canRemoveTeam.value) return;
  if (
    selectedIndex.value < 0 ||
    selectedIndex.value >= displayedTeams.value.length
  )
    return;
  removeTeamByIndex(selectedIndex.value);
}

function removeTeamByIndex(idx: number) {
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

/* -------- Fullscreen helpers -------- */

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value;
}

/* -------- Exposed helpers for RandomPoints -------- */

function addPoints(teamIndex: number, delta: number) {
  if (teamIndex < 0 || teamIndex >= localTeams.value.length) return;
  if (!Number.isFinite(delta)) return;

  const updated = [...localTeams.value];
  updated[teamIndex] = {
    ...updated[teamIndex],
    points: updated[teamIndex].points + Math.round(delta),
  };
  localTeams.value = updated;
  emit("update:teams", updated);
}

/**
 * Apply a delta to whichever team is currently selected.
 * Does nothing if no tab is selected.
 */
function applyDeltaToSelected(delta: number) {
  if (!displayedTeams.value.length || !Number.isFinite(delta)) return;

  const idx = selectedIndex.value;
  if (idx < 0 || idx >= displayedTeams.value.length) return;

  const updated = [...localTeams.value];
  updated[idx] = {
    ...updated[idx],
    points: (updated[idx].points ?? 0) + Math.round(delta),
  };
  localTeams.value = updated;
  emit("update:teams", updated);
}

function setPoints(teamIndex: number, value: number) {
  if (teamIndex < 0 || teamIndex >= localTeams.value.length) return;
  const updated = [...localTeams.value];
  updated[teamIndex] = {
    ...updated[teamIndex],
    points: Math.round(value),
  };
  localTeams.value = updated;
  emit("update:teams", updated);
}

defineExpose({
  addPoints,
  setPoints,
  applyDeltaToSelected,
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
  top: -40px; /* tab tops stay off-screen even when selected */
  left: 0;
  width: 100%;
  z-index: 500; /* above card grid */
  display: flex;
  justify-content: center;
}

/* Inner shell that participates in slide animation */
.tracker-shell {
  width: 100%;
  max-width: 1100px;
  margin-top: 16px; /* pulls visible part slightly down */
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
  padding-bottom: 2px; /* tiny gap from bottom edge */
}

.team-tab:hover {
  box-shadow: var(--elevation-2);
}

/* Selected tab: pulled a bit further into view, scaled up */
.team-tab.is-selected {
  background: color-mix(
    in srgb,
    var(--accent-primary) 13%,
    var(--table-surface) 87%
  );
  border-color: var(--header-border-color);
  transform: translateY(-6px) scale(1.08);
  z-index: 1004;
}

.team-tab.is-leader {
  box-shadow: 0 0 20px
    color-mix(in srgb, var(--accent-warning) 60%, #000 40%);
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
  align-items: center;    /* vertical center */
  justify-content: center; /* horizontal center */
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
}

.fullscreen-card.is-leader {
  border-color: color-mix(
    in srgb,
    var(--accent-warning) 60%,
    #000 40%
  );
  box-shadow: 0 0 20px
    color-mix(in srgb, var(--accent-warning) 55%, #000 45%);
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
</style>
