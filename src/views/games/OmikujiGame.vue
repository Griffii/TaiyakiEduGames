<template>
    <section class="omikuji-page" :style="rootVars">
        <!-- Background layers -->
        <div class="bg-image" aria-hidden="true"></div>
        <div class="bg-overlay" aria-hidden="true"></div>

        <!-- Back / Home -->
        <button class="home-button" type="button" @click="onExit" aria-label="Back">
            <img :src="homeIconUrl" alt="" />
        </button>

        <!-- Taiyaki Mode toggle (top-right) -->
        <button
            class="taiyaki-mode-toggle"
            type="button"
            @click="toggleTaiyakiMode"
            :aria-pressed="taiyakiMode"
            :title="taiyakiMode ? 'Taiyaki Mode: ON' : 'Taiyaki Mode: OFF'"
        >
            <span class="tmt-left">
                <img class="tmt-thumb" :src="taiyakiAltIconUrl" alt="" />
                <span class="tmt-label">Taiyaki Mode</span>
            </span>
            <span class="tmt-switch" :class="{ 'is-on': taiyakiMode }" aria-hidden="true">
                <span class="tmt-knob"></span>
            </span>
        </button>

        <section class="gamecontainer">
            <header class="header">
                <h1 class="title">
                    New Year's Fortune!
                </h1>

                <button class="draw-btn" type="button" @click="drawFortune" :disabled="isBusy">
                    {{ isBusy ? "Drawing..." : "Choose Your Fortune" }}
                </button>
            </header>

            <!-- Center stage: Taiyaki + Kanji overlay + results underneath -->
            <div class="center-stage">
                <div class="stage-layer">
                    <!-- Taiyaki (base layer) -->
                    <Transition name="fade">
                        <div v-if="showTaiyaki" class="taiyaki-wrap" aria-hidden="true">
                            <img
                                class="taiyaki"
                                :class="{ 'crazy-shake': taiyakiShake }"
                                :style="taiyakiShakeVars"
                                :src="activeTaiyakiUrl"
                                alt=""
                            />
                        </div>
                    </Transition>

                    <!-- Kanji overlay (above Taiyaki, same position, does not displace anything) -->
                    <Transition name="kanji-bounce">
                        <div v-if="kanjiVisible && overallLuck" class="kanji-overlay" aria-live="polite">
                            <h2 class="overall-kanji">{{ overallLuck.kanji }}</h2>
                            <div class="furigana">{{ overallLuck.name }}</div>
                            <p class="total-stars">Total Stars: {{ overallLuck.total }}</p>
                        </div>
                    </Transition>
                </div>

                <!-- Fortune cards load in under the Kanji after a pause -->
                <div class="result-wrap">
                    <TransitionGroup name="fade-up" tag="div" class="fortunes">
                        <article v-for="card in shownCards" :key="card.key" class="fortune-type">
                            <div class="fortune-stars">{{ card.stars }}</div>

                            <p class="fortune-label">
                                <strong>{{ card.type }}:</strong>
                            </p>

                            <p class="fortune-en">{{ card.en }}</p>

                            <button v-if="!card.showJa" type="button" class="ja-btn" @click="card.showJa = true">
                                日本語
                            </button>

                            <p v-if="card.showJa" class="fortune-ja" v-html="card.jaHtml"></p>
                        </article>
                    </TransitionGroup>
                </div>
            </div>
        </section>

        <!-- Hidden preload images so first draw has no "cold load" flicker -->
        <div class="preload-bin" aria-hidden="true">
            <img :src="taiyakiDefaultIconUrl" alt="" />
            <img :src="taiyakiAltIconUrl" alt="" />
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";

/* =========================
   Types
========================= */
type Fortune = {
    level: number | string;
    stars: string;
    fortune_english: string;
    fortune_japanese: string;
};

type Card = {
    key: string;
    type: string;
    stars: string;
    en: string;
    jaHtml: string;
    showJa: boolean;
};

/* =========================
   State
========================= */
const isBusy = ref(false);

const showTaiyaki = ref(false);
const taiyakiShake = ref(false);

const kanjiVisible = ref(false);

const overallLuck = ref<null | {
    kanji: string;
    name: string;
    total: number;
}>(null);

const shownCards = reactive<Card[]>([]);

/* =========================
   Taiyaki Mode (NEW)
========================= */
const taiyakiMode = ref(false);

