<!-- src/components/MysteryMachine.vue -->
<template>
    <section class="mystery-machine-overlay" role="dialog" aria-modal="true" @click.self="handleBackdropClick">
        <!-- Top-left: Prizes icon button -->
        <button class="overlay-prizes-btn" type="button" @click="showPrizesModal = true" aria-label="View prize tiers">
            ❓
        </button>

        <!-- Top-right: close button -->
        <button class="overlay-close-btn" type="button" @click="handleClose" aria-label="Close Mystery Machine">
            ✕
        </button>

        <!-- Main stage (machine slightly lowered, centered) -->
        <div class="mm-stage">
            <section class="mm-machine">
                <div class="mm-stack">
                    <!-- Wager panel: always visible, behind machine, partially hidden -->
                    <div class="mm-top-panel">
                        <section class="wager-section">
                            <div class="wager-inner">
                                <div class="wager-header">
                                    <span class="wager-label">Wager</span>
                                    <span class="wager-tier-pill" :class="`tier-${currentTier}`">
                                        Tier {{ currentTier }}
                                    </span>
                                </div>

                                <div class="wager-controls">
                                    <button type="button" class="arrow-btn" @click="bumpWager(-10)"
                                        :disabled="isSpinning || wager <= 0" aria-label="Decrease wager">
                                        ◀
                                    </button>

                                    <div class="wager-value-block">
                                        <span class="wager-amount">
                                            {{ wager }} pts
                                        </span>
                                    </div>

                                    <button type="button" class="arrow-btn" @click="bumpWager(10)"
                                        :disabled="isSpinning || (maxWager != null && wager >= maxWager)"
                                        aria-label="Increase wager">
                                        ▶
                                    </button>
                                </div>
                            </div>
                        </section>
                    </div>

                    <!-- Toast panel: raises up from behind machine, above everything -->
                    <div class="mm-toast-panel">
                        <transition name="mm-toast-slide">
                            <div v-if="toastVisible" key="toast" class="mm-toast">
                                <span class="mm-toast-text">{{ toastMessage }}</span>
                                <button class="mm-toast-close" type="button" @click="dismissToast"
                                    aria-label="Dismiss message">
                                    ✕
                                </button>
                            </div>
                        </transition>
                    </div>

                    <!-- Reels layer (behind body) -->
                    <div class="reels-layer">
                        <div class="slot-frame">
                            <div v-for="(rotation, i) in reelRotations" :key="i" class="reel3d">
                                <div class="reel3d-inner" :style="reelInnerStyle(i)">
                                    <div v-for="(symbol, idx) in REEL_SYMBOLS" :key="idx" class="reel-face"
                                        :style="faceStyle(idx)">
                                        <span class="reel-symbol">{{ symbol }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Main machine body image -->
                    <img :src="machineBodySrc" alt="Mystery Machine body" class="machine-body-img" draggable="false" />

                    <!-- Glowing prize button in front of the prize slot -->
                    <button v-if="hasPrize && !showEffectModal" class="prize-btn" type="button" @click="openEffectModal"
                        :class="{ 'has-prize': hasPrize }">
                        <span class="prize-label">🎁 Mystery Prize</span>
                    </button>

                    <!-- Slot arm: lever -->
                    <button class="slot-arm-btn" type="button" :disabled="!canSpin || isSpinning" @click="onHandlePull"
                        :aria-disabled="!canSpin || isSpinning">
                        <img :src="slotArmSrc" alt="Pull to spin" class="slot-arm-img" :class="{
                            'is-disabled': !canSpin || isSpinning,
                            'is-pulled': handlePulled
                        }" draggable="false" />
                    </button>
                </div>
            </section>
        </div>

        <!-- Prize card modal: transparent overlay, big card with tier chip -->
        <div v-if="showEffectModal && effect" class="effect-modal-overlay" @click.self="closeEffectModal">
            <transition name="mm-card-pop">
                <div class="effect-modal" v-if="showEffectModal">
                    <div class="effect-header">
                        <h3 class="effect-title">{{ effect.label }}</h3>
                        <span class="effect-tier-chip" :class="`tier-${effect.tier}`">
                            Tier {{ effect.tier }}
                        </span>
                    </div>

                    <div class="effect-body">
                        <p class="effect-description">{{ effectDescription }}</p>
                    </div>

                    <div class="effect-actions">
                        <button class="pill-btn primary" type="button" @click="closeEffectModal">
                            Close
                        </button>
                    </div>
                </div>
            </transition>
        </div>

        <!-- Prizes info modal: colorful grid layout -->
        <div v-if="showPrizesModal" class="effect-modal-overlay" @click.self="showPrizesModal = false">
            <div class="effect-modal info-modal">
                <h3 class="effect-title">Mystery Machine: Outcomes &amp; Prizes</h3>

                <div class="prize-grid">
                    <!-- Column 1: Wager Outcomes -->
                    <section class="prize-col">
                        <h4 class="prize-heading">Wager Outcomes</h4>
                        <div class="outcome-grid">
                            <div class="outcome-card outcome-bad-1">
                                <span class="outcome-label">Lose all</span>
                                <span class="outcome-pct">~22%</span>
                            </div>

                            <div class="outcome-card outcome-bad-2">
                                <span class="outcome-label">Lose half</span>
                                <span class="outcome-pct">~18%</span>
                            </div>

                            <div class="outcome-card outcome-neutral">
                                <span class="outcome-label">No change</span>
                                <span class="outcome-pct">~25%</span>
                            </div>

                            <div class="outcome-card outcome-good">
                                <span class="outcome-label">2×</span>
                                <span class="outcome-pct">~18%</span>
                            </div>

                            <div class="outcome-card outcome-good">
                                <span class="outcome-label">3×</span>
                                <span class="outcome-pct">~10%</span>
                            </div>

                            <div class="outcome-card outcome-good">
                                <span class="outcome-label">4×</span>
                                <span class="outcome-pct">~7%</span>
                            </div>
                        </div>

                    </section>

                    <!-- Column 2: Prize cards by tier -->
                    <section class="prize-col">
                        <h4 class="prize-heading">Prize Cards by Tier</h4>
                        <div class="tier-grid">
                            <article class="tier-card tier-1">
                                <header class="tier-header">
                                    <span class="tier-title">Tier 1: 10+ points</span>
                                </header>
                                <ul class="tier-list">
                                    <li>+20 points</li>
                                    <li>+10 to every team</li>
                                    <li>+20 to the lowest team</li>
                                    <li>Nothing happens</li>
                                </ul>
                            </article>

                            <article class="tier-card tier-2">
                                <header class="tier-header">
                                    <span class="tier-title">Tier 2: 50+ points</span>
                                </header>
                                <ul class="tier-list">
                                    <li>Double next card (x2)</li>
                                    <li>Steal 40 from one team</li>
                                    <li>+40 to one team</li>
                                </ul>
                            </article>

                            <article class="tier-card tier-3">
                                <header class="tier-header">
                                    <span class="tier-title">Tier 3: 100+ points</span>
                                </header>
                                <ul class="tier-list">
                                    <li>Triple next card (x3)</li>
                                    <li>Steal 20 from each team</li>
                                    <li>Swap scores with any team</li>
                                    <li>Rain of Points (+80 you, +40 others)</li>
                                </ul>
                            </article>
                        </div>
                    </section>
                </div>

                <p class="prize-disclaimer">
                    All prizes are applied automatically.
                    There is no need to manually edit team points to apply prize effects.
                </p>

            </div>
        </div>
    </section>
