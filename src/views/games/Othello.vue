<template>
    <section class="othello-page">
        <!-- Top bar with back button -->
        <header class="othello-header">
            <button class="back-btn" type="button" @click="goBack">
                <img :src="backIconSrc" alt="Back" class="back-icon" />
            </button>
        </header>

        <div class="othello-layout">
            <!-- CENTER: BOARD + LABELS -->
            <main class="board-container">
                <div class="board-stack">
                    <!-- Top labels (anchored to board columns, can overlap) -->
                    <div class="x-labels">
                        <div v-for="(label, index) in xLabels" :key="'x-' + index" class="label label-x"
                            :style="getXLabelStyle(index)">
                            {{ label }}
                        </div>
                    </div>

                    <!-- Left labels + board -->
                    <div class="board-row">
                        <div class="y-labels">
                            <div v-for="(label, index) in yLabels" :key="'y-' + index" class="label label-y">
                                {{ label }}
                            </div>
                        </div>

                        <div class="board-grid" :class="currentPlayer">
                            <template v-for="(row, rowIndex) in board" :key="'row-' + rowIndex">
                                <button v-for="(cell, colIndex) in row" :key="rowIndex + '-' + colIndex"
                                    :class="['cell', { 'playable-cell': validMoveMap[rowIndex][colIndex] }]"
                                    type="button" @click="handleCellClick(rowIndex, colIndex)">
                                    <div v-if="cell" class="piece" :class="[
                                        cell,
                                        flipMap[rowIndex][colIndex] ? 'flip' : ''
                                    ]"></div>
                                </button>

                            </template>
                        </div>
                    </div>
                </div>
            </main>

            <!-- RIGHT: SCORE + CONTROLS -->
            <aside class="side-panel controls-panel">
                <div class="turn-indicator">
                    <span class="turn-text">
                        Turn:
                        <span :class="['player-chip', currentPlayer]">
                            {{ currentPlayerLabel }}
                        </span>
                    </span>
                </div>

                <table class="scoreboard">
                    <thead>
                        <tr>
                            <th class="score-header black-header">Black</th>
                            <th class="score-header white-header">White</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="score-cell black-score">{{ blackScore }}</td>
                            <td class="score-cell white-score">{{ whiteScore }}</td>
                        </tr>
                    </tbody>
                </table>

                <p v-if="statusMessage" class="status-message">
                    {{ statusMessage }}
                </p>

                <div class="label-buttons">
                    <button class="secondary-btn" type="button" @click="openLabelModal('y')">
                        Set Left Labels
                    </button>
                    <button class="secondary-btn" type="button" @click="openLabelModal('x')">
                        Set Top Labels
                    </button>
                </div>
                <button class="primary-btn" type="button" @click="resetBoard">
                    Reset Board
                </button>
            </aside>
        </div>

        <!-- LABEL MODAL -->
        <div v-if="showLabelModal" class="modal" @click.self="closeLabelModal">
            <div class="modal-content">
                <div class="modal-header-row">
                    <h3 class="modal-title">
                        {{ modalTitle }}
                    </h3>

                    <div class="theme-select-wrap">
                        <label class="theme-label" for="theme-select">Theme:</label>
                        <select id="theme-select" v-model="selectedTheme" class="theme-select" @change="onThemeChange">
                            <option value="food">Food</option>
                            <option value="drinks">Drinks</option>
                            <option value="desserts">Desserts</option>
                        </select>
                    </div>
                </div>

                <div class="input-container">
                    <label v-for="(value, index) in labelInputs" :key="'input-' + index" class="input-row">
                        <span class="input-label">#{{ index + 1 }}</span>
                        <input v-model="labelInputs[index]" type="text" class="modal-input" />
                    </label>
                </div>

                <div class="modal-actions">
                    <button class="modal-btn reset" type="button" @click="randomLabelInputs">
                        Randomize
                    </button>
                    <button class="modal-btn save" type="button" @click="saveLabels">
                        Save
                    </button>
                    <button class="modal-btn cancel" type="button" @click="closeLabelModal">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import backIconSrc from "@/assets/images/icons/back-icon.png";

