<template>
  <section class="flashcard-grid-page">
    <div class="center-area">
      <TextbookList />
    </div>
  </section>
</template>

<script setup lang="ts">
import TextbookList from '@/views/flashcard-system/TextbookList.vue'
</script>

<style scoped>
.flashcard-grid-page {
  width: 100%;
  display: flex;
  justify-content: center;
  padding-top: 5rem; /* Space for app header */
  padding-bottom: 2rem;
}

/* Center area – 60% width on large screens */
.center-area {
  width: 60%;
  max-width: 1400px;
}

/* Medium screens: expand slightly */
@media (max-width: 1400px) {
  .center-area {
    width: 70%;
  }
}

/* Tablets: grow bigger */
@media (max-width: 1000px) {
  .center-area {
    width: 85%;
  }
}

/* Phones: full width */
@media (max-width: 700px) {
  .center-area {
    width: 100%;
    padding: 0 1rem;
  }
}
</style>