</template>

<script setup lang="ts">

import { computed, onBeforeUnmount, ref } from "vue";

/**
 * Asset imports
 */
import machineBodyPng from "@/assets/images/games/mystery-machine/mystery-machine-body.png";
import slotArmPng from "@/assets/images/games/mystery-machine/slot-arm-christmas.png";

import slotMachineSfx from "@/assets/sounds/slot-machine.mp3";
import chukichiSfx from "@/assets/sounds/fortunegame/chukichi.mp3";
import daikichiSfx from "@/assets/sounds/fortunegame/daikichi.mp3";
import daikyoSfx from "@/assets/sounds/fortunegame/daikyo.mp3";
import kichiSfx from "@/assets/sounds/fortunegame/kichi.mp3";
import kyoSfx from "@/assets/sounds/fortunegame/kyo.mp3";
import shokichiSfx from "@/assets/sounds/fortunegame/shokichi.mp3";

/**
 * Resolved image URLs
 */
const machineBodySrc = machineBodyPng;
const slotArmSrc = slotArmPng;

/**
 * Sounds (preloaded from imports)
 */
let slotMachineSound: HTMLAudioElement | null = null;
const fortuneSounds = new Map<WagerOutcomeType, string>();

if (typeof window !== "undefined" && typeof Audio !== "undefined") {
    slotMachineSound = new Audio(slotMachineSfx);

    fortuneSounds.set("return", shokichiSfx);
    fortuneSounds.set("quadruple", daikichiSfx);
    fortuneSounds.set("lose_all", daikyoSfx);
    fortuneSounds.set("double", kichiSfx);
    fortuneSounds.set("lose_half", kyoSfx);
    fortuneSounds.set("triple", chukichiSfx);
}

function playSlotMachine() {
    if (!slotMachineSound) return;
    try {
        slotMachineSound.currentTime = 0;
        void slotMachineSound.play().catch(() => { });
    } catch {
        // ignore
    }
}

function playFortuneSound(type: WagerOutcomeType) {
    const src = fortuneSounds.get(type);
    if (!src) return;
    try {
        const audio = new Audio(src);
        audio.currentTime = 0;
        void audio.play().catch(() => { });
    } catch {
        // ignore
    }
}

/**
 * Types
 */
type WagerOutcomeType =
    | "lose_all"
    | "lose_half"
    | "return"
    | "double"
    | "triple"
    | "quadruple";