type Player = "black" | "white";
type Cell = Player | null;
type ThemeKey = "food" | "drinks" | "desserts";

const router = useRouter();
const BOARD_SIZE = 8;

// --- STATE ---
const board = ref<Cell[][]>([]);
const flipMap = ref<boolean[][]>([]);
const currentPlayer = ref<Player>("black");
const statusMessage = ref<string>("");

// labels
const xLabels = ref<string[]>([]);
const yLabels = ref<string[]>([]);

// modal
const showLabelModal = ref(false);
const labelModalAxis = ref<"x" | "y">("x");
const labelInputs = ref<string[]>([]);
const selectedTheme = ref<ThemeKey>("food");

// sounds
const placeSoundSrc = new URL("@/assets/sounds/place.mp3", import.meta.url)
    .href;
const flipSoundSrc = new URL("@/assets/sounds/flip.mp3", import.meta.url)
    .href;
let placeAudio: HTMLAudioElement | null = null;
let flipAudio: HTMLAudioElement | null = null;

// --- STATIC WORD LISTS ---
const themeWords: Record<ThemeKey, string[]> = {
    food: [
        "rice",
        "riceball",
        "curry and rice",
        "grilled eel",
        "grilled fish",
        "bread",
        "sandwich",
        "pancake",
        "pizza",
        "hamburger",
        "french fries",
        "fried chicken",
        "sausage",
        "steak",
        "omelet",
        "spaghetti",
        "pie",
        "salad",
        "soup",
    ],
    drinks: [
        "water",
        "coffee",
        "tea",
        "juice",
        "milk",
        "soda",
        "mineral water",
        "green tea",
    ],
    desserts: [
        "cake",
        "ice cream",
        "donut",
        "pudding",
        "parfait",
        "chocolate",
        "cream puff",
        "pudding",
        "popcorn",
        "potato chips"
    ],
};

function onThemeChange() {
    randomLabelInputs()
}


// --- NAV ---
function goBack() {
    router.push("/dashboard"); // adjust if needed
}

// --- HELPERS ---
const directions: [number, number][] = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
];

const otherPlayer = (player: Player): Player =>
    player === "black" ? "white" : "black";

const inBounds = (row: number, col: number): boolean =>
    row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;

// get flips for a specific move
function getFlipsForMove(
    row: number,
    col: number,
    player: Player
): [number, number][] {
    const flips: [number, number][] = [];

    if (board.value[row][col] !== null) {
        return flips;
    }

    const opponent = otherPlayer(player);

    for (const [dr, dc] of directions) {
        const line: [number, number][] = [];
        let r = row + dr;
        let c = col + dc;

        while (inBounds(r, c) && board.value[r][c] === opponent) {
            line.push([r, c]);
            r += dr;
            c += dc;
        }

        if (line.length > 0 && inBounds(r, c) && board.value[r][c] === player) {
            flips.push(...line);
        }
    }

    return flips;
}

function hasAnyValidMove(player: Player): boolean {
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const flips = getFlipsForMove(r, c, player);
            if (flips.length > 0) return true;
        }
    }
    return false;
}

const validMoveMap = computed<boolean[][]>(() => {
    // If the board isn't initialized yet, return an all-false map
    if (board.value.length !== BOARD_SIZE) {
        return Array.from({ length: BOARD_SIZE }, () =>
            Array(BOARD_SIZE).fill(false)
        );
    }

    const map: boolean[][] = [];

    for (let r = 0; r < BOARD_SIZE; r++) {
        const row: boolean[] = [];
        for (let c = 0; c < BOARD_SIZE; c++) {
            row.push(
                board.value[r][c] === null &&
                getFlipsForMove(r, c, currentPlayer.value).length > 0
            );
        }
        map.push(row);
    }

    return map;
});


