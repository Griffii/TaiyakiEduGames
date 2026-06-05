<template>
    <main class="directions-card-page">
        <section ref="mapStageRef" class="map-stage">
            <img class="map-layer" :src="townMapImage" alt="Town map" draggable="false" />

            <div class="deck-wrapper">
                <button class="deck-button" type="button" aria-label="Draw a random villager card"
                    @click="handleDeckPress">
                    <div class="deck-card deck-card-back back-3"></div>
                    <div class="deck-card deck-card-back back-2"></div>

                    <div class="deck-card deck-card-front">
                        <span class="deck-icon">?</span>
                    </div>
                </button>

                <button class="clear-card-button" type="button" aria-label="Clear current card and villager"
                    @click.stop="clearActiveCard">
                    ×
                </button>
            </div>

            <Transition name="sprite-poof">
                <button v-if="currentCard" :key="spriteKey" class="tiny-villager" type="button"
                    :style="tinyVillagerStyle" :aria-label="`Move ${currentCard.character.name}`"
                    @pointerdown="startTinyVillagerDrag">
                    <img :src="currentCard.character.imageUrl" :alt="currentCard.character.name" draggable="false" />
                    <span class="poof-cloud"></span>
                </button>
            </Transition>
        </section>

        <button class="conversation-button" type="button" aria-label="Show conversation example"
            @click="openConversationOverlay"></button>

        <Transition name="main-card" mode="out-in" @after-enter="handleCardAfterEnter"
            @after-leave="handleCardAfterLeave">
            <article v-if="currentCard" :key="cardKey" class="request-card" :class="{ minimized: isCardMinimized }"
                :style="requestCardStyle" @click="handleCardClick" @pointerdown="startCardDrag">
                <section class="character-panel">
                    <div class="character-pattern">
                        <img class="character-image" :src="currentCard.character.imageUrl"
                            :alt="currentCard.character.name" draggable="false" />

                        <div class="name-bubble">
                            {{ currentCard.character.name }}
                        </div>
                    </div>
                </section>

                <section class="sentence-panel">
                    <p class="request-text">
                        <span>{{ currentCard.requestParts.before }}</span>

                        <span class="place-word" tabindex="0" :data-tooltip="currentCard.placeJapanese" @click.stop
                            @pointerdown.stop>
                            {{ currentCard.place }}
                        </span>

                        <span>{{ currentCard.requestParts.after }}</span>
                    </p>
                </section>
            </article>
        </Transition>

        <Transition name="overlay-fade">
            <section v-if="isConversationOverlayOpen" class="conversation-overlay" @click="closeConversationOverlay">
                <article class="conversation-panel" @click.stop>
                    <h2 class="conversation-title">例文</h2>

                    <div class="conversation-lines">
                        <p class="conversation-line">
                            <strong class="speaker-label">A:</strong>
                            <span class="line-text">
                                Excuse me. How can I get to the
                                <span class="blank-wrapper">
                                    (<span class="blank-word" tabindex="0"
                                        data-tooltip="hospital, library, shrine, castle, gym...">_________</span>)
                                </span>?
                            </span>
                        </p>

                        <p class="conversation-line speaker-gap">
                            <strong class="speaker-label">B:</strong>
                            <span class="line-text">
                                Go straight and turn
                                <span class="blank-wrapper">
                                    (<span class="blank-word short-blank" tabindex="0"
                                        data-tooltip="left, right">______</span>)
                                </span>
                                at the
                                <span class="blank-wrapper">
                                    (<span class="blank-word medium-blank" tabindex="0"
                                        data-tooltip="first, second, third">________</span>)
                                </span>
                                corner.
                            </span>
                        </p>

                        <p class="conversation-line">
                            <span class="speaker-label"></span>
                            <span class="line-text">
                                Then, go straight for
                                <span class="blank-wrapper">
                                    (<span class="blank-word short-blank" tabindex="0"
                                        data-tooltip="one, two, three, four">______</span>)
                                </span>
                                block(s).
                            </span>
                        </p>

                        <p class="conversation-line">
                            <span class="speaker-label"></span>
                            <span class="line-text">
                                It's on your
                                <span class="blank-wrapper">
                                    (<span class="blank-word short-blank" tabindex="0"
                                        data-tooltip="left, right">________</span>)
                                </span>.
                            </span>
                        </p>

                        <p class="conversation-line speaker-gap">
                            <strong class="speaker-label">A:</strong>
                            <span class="line-text">Thank you!</span>
                        </p>
                    </div>
                </article>
            </section>
        </Transition>
    </main>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";

import townMapImage from "@/assets/images/games/directions-cards/town-map.png";

import apolloImage from "@/assets/images/games/directions-cards/apollo.png";
import midgeImage from "@/assets/images/games/directions-cards/midge.png";
import skyeImage from "@/assets/images/games/directions-cards/skye.png";
import pekoeImage from "@/assets/images/games/directions-cards/pekoe.png";
import punchyImage from "@/assets/images/games/directions-cards/punchy.png";
import texImage from "@/assets/images/games/directions-cards/tex.png";
import sparroImage from "@/assets/images/games/directions-cards/sparro.png";
import walkerImage from "@/assets/images/games/directions-cards/walker.png";
import zuckerImage from "@/assets/images/games/directions-cards/zucker.png";
import twiggyImage from "@/assets/images/games/directions-cards/twiggy.png";
import bonbonImage from "@/assets/images/games/directions-cards/bonbon.png";
import lopezImage from "@/assets/images/games/directions-cards/lopez.png";
import carolineImage from "@/assets/images/games/directions-cards/caroline.png";
import nookImage from "@/assets/images/games/directions-cards/nook.png";
import coleImage from "@/assets/images/games/directions-cards/cole.png";
import hamphreyImage from "@/assets/images/games/directions-cards/hamphrey.png";
import tortimerImage from "@/assets/images/games/directions-cards/tortimer.png";
import mapleImage from "@/assets/images/games/directions-cards/maple.png";
import mitziImage from "@/assets/images/games/directions-cards/mitzi.png";

