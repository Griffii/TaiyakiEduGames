<template>
  <div id="App">
    <AppHeader v-if="!route.meta?.hideHeader" />
    <LeftPanel v-if="!route.meta?.hideHeader" />
    <RightPanel v-if="!route.meta?.hideHeader" />

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
import LeftPanel from '@/views/LeftPanel.vue'
import RightPanel from '@/views/RightPanel.vue'
import { useRoute } from 'vue-router'
const route = useRoute()

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

/* Header height token (keep in sync with AppHeader) */
:root {
  --app-header-height: 80px;
}

/* 3) App shell */
#App {
  position: relative;
  min-height: 100vh;
  min-height: 100svh;
  min-height: 100dvh;
  overflow: hidden; /* horizontal safety */
}

/* 4) Main view: full canvas behind fixed header + panels */
.view {
  position: relative;
  width: 100%;
  height: 100%;
}

/* Center content: scrollable area under the fixed chrome */
.app-bg {
  position: relative;
  width: 100%;
  height: 100%;

  /* Make only this area scroll; header + panels stay fixed */
  overflow-y: auto;
}

/* 5) Base font */
body {
  font-family: system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue",
    Arial, sans-serif;
  line-height: 1.4;
}
</style>