interface WagerOutcome {
    type: WagerOutcomeType;
    label: string;
}

type Tier = 1 | 2 | 3;

interface Effect {
    id: string;
    tier: Tier;
    label: string;
}

interface MysteryResult {
    wager: number;
    wagerOutcome: WagerOutcome;
    pointsDelta: number;
    tier: Tier;
    effect: Effect;
}

/**
 * Props & emits
 */
const props = defineProps<{
    maxWager?: number | null;
}>();

const emit = defineEmits<{
    (e: "close"): void;
    (e: "resolved", payload: MysteryResult): void;
    (e: "effect-opened", payload: MysteryResult): void;
}>();

/**
 * Wager state
 */
const wager = ref<number>(10);

/**
 * Reel symbols & geometry
 * Outcome emojis:
 * - lose_all: 💣
 * - lose_half: ⭕
 * - return: ⚖️
 * - double: ✨
 * - triple: 🏆
 * - quadruple: 7️⃣
 */
const REEL_SYMBOLS = ["💣", "⚖️", "⭕", "✨", "🏆", "7️⃣"];

const OUTCOME_SYMBOL_MAP: Record<WagerOutcomeType, string> = {
    lose_all: "💣",
    lose_half: "⭕",
    return: "⚖️",
    double: "✨",
    triple: "🏆",
    quadruple: "7️⃣",
};

const FACE_ANGLE = 360 / REEL_SYMBOLS.length;
const REEL_RADIUS = 48;

// Total spin time (~3.5s)
const TOTAL_SPIN_MS = 3500;

// Per-reel durations for sequential stop
const REEL_SPIN_DURATIONS = [2300, 2900, 3400];

/**
 * Reels rotation state
 */
const reelRotations = ref<number[]>([0, 0, 0]);
const isSpinning = ref(false);
const isResetting = ref(false);

/**
 * Handle animation state
 */
const handlePulled = ref(false);

/**
 * Results & UI state
 */
const wagerOutcome = ref<WagerOutcome | null>(null);
const effect = ref<Effect | null>(null);
const pointsDelta = ref<number>(0);
const lastResult = ref<MysteryResult | null>(null);

const showEffectModal = ref(false);
const showPrizesModal = ref(false);

const toastVisible = ref(false);
const toastMessage = ref("");

/**
 * Tiered effect pools
 *
 * Tier 1:
 *  - Tip Jar
 *  - Party Favor
 *  - Donation
 *  - Nothing
 *
 * Tier 2:
 *  - Double next card
 *  - Steal 40 points (choose team)
 *  - Give 40 points (choose team)
 *
 * Tier 3:
 *  - Triple next card
 *  - Steal 10 from each team
 *  - Swap any team
 *  - Rain of points (+80 you, +40 another)
 */
const tier1Effects: Effect[] = [
    {
        id: "t1_tip_jar",
        tier: 1,
        label: "+20 points",
    },
    {
        id: "t1_party_favor",
        tier: 1,
        label: "+10 points to every team",
    },
    {
        id: "t1_donation",
        tier: 1,
        label: "+20 points to the lowest team",
    },
    {
        id: "t1_nothing",
        tier: 1,
        label: "Nothing happens",
    },
];


const tier2Effects: Effect[] = [
    {
        id: "t2_double_next",
        tier: 2,
        label: "2x next card",
    },
    {
        id: "t2_steal40_one",
        tier: 2,
        label: "Steal 40 points from one team",
    },
    {
        id: "t2_give40_one",
        tier: 2,
        label: "+40 points to one team",
    },
];

const tier3Effects: Effect[] = [
    {
        id: "t3_triple_next",
        tier: 3,
        label: "3x next card",
    },
    {
        id: "t3_steal20_each",
        tier: 3,
        label: "Steal 20 points from each team",
    },
    {
        id: "t3_swap_any_team",
        tier: 3,
        label: "Swap total points with another team",
    },
    {
        id: "t3_rain_of_points",
        tier: 3,
        label: "Rain of points: +80 for you, +40 for all other teams",
    },
];

/**
 * Optional effect descriptions (for the card text)
 */
const EFFECT_DESCRIPTIONS: Record<string, string> = {
    t1_tip_jar:
        "Your team gains +20 points.",
    t1_party_favor:
        "Every team gains +10 points.",
    t1_donation:
        "The team with the lowest score gains +20 points.",
    t1_nothing:
        "Nothing happens this time.",

    t2_double_next:
        "Your next card is doubled.",
    t2_steal40_one:
        "Steal 40 points from anohter team.",
    t2_give40_one:
        "Plus 40 points to another team.",

    t3_triple_next:
        "Your next card is tripled!",
    t3_steal20_each:
        "Steal 20 points from ALL other teams.",
    t3_swap_any_team:
        "Swap your total score with any team.",
    t3_rain_of_points:
        "You gain +80 points, every other team gains +40 points.",
};


/**
 * Wager outcome probabilities
 */