function toggleTaiyakiMode() {
    taiyakiMode.value = !taiyakiMode.value;
}

/* =========================
   Assets (images)
========================= */
import homeIconUrl from "@/assets/images/icons/home-icon.png";

// Default taiyaki
import taiyakiDefaultIconUrl from "@/assets/images/games/omikuji/omikuji.png";

// Alternative taiyaki
import taiyakiAltIconUrl from "@/assets/images/logos/taiyaki.png";

import bgUrl from "@/assets/images/backgrounds/repeating-fans-green.jpg";

/* Use whichever image matches mode */
const activeTaiyakiUrl = computed(() =>
    taiyakiMode.value ? taiyakiAltIconUrl : taiyakiDefaultIconUrl
);

/* Bind background URL into CSS via var (reliable with scoped styles) */
const rootVars = computed(() => ({
    "--bg-url": `url(${bgUrl})`,
}));

/* =========================
   Assets (audio)
========================= */
import sfxTaiyakiUrl from "@/assets/sounds/fortunegame/omikuji-sfx.mp3";
import sfxDaikichiUrl from "@/assets/sounds/fortunegame/daikichi.mp3";
import sfxKichiUrl from "@/assets/sounds/fortunegame/kichi.mp3";
import sfxChukichiUrl from "@/assets/sounds/fortunegame/chukichi.mp3";
import sfxShokichiUrl from "@/assets/sounds/fortunegame/shokichi.mp3";
import sfxKyoUrl from "@/assets/sounds/fortunegame/kyo.mp3";
import sfxDaikyoUrl from "@/assets/sounds/fortunegame/daikyo.mp3";

const sfxTaiyaki = new Audio(sfxTaiyakiUrl);
const sfxDaikichi = new Audio(sfxDaikichiUrl);
const sfxKichi = new Audio(sfxKichiUrl);
const sfxChukichi = new Audio(sfxChukichiUrl);
const sfxShokichi = new Audio(sfxShokichiUrl);
const sfxKyo = new Audio(sfxKyoUrl);
const sfxDaikyo = new Audio(sfxDaikyoUrl);

/* =========================
   Fortunes JSON (bundled)
========================= */
import gradesData from "@/assets/data/fortunes/grades.json";
import loveData from "@/assets/data/fortunes/love.json";
import moneyData from "@/assets/data/fortunes/money.json";

const grades = gradesData as Fortune[];
const love = loveData as Fortune[];
const money = moneyData as Fortune[];

/* =========================
   Preload helpers (NEW)
========================= */
function preloadImage(src: string) {
    return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve(); // don't block gameplay if an image fails
        img.src = src;
    });
}

/* =========================
   Audio helpers
========================= */
function resetAndPlay(a: HTMLAudioElement) {
    try {
        a.currentTime = 0;
        void a.play();
    } catch { }
}

function preloadAudio(a: HTMLAudioElement) {
    return new Promise<void>((resolve) => {
        const done = () => resolve();
        a.addEventListener("canplaythrough", done, { once: true });
        a.load();
    });
}

onMounted(() => {
    // Preload audio AND images to avoid the first-click Taiyaki not appearing in time
    void Promise.all([
        preloadAudio(sfxTaiyaki),
        preloadAudio(sfxDaikichi),
        preloadAudio(sfxKichi),
        preloadAudio(sfxChukichi),
        preloadAudio(sfxShokichi),
        preloadAudio(sfxKyo),
        preloadAudio(sfxDaikyo),
        preloadImage(taiyakiDefaultIconUrl),
        preloadImage(taiyakiAltIconUrl),
    ]);
});

/* =========================
   Fortune logic
========================= */
function getRandomFortune(list: Fortune[]) {
    return list[Math.floor(Math.random() * list.length)];
}

function calculateLuckLevel(total: number) {
    if (total >= 13) return "大吉 (Dai-kichi)";
    if (total >= 10) return "吉 (Kichi)";
    if (total >= 7) return "中吉 (Chu-kichi)";
    if (total >= 4) return "小吉 (Sho-kichi)";
    if (total >= 1) return "凶 (Kyo)";
    return "大凶 (Dai-kyo)";
}

