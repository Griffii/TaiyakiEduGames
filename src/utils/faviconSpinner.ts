let timer: number | null = null
let linkEl: HTMLLinkElement | null = null
let originalHref: string | null = null
let frames: string[] = []
const baseTitle = document.title

function ensureLinkEl() {
  if (linkEl) return
  linkEl = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null
  if (!linkEl) {
    linkEl = document.createElement('link')
    linkEl.rel = 'icon'
    document.head.appendChild(linkEl)
  }
  if (!originalHref) originalHref = linkEl.href || ''
}

function buildFrames() {
  if (frames.length) return frames
  const N = 12
  const size = 32
  const r = 12
  for (let i = 0; i < N; i++) {
    const c = document.createElement('canvas')
    c.width = c.height = size
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, size, size)

    // faint ring
    ctx.lineWidth = 2
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.beginPath()
    ctx.arc(size/2, size/2, r, 0, Math.PI * 2)
    ctx.stroke()

    // active arc
    const start = (i / N) * Math.PI * 2
    const len = Math.PI * 1.2
    ctx.lineCap = 'round'
    ctx.lineWidth = 3
    ctx.strokeStyle = '#ffffff'
    ctx.shadowColor = 'rgba(255,255,255,0.7)'
    ctx.shadowBlur = 4
    ctx.beginPath()
    ctx.arc(size/2, size/2, r, start, start + len)
    ctx.stroke()

    frames.push(c.toDataURL('image/png'))
  }
  return frames
}

export function startFaviconSpinner() {
  if (timer) return
  ensureLinkEl()
  buildFrames()
  let i = 0
  timer = window.setInterval(() => {
    if (!linkEl) return
    linkEl.href = frames[i++ % frames.length]
  }, 90)
  if (!document.title.startsWith('⏳')) {
    document.title = `⏳ ${baseTitle}`
  }
}

export function stopFaviconSpinner() {
  if (!timer) return
  window.clearInterval(timer)
  timer = null
  if (linkEl && originalHref) linkEl.href = originalHref
  document.title = baseTitle
}