// --- GAME LOGIC ---
function initBoard() {
    const newBoard: Cell[][] = [];
    const newFlipMap: boolean[][] = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
        const row: Cell[] = [];
        const flipRow: boolean[] = [];
        for (let c = 0; c < BOARD_SIZE; c++) {
            row.push(null);
            flipRow.push(false);
        }
        newBoard.push(row);
        newFlipMap.push(flipRow);
    }

    // standard Othello start
    const mid = BOARD_SIZE / 2;
    newBoard[mid - 1][mid - 1] = "white";
    newBoard[mid - 1][mid] = "black";
    newBoard[mid][mid - 1] = "black";
    newBoard[mid][mid] = "white";

    board.value = newBoard;
    flipMap.value = newFlipMap;
    currentPlayer.value = "black";
    statusMessage.value = "";
}

// apply flips with animation flag
function applyFlips(flips: [number, number][]) {
    if (!flips.length) return;

    flips.forEach(([r, c]) => {
        flipMap.value[r][c] = true;
    });

    setTimeout(() => {
        flips.forEach(([r, c]) => {
            flipMap.value[r][c] = false;
        });
    }, 400);
}

function playPlaceSound() {
    if (!placeAudio) return;
    void placeAudio.play().catch(() => { });
}

function playFlipSound() {
    if (!flipAudio) return;
    void flipAudio.play().catch(() => { });
}

function handleCellClick(row: number, col: number) {
    const flips = getFlipsForMove(row, col, currentPlayer.value);
    if (!flips.length) return; // invalid move

    // place piece
    board.value[row][col] = currentPlayer.value;
    playPlaceSound();

    // flip pieces
    flips.forEach(([r, c]) => {
        board.value[r][c] = currentPlayer.value;
    });
    applyFlips(flips);
    if (flips.length) {
        playFlipSound();
    }

    // switch turn / check for passes or end
    const next = otherPlayer(currentPlayer.value);

    if (hasAnyValidMove(next)) {
        currentPlayer.value = next;
        statusMessage.value = "";
    } else if (hasAnyValidMove(currentPlayer.value)) {
        statusMessage.value = `${capitalize(
            next
        )} has no valid moves. Turn stays with ${capitalize(
            currentPlayer.value
        )}.`;
    } else {
        // no valid moves for either player -> game over
        statusMessage.value = "No valid moves for either player. Game over!";
    }
}

function resetBoard() {
    initBoard();
}

// --- LABELS / MODAL ---
function initDefaultLabels() {
    xLabels.value = Array.from({ length: BOARD_SIZE }, (_, i) =>
        String.fromCharCode(65 + i)
    ); // A–H
    yLabels.value = Array.from({ length: BOARD_SIZE }, (_, i) =>
        String(i + 1)
    ); // 1–8
}

function openLabelModal(axis: "x" | "y") {
    labelModalAxis.value = axis;
    labelInputs.value = axis === "x" ? [...xLabels.value] : [...yLabels.value];
    showLabelModal.value = true;
}

function closeLabelModal() {
    showLabelModal.value = false;
}

function getRandomLabelsFromTheme(theme: ThemeKey): string[] {
    const words = [...themeWords[theme]];
    // shuffle
    for (let i = words.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [words[i], words[j]] = [words[j], words[i]];
    }
    return words.slice(0, BOARD_SIZE);
}

function randomLabelInputs() {
    const labels = getRandomLabelsFromTheme(selectedTheme.value);
    labelInputs.value = [...labels];
}

function saveLabels() {
    if (labelModalAxis.value === "x") {
        xLabels.value = [...labelInputs.value];
    } else {
        yLabels.value = [...labelInputs.value];
    }
    showLabelModal.value = false;
}

// --- COMPUTED ---
const blackScore = computed(() => {
    let count = 0;
    for (const row of board.value) {
        for (const cell of row) {
            if (cell === "black") count++;
        }
    }
    return count;
});

const whiteScore = computed(() => {
    let count = 0;
    for (const row of board.value) {
        for (const cell of row) {
            if (cell === "white") count++;
        }
    }
    return count;
});

const currentPlayerLabel = computed(() =>
    currentPlayer.value === "black" ? "Black" : "White"
);

const modalTitle = computed(() =>
    labelModalAxis.value === "x" ? "Set Top Labels" : "Set Left Labels"
);