function playLuckSound(luckLevel: string) {
    switch (luckLevel) {
        case "大吉 (Dai-kichi)":
            resetAndPlay(sfxDaikichi);
            break;
        case "吉 (Kichi)":
            resetAndPlay(sfxKichi);
            break;
        case "中吉 (Chu-kichi)":
            resetAndPlay(sfxChukichi);
            break;
        case "小吉 (Sho-kichi)":
            resetAndPlay(sfxShokichi);
            break;
        case "凶 (Kyo)":
            resetAndPlay(sfxKyo);
            break;
        case "大凶 (Dai-kyo)":
            resetAndPlay(sfxDaikyo);
            break;
    }
}

function formatRubyText(text: string) {
    return text.replace(
        /([\u4E00-\u9FFF]+)\(([\u3040-\u309F]+)\)/g,
        "<ruby>$1<rt>$2</rt></ruby>"
    );
}

/* =========================
   Taiyaki shake animation
========================= */
const shakeVars = reactive({
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0,
    r1: 0,
    r2: 0,
});

function randomizeShake() {
    shakeVars.x1 = Math.random() * 10 - 5;
    shakeVars.y1 = Math.random() * 10 - 5;
    shakeVars.x2 = Math.random() * 20 - 10;
    shakeVars.y2 = Math.random() * 20 - 10;
    shakeVars.r1 = Math.random() * 30 - 15;
    shakeVars.r2 = Math.random() * 40 - 20;
}

const taiyakiShakeVars = computed(() => ({
    "--sx1": `${shakeVars.x1}%`,
    "--sy1": `${shakeVars.y1}%`,
    "--sx2": `${shakeVars.x2}%`,
    "--sy2": `${shakeVars.y2}%`,
    "--sr1": `${shakeVars.r1}deg`,
    "--sr2": `${shakeVars.r2}deg`,
}));

/* =========================
   Timers
========================= */
let activeTimers: number[] = [];
function clearTimers() {
    activeTimers.forEach(clearTimeout);
    activeTimers = [];
}

/* =========================
   Main action
========================= */
async function drawFortune() {
    if (isBusy.value) return;

    clearTimers();
    isBusy.value = true;

    // Reset display
    showTaiyaki.value = false;
    taiyakiShake.value = false;
    kanjiVisible.value = false;
    overallLuck.value = null;
    shownCards.splice(0);

    // Random picks
    const f1 = getRandomFortune(grades);
    const f2 = getRandomFortune(love);
    const f3 = getRandomFortune(money);

    const total = Number(f1.level) + Number(f2.level) + Number(f3.level);
    const luckLevel = calculateLuckLevel(total);
    const [kanji, name] = luckLevel.split(" ");

    // Helper: always use DOM timers (fixes "Timeout not assignable to number")
    const schedule = (fn: () => void, ms: number) => {
        const id = window.setTimeout(fn, ms);
        activeTimers.push(id);
        return id;
    };

    // 1) Show Taiyaki and shake
    randomizeShake();
    showTaiyaki.value = true;

    schedule(() => {
        resetAndPlay(sfxTaiyaki);
        taiyakiShake.value = true;
    }, 100);

    // 2) Stop shake and hide Taiyaki completely
    schedule(() => {
        taiyakiShake.value = false;
    }, 1750);

    schedule(() => {
        showTaiyaki.value = false;
    }, 2000);

    // 3) Immediately after Taiyaki is gone, animate Kanji in the same position (overlay)
    schedule(() => {
        overallLuck.value = { kanji, name, total };
        kanjiVisible.value = true;
        playLuckSound(luckLevel);
    }, 2050);

    // 4) After a pause, load the three fortunes one-by-one UNDER the kanji
    schedule(() => {
        const items = [
            { type: "Grades Fortune", f: f1 },
            { type: "Love Fortune", f: f2 },
            { type: "Money Fortune", f: f3 },
        ];

        items.forEach((c, i) => {
            schedule(() => {
                shownCards.push({
                    key: `${Date.now()}-${i}`,
                    type: c.type,
                    stars: c.f.stars,
                    en: c.f.fortune_english,
                    jaHtml: formatRubyText(c.f.fortune_japanese),
                    showJa: false,
                });

                // Re-enable after last card appears
                if (i === items.length - 1) {
                    schedule(() => {
                        isBusy.value = false;
                    }, 300);
                }
            }, i * 700);
        });
    }, 3050);
}

function onExit() {
    window.history.back();
}
</script>

<style scoped>
/* =========================
   Page background + filter
========================= */
.omikuji-page {
    position: relative;
    min-height: 100vh;
    overflow: hidden;
}

