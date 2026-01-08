<template>
  <section class="tutorials">
    <p class="tutorials-text">
      Tutorial videos and explanations on how to use games and activities are coming soon!
    </p>

    <img class="wip-img" :src="wipImg" alt="Work in progress" decoding="async" />
  </section>
</template>

<script setup>
const wipImg = new URL('@/assets/images/icons/work-in-progress.png', import.meta.url).toString()
</script>

<style scoped>
.tutorials {
  width: 100%;
  height: 100%;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;

  background: var(--bg-panel);
}

.tutorials-text {
  font-size: 1rem;
  line-height: 1.5;
  color: var(--modal-on-surface);
  text-align: center;
}

.wip-img {
  display: block;
  width: min(128px, 100%);
  height: auto;
  opacity: 0.95;
  filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.18));
  user-select: none;
  pointer-events: none;
}
</style>