import cardPressSoundFile from "@/assets/sounds/Wood_Block.ogg";
import cardRevealSoundFile from "@/assets/sounds/animalese-directions.wav";

const TINY_VILLAGER_SPAWN_POINTS_PERCENT = [
    {
        x: 6,
        y: 60,
    },
    {
        x: 57,
        y: 77,
    },
    {
        x: 43,
        y: 6,
    },
    {
        x: 87,
        y: 43,
    },
];

const TINY_VILLAGER_SIZE_MIN = 46;
const TINY_VILLAGER_SIZE_MAX = 72;
const TINY_VILLAGER_SIZE_VIEWPORT_RATIO = 0.0435;
const TINY_VILLAGER_GRAB_OFFSET_Y_RATIO = 0.28;

const LARGE_CARD_WIDTH_MAX = 360;
const LARGE_CARD_ASPECT_RATIO = 520 / 360;
const LARGE_CARD_SCREEN_WIDTH_RATIO = 0.9;
const LARGE_CARD_SCREEN_HEIGHT_MARGIN = 30;

const MINIMIZED_CARD_WIDTH_MIN = 132;
const MINIMIZED_CARD_WIDTH_MAX = 190;
const MINIMIZED_CARD_WIDTH_VIEWPORT_RATIO = 0.105;
const MINIMIZED_CARD_ASPECT_RATIO = 274 / 190;
const MINIMIZED_CARD_MARGIN_MIN = 20;
const MINIMIZED_CARD_MARGIN_MAX = 42;
const MINIMIZED_CARD_MARGIN_VIEWPORT_RATIO = 0.023;

const characters = [
    {
        name: "Apollo",
        imageUrl: apolloImage,
    },
    {
        name: "Midge",
        imageUrl: midgeImage,
    },
    {
        name: "Skye",
        imageUrl: skyeImage,
    },
    {
        name: "Pekoe",
        imageUrl: pekoeImage,
    },
    {
        name: "Punchy",
        imageUrl: punchyImage,
    },
    {
        name: "Tex",
        imageUrl: texImage,
    },
    {
        name: "Sparro",
        imageUrl: sparroImage,
    },
    {
        name: "Walker",
        imageUrl: walkerImage,
    },
    {
        name: "Zucker",
        imageUrl: zuckerImage,
    },
    {
        name: "Twiggy",
        imageUrl: twiggyImage,
    },
    {
        name: "Bonbon",
        imageUrl: bonbonImage,
    },
    {
        name: "Lopez",
        imageUrl: lopezImage,
    },
    {
        name: "Caroline",
        imageUrl: carolineImage,
    },
    {
        name: "Nook",
        imageUrl: nookImage,
    },
    {
        name: "Cole",
        imageUrl: coleImage,
    },
    {
        name: "Hamphrey",
        imageUrl: hamphreyImage,
    },
    {
        name: "Tortimer",
        imageUrl: tortimerImage,
    },
    {
        name: "Maple",
        imageUrl: mapleImage,
    },
    {
        name: "Mitzi",
        imageUrl: mitziImage,
    },
];

const places = [
    {
        english: "heart pond",
        japanese: "ハートの池",
    },
    {
        english: "flower shop",
        japanese: "花屋",
    },
    {
        english: "amusement park",
        japanese: "遊園地",
    },
    {
        english: "museum",
        japanese: "博物館",
    },
    {
        english: "restaurant",
        japanese: "レストラン",
    },
    {
        english: "city hall",
        japanese: "市役所",
        usesArticle: false,
    },
    {
        english: "fire station",
        japanese: "消防署",
    },
    {
        english: "book store",
        japanese: "本屋",
    },
    {
        english: "shrine",
        japanese: "神社",
    },
    {
        english: "super market",
        japanese: "スーパー",
    },
    {
        english: "school",
        japanese: "学校",
    },
    {
        english: "police station",
        japanese: "警察署",
    },
    {
        english: "hospital",
        japanese: "病院",
    },
    {
        english: "library",
        japanese: "図書館",
    },
    {
        english: "post office",
        japanese: "郵便局",
    },
    {
        english: "gym",
        japanese: "体育館",
    },
    {
        english: "castle",
        japanese: "城",
    },
    {
        english: "campsite",
        japanese: "キャンプ場",
    },
    {
        english: "airport",
        japanese: "空港",
    },
    {
        english: "park",
        japanese: "公園",
    },
    {
        english: "beach",
        japanese: "ビーチ",
    },
];

const requestTemplates = [
    {
        type: "directions",
        after: "?",
    },
    {
        type: "looking",
        after: ".",
    },
];

const mapStageRef = ref(null);

const currentCard = ref(null);
const pendingCard = ref(null);

const cardKey = ref(0);
const spriteKey = ref(0);
const isCardMinimized = ref(false);
const isConversationOverlayOpen = ref(false);

const previousCharacterName = ref(null);
const previousPlace = ref(null);

const viewportSize = ref({
    width: window.innerWidth,
    height: window.innerHeight,
});