.bg-image {
    position: absolute;
    inset: 0;
    background-image: var(--bg-url);
    background-size: 420px;
    background-repeat: repeat;
    background-position: center;
    z-index: 0;
}

.bg-overlay {
    position: absolute;
    inset: 0;
    z-index: 1;
    background: linear-gradient(180deg,
            rgba(255, 255, 255, 0.88),
            rgba(245, 255, 248, 0.86));
    backdrop-filter: saturate(0.9) brightness(1.05);
}

/* =========================
   Layout
========================= */
.gamecontainer {
    position: relative;
    z-index: 2;
    min-height: 100vh;
    width: 100%;
    padding: 18px 16px 40px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.header {
    width: min(720px, 94vw);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    padding-top: 52px;
}

.center-stage {
    width: min(980px, 94vw);
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 18px 0 28px;
    gap: 18px;
}

/* This layer holds Taiyaki and Kanji in the exact same center position */
.stage-layer {
    position: relative;
    width: 100%;
    display: grid;
    place-items: center;
    min-height: min(320px, 38vh);
}

/* =========================
   Header typography
========================= */
.title {
    margin: 0;
    text-align: center;
    font-size: clamp(28px, 3.6vw, 44px);
    line-height: 1.05;
    color: #103b2b;
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.75);
}

/* =========================
   Buttons
========================= */
.draw-btn {
    background-color: #0f6b4f;
    color: #ffffff;
    border: none;
    padding: 10px 16px;
    cursor: pointer;
    border-radius: 12px;
    font-size: 18px;
    transition: transform 0.15s ease, filter 0.15s ease, opacity 0.15s ease;
    box-shadow: 0 10px 22px rgba(0, 0, 0, 0.12);
}

.draw-btn:hover:not(:disabled) {
    transform: translateY(-1px) scale(1.03);
    filter: brightness(1.05);
}

.draw-btn:disabled {
    opacity: 0.72;
    cursor: not-allowed;
}

/* Back button */
.home-button {
    position: absolute;
    top: 16px;
    left: 16px;
    width: 34px;
    height: 34px;
    z-index: 3;
    background: transparent;
    border: 0;
    padding: 0;
}

.home-button img {
    width: 100%;
    height: auto;
    cursor: pointer;
    transition: transform 0.2s ease-in-out;
    filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.16));
}

.home-button img:hover {
    transform: scale(1.12);
}

/* =========================
   Taiyaki Mode Toggle (TOP-RIGHT)
========================= */
.taiyaki-mode-toggle {
    position: absolute;
    top: 14px;
    right: 14px;
    z-index: 3;

    display: inline-flex;
    align-items: center;
    gap: 10px;

    padding: 8px 10px;
    border-radius: 12px;
    border: 1px solid rgba(15, 107, 79, 0.22);

    background: rgba(255, 255, 255, 0.88);
    box-shadow: 0 12px 22px rgba(0, 0, 0, 0.10);
    backdrop-filter: blur(6px);

    cursor: pointer;
    user-select: none;
}

.taiyaki-mode-toggle:hover {
    filter: brightness(1.02);
}

.tmt-left {
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.tmt-thumb {
    width: 22px;
    height: 22px;
    object-fit: contain;
    filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.10));
}

.tmt-label {
    font-size: 13px;
    font-weight: 700;
    color: #0d5d44;
    letter-spacing: 0.01em;
}

/* The switch pill */
.tmt-switch {
    width: 42px;
    height: 24px;
    border-radius: 999px;
    position: relative;
    flex: 0 0 auto;

    background: rgba(10, 60, 40, 0.20);
    border: 1px solid rgba(10, 60, 40, 0.18);

    transition: background 0.18s ease, border-color 0.18s ease;
}

.tmt-switch.is-on {
    background: rgba(15, 107, 79, 0.92);
    border-color: rgba(15, 107, 79, 0.30);
}

.tmt-knob {
    position: absolute;
    top: 50%;
    left: 3px;
    transform: translateY(-50%);
    width: 18px;
    height: 18px;
    border-radius: 999px;
    background: #ffffff;
    box-shadow: 0 6px 14px rgba(0, 0, 0, 0.18);
    transition: left 0.18s ease;
}

.tmt-switch.is-on .tmt-knob {
    left: 21px;
}

/* =========================
   Taiyaki (centered, large)
========================= */
.taiyaki-wrap {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    z-index: 1;
}

