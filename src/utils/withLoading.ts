// src/utils/withLoading.ts
import { pushLoading, popLoading } from '@/state/loading'
import { startFaviconSpinner, stopFaviconSpinner } from '@/utils/faviconSpinner'

export async function withLoading<T>(task: () => Promise<T>, minMs = 0): Promise<T> {
  pushLoading(); startFaviconSpinner()
  const t0 = performance.now()
  try {
    return await task()
  } finally {
    const dt = performance.now() - t0
    if (minMs && dt < minMs) await new Promise(r => setTimeout(r, minMs - dt)) // avoid flicker
    popLoading(); stopFaviconSpinner()
  }
}