const WAGER_OUTCOME_WEIGHTS: { type: WagerOutcomeType; weight: number }[] = [
    { type: "lose_all", weight: 22 },
    { type: "lose_half", weight: 18 },
    { type: "return", weight: 25 },
    { type: "double", weight: 18 },
    { type: "triple", weight: 10 },
    { type: "quadruple", weight: 7 },
];

const cleanupTimeouts: number[] = [];

/**
 * Derived helpers
 */
const canSpin = computed(() => {
    if (isSpinning.value) return false;
    if (wager.value < 10) return false;
    if (wager.value % 10 !== 0) return false;
    if (props.maxWager != null && wager.value > props.maxWager) return false;
    return true;
});

const hasPrize = computed(
    () => !!effect.value && !!wagerOutcome.value && !isSpinning.value,
);

const currentTier = computed<Tier>(() => determineTier(wager.value));

const effectDescription = computed(() => {
    if (!effect.value) return "";
    return EFFECT_DESCRIPTIONS[effect.value.id] ?? effect.value.label;
});

/**
 * Outcome labels for info modal
 */
function outcomeName(type: WagerOutcomeType): string {
    switch (type) {
        case "lose_all":
            return "Lose all wager";
        case "lose_half":
            return "Lose half wager";
        case "return":
            return "No change (return wager)";
        case "double":
            return "Double wager";
        case "triple":
            return "Triple wager";
        case "quadruple":
            return "Quadruple wager";
    }
}

const outcomeChances = computed(() => {
    const total = WAGER_OUTCOME_WEIGHTS.reduce((acc, o) => acc + o.weight, 0);
    return WAGER_OUTCOME_WEIGHTS.map(({ type, weight }) => {
        const percent = (weight / total) * 100;
        return {
            type,
            name: outcomeName(type),
            percent: percent.toFixed(1),
        };
    });
});

function clampWager() {
    if (wager.value < 0) wager.value = 0;
    if (props.maxWager != null && wager.value > props.maxWager) {
        wager.value = props.maxWager;
    }
    if (wager.value % 10 !== 0) {
        wager.value = Math.round(wager.value / 10) * 10;
    }
}

/**
 * Tier determination
 */
function determineTier(w: number): Tier {
    if (w >= 100) return 3;
    if (w >= 50) return 2;
    return 1;
}

function pickEffectForTier(tier: Tier): Effect {
    let pool: Effect[] = [];

    if (tier >= 1) pool = pool.concat(tier1Effects);
    if (tier >= 2) pool = pool.concat(tier2Effects);
    if (tier >= 3) pool = pool.concat(tier3Effects);

    const idx = Math.floor(Math.random() * pool.length);
    return pool[idx];
}

/**
 * Wager outcome selection
 */
function pickWeightedOutcome(): WagerOutcomeType {
    const total = WAGER_OUTCOME_WEIGHTS.reduce((acc, o) => acc + o.weight, 0);
    const roll = Math.random() * total;
    let acc = 0;
    for (const o of WAGER_OUTCOME_WEIGHTS) {
        acc += o.weight;
        if (roll <= acc) return o.type;
    }
    return "return";
}

function buildWagerOutcome(
    type: WagerOutcomeType,
    w: number,
): { outcome: WagerOutcome; delta: number } {
    let label = "";
    let delta = 0;

    switch (type) {
        case "lose_all":
            label = "You lost your entire wager";
            delta = -w;
            break;
        case "lose_half":
            label = "You lost half your wager";
            delta = -Math.round(w / 2);
            break;
        case "return":
            label = "Your wager was returned (no change)";
            delta = 0;
            break;
        case "double":
            label = "Your wager was doubled";
            delta = w;
            break;
        case "triple":
            label = "Your wager was tripled";
            delta = 2 * w;
            break;
        case "quadruple":
            label = "Your wager was quadrupled";
            delta = 3 * w;
            break;
    }

    return {
        outcome: { type, label },
        delta,
    };
}

/**
 * 3D reel styles (sequential stops)
 */
function reelInnerStyle(reelIndex: number) {
    const deg = reelRotations.value[reelIndex];
    const baseTransform = `rotateX(${deg}deg)`;

    // During reset: snap instantly (no animation)
    if (isResetting.value) {
        return {
            transform: baseTransform,
            transition: "transform 0s",
        } as Record<string, string>;
    }

    // During spin: use long animated durations
    if (isSpinning.value) {
        const duration = REEL_SPIN_DURATIONS[reelIndex] ?? TOTAL_SPIN_MS;
        return {
            transform: baseTransform,
            transition: `transform ${duration}ms cubic-bezier(.2,.8,.3,1.1)`,
        } as Record<string, string>;
    }

    // Idle state – no transition
    return {
        transform: baseTransform,
        transition: "transform 0s",
    } as Record<string, string>;
}

function faceStyle(faceIndex: number) {
    return {
        transform: `rotateX(${faceIndex * FACE_ANGLE}deg) translateZ(${REEL_RADIUS}px)`,
    } as Record<string, string>;
}