const tinyVillagerPositionPercent = ref({
    x: TINY_VILLAGER_SPAWN_POINTS_PERCENT[0].x,
    y: TINY_VILLAGER_SPAWN_POINTS_PERCENT[0].y,
});

const minimizedCardPosition = ref({
    x: 0,
    y: 0,
});

const dragState = ref({
    isDragging: false,
    pointerId: null,
});

const cardDragState = ref({
    isDragging: false,
    pointerId: null,
    offsetX: 0,
    offsetY: 0,
    startX: 0,
    startY: 0,
    hasDragged: false,
    suppressNextClick: false,
});

const cardPressSound = new Audio(cardPressSoundFile);
const cardRevealSound = new Audio(cardRevealSoundFile);

cardPressSound.volume = 0.8;
cardRevealSound.volume = 0.85;

const largeCardDimensions = computed(() => {
    const widthByScreenWidth = viewportSize.value.width * LARGE_CARD_SCREEN_WIDTH_RATIO;
    const widthByScreenHeight =
        (viewportSize.value.height - LARGE_CARD_SCREEN_HEIGHT_MARGIN) /
        LARGE_CARD_ASPECT_RATIO;

    const width = Math.min(
        LARGE_CARD_WIDTH_MAX,
        widthByScreenWidth,
        widthByScreenHeight
    );

    return {
        width,
        height: width * LARGE_CARD_ASPECT_RATIO,
    };
});

const minimizedCardDimensions = computed(() => {
    const width = clamp(
        viewportSize.value.width * MINIMIZED_CARD_WIDTH_VIEWPORT_RATIO,
        MINIMIZED_CARD_WIDTH_MIN,
        MINIMIZED_CARD_WIDTH_MAX
    );

    return {
        width,
        height: width * MINIMIZED_CARD_ASPECT_RATIO,
    };
});

const minimizedCardMargin = computed(() => {
    return clamp(
        viewportSize.value.width * MINIMIZED_CARD_MARGIN_VIEWPORT_RATIO,
        MINIMIZED_CARD_MARGIN_MIN,
        MINIMIZED_CARD_MARGIN_MAX
    );
});

const requestCardStyle = computed(() => {
    if (!isCardMinimized.value) {
        return {
            left: "50%",
            top: "50%",
            width: `${largeCardDimensions.value.width}px`,
            height: `${largeCardDimensions.value.height}px`,
        };
    }

    return {
        left: `${minimizedCardPosition.value.x}px`,
        top: `${minimizedCardPosition.value.y}px`,
        width: `${minimizedCardDimensions.value.width}px`,
        height: `${minimizedCardDimensions.value.height}px`,
    };
});

const tinyVillagerStyle = computed(() => {
    return {
        left: `${tinyVillagerPositionPercent.value.x}%`,
        top: `${tinyVillagerPositionPercent.value.y}%`,
    };
});

function getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function getRandomItemExcluding(array, excludedValue, getValue = (item) => item) {
    const filteredArray = array.filter((item) => getValue(item) !== excludedValue);

    if (filteredArray.length === 0) {
        return getRandomItem(array);
    }

    return getRandomItem(filteredArray);
}

function createRequestParts(placeData) {
    const template = getRandomItem(requestTemplates);
    const article = placeData.usesArticle === false ? "" : "the ";

    if (template.type === "directions") {
        return {
            before: `Excuse me. How can I get to ${article}`,
            after: template.after,
        };
    }

    return {
        before: `Excuse me. I’m looking for ${article}`,
        after: template.after,
    };
}

function createRandomCard() {
    const character = getRandomItemExcluding(
        characters,
        previousCharacterName.value,
        (characterData) => characterData.name
    );

    const placeData = getRandomItemExcluding(
        places,
        previousPlace.value,
        (place) => place.english
    );

    const requestParts = createRequestParts(placeData);

    previousCharacterName.value = character.name;
    previousPlace.value = placeData.english;

    return {
        character,
        place: placeData.english,
        placeJapanese: placeData.japanese,
        requestParts,
    };
}

function playSound(sound) {
    sound.pause();
    sound.currentTime = 0;

    sound.play().catch(() => {
        // Prevent browser autoplay errors from interrupting the activity.
    });
}

function handleDeckPress() {
    playSound(cardPressSound);
    drawCard();
}

function drawCard() {
    const nextCard = createRandomCard();

    if (currentCard.value) {
        pendingCard.value = nextCard;
        currentCard.value = null;
        return;
    }

    showNewCard(nextCard);
}

async function showNewCard(nextCard) {
    isCardMinimized.value = false;
    resetTinyVillagerPosition();

    currentCard.value = nextCard;
    cardKey.value += 1;
    spriteKey.value += 1;

    await nextTick();

    resetTinyVillagerPosition();
    setCardToBottomRight();
}

function clearActiveCard() {
    pendingCard.value = null;
    currentCard.value = null;
    isCardMinimized.value = false;
    resetCardDragState();
    resetTinyVillagerPosition();
}

function handleCardAfterLeave() {
    if (!pendingCard.value) {
        return;
    }

    const nextCard = pendingCard.value;
    pendingCard.value = null;
    showNewCard(nextCard);
}

function handleCardAfterEnter() {
    if (!currentCard.value) {
        return;
    }

    playSound(cardRevealSound);
}