// --- LABEL POSITIONING FOR TOP LABELS ---
function getXLabelStyle(index: number) {
    // center of this column as fraction of board width
    const fraction = (index + 0.5) / BOARD_SIZE;
    return {
        left: `calc(${fraction * 100}% - 0.6em)`,
        bottom: "0",
    } as const;
}

// --- UTIL ---
function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// --- LIFECYCLE ---
onMounted(() => {
    initBoard();
    initDefaultLabels();

    placeAudio = new Audio(placeSoundSrc);
    flipAudio = new Audio(flipSoundSrc);
});
</script>

<style scoped>
.othello-page {
    min-height: 100vh;
    padding: 16px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
}

/* Top bar */
.othello-header {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    margin-bottom: 8px;
}

.back-btn {
    padding: 0;
    border-radius: 4px;
    border: none;
    background: transparent;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.12s ease;
}

.back-btn:hover {
    transform: scale(1.15);
}

.back-icon {
    width: 36px;
    height: 36px;
}

/* MAIN LAYOUT */
.othello-layout {
    position: relative;
    flex: 1;
    display: flex;
    justify-content: center;
    /* board column centered */
    align-items: stretch;
    margin-top: 4px;
}

/* BOARD AREA – centered, but lower on the page */
.board-container {
    width: 100%;
    display: flex;
    justify-content: center;
    /* center board horizontally */
    align-items: flex-end;
    /* push board towards bottom */
    padding-bottom: 5vh;
    /* distance from bottom of viewport */
}

/* Board + labels stack */
.board-stack {
    position: relative;
    width: min(85vmin, 700px);
    /* bigger fixed responsive size */
}

/* Row with left labels + board */
.board-row {
    position: relative;
    width: 100%;
}

/* Top labels, anchored over board width */
.x-labels {
    position: absolute;
    top: -40px;
    /* space above board */
    left: 0;
    width: 100%;
    height: 40px;
    pointer-events: none;
    /* labels don't block clicks on board */
}

/* Left labels: anchored to board's LEFT edge, text extends left */
.y-labels {
    position: absolute;
    top: 0;
    bottom: 0;
    right: 100%;
    /* anchor to left edge of board-grid */
    display: grid;
    grid-template-rows: repeat(8, 1fr);
    gap: 4px;
    font-weight: 700;
    align-items: center;
    overflow: visible;
    /* allow label text to extend left */
    min-width: 40px;
}

/* Board grid (the actual Othello board) */
.board-grid {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 2px;
    background-color: #0f7f0f;
    padding: 6px;
    border-radius: 6px;
    border: 4px solid #000;
    box-sizing: border-box;
    aspect-ratio: 1 / 1;
    /* square board */
}

/* Board border color changes by turn */
.board-grid.black {
    border-color: #000;
}

.board-grid.white {
    border-color: #fff;
}

/* RIGHT SIDE PANEL (score + controls) */
.side-panel {
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    min-width: 170px;
}

/* TURN INDICATOR */
.turn-indicator {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
}

.turn-text {
    font-weight: 600;
}

.player-chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-left: 4px;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 14px;
    border: 1px solid #000;
}

.player-chip.black {
    background-color: #000;
    color: #fff;
}

.player-chip.white {
    background-color: #fff;
    color: #000;
}

/* SCOREBOARD */
.scoreboard {
    border-collapse: collapse;
    width: 150px;
    text-align: center;
    font-size: 16px;
    background-color: #fff;
}

.scoreboard th,
.scoreboard td {
    border: 2px solid #000;
    padding: 5px;
}

.score-header {
    background-color: goldenrod;
    color: #000;
    font-weight: 700;
}

.black-score {
    background-color: #000;
    color: #fff;
    font-weight: 700;
}

.white-score {
    background-color: #fff;
    color: #000;
    font-weight: 700;
}

.status-message {
    margin-top: 4px;
    text-align: center;
    font-size: 14px;
    max-width: 200px;
}

/* Cells */
.cell {
    width: 100%;
    aspect-ratio: 1 / 1;
    background-color: #8ee28e;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border: none;
    padding: 0;
    position: relative; /* needed for hover outline */
}

