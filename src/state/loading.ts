import { ref, computed } from 'vue'

const counter = ref(0) // reference count to handle overlapping loads
export const isLoading = computed(() => counter.value > 0)

export function pushLoading() {
  counter.value++
}

export function popLoading() {
  counter.value = Math.max(0, counter.value - 1)
}
