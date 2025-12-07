<!-- src/components/LevelUpTester.vue -->
<!-- Example usage
    <levelUpTester :showDevTools="true" buttonLabel="Test Level Overlay"/>
-->

<script setup lang="ts">
import { ref } from 'vue'
import UserLevels from '@/components/UserLevels.vue'

const props = withDefaults(defineProps<{
  buttonLabel?: string
  showDevTools?: boolean
}>(), {
  buttonLabel: 'Open Levels',
  showDevTools: false,
})

const ulRef = ref<InstanceType<typeof UserLevels> | null>(null)

function openLevels() {
  // call the exposed method from UserLevels.vue
  (ulRef.value as any)?.open?.()
}

// Optional convenience if you want to close it from here, too
function closeLevels() {
  (ulRef.value as any)?.close?.()
}
</script>

<template>
  <!-- Trigger -->
  <button class="lut-btn" @click="openLevels">{{ props.buttonLabel }}</button>

  <!-- Keep it mounted; it controls its own visibility in overlay mode -->
  <UserLevels
    ref="ulRef"
    :overlay="true"
    :showDevTools="props.showDevTools"
  />
</template>

<style scoped>
.lut-btn{
  padding: .6rem 1rem;
  border-radius: 10px;
  border: 1px solid var(--border, #e5e5e5);
  background: var(--panel, #fff);
  font-weight: 800;
  cursor: pointer;
}
</style>