function resetTinyVillagerPosition() {
    const selectedSpawnPoint = getRandomItem(TINY_VILLAGER_SPAWN_POINTS_PERCENT);
    const mapRect = mapStageRef.value?.getBoundingClientRect();

    if (!mapRect) {
        tinyVillagerPositionPercent.value = {
            x: selectedSpawnPoint.x,
            y: selectedSpawnPoint.y,
        };

        return;
    }

    const spriteSize = getTinyVillagerSize();
    const spriteHeightAsMapPercent = (spriteSize / mapRect.height) * 100;

    tinyVillagerPositionPercent.value = {
        x: selectedSpawnPoint.x,
        y: selectedSpawnPoint.y + spriteHeightAsMapPercent,
    };
}

function handleCardClick() {
    if (cardDragState.value.suppressNextClick) {
        cardDragState.value.suppressNextClick = false;
        return;
    }

    toggleCardSize();
}

function toggleCardSize() {
    if (isCardMinimized.value) {
        isCardMinimized.value = false;
        return;
    }

    setCardToBottomRight();
    isCardMinimized.value = true;
}

function setCardToBottomRight() {
    const dimensions = minimizedCardDimensions.value;
    const margin = minimizedCardMargin.value;

    minimizedCardPosition.value = {
        x: viewportSize.value.width - margin - dimensions.width,
        y: viewportSize.value.height - margin - dimensions.height,
    };
}

function startTinyVillagerDrag(event) {
    if (!currentCard.value) {
        return;
    }

    dragState.value = {
        isDragging: true,
        pointerId: event.pointerId,
    };

    event.currentTarget.setPointerCapture(event.pointerId);

    window.addEventListener("pointermove", moveTinyVillager);
    window.addEventListener("pointerup", stopTinyVillagerDrag);
    window.addEventListener("pointercancel", stopTinyVillagerDrag);

    moveTinyVillager(event);
}

function moveTinyVillager(event) {
    if (!dragState.value.isDragging) {
        return;
    }

    if (event.pointerId !== dragState.value.pointerId) {
        return;
    }

    const mapRect = mapStageRef.value?.getBoundingClientRect();

    if (!mapRect) {
        return;
    }

    const spriteSize = getTinyVillagerSize();
    const grabOffsetY = spriteSize * TINY_VILLAGER_GRAB_OFFSET_Y_RATIO;

    const adjustedClientX = event.clientX;
    const adjustedClientY = event.clientY - grabOffsetY;

    const nextXPercent = ((adjustedClientX - mapRect.left) / mapRect.width) * 100;
    const nextYPercent = ((adjustedClientY - mapRect.top) / mapRect.height) * 100;

    tinyVillagerPositionPercent.value = {
        x: clamp(nextXPercent, 2, 98),
        y: clamp(nextYPercent, 2, 98),
    };
}

function stopTinyVillagerDrag(event) {
    if (
        dragState.value.pointerId !== null &&
        event.pointerId !== dragState.value.pointerId
    ) {
        return;
    }

    dragState.value = {
        isDragging: false,
        pointerId: null,
    };

    window.removeEventListener("pointermove", moveTinyVillager);
    window.removeEventListener("pointerup", stopTinyVillagerDrag);
    window.removeEventListener("pointercancel", stopTinyVillagerDrag);
}

function startCardDrag(event) {
    if (!isCardMinimized.value || !currentCard.value) {
        return;
    }

    cardDragState.value = {
        isDragging: true,
        pointerId: event.pointerId,
        offsetX: event.clientX - minimizedCardPosition.value.x,
        offsetY: event.clientY - minimizedCardPosition.value.y,
        startX: event.clientX,
        startY: event.clientY,
        hasDragged: false,
        suppressNextClick: false,
    };

    event.currentTarget.setPointerCapture(event.pointerId);

    window.addEventListener("pointermove", moveCard);
    window.addEventListener("pointerup", stopCardDrag);
    window.addEventListener("pointercancel", stopCardDrag);
}

function moveCard(event) {
    if (!cardDragState.value.isDragging) {
        return;
    }

    if (event.pointerId !== cardDragState.value.pointerId) {
        return;
    }

    const distanceMoved = Math.hypot(
        event.clientX - cardDragState.value.startX,
        event.clientY - cardDragState.value.startY
    );

    if (distanceMoved > 6) {
        cardDragState.value.hasDragged = true;
    }

    const dimensions = minimizedCardDimensions.value;

    const nextX = event.clientX - cardDragState.value.offsetX;
    const nextY = event.clientY - cardDragState.value.offsetY;

    minimizedCardPosition.value = {
        x: clamp(nextX, 0, viewportSize.value.width - dimensions.width),
        y: clamp(nextY, 0, viewportSize.value.height - dimensions.height),
    };
}

function stopCardDrag(event) {
    if (
        cardDragState.value.pointerId !== null &&
        event.pointerId !== cardDragState.value.pointerId
    ) {
        return;
    }

    cardDragState.value = {
        ...cardDragState.value,
        isDragging: false,
        pointerId: null,
        suppressNextClick: cardDragState.value.hasDragged,
    };

    window.removeEventListener("pointermove", moveCard);
    window.removeEventListener("pointerup", stopCardDrag);
    window.removeEventListener("pointercancel", stopCardDrag);
}

function resetCardDragState() {
    cardDragState.value = {
        isDragging: false,
        pointerId: null,
        offsetX: 0,
        offsetY: 0,
        startX: 0,
        startY: 0,
        hasDragged: false,
        suppressNextClick: false,
    };
}

function openConversationOverlay() {
    isConversationOverlayOpen.value = true;
}

function closeConversationOverlay() {
    isConversationOverlayOpen.value = false;
}

