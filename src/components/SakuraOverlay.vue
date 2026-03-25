<template>
    <div ref="layer" class="sakura-layer"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import sakuraImg from '@/assets/images/icons/sakura_01.png'

const layer = ref(null)

let spawnTimeoutId = null
let stopped = false
const petalTimeouts = new Set()

function createSakuraPetal() {
    if (!layer.value) return

    const petal = document.createElement('div')
    petal.className = 'sakura'

    // Random x position across the top of the viewport
    petal.style.left = `${Math.random() * 100}vw`

    // Random size
    const size = 28 + Math.random() * 14
    petal.style.width = `${size}px`
    petal.style.height = `${size}px`

    // Random animation timing and movement
    const duration = 8 + Math.random() * 5
    const driftX = -120 + Math.random() * 240
    const rotateStart = Math.random() * 360

    // Random direction: 1 (clockwise) or -1 (counterclockwise)
    const direction = Math.random() > 0.5 ? 1 : -1

    // Random spin amount
    const spinAmount = 180 + Math.random() * 540

    const rotateEnd = rotateStart + direction * spinAmount

    // Apply image
    petal.style.backgroundImage = `url(${sakuraImg})`
    petal.style.backgroundSize = 'contain'
    petal.style.backgroundRepeat = 'no-repeat'
    petal.style.backgroundPosition = 'center'

    // Variation
    petal.style.opacity = `${0.65 + Math.random() * 0.3}`
    petal.style.setProperty('--drift-x', `${driftX}px`)
    petal.style.setProperty('--rotate-start', `${rotateStart}deg`)
    petal.style.setProperty('--rotate-end', `${rotateEnd}deg`)
    petal.style.animation = `sakura-fall ${duration}s linear forwards`

    layer.value.appendChild(petal)

    const removeId = setTimeout(() => {
        petal.remove()
        petalTimeouts.delete(removeId)
    }, duration * 1000)

    petalTimeouts.add(removeId)
}

function scheduleNextPetal() {
    if (stopped) return

    createSakuraPetal()

    const nextDelay = 1000 + Math.random() * 1000
    spawnTimeoutId = setTimeout(scheduleNextPetal, nextDelay)
}

onMounted(() => {
    stopped = false
    scheduleNextPetal()
})

onBeforeUnmount(() => {
    stopped = true
    clearTimeout(spawnTimeoutId)

    for (const id of petalTimeouts) {
        clearTimeout(id)
    }
    petalTimeouts.clear()

    layer.value?.querySelectorAll('.sakura').forEach((petal) => petal.remove())
})
</script>

<style>
.sakura-layer {
    position: fixed;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
    z-index: 999;
}

.sakura {
    position: fixed;
    top: -40px;
    left: 0;
    will-change: transform, opacity;
}

@keyframes sakura-fall {
    0% {
        transform: translate3d(0, 0, 0) rotate(var(--rotate-start));
        opacity: 0;
    }

    10% {
        opacity: 0.9;
    }

    100% {
        transform: translate3d(var(--drift-x), 110vh, 0) rotate(var(--rotate-end));
        opacity: 0.15;
    }
}
</style>