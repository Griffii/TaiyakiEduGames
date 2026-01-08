<template>
  <div id="App">
    <!-- BACKGROUND STACK -->
    <!-- BG image of Japanese waves -->
    <div v-if="bgImageEnabled" class="bg-layer bg-layer--image" :style="{ backgroundImage: `url(${imageBg})` }"
      aria-hidden="true" />

    <div class="bg-layer bg-layer--color" aria-hidden="true"></div>

    <!-- BG overlay of chalkdust -->
    <div v-if="overlayEnabled" class="bg-layer bg-layer--overlay" :style="{ backgroundImage: `url(${overlayBg})` }"
      aria-hidden="true" />

    <!-- APP UI -->
    <AppHeader v-if="!route.meta?.hideHeader" />
    <PageLoader />

    <main class="view">
      <section class="app-bg">
        <RouterView />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import PageLoader from '@/components/PageLoader.vue'
import AppHeader from '@/views/AppHeader.vue'
import { useRoute } from 'vue-router'
import { useTheme } from '@/utils/useTheme'

import imageBg from '@/assets/images/backgrounds/Japanese_Wave_Pattern.png'
import overlayBg from '@/assets/images/backgrounds/asfalt-light.png'

const route = useRoute()

const { bgImageEnabled, overlayEnabled } = useTheme()
</script>

<style>
/* 1) Reset-ish basics */
*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
}

/* 2) Full viewport foundation */
html,
body,
#App {
  width: 100%;
  height: 100%;
}

/* 3) App shell */
#App {
  position: relative;
  min-height: 100vh;
  min-height: 100svh;
  min-height: 100dvh;
  overflow: hidden;
  /* horizontal safety */
}

/* =========================
   BACKGROUND STACK (NO BLEND)
   z-index order:
   -3 imageBg
   -2 theme bg color
   -1 overlay texture
    0 app UI
   ========================= */

.bg-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

/* -3: base pattern image */
.bg-layer--image {
  z-index: -3;
  background-repeat: repeat;
  background-position: center;
  background-size: 520px 520px;
  /* adjust to taste */
}

/* -2: solid theme color */
.bg-layer--color {
  z-index: -2;
  background: var(--bg-app-color);
}

/* -1: overlay texture (asphalt grain) */
.bg-layer--overlay {
  z-index: -1;
  background-repeat: repeat;
  background-position: center;
  background-size: 440px 440px;
  /* typical grain tile */
  opacity: 1;
}

/* =========================
   APP UI (0+)
   ========================= */

.view {
  position: relative;
  width: 100%;
  height: 100%;
  z-index: 0;
  /* ensure above all bg layers */
}

/* Scroll container */
.app-bg {
  position: relative;
  width: 100%;
  height: 100%;
  overflow-y: auto;

  /* IMPORTANT: do not paint theme bg here anymore */
  background: transparent;
}

/* 5) Base font */
body {
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue",
    Arial, sans-serif;
  line-height: 1.4;
}
</style>