/* Dotted preview circle on playable cells when hovered */
.board-grid .cell.playable-cell:hover::after {
  content: "";
  position: absolute;
  inset: 10%;
  border-radius: 50%;
  border-width: 3px;
  border-style: dotted;
  box-sizing: border-box;
  pointer-events: none;
}

/* Color of the preview outline matches the current player */
.board-grid.black .cell.playable-cell:hover::after {
  border-color: #000;
}

.board-grid.white .cell.playable-cell:hover::after {
  border-color: #fff;
}


/* Pieces */
.piece {
    width: 80%;
    height: 80%;
    border-radius: 50%;
    position: relative;
    transform-style: preserve-3d;
    transition: transform 0.4s ease, background-color 0.4s ease;
    border: 1px solid #000;
}

.piece.black {
    background-color: #000;
}

.piece.white {
    background-color: #fff;
}

.piece.flip {
    transform: rotateY(180deg);
}

/* Labels */
.label {
    font-size: clamp(20px, 3vw, 32px);
    font-weight: 700;
    color: #fff;
    text-shadow:
        -1px -1px 0 #000,
        1px -1px 0 #000,
        -1px 1px 0 #000,
        1px 1px 0 #000;
}

/* Slanted top labels, absolutely positioned per column, can overlap */
.label-x {
    position: absolute;
    transform: rotate(-45deg);
    transform-origin: left bottom;
    white-space: nowrap;
    line-height: 1;
}

/* Left labels: text grows left, stays anchored at board edge */
.label-y {
    text-align: right;
    padding-right: 4px;
    white-space: nowrap;
}

/* BUTTONS */
.primary-btn {
    padding: 10px 20px;
    font-size: 15px;
    font-weight: 700;
    background-color: #ff4d4d;
    color: #fff;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    transition: background-color 0.25s ease, transform 0.1s ease;
}

.primary-btn:hover {
    background-color: #cc0000;
    transform: translateY(-1px);
}

.label-buttons {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 12px;
}

.secondary-btn {
    padding: 8px 14px;
    font-size: 14px;
    background-color: #4caf50;
    color: #fff;
    border-radius: 5px;
    border: none;
    cursor: pointer;
    transition: background-color 0.25s ease, transform 0.1s ease;
}

.secondary-btn:hover {
    background-color: #388e3c;
    transform: translateY(-1px);
}

/* MODAL */
.modal {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
}

.modal-content {
    background: #ffffff;
    padding: 20px;
    border-radius: 8px;
    width: min(360px, 95%);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}

/* Modal header row: title + theme select */
.modal-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
}

.modal-title {
    margin: 0;
    font-size: 18px;
}

.theme-select-wrap {
    display: flex;
    align-items: center;
    gap: 6px;
}

.theme-label {
    font-size: 13px;
}

.theme-select {
    padding: 4px 6px;
    font-size: 13px;
}

/* Modal body */
.input-container {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 12px;
}

.input-row {
    display: flex;
    align-items: center;
    gap: 6px;
}

.input-label {
    width: 32px;
    text-align: right;
    font-size: 13px;
}

.modal-input {
    flex: 1;
    padding: 6px 8px;
    border-radius: 4px;
    border: 1px solid #ccc;
    font-size: 14px;
}

.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    flex-wrap: wrap;
}

.modal-btn {
    padding: 8px 14px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    font-size: 14px;
}

.modal-btn.reset {
    background-color: #e0e0e0;
    color: #333;
}

.modal-btn.save {
    background-color: #4caf50;
    color: #fff;
}

.modal-btn.cancel {
    background-color: #f44336;
    color: #fff;
}

/* RESPONSIVE */
@media (max-width: 900px) {
    .othello-layout {
        flex-direction: column;
        align-items: center;
    }

    .board-container {
        order: -1;
        /* board on top for mobile */
        padding-bottom: 24px;
    }

    .side-panel {
        position: static;
        transform: none;
        margin-top: 16px;
        min-width: 0;
        width: 100%;
        max-width: 360px;
    }

    .board-stack {
        width: min(95vw, 700px);
    }
}
</style>