function updateViewportSize() {
    viewportSize.value = {
        width: window.innerWidth,
        height: window.innerHeight,
    };

    if (isCardMinimized.value) {
        const dimensions = minimizedCardDimensions.value;

        minimizedCardPosition.value = {
            x: clamp(
                minimizedCardPosition.value.x,
                0,
                viewportSize.value.width - dimensions.width
            ),
            y: clamp(
                minimizedCardPosition.value.y,
                0,
                viewportSize.value.height - dimensions.height
            ),
        };
    }
}

function getTinyVillagerSize() {
    return clamp(
        window.innerWidth * TINY_VILLAGER_SIZE_VIEWPORT_RATIO,
        TINY_VILLAGER_SIZE_MIN,
        TINY_VILLAGER_SIZE_MAX
    );
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

onMounted(() => {
    window.addEventListener("resize", updateViewportSize);
    updateViewportSize();
    setCardToBottomRight();
});

onBeforeUnmount(() => {
    window.removeEventListener("resize", updateViewportSize);

    window.removeEventListener("pointermove", moveTinyVillager);
    window.removeEventListener("pointerup", stopTinyVillagerDrag);
    window.removeEventListener("pointercancel", stopTinyVillagerDrag);

    window.removeEventListener("pointermove", moveCard);
    window.removeEventListener("pointerup", stopCardDrag);
    window.removeEventListener("pointercancel", stopCardDrag);
});
</script>

<style scoped>
.directions-card-page {
    position: relative;
    width: 100vw;
    height: 100vh;
    padding: 15px;
    background: #6fd3ef;
    overflow: hidden;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: #263238;
    display: flex;
    align-items: center;
    justify-content: center;
}

.map-stage {
    position: relative;
    width: min(calc(100vw - 30px), calc((100vh - 30px) * 1.844444));
    height: min(calc(100vh - 30px), calc((100vw - 30px) / 1.844444));
    aspect-ratio: 1660 / 900;
    border-radius: 18px;
    border: 6px solid rgba(255, 255, 255, 0.92);
    box-shadow: 0 18px 36px rgba(31, 45, 38, 0.22);
    overflow: hidden;
    z-index: 1;
}

.map-layer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: center;
    user-select: none;
    pointer-events: none;
    z-index: 1;
}

.deck-wrapper {
    position: absolute;
    left: clamp(12px, 1.45vw, 24px);
    top: clamp(12px, 1.45vw, 24px);
    width: clamp(90px, 8.75vw, 145px);
    aspect-ratio: 145 / 198;
    z-index: 5;
}

.deck-button {
    position: absolute;
    inset: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
    transform: translateY(0);
    transition:
        transform 180ms ease,
        filter 180ms ease;
}

.deck-wrapper:hover .deck-button {
    transform: translateY(-6px);
    filter: brightness(1.04);
}

.deck-button:active {
    transform: translateY(0) scale(0.98);
}

.clear-card-button {
    position: absolute;
    right: -10px;
    top: -10px;
    width: clamp(24px, 2.15vw, 34px);
    height: clamp(24px, 2.15vw, 34px);
    border: 3px solid #ffffff;
    border-radius: 999px;
    background: #e53935;
    color: #ffffff;
    font-size: clamp(1rem, 1.7vw, 1.5rem);
    line-height: 1;
    font-weight: 950;
    cursor: pointer;
    z-index: 10;
    box-shadow: 0 4px 10px rgba(31, 45, 38, 0.32);
    display: grid;
    place-items: center;
    padding: 0;
}

.clear-card-button:hover {
    filter: brightness(1.07);
    transform: scale(1.06);
}

.clear-card-button:active {
    transform: scale(0.96);
}

.deck-card {
    position: absolute;
    inset: 0;
    border-radius: clamp(12px, 1.1vw, 18px);
    box-shadow: 0 12px 24px rgba(31, 45, 38, 0.24);
}

.deck-card-back {
    background:
        radial-gradient(circle, rgba(255, 255, 255, 0.28) 2px, transparent 3px),
        radial-gradient(circle, rgba(255, 255, 255, 0.16) 2px, transparent 3px),
        #5aa880;
    background-size: 20px 20px, 20px 20px;
    background-position: 0 0, 10px 10px;
    border: clamp(3px, 0.25vw, 4px) solid #f8fff9;
}

.back-3 {
    transform: rotate(-8deg) translate(-9px, 8px);
}

.back-2 {
    transform: rotate(5deg) translate(8px, 3px);
}

.deck-card-front {
    background: #fffdf2;
    border: clamp(3px, 0.3vw, 5px) solid #4c8f6a;
    display: flex;
    align-items: center;
    justify-content: center;
}

.deck-icon {
    width: clamp(44px, 4.1vw, 68px);
    height: clamp(44px, 4.1vw, 68px);
    border-radius: 50%;
    background: #ffcf5a;
    color: #234c3c;
    display: grid;
    place-items: center;
    font-size: clamp(1.9rem, 2.7vw, 2.9rem);
    font-weight: 900;
    border: clamp(3px, 0.25vw, 4px) solid #234c3c;
}

.conversation-button {
    position: absolute;
    right: clamp(22px, 2.5vw, 42px);
    top: clamp(22px, 2.5vw, 42px);
    width: clamp(58px, 5vw, 86px);
    height: clamp(48px, 4.2vw, 72px);
    border: 5px solid #234c3c;
    border-radius: 28px;
    background: #fffdf2;
    box-shadow: 0 8px 0 rgba(31, 45, 38, 0.25);
    cursor: pointer;
    z-index: 8;
    transition:
        transform 180ms ease,
        filter 180ms ease;
}