/**
 * Toast helpers
 */
function showToast(deltaPoints: number, outcomeType: WagerOutcomeType) {
    const label =
        deltaPoints === 0
            ? "0 points"
            : `${deltaPoints > 0 ? "+" : ""}${deltaPoints} points`;

    toastMessage.value = label;
    toastVisible.value = true;

    playFortuneSound(outcomeType);
}

function dismissToast() {
    toastVisible.value = false;
}

/**
 * Spin logic
 */
function startSpin() {
    if (!canSpin.value) return;

    clampWager();

    // Clear previous result & toast
    wagerOutcome.value = null;
    effect.value = null;
    pointsDelta.value = 0;
    lastResult.value = null;
    showEffectModal.value = false;
    toastVisible.value = false;

    // 1) Determine wager outcome up front
    const type = pickWeightedOutcome();
    const { outcome, delta } = buildWagerOutcome(type, wager.value);

    // 2) Determine tier & special effect
    const tier = determineTier(wager.value);
    const eff = pickEffectForTier(tier);

    // 3) Map outcome => final symbol/face index
    const symbol = OUTCOME_SYMBOL_MAP[type];
    const targetIndex = REEL_SYMBOLS.indexOf(symbol);
    const safeTargetIndex = targetIndex >= 0 ? targetIndex : 0;

    // -------- RESET PHASE (no animation) --------
    isSpinning.value = false;
    isResetting.value = true;
    reelRotations.value = [0, 0, 0];

    try {
        // force layout
        // eslint-disable-next-line no-unused-expressions
        document.body.offsetHeight;
    } catch {
        // ignore SSR
    }

    // -------- SPIN PHASE (animated) --------
    window.requestAnimationFrame(() => {
        isResetting.value = false;
        isSpinning.value = true;

        const baseSpins = 3;

        reelRotations.value = reelRotations.value.map((_, i) => {
            const extraSpins = baseSpins + i; // 3,4,5
            const totalRot = extraSpins * 360 + safeTargetIndex * FACE_ANGLE;
            return -totalRot;
        });

        const timeoutId = window.setTimeout(() => {
            wagerOutcome.value = outcome;
            effect.value = eff;
            pointsDelta.value = delta;
            isSpinning.value = false;

            const result: MysteryResult = {
                wager: wager.value,
                wagerOutcome: outcome,
                pointsDelta: delta,
                tier,
                effect: eff,
            };

            lastResult.value = result;
            emit("resolved", result);

            showToast(delta, outcome.type);
        }, TOTAL_SPIN_MS);

        cleanupTimeouts.push(timeoutId);
    });
}

/**
 * Arm pull: animate + spin
 */
function onHandlePull() {
    if (!canSpin.value || isSpinning.value) return;
    handlePulled.value = true;

    playSlotMachine();

    const id = window.setTimeout(() => {
        handlePulled.value = false;
    }, 350);
    cleanupTimeouts.push(id);

    startSpin();
}

/**
 * Wager controls
 */
function bumpWager(amount: number) {
    if (isSpinning.value) return;
    wager.value += amount;
    if (wager.value < 0) wager.value = 0;
    clampWager();
}

/**
 * Prize modal controls
 */
function openEffectModal() {
  if (!hasPrize.value || !effect.value || !wagerOutcome.value) return;

  showEffectModal.value = true;

  // Always emit a fully-formed payload (even if lastResult is null for any reason)
  const payload: MysteryResult = lastResult.value ?? {
    wager: wager.value,
    wagerOutcome: wagerOutcome.value,
    pointsDelta: pointsDelta.value,
    tier: determineTier(wager.value),
    effect: effect.value,
  };

  // Debug (remove after confirming)
  // eslint-disable-next-line no-console
  console.log("[MysteryMachine] effect-opened", payload.effect.id, payload);

  emit("effect-opened", payload);
}


function closeEffectModal() {
    showEffectModal.value = false;
}

/**
 * Closing
 */
function handleClose() {
    emit("close");
}
function handleBackdropClick() {
    handleClose();
}

/**
 * Cleanup (timeouts)
 */
onBeforeUnmount(() => {
    cleanupTimeouts.forEach((id) => clearTimeout(id));
});
</script>


<style scoped>
.mystery-machine-overlay {
    position: fixed;
    inset: 0;
    z-index: 1100;
    background: var(--modal-overlay-bg);
    backdrop-filter: var(--modal-overlay-filter);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 16px;
}

/* Top-left prizes button */
.overlay-prizes-btn {
    position: absolute;
    top: 16px;
    left: 16px;
    width: 46px;
    height: 46px;
    border-radius: 999px;
    border: 1px solid var(--btn-ghost-border);
    background: var(--btn-ghost-bg);
    color: var(--btn-ghost-on);
    font-size: 1.6rem;
    display: grid;
    place-items: center;
    cursor: pointer;
    z-index: 1200;
    transition: transform 0.18s ease-out;
}

