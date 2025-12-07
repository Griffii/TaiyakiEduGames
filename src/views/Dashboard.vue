<!-- src/views/Dashboard.vue -->
<template>
  <main class="dash">
    <AnnouncementBanner :items="announcements" :auto-rotate="true" rotate-ms="7000" />

    <h1 class="bubble-title">English Games</h1>
    <!-- New Card Carousel for Games -->
    <CardCarousel :items="gameCards" :auto-rotate="true" :auto-rotate-delay="6000" />

    <h1 class="bubble-title">Flashcard Games</h1>
    <!-- Flashcard Games Carousel -->
    <CardCarousel :items="flashcardGameCards" :auto-rotate="true" :auto-rotate-delay="6000" />

    <h1 class="bubble-title">Textbooks</h1>
    <!-- Textbook List -->
    <section class="center-area">
      <TextbookList />
    </section>

    <h1 class="bubble-title">Games + Tools</h1>
    <!-- Activity List -->
    <ActivityList class="activities" />


  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

import ActivityList from '@/views/ActivitiesGrid.vue'
import CardCarousel from '@/components/CardCarousel.vue'
import TextbookList from '@/views/flashcard-system/TextbookList.vue'
import AnnouncementBanner from '@/components/AnnouncementBanner.vue'

// Announcement Data
const announcements = [
    {
        id: 'announce-1',
        title: 'Welcome to EiTake!',
        note: '英語の勉強楽しもう！',
    },
    
]

// Game Carousel Data
const gameCards = [
  {
    title: "Pizzas & Parfaits",
    link: "/activities/pizzas-and-parfaits",
    image: new URL("@/assets/images/screenshots/games/PaP_01.png", import.meta.url).href,
    color: "#FF7A5C", // coral orange
  },
  {
    title: "Who is it?!",
    link: "/activities/who-is-it",
    image: new URL("@/assets/images/screenshots/games/who-is-it.png", import.meta.url).href,
    color: "#6BA3FF", // bright denim blue
  },
  {
    title: "Othello",
    link: "/othello",
    image: new URL("@/assets/images/screenshots/games/othello-01.png", import.meta.url).href,
    color: "#FFB0D8", // cute soft pink
  },
  {
    title: "Spelling Battle",
    link: "/activities/spelling-battle",
    image: new URL("@/assets/images/screenshots/games/spelling-battle.png", import.meta.url).href,
    color: "#8C6BFF", // vivid purple
  },
  {
    title: "Wordle",
    link: "/wordle",
    image: new URL("@/assets/images/screenshots/games/wordle-01.png", import.meta.url).href,
    color: "#FFE56E", // fun sunny yellow
  },
  {
    title: "Directions",
    link: "/activities/directions",
    image: new URL("@/assets/images/screenshots/games/directions-game-01.png", import.meta.url).href,
    color: "#5CD6FF", // bright aqua blue
  }
];
// Flashcard Carousel Games Data
const flashcardGameCards = [
  {
    title: "Flashcard Bingo",
    link: "/textbooks",
    image: new URL("@/assets/images/screenshots/flashcard-games/bingo.png", import.meta.url).href,
    color: "#FFA63F", // warm orange
  },
  {
    title: "Spelling Blitz",
    link: "/textbooks",
    image: new URL("@/assets/images/screenshots/flashcard-games/SpellingBlitz.png", import.meta.url).href,
    color: "#3EC7FF", // sky blue
  },
  {
    title: "Spelling Guesser",
    link: "/textbooks",
    image: new URL("@/assets/images/screenshots/flashcard-games/spelling-guesser.png", import.meta.url).href,
    color: "#B377FF", // soft purple
  },
  {
    title: "Sound Matcher",
    link: "/textbooks",
    image: new URL("@/assets/images/screenshots/flashcard-games/sound-matcher.png", import.meta.url).href,
    color: "#FF6D92", // rose pink
  },
  {
    title: "Bomb Game",
    link: "/textbooks",
    image: new URL("@/assets/images/screenshots/flashcard-games/bomb-game.png", import.meta.url).href,
    color: "#FF4F4F", // strong red
  },
  {
    title: "Sharknado!",
    link: "/textbooks",
    image: new URL("@/assets/images/screenshots/flashcard-games/sharknado.png", import.meta.url).href,
    color: "#00D29E", // teal
  },
];

//////// HELPER FUNCTIONS ////////////
function onOpenActivity(link: string) {
  if (!link) {
    console.warn('onOpenActivity called without a link')
    return
  }
  // If you ever pass absolute URLs, open them; otherwise use router
  if (/^https?:\/\//i.test(link)) {
    window.location.href = link
  } else {
    router.push(link)
  }
}

</script>

<style scoped>
.dash {
  /* Fill viewport height */
  min-block-size: 100dvh;

  padding-top: var(--app-header-height); /** Leave space fo the tapp header */

  /* Prevent grid container from forcing inner overflow */
  overflow: hidden;
}

/* Keep centering behavior for the top bands if you want */
.section {
  margin-inline: auto;
}

/* New: let ActivitiesList fill and scroll within its grid area */
.activities {
  min-height: 0;
  /* Important for grid children to allow shrinking */
  overflow: auto;
  /* Scroll the list, not the whole page */
}

.center-area{
  width: 60%;
  max-width: 60%;
  margin: 0 auto;          /* center horizontally */
  padding: 12px 0;         /* vertical breathing room */
  box-sizing: border-box;  /* prevent overflow */
  display: block;
}
/* On small screens, let it use full width */
@media (max-width: 800px) {
  .center-area {
    width: 90%;
    max-width: 90%;
  }
}
@media (max-width: 600px) {
  .center-area {
    width: 100%;
    max-width: 100%;
    padding: 8px;
  }
}

.bubble-title {
  font-size: clamp(2.4rem, 5vw, 4rem);
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #ffeefc; /* light bubble fill */
  text-align: center;
  margin: 10px auto;

  /* Bubble shadow stack matching card titles */
  text-shadow:
    0 0 0 #ffeefc,
    0.10em 0.10em 0 #ff3a8d,
    0.18em 0.18em 12px rgba(0, 0, 0, 0.55);

  user-select: none;
}

</style>