.conversation-button::before {
    content: "";
    position: absolute;
    left: 50%;
    top: 50%;
    width: 62%;
    height: 12%;
    border-radius: 999px;
    background: #234c3c;
    box-shadow:
        0 -13px 0 #234c3c,
        0 13px 0 #234c3c;
    transform: translate(-50%, -50%);
}

.conversation-button::after {
    content: "";
    position: absolute;
    right: 12px;
    bottom: -14px;
    width: 20px;
    height: 20px;
    background: #fffdf2;
    border-right: 5px solid #234c3c;
    border-bottom: 5px solid #234c3c;
    transform: rotate(35deg);
}

.conversation-button:hover {
    transform: translateY(-4px);
    filter: brightness(1.04);
}

.conversation-button:active {
    transform: translateY(0) scale(0.98);
}

.tiny-villager {
    position: absolute;
    width: clamp(46px, 4.35vw, 72px);
    height: clamp(46px, 4.35vw, 72px);
    z-index: 3;
    border: 0;
    background: transparent;
    padding: 0;
    cursor: grab;
    touch-action: none;
    user-select: none;
    transform: translate(-50%, -50%);
}

.tiny-villager:active {
    cursor: grabbing;
}

.tiny-villager img {
    position: relative;
    z-index: 2;
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter:
        drop-shadow(0 0 3px #fff4a8) drop-shadow(0 0 8px #ffd84d) drop-shadow(0 8px 8px rgba(31, 45, 38, 0.35));
    pointer-events: none;
}

.poof-cloud {
    position: absolute;
    inset: 0;
    z-index: 1;
    opacity: 0;
    pointer-events: none;
}

.poof-cloud::before,
.poof-cloud::after {
    content: "";
    position: absolute;
    border-radius: 999px;
    background: rgba(245, 245, 245, 0.95);
    box-shadow:
        -18px 6px 0 rgba(245, 245, 245, 0.85),
        18px 7px 0 rgba(245, 245, 245, 0.8),
        4px -15px 0 rgba(245, 245, 245, 0.75),
        -6px 18px 0 rgba(245, 245, 245, 0.72);
}

.poof-cloud::before {
    width: 34px;
    height: 34px;
    left: 18px;
    top: 20px;
}

.poof-cloud::after {
    width: 22px;
    height: 22px;
    left: 28px;
    top: 30px;
}

.request-card {
    position: absolute;
    border-radius: 26px;
    box-shadow: 0 18px 36px rgba(31, 45, 38, 0.22);
    border: 6px solid #ffffff;
    overflow: visible;
    background:
        linear-gradient(180deg, #fffdf2 0%, #f7edcf 100%);
    display: grid;
    grid-template-rows: 65% 1fr;
    padding: 12px;
    gap: 10px;
    transform: translate(-50%, -50%);
    transform-origin: center center;
    z-index: 10;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    transition:
        left 420ms cubic-bezier(0.22, 1, 0.36, 1),
        top 420ms cubic-bezier(0.22, 1, 0.36, 1),
        width 420ms cubic-bezier(0.22, 1, 0.36, 1),
        height 420ms cubic-bezier(0.22, 1, 0.36, 1),
        grid-template-rows 420ms cubic-bezier(0.22, 1, 0.36, 1),
        padding 420ms cubic-bezier(0.22, 1, 0.36, 1),
        gap 420ms cubic-bezier(0.22, 1, 0.36, 1),
        transform 420ms cubic-bezier(0.22, 1, 0.36, 1),
        border-radius 420ms cubic-bezier(0.22, 1, 0.36, 1),
        box-shadow 420ms cubic-bezier(0.22, 1, 0.36, 1);
}

.request-card * {
    user-select: none;
    -webkit-user-select: none;
}

.request-card.minimized {
    padding: clamp(5px, 0.42vw, 7px);
    gap: clamp(4px, 0.36vw, 6px);
    border-radius: clamp(13px, 1.1vw, 18px);
    border-width: clamp(4px, 0.35vw, 6px);
    transform: translate(0, 0);
    cursor: grab;
    box-shadow: 0 12px 24px rgba(31, 45, 38, 0.26);
}

.request-card.minimized:active {
    cursor: grabbing;
}

.character-panel {
    position: relative;
    min-height: 0;
}

.character-pattern {
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: 20px;
    overflow: hidden;
    display: grid;
    place-items: center;
    background:
        radial-gradient(circle, rgba(255, 255, 255, 0.32) 2px, transparent 3px),
        radial-gradient(circle, rgba(22, 95, 73, 0.18) 4px, transparent 5px),
        linear-gradient(135deg, #57d486, #2fc7a2);
    background-size: 24px 24px, 30px 30px, 100% 100%;
    background-position: 0 0, 8px 10px, 0 0;
    border: 4px solid #dff8dc;
}

.request-card.minimized .character-pattern {
    border-radius: 13px;
    border-width: 3px;
    background-size: 16px 16px, 22px 22px, 100% 100%;
}

.character-pattern::before {
    content: "";
    position: absolute;
    inset: 0;
    background:
        radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.3), transparent 18%),
        radial-gradient(circle at 80% 10%, rgba(255, 255, 255, 0.22), transparent 16%),
        radial-gradient(circle at 50% 85%, rgba(0, 80, 65, 0.15), transparent 28%);
    pointer-events: none;
}

.character-image {
    position: relative;
    z-index: 1;
    width: 80%;
    height: 80%;
    object-fit: contain;
    filter: drop-shadow(0 14px 12px rgba(31, 45, 38, 0.26));
    pointer-events: none;
    transition:
        width 420ms cubic-bezier(0.22, 1, 0.36, 1),
        height 420ms cubic-bezier(0.22, 1, 0.36, 1);
}

.request-card.minimized .character-image {
    width: 78%;
    height: 78%;
}

.name-bubble {
    position: absolute;
    z-index: 2;
    left: 12px;
    bottom: 10px;
    padding: 9px 18px 10px;
    background: #1587c9;
    border: 4px solid #ffffff;
    border-radius: 999px;
    font-size: clamp(0.9rem, 3.5vh, 1.25rem);
    line-height: 1;
    font-weight: 950;
    color: #ffffff;
    box-shadow: 0 6px 0 rgba(31, 45, 38, 0.24);
    min-width: 34%;
    text-align: center;
    transition:
        padding 420ms cubic-bezier(0.22, 1, 0.36, 1),
        font-size 420ms cubic-bezier(0.22, 1, 0.36, 1),
        min-width 420ms cubic-bezier(0.22, 1, 0.36, 1),
        border-width 420ms cubic-bezier(0.22, 1, 0.36, 1);
}

.request-card.minimized .name-bubble {
    left: 7px;
    bottom: 6px;
    padding: 6px 10px;
    border-width: 3px;
    font-size: clamp(0.62rem, 0.72vw, 0.78rem);
    min-width: 58%;
    box-shadow: 0 4px 0 rgba(31, 45, 38, 0.24);
}

.sentence-panel {
    background: #fff3d7;
    border: 4px solid #e4d2a7;
    border-radius: 16px;
    padding: 16px 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
        padding 420ms cubic-bezier(0.22, 1, 0.36, 1),
        border-radius 420ms cubic-bezier(0.22, 1, 0.36, 1),
        border-width 420ms cubic-bezier(0.22, 1, 0.36, 1);
}

.request-card.minimized .sentence-panel {
    padding: 6px 7px;
    border-radius: 10px;
    border-width: 3px;
}

.request-text {
    margin: 0;
    font-size: clamp(1.18rem, 4.2vh, 1.68rem);
    line-height: 1.22;
    font-weight: 900;
    color: #3c3b35;
    text-align: center;
    transition:
        font-size 420ms cubic-bezier(0.22, 1, 0.36, 1),
        line-height 420ms cubic-bezier(0.22, 1, 0.36, 1);
}

.request-card.minimized .request-text {
    font-size: clamp(0.64rem, 0.72vw, 0.84rem);
    line-height: 1.1;
}

.place-word {
    position: relative;
    display: inline-block;
    color: #3c9e55;
    text-decoration-line: underline;
    text-decoration-thickness: 4px;
    text-underline-offset: 4px;
    cursor: help;
    outline: none;
}

.request-card.minimized .place-word {
    text-decoration-thickness: 2px;
    text-underline-offset: 2px;
}

.place-word::after,
.blank-word::after {
    content: attr(data-tooltip);
    position: absolute;
    left: 50%;
    bottom: calc(100% + 12px);
    transform: translateX(-50%) translateY(6px);
    padding: 8px 12px;
    background: #234c3c;
    color: #ffffff;
    border: 3px solid #ffffff;
    border-radius: 12px;
    font-size: 1rem;
    line-height: 1.2;
    font-weight: 900;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    box-shadow: 0 8px 18px rgba(31, 45, 38, 0.24);
    transition:
        opacity 160ms ease,
        transform 160ms ease;
    z-index: 20;
}

.place-word::before,
.blank-word::before {
    content: "";
    position: absolute;
    left: 50%;
    bottom: calc(100% + 4px);
    transform: translateX(-50%) translateY(6px);
    border-width: 8px 8px 0 8px;
    border-style: solid;
    border-color: #234c3c transparent transparent transparent;
    opacity: 0;
    pointer-events: none;
    transition:
        opacity 160ms ease,
        transform 160ms ease;
    z-index: 21;
}

.place-word:hover::after,
.place-word:hover::before,
.place-word:focus::after,
.place-word:focus::before,
.blank-word:hover::after,
.blank-word:hover::before,
.blank-word:focus::after,
.blank-word:focus::before {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
}

.conversation-overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: grid;
    place-items: center;
    padding: 28px;
    background:
        radial-gradient(circle, rgba(255, 255, 255, 0.08) 2px, transparent 3px),
        rgba(0, 0, 0, 0.48);
    background-size: 22px 22px;
    backdrop-filter: blur(7px);
}