.overlay-prizes-btn:hover {
    transform: scale(1.08) rotate(-4deg);
}

.overlay-prizes-btn:active {
    transform: scale(0.96) rotate(2deg);
}

/* Close button */
.overlay-close-btn {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 44px;
    height: 44px;
    border-radius: 999px;
    border: 1px solid var(--modal-close-border);
    background: var(--modal-close-bg);
    color: var(--modal-close-on);
    font-size: 1.5rem;
    font-weight: 800;
    display: grid;
    place-items: center;
    cursor: pointer;
    z-index: 1200;
    transition: transform 0.18s ease-out;
}

.overlay-close-btn:hover {
    transform: scale(1.08) rotate(4deg);
}

.overlay-close-btn:active {
    transform: scale(0.96) rotate(-2deg);
}

/* Stage */
.mm-stage {
    position: relative;
    width: min(1040px, 100%);
    margin-top: 40px;
}

/* Machine */
.mm-machine {
    display: flex;
    justify-content: center;
    width: 100%;
    min-height: 420px;
}

.mm-stack {
    position: relative;
    max-width: 640px;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
}

/* Wager panel */
.mm-top-panel {
    position: absolute;
    left: 50%;
    bottom: calc(100% - 33px);
    transform: translateX(-50%);
    z-index: 2;
}

/* Toast panel */
.mm-toast-panel {
    position: absolute;
    left: 50%;
    bottom: calc(100% - 160px);
    transform: translateX(-50%);
    z-index: 4;
}

/* Wager card */
.wager-section {
    padding: 10px 16px;
    border-radius: var(--modal-radius);
    background: var(--modal-surface);
    color: var(--modal-on-surface);
    width: 260px;
    box-shadow: var(--modal-shadow);

    padding: 6px 14px;
    border: 6px solid transparent;

    background:
        linear-gradient(var(--modal-surface), var(--modal-surface)) padding-box,
        linear-gradient(120deg,
            var(--accent-primary),
            var(--accent-secondary),
            var(--accent-success),
            var(--accent-warning),
            var(--accent-danger),
            var(--accent-primary)) border-box;
}

.wager-inner {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.wager-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
}

.wager-label {
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-weight: 800;
    color: var(--modal-on-surface-soft);
}

.wager-tier-pill {
    padding: 3px 12px;
    border-radius: 999px;
    border: 1px solid rgba(0, 0, 0, 0.12);
    font-size: 0.85rem;
    font-weight: 700;
    white-space: nowrap;
}

.wager-tier-pill.tier-1 {
    background: color-mix(in srgb, var(--accent-success) 18%, var(--neutral-0) 82%);
    color: #07401e;
}

.wager-tier-pill.tier-2 {
    background: color-mix(in srgb, var(--accent-warning) 26%, var(--neutral-0) 74%);
    color: #3a2a00;
}

.wager-tier-pill.tier-3 {
    background: color-mix(in srgb, var(--accent-danger) 26%, var(--neutral-0) 74%);
    color: #42030f;
}

.wager-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 4px;
}

.arrow-btn {
    width: 40px;
    height: 40px;
    border-radius: 999px;
    border: 1px solid var(--btn-ghost-border);
    background: var(--btn-ghost-bg);
    color: var(--btn-ghost-on);
    cursor: pointer;
    font-size: 1.3rem;
    display: grid;
    place-items: center;
}

.arrow-btn:disabled {
    opacity: 0.45;
    cursor: default;
}

.wager-value-block {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.wager-amount {
    font-size: 1.4rem;
    font-weight: 800;
}

/* Toast */
.mm-toast {
    background: var(--modal-surface);
    color: var(--modal-on-surface);
    padding: 18px 32px;
    border-radius: var(--modal-radius);
    box-shadow: var(--modal-shadow);
    border: 1px solid var(--modal-border);
    display: inline-flex;
    align-items: center;
    gap: 14px;
    max-width: min(720px, 100vw - 40px);

    padding: 6px 14px;
    border: 6px solid transparent;

    background:
        linear-gradient(var(--modal-surface), var(--modal-surface)) padding-box,
        linear-gradient(120deg,
            var(--accent-primary),
            var(--accent-secondary),
            var(--accent-success),
            var(--accent-warning),
            var(--accent-danger),
            var(--accent-primary)) border-box;
}

.mm-toast-text {
    font-size: clamp(1.8rem, 3.8vw, 2.5rem);
    font-weight: 900;
    text-align: center;
}

.mm-toast-close {
    border: none;
    background: transparent;
    color: var(--modal-on-surface-soft);
    font-size: 1.2rem;
    cursor: pointer;
}

/* Machine body image */
.machine-body-img {
    width: 100%;
    height: auto;
    display: block;
    z-index: 3;
    pointer-events: none;
}

/* Reels layer */
.reels-layer {
    position: absolute;
    inset: 0;
    z-index: 1;
    display: flex;
    justify-content: center;
    align-items: center;
}

/* Reels window */
.slot-frame {
    width: 78%;
    max-width: 380px;
    height: 240px;
    border-radius: var(--radius-md);
    padding: 16px 22px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
    background: var(--neutral-0);
    transform: translateY(5%);
}

/* 3D reel */
.reel3d {
    height: 105px;
    perspective: 900px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.reel3d-inner {
    position: relative;
    width: 100%;
    height: 250px;
    transform-style: preserve-3d;
}

.reel-face {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    backface-visibility: hidden;
}

.reel-symbol {
    font-size: 3rem;
}

/* Prize button */
.prize-btn {
    position: absolute;
    bottom: 16%;
    left: 50%;
    transform: translateX(-50%);
    border-radius: 999px;
    border: 2px solid rgba(255, 255, 255, 0.9);
    background: var(--btn-primary-bg);
    color: var(--btn-primary-on);
    padding: 8px 24px;
    font-weight: 800;
    font-size: 1rem;
    cursor: pointer;
    z-index: 4;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    transition:
        transform 0.15s ease-out,
        box-shadow 0.15s ease-out,
        opacity 0.15s ease-out;
}

.prize-btn:hover {
    transform: translateX(-50%) translateY(-1px);
}

.prize-label {
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.prize-btn.has-prize {
    box-shadow:
        0 0 12px color-mix(in srgb, var(--btn-primary-bg) 55%, transparent),
        0 0 30px color-mix(in srgb, var(--btn-primary-bg) 85%, transparent),
        0 0 60px color-mix(in srgb, var(--btn-primary-bg) 100%, transparent);
    animation: prize-pulse 1.4s ease-in-out infinite;
}

.prize-btn.has-prize .prize-label {
    animation: prize-spin 3s linear infinite;
}

@keyframes prize-pulse {
    0% {
        transform: translateX(-50%) scale(1);
        box-shadow:
            0 0 10px color-mix(in srgb, var(--btn-primary-bg) 55%, transparent),
            0 0 24px color-mix(in srgb, var(--btn-primary-bg) 80%, transparent);
    }

    45% {
        transform: translateX(-50%) scale(1.12);
        box-shadow:
            0 0 16px color-mix(in srgb, var(--btn-primary-bg) 70%, transparent),
            0 0 42px color-mix(in srgb, var(--btn-primary-bg) 100%, transparent),
            0 0 72px color-mix(in srgb, var(--btn-primary-bg) 100%, transparent);
    }

    100% {
        transform: translateX(-50%) scale(1);
        box-shadow:
            0 0 10px color-mix(in srgb, var(--btn-primary-bg) 55%, transparent),
            0 0 24px color-mix(in srgb, var(--btn-primary-bg) 80%, transparent);
    }
}

@keyframes prize-spin {
    0% {
        transform: rotate(0deg);
    }

    50% {
        transform: rotate(10deg);
    }

    100% {
        transform: rotate(0deg);
    }
}

/* Slot arm */
.slot-arm-btn {
    position: absolute;
    right: -260px;
    top: 35%;
    border: none;
    background: transparent;
    cursor: pointer;
    z-index: 2;
}

.slot-arm-btn[disabled],
.slot-arm-btn[aria-disabled="true"] {
    cursor: default;
}

.slot-arm-img {
    max-height: 260px;
    width: auto;
    transition: transform 0.18s ease-out;
    transform-origin: left center;
}

.slot-arm-img.is-pulled {
    transform: rotate(60deg);
}

/* Buttons */
.pill-btn {
    padding: 7px 14px;
    border-radius: 999px;
    border: 1px solid var(--btn-ghost-border);
    background: var(--btn-ghost-bg);
    color: var(--btn-ghost-on);
    cursor: pointer;
    font-weight: 700;
    font-size: 0.96rem;
}

.pill-btn:disabled {
    opacity: 0.4;
    cursor: default;
}

.pill-btn.primary {
    border-color: var(--btn-primary-border);
    background: var(--btn-primary-bg);
    color: var(--btn-primary-on);
}

/* Transparent overlay for modals */
.effect-modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 1110;
    background: transparent;
    backdrop-filter: none;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* Prize card modal */
.effect-modal {
    width: min(560px, 92vw);
    max-height: 90vh;
    overflow-y: auto;
    background: var(--modal-surface);
    color: var(--modal-on-surface);
    border-radius: var(--modal-radius);
    box-shadow: var(--modal-shadow);
    border: 1px solid var(--modal-border);
    padding: 20px 22px 18px;
}

.effect-modal.info-modal {
    width: min(820px, 80vw);
}

.effect-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
}

.effect-title {
    font-size: 1.8rem;
    font-weight: 900;
    margin: 0;
}

.effect-tier-chip {
    padding: 4px 12px;
    border-radius: 999px;
    border: 1px solid rgba(0, 0, 0, 0.14);
    font-size: 0.95rem;
    font-weight: 800;
    white-space: nowrap;
}

.effect-tier-chip.tier-1 {
    background: color-mix(in srgb, var(--accent-success) 18%, var(--neutral-0) 82%);
    color: #07401e;
}

.effect-tier-chip.tier-2 {
    background: color-mix(in srgb, var(--accent-warning) 26%, var(--neutral-0) 74%);
    color: #3a2a00;
}

.effect-tier-chip.tier-3 {
    background: color-mix(in srgb, var(--accent-danger) 26%, var(--neutral-0) 74%);
    color: #42030f;
}

.effect-body {
    margin: 6px 0 16px;
    display: flex;
    justify-content: center;
    text-align: center;
}

.effect-description {
    font-size: 1.05rem;
    line-height: 1.5;
    color: var(--modal-on-surface-soft);
}

.effect-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}

.effect-actions.info-actions {
    margin-top: 16px;
}

/* Info modal grid: 2 columns */
.prize-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 24px;
    margin-top: 12px;
}

.prize-col h4 {
    margin: 0 0 8px;
    font-size: 1.05rem;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    color: var(--modal-on-surface-soft);
}

.prize-list {
    padding-left: 20px;
    margin: 0;
    font-size: 1rem;
    line-height: 1.6;
    color: var(--modal-on-surface-soft);
}

/* Toast slide animation */
.mm-toast-slide-enter-active,
.mm-toast-slide-leave-active {
    transition: transform 0.25s ease-out, opacity 0.25s ease-out;
}

.mm-toast-slide-enter-from {
    transform: translateY(120%);
    opacity: 0;
}

.mm-toast-slide-enter-to {
    transform: translateY(0);
    opacity: 1;
}

.mm-toast-slide-leave-from {
    transform: translateY(0);
    opacity: 1;
}

.mm-toast-slide-leave-to {
    transform: translateY(120%);
    opacity: 0;
}

/* Prize card pop animation */
.mm-card-pop-enter-active {
    animation: mm-card-open 0.3s cubic-bezier(.2, .8, .3, 1.1);
}

.mm-card-pop-leave-active {
    animation: mm-card-close 0.22s ease-in forwards;
}

@keyframes mm-card-open {
    0% {
        transform: translateY(40px) scale(0.25) rotate(-10deg);
        opacity: 0;
    }

    60% {
        transform: translateY(-6px) scale(1.05) rotate(4deg);
        opacity: 1;
    }

    100% {
        transform: translateY(0) scale(1) rotate(0deg);
        opacity: 1;
    }
}

@keyframes mm-card-close {
    0% {
        transform: translateY(0) scale(1) rotate(0deg);
        opacity: 1;
    }

    100% {
        transform: translateY(24px) scale(0.9) rotate(-3deg);
        opacity: 0;
    }
}

/* Responsive */
@media (max-width: 900px) {
    .prize-grid {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 640px) {
    .slot-arm-btn {
        right: -140px;
        top: 32%;
    }

    .wager-section {
        width: min(280px, 100vw - 32px);
    }

    .mm-machine {
        min-height: 360px;
    }
}

/* ===== Wager Outcomes: big colored chips ===== */

.outcome-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

/* Big pill chips with large text */
.outcome-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 22px;
    border-radius: 999px;
    box-shadow: var(--elevation-1);
    font-size: clamp(28px, 3vw, 36px);
    font-weight: 800;
    color: var(--neutral-0);
    text-shadow: 0 0 6px rgba(0, 0, 0, 0.5);
}

/* Labels + percentages share the big size */
.outcome-label,
.outcome-pct {
    line-height: 1.05;
}

/* ================================
   OUTCOME CHIP COLOR SET (DARK)
   ================================ */

/* Lose all — dark red #1 */
.outcome-bad-1 {
    background: linear-gradient(135deg,
            #b3002b 0%,
            #7a001f 100%);
}

/* Lose half — dark red #2 */
.outcome-bad-2 {
    background: linear-gradient(135deg,
            #c51634 0%,
            #8b0f26 100%);
}

/* No change — deep blue */
.outcome-neutral {
    background: linear-gradient(135deg,
            #1e4fa3 0%,
            #10346d 100%);
}

/* Positive (2×, 3×, 4×) — dark green → gold */
.outcome-good {
    background: linear-gradient(135deg,
            #0e6b2f 0%,
            #b48a00 100%);
}


/* ===== Tier titles: larger, bold, underlined ===== */
.tier-title {
    font-weight: 900;
    font-size: clamp(1.2rem, 2vw, 1.6rem);
    text-decoration: underline;
    text-underline-offset: 3px;
}

.prize-disclaimer {
    margin-top: 18px;
    font-size: 0.85rem;
    line-height: 1.35;
    color: var(--modal-on-surface-soft);
    text-align: center;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
    opacity: 0.85;
}

.prize-disclaimer strong {
    color: var(--accent-primary);
    font-weight: 700;
}

.prize-disclaimer u {
    text-decoration-color: var(--accent-warning);
    text-decoration-thickness: 2px;
}
</style>