.taiyaki {
    width: min(360px, 74vw);
    height: auto;
    transform-origin: center;
    filter: drop-shadow(0 18px 32px rgba(0, 0, 0, 0.22));
}

/* Shake using CSS vars */
@keyframes crazy-shake-vars {
    0% {
        transform: translate(0, 0) rotate(0deg) scale(1);
    }

    25% {
        transform: translate(var(--sx1), var(--sy1)) rotate(var(--sr1)) scale(1.06);
    }

    50% {
        transform: translate(var(--sx2), var(--sy2)) rotate(var(--sr2)) scale(1.1);
    }

    75% {
        transform: translate(var(--sx1), var(--sy1)) rotate(var(--sr1)) scale(1.06);
    }

    100% {
        transform: translate(0, 0) rotate(0deg) scale(1);
    }
}

.crazy-shake {
    animation: crazy-shake-vars 0.45s infinite;
}

/* =========================
   Kanji overlay (above Taiyaki)
========================= */
.kanji-overlay {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    text-align: center;
    z-index: 2;
    pointer-events: none;
}

.overall-kanji {
    margin: 0;
    font-size: clamp(62px, 6.6vw, 92px);
    letter-spacing: 0.02em;

    color: #0f6b4f;
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.85), 0 2px 0 rgba(0, 0, 0, 0.06),
        0 3px 0 rgba(0, 0, 0, 0.06), 0 4px 0 rgba(0, 0, 0, 0.06),
        0 10px 22px rgba(0, 0, 0, 0.22);
}

.furigana {
    margin-top: 6px;
    font-size: 20px;
    color: #124b37;
    font-weight: 600;
}

.total-stars {
    margin: 8px 0 0;
    color: #1b2a24;
    opacity: 0.9;
}

/* =========================
   Fortune cards (under Kanji)
========================= */
.result-wrap {
    width: min(980px, 94vw);
}

.fortunes {
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px;
}

@media (min-width: 860px) {
    .fortunes {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }
}

.fortune-type {
    border-radius: 16px;
    padding: 14px 14px 16px;

    background: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(10, 60, 40, 0.12);
    box-shadow: 0 14px 26px rgba(0, 0, 0, 0.08);

    color: #12251e;
    text-align: left;
    display: flex;
    flex-direction: column;
}

.fortune-stars {
    font-size: 22px;
    margin-bottom: 10px;
}

.fortune-label {
    margin: 0 0 8px;
    color: #0d5d44;
}

.fortune-en {
    margin: 0 0 12px;
    line-height: 1.45;
}

/* Japanese toggle button centered */
.ja-btn {
    align-self: center;
    margin-top: 6px;

    background-color: #0f6b4f;
    color: white;
    border: none;
    padding: 7px 12px;
    cursor: pointer;
    border-radius: 10px;
    font-size: 15px;
    box-shadow: 0 10px 18px rgba(0, 0, 0, 0.12);
}

.ja-btn:hover {
    filter: brightness(1.05);
}

.fortune-ja {
    margin-top: 10px;
    color: #123528;
    line-height: 1.55;
}

/* Ruby styling */
ruby {
    font-size: 1rem;
    line-height: 1.5;
}

rt {
    font-size: 0.7rem;
    color: #335a4b;
}

/* =========================
   Preload bin (invisible, off-layout)
========================= */
.preload-bin {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    opacity: 0;
    pointer-events: none;
    left: -9999px;
    top: -9999px;
}

/* =========================
   Transitions
========================= */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.35s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

/* Kanji grow + overshoot + rebound */
@keyframes kanji-overshoot {
    0% {
        opacity: 0;
        transform: scale(0);
    }

    60% {
        opacity: 1;
        transform: scale(1.22);
    }

    78% {
        transform: scale(0.96);
    }

    92% {
        transform: scale(1.04);
    }

    100% {
        transform: scale(1);
    }
}

.kanji-bounce-enter-active {
    animation: kanji-overshoot 520ms cubic-bezier(0.2, 0.9, 0.2, 1) both;
}

.kanji-bounce-leave-active {
    transition: opacity 0.2s ease;
}

.kanji-bounce-leave-to {
    opacity: 0;
}

/* Fortune card fade-up */
.fade-up-enter-active {
    transition: opacity 0.35s ease, transform 0.35s ease;
}

.fade-up-enter-from {
    opacity: 0;
    transform: translateY(8px);
}
</style>