.conversation-panel {
    width: min(920px, 92vw);
    background: #fffdf2;
    border: 7px solid #ffffff;
    border-radius: 28px;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.36);
    padding: clamp(24px, 4vw, 44px);
}

.conversation-title {
    margin: 0 0 18px;
    font-size: clamp(1.8rem, 3.2vw, 2.8rem);
    color: #234c3c;
    text-align: center;
    text-shadow: 0 3px 0 #dff4e6;
}

.conversation-lines {
    display: grid;
    gap: 8px;
    font-size: clamp(1.05rem, 1.85vw, 1.65rem);
    line-height: 1.34;
    font-weight: 850;
    color: #343832;
}

.conversation-line {
    display: grid;
    grid-template-columns: 2.2em minmax(0, 1fr);
    column-gap: 0.28em;
    align-items: start;
    margin: 0;
}

.conversation-line.speaker-gap {
    margin-top: 0.7em;
}

.speaker-label {
    color: #1587c9;
    white-space: nowrap;
}

.line-text {
    min-width: 0;
}

.blank-wrapper {
    display: inline-flex;
    align-items: baseline;
    gap: 0;
    color: #3c9e55;
    font-weight: 950;
    white-space: nowrap;
}

.blank-word {
    position: relative;
    display: inline-block;
    min-width: clamp(76px, 9vw, 120px);
    color: #3c9e55;
    text-align: center;
    text-decoration-line: underline;
    text-decoration-thickness: 4px;
    text-underline-offset: 6px;
    cursor: help;
    outline: none;
}

.blank-word.short-blank {
    min-width: clamp(48px, 6vw, 76px);
}

.blank-word.medium-blank {
    min-width: clamp(62px, 7.5vw, 96px);
}

.main-card-enter-active {
    animation: cardSpinIn 680ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.main-card-leave-active {
    animation: cardFlyOutRight 520ms cubic-bezier(0.7, 0, 0.84, 0) both;
}

.request-card.minimized.main-card-leave-active {
    animation: cardPoofOut 420ms ease both;
}

.request-card.minimized.main-card-leave-active::before,
.request-card.minimized.main-card-leave-active::after {
    content: "";
    position: absolute;
    z-index: 30;
    left: 50%;
    top: 50%;
    border-radius: 999px;
    background: rgba(245, 245, 245, 0.96);
    pointer-events: none;
    transform: translate(-50%, -50%) scale(0.2);
    animation: cardPoofCloud 420ms ease both;
}

.request-card.minimized.main-card-leave-active::before {
    width: 62px;
    height: 62px;
    box-shadow:
        -38px 6px 0 rgba(245, 245, 245, 0.86),
        38px 8px 0 rgba(245, 245, 245, 0.8),
        6px -34px 0 rgba(245, 245, 245, 0.78),
        -8px 34px 0 rgba(245, 245, 245, 0.72);
}

.request-card.minimized.main-card-leave-active::after {
    width: 36px;
    height: 36px;
    animation-delay: 40ms;
    box-shadow:
        -24px -8px 0 rgba(245, 245, 245, 0.78),
        26px -4px 0 rgba(245, 245, 245, 0.72),
        0 28px 0 rgba(245, 245, 245, 0.64);
}

.sprite-poof-enter-active {
    animation: spritePopIn 300ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.sprite-poof-leave-active {
    animation: spritePoofOut 360ms ease both;
}

.sprite-poof-leave-active .poof-cloud {
    animation: poofCloud 360ms ease both;
}

.sprite-poof-leave-active img {
    animation: spriteVanish 240ms ease both;
}

.overlay-fade-enter-active,
.overlay-fade-leave-active {
    transition:
        opacity 180ms ease,
        backdrop-filter 180ms ease;
}

.overlay-fade-enter-from,
.overlay-fade-leave-to {
    opacity: 0;
    backdrop-filter: blur(0);
}

@keyframes cardSpinIn {
    0% {
        opacity: 0;
        transform: translate(-50%, -50%) translateX(-80px) translateY(40px) scale(0.2) rotate(-720deg);
    }

    65% {
        opacity: 1;
        transform: translate(-50%, -50%) translateX(0) translateY(0) scale(1.07) rotate(18deg);
    }

    82% {
        transform: translate(-50%, -50%) translateX(0) translateY(0) scale(0.98) rotate(-6deg);
    }

    100% {
        opacity: 1;
        transform: translate(-50%, -50%) translateX(0) translateY(0) scale(1) rotate(0deg);
    }
}

@keyframes cardFlyOutRight {
    0% {
        opacity: 1;
        transform: translate(-50%, -50%) translateX(0) translateY(0) scale(1) rotate(0deg);
    }

    100% {
        opacity: 0;
        transform: translate(-50%, -50%) translateX(120vw) translateY(-20px) scale(0.72) rotate(720deg);
    }
}

@keyframes cardPoofOut {
    0% {
        opacity: 1;
        transform: translate(0, 0) scale(1);
    }

    100% {
        opacity: 0;
        transform: translate(0, 0) scale(0.68);
    }
}

@keyframes cardPoofCloud {
    0% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.2);
    }

    38% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
    }

    100% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(2.4);
    }
}

@keyframes spritePopIn {
    0% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.25);
    }

    75% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1.12);
    }

    100% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
    }
}

@keyframes spritePoofOut {
    0% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
    }

    100% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(1.35);
    }
}

@keyframes spriteVanish {
    0% {
        opacity: 1;
        transform: scale(1);
    }

    100% {
        opacity: 0;
        transform: scale(0.2);
    }
}

@keyframes poofCloud {
    0% {
        opacity: 0;
        transform: scale(0.2);
    }

    35% {
        opacity: 1;
        transform: scale(1.05);
    }

    100% {
        opacity: 0;
        transform: scale(1.8);
    }
}

@media (max-width: 760px) {
    .conversation-panel {
        max-height: 86vh;
        overflow-y: auto;
    }

    .conversation-lines {
        gap: 7px;
    }

    .conversation-line.speaker-gap {
        margin-top: 0.55em;
    }
}

@media (max-width: 420px) {
    .conversation-lines {
        font-size: 0.98rem;
    }

    .blank-word {
        min-width: 68px;
    }

    .blank-word.short-blank {
        min-width: 44px;
    }

    .blank-word.medium-blank {
        min-width: 58px;
    }
}
</style>