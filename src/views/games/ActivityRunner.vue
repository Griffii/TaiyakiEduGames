<!-- src/views/games/ActivityRunner.vue -->

<template>
  <div class="page activity-runner" @pointerdown="rememberPointer">
    <button class="home-button" type="button" @click="goHome" aria-label="Back">
      <img :src="homeIcon" alt="" />
    </button>

    <header class="head title-head">
      <h1 class="title">{{ title }}</h1>
    </header>

    <main class="content runner-content">
      <div class="frame-wrap" ref="frameWrap">
        <template v-if="iframeSrc">
          <iframe
            ref="frameEl"
            :src="iframeSrc"
            title=""
            allow="fullscreen; autoplay; gamepad"
            allowfullscreen
            @load="onFrameLoad"
          ></iframe>
        </template>

        <template v-else>
          <div class="empty">
            <p class="muted">
              {{ loading ? 'Loading activity…' : (error || 'No game URL configured for this activity.') }}
            </p>
          </div>
        </template>
      </div>

      <div class="under-actions">
        <button class="btn primary" @click="requestFullscreen">
          Go Fullscreen
        </button>
      </div>

      <section class="activity-engagement-bar">
        <div class="activity-stats">
          <span class="activity-stat">
            <svg viewBox="0 0 24 24" class="activity-stat-icon" aria-hidden="true">
              <path d="M12 21.35 10.55 20C5.4 15.24 2 12.09 2 8.5A4.5 4.5 0 0 1 6.5 4 5 5 0 0 1 12 7.09 5 5 0 0 1 17.5 4 4.5 4.5 0 0 1 22 8.5c0 3.59-3.4 6.74-8.55 11.5L12 21.35Z" />
            </svg>
            {{ stats.likes }} likes
          </span>

          <span class="activity-stat">
            <svg viewBox="0 0 24 24" class="activity-stat-icon" aria-hidden="true">
              <path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 2v9h2v1.17L8.71 15H20V6Z" />
            </svg>
            {{ stats.comments }} comments
          </span>
        </div>

        <button
          ref="heartButtonEl"
          class="activity-heart-button"
          :class="[userHasLiked ? 'is-liked' : '', heartAnimClass]"
          :disabled="likeLoading || !user || !dbActivity"
          :aria-label="userHasLiked ? 'Unlike activity' : 'Like activity'"
          :title="userHasLiked ? 'Unlike' : 'Like'"
          @click="toggleLike"
          @animationend="onHeartAnimationEnd"
        >
          <svg viewBox="0 0 24 24" class="activity-heart-icon" aria-hidden="true">
            <path d="M12 21.35 10.55 20C5.4 15.24 2 12.09 2 8.5A4.5 4.5 0 0 1 6.5 4 5 5 0 0 1 12 7.09 5 5 0 0 1 17.5 4 4.5 4.5 0 0 1 22 8.5c0 3.59-3.4 6.74-8.55 11.5L12 21.35Z" />
          </svg>
        </button>
      </section>

      <section v-if="tags.length" class="tags">
        <div class="chips">
          <span v-for="t in tags" :key="t" class="chip"># {{ t }}</span>
        </div>
      </section>

      <section class="activity-comments-section">
        <h2 class="activity-comments-title">Comments</h2>

        <div v-if="user" class="activity-comment-form">
          <textarea
            v-model="newComment"
            class="activity-comment-input"
            rows="4"
            maxlength="1000"
            placeholder="Leave a comment..."
            @input="clearCommentFeedback"
          ></textarea>

          <div class="activity-comment-form-footer">
            <span>{{ newComment.length }}/1000</span>

            <button
              class="activity-comment-submit"
              :disabled="commentLoading || !trimmedComment || !dbActivity"
              @click="submitComment"
            >
              {{ commentLoading ? 'Posting…' : 'Post Comment' }}
            </button>
          </div>

          <p
            v-if="commentFeedback.message"
            class="activity-comment-feedback"
            :class="{
              'is-success': commentFeedback.type === 'success',
              'is-error': commentFeedback.type === 'error',
            }"
          >
            {{ commentFeedback.message }}
          </p>
        </div>

        <p v-else class="activity-login-note">
          You must be logged in to leave a comment.
        </p>

        <div class="activity-comments-list">
          <article
            v-for="comment in comments"
            :key="comment.id"
            class="activity-comment-card"
          >
            <div class="activity-comment-top">
              <div class="activity-comment-user">
                <img
                  v-if="comment.avatar_url"
                  :src="comment.avatar_url"
                  :alt="`${comment.display_name || 'User'} avatar`"
                  class="activity-comment-avatar"
                />

                <div v-else class="activity-comment-avatar activity-comment-avatar--fallback">
                  {{ getInitial(comment.display_name) }}
                </div>

                <div class="activity-comment-user-meta">
                  <strong class="activity-comment-name">
                    {{ comment.display_name || 'User' }}
                  </strong>

                  <span class="activity-comment-time">
                    {{ timeAgo(comment.created_at) }}
                  </span>
                </div>
              </div>

              <button
                v-if="comment.user_id === currentUserId"
                class="activity-comment-delete"
                :disabled="deletingCommentIds[comment.id]"
                @click="deleteComment(comment)"
              >
                Delete
              </button>
            </div>

            <p class="activity-comment-body">{{ comment.body }}</p>
          </article>

          <p v-if="!comments.length" class="activity-no-comments">
            No comments yet.
          </p>
        </div>
      </section>
    </main>

    <div class="activity-heart-burst-layer" aria-hidden="true">
      <span
        v-for="burst in heartBursts"
        :key="burst.id"
        class="activity-heart-burst"
        :style="{
          left: burst.x + 'px',
          top: burst.y + 'px',
          '--dx': burst.dx + 'px',
          '--dy': burst.dy + 'px',
          '--rot': burst.rot + 'deg',
          '--durUp': burst.durUp + 'ms',
          '--durFall': burst.durFall + 'ms',
          '--delay': burst.delay + 'ms',
          '--size': burst.size + 'px',
          '--alpha': burst.alpha,
        }"
      >
        ❤
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import type { PostgrestMaybeSingleResponse } from '@supabase/supabase-js'

const homeIcon = new URL('@/assets/images/icons/back-icon.png', import.meta.url).toString()
const BUCKET = 'public-assets'

const router = useRouter()
function goHome() {
  router.push('/dashboard')
}

type DBActivity = {
  id: string
  slug: string
  name: string
  type: string | null
  url_path: string | null
  external_url: string | null
  icon_url: string | null
  thumbnail_url: string | null
  tags: string[] | null
  launch_params: Record<string, any> | null
  status: 'draft' | 'published' | 'archived'
  archived_at: string | null
}

type MetaActivity = Partial<
  Pick<DBActivity, 'slug' | 'name' | 'external_url' | 'url_path' | 'tags'>
> & { title?: string }

type ActivityStats = {
  likes: number
  comments: number
}

type ActivityComment = {
  id: string
  activity_id: string
  slug?: string
  user_id: string
  body: string
  created_at: string
  updated_at: string | null
  display_name?: string
  avatar_url?: string
}

type UserProfile = {
  id: string
  display_name?: string | null
  avatar_url?: string | null
}

type HeartBurst = {
  id: string
  x: number
  y: number
  dx: number
  dy: number
  rot: number
  durUp: number
  durFall: number
  delay: number
  size: number
  alpha: string
}

const route = useRoute()
const frameEl = ref<HTMLIFrameElement | null>(null)
const frameWrap = ref<HTMLElement | null>(null)
const heartButtonEl = ref<HTMLButtonElement | null>(null)

const routeSlug = computed(() => route.params.slug as string | undefined)
const routeId = computed(() => route.params.id as string | undefined)
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const meta = (route.meta as Record<string, unknown>) ?? {}
const metaActivity = (meta.activity as MetaActivity | undefined) ?? undefined

const dbActivity = ref<DBActivity | null>(null)
const loading = ref<boolean>(false)
const error = ref<string | null>(null)

const user = ref<any>(null)
const stats = ref<ActivityStats>({
  likes: 0,
  comments: 0,
})

const comments = ref<ActivityComment[]>([])
const newComment = ref('')
const likeLoading = ref(false)
const commentLoading = ref(false)
const userHasLiked = ref(false)
const deletingCommentIds = ref<Record<string, boolean>>({})
const commentFeedback = ref({
  type: '',
  message: '',
})

const heartAnimClass = ref('')
const heartAnimClasses = ['anim-bounce', 'anim-spin', 'anim-wiggle', 'anim-pop', 'anim-squash', 'anim-float']
const isHeartAnimating = ref(false)
const heartBursts = ref<HeartBurst[]>([])
const heartBurstTimers: number[] = []
let heartBurstId = 1
let lastPointer = { x: null as number | null, y: null as number | null }

const trimmedComment = computed(() => newComment.value.trim())
const currentUserId = computed(() => user.value?.id || '')

async function loadUser() {
  const { data, error } = await supabase.auth.getUser()

  if (error) {
    console.error('Failed to load user:', error)
    user.value = null
    return
  }

  user.value = data.user ?? null
}

async function loadActivity() {
  error.value = null
  dbActivity.value = null
  stats.value = {
    likes: 0,
    comments: 0,
  }
  comments.value = []
  userHasLiked.value = false
  heartAnimClass.value = ''
  isHeartAnimating.value = false

  if (!supabase) return

  const key = routeId.value || routeSlug.value || metaActivity?.slug
  if (!key) return

  loading.value = true

  try {
    let resp: PostgrestMaybeSingleResponse<DBActivity>

    if (uuidRegex.test(key)) {
      resp = await supabase
        .from('activities')
        .select('*')
        .eq('id', key)
        .maybeSingle()
    } else {
      resp = await supabase
        .from('activities')
        .select('*')
        .eq('slug', key)
        .maybeSingle()
    }

    if (resp.error) throw resp.error

    dbActivity.value = resp.data ?? null

    if (!dbActivity.value) {
      error.value = 'Activity not found.'
      return
    }

    await refreshEngagementState()
  } catch (e: any) {
    error.value = e?.message || 'Failed to load activity.'
  } finally {
    loading.value = false
  }
}

async function loadStats() {
  if (!dbActivity.value) return

  const { data, error } = await supabase
    .from('activities_stats')
    .select('likes_count, comments_count')
    .eq('activity_id', dbActivity.value.id)
    .maybeSingle()

  if (error) {
    console.error('Failed to load activity stats:', error)
    return
  }

  stats.value.likes = data?.likes_count ?? 0
  stats.value.comments = data?.comments_count ?? 0
}

async function loadComments() {
  if (!dbActivity.value) return

  const { data: rawComments, error } = await supabase
    .from('activities_comments_view')
    .select('id, activity_id, slug, user_id, body, created_at, updated_at')
    .eq('activity_id', dbActivity.value.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to load activity comments:', error)
    return
  }

  const safeComments = (rawComments ?? []) as ActivityComment[]
  const userIds = [...new Set(safeComments.map((item) => item.user_id).filter(Boolean))]

  let profileMap: Record<string, UserProfile> = {}

  if (userIds.length) {
    const { data: profiles, error: profilesError } = await supabase.rpc(
      'get_public_profiles_by_ids',
      { p_ids: userIds }
    )

    if (profilesError) {
      console.error('Failed to load comment profiles:', profilesError)
    } else {
      profileMap = Object.fromEntries(
        ((profiles ?? []) as UserProfile[]).map((profile) => [profile.id, profile])
      )
    }
  }

  comments.value = safeComments.map((comment) => {
    const profile = profileMap[comment.user_id] || null

    return {
      ...comment,
      display_name: profile?.display_name || 'User',
      avatar_url: resolveStorageAvatar(profile?.avatar_url || ''),
    }
  })
}

async function loadUserLike() {
  if (!dbActivity.value || !user.value) {
    userHasLiked.value = false
    return
  }

  const { data, error } = await supabase
    .from('activities_likes')
    .select('id')
    .eq('activity_id', dbActivity.value.id)
    .eq('user_id', user.value.id)
    .maybeSingle()

  if (error) {
    console.error('Failed to load user activity like:', error)
    return
  }

  userHasLiked.value = !!data
}

async function refreshEngagementState() {
  await Promise.all([loadStats(), loadComments(), loadUserLike()])
}

function rememberPointer(event: PointerEvent) {
  if (typeof event.clientX === 'number' && typeof event.clientY === 'number') {
    lastPointer = {
      x: event.clientX,
      y: event.clientY,
    }
  }
}

function pickHeartAnimClass() {
  return heartAnimClasses[Math.floor(Math.random() * heartAnimClasses.length)]
}

async function startHeartAnimation() {
  if (isHeartAnimating.value) return

  isHeartAnimating.value = true
  heartAnimClass.value = ''

  await nextTick()

  if (heartButtonEl.value) {
    void heartButtonEl.value.offsetWidth
  }

  heartAnimClass.value = pickHeartAnimClass()
}

function onHeartAnimationEnd() {
  isHeartAnimating.value = false
  heartAnimClass.value = ''
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function getHeartBurstPoint(event?: MouseEvent) {
  if (event && typeof event.clientX === 'number' && typeof event.clientY === 'number') {
    return {
      x: event.clientX,
      y: event.clientY,
    }
  }

  if (heartButtonEl.value) {
    const rect = heartButtonEl.value.getBoundingClientRect()
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    }
  }

  if (lastPointer.x !== null && lastPointer.y !== null) {
    return {
      x: lastPointer.x,
      y: lastPointer.y,
    }
  }

  return {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  }
}

function spawnHeartBurstAt(x: number, y: number) {
  const count = 10 + Math.floor(Math.random() * 5)
  const now = Date.now()

  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + Math.random() * Math.PI
    const power = 35 + Math.random() * 65

    const dx = Math.cos(angle) * power + (Math.random() * 26 - 13)
    const dy = Math.sin(angle) * power - (45 + Math.random() * 70)

    const durUp = 900 + Math.floor(Math.random() * 650)
    const durFall = 2200 + Math.floor(Math.random() * 1500)
    const delay = Math.floor(Math.random() * 140)
    const size = 10 + Math.floor(Math.random() * 14)
    const rot = Math.floor(Math.random() * 220 - 110)
    const alpha = (0.45 + Math.random() * 0.35).toFixed(2)

    const id = `${now}-${heartBurstId++}-${i}`

    heartBursts.value.push({
      id,
      x,
      y,
      dx,
      dy,
      rot,
      durUp,
      durFall,
      delay,
      size,
      alpha,
    })

    const timer = window.setTimeout(() => {
      const index = heartBursts.value.findIndex((burst) => burst.id === id)
      if (index !== -1) {
        heartBursts.value.splice(index, 1)
      }
    }, durUp + durFall + delay + 160)

    heartBurstTimers.push(timer)
  }
}

function triggerHeartEffects(event?: MouseEvent) {
  const point = getHeartBurstPoint(event)

  spawnHeartBurstAt(
    clamp(point.x, 0, window.innerWidth),
    clamp(point.y, 0, window.innerHeight)
  )

  startHeartAnimation()
}

async function toggleLike(event?: MouseEvent) {
  if (!user.value || !dbActivity.value || likeLoading.value) return

  likeLoading.value = true

  const previousLiked = userHasLiked.value
  const previousLikes = stats.value.likes
  const nextLiked = !previousLiked

  userHasLiked.value = nextLiked
  stats.value.likes = previousLiked
    ? Math.max(0, stats.value.likes - 1)
    : stats.value.likes + 1

  if (nextLiked) {
    triggerHeartEffects(event)
  }

  try {
    if (previousLiked) {
      const { error } = await supabase
        .from('activities_likes')
        .delete()
        .eq('activity_id', dbActivity.value.id)
        .eq('user_id', user.value.id)

      if (error) throw error
    } else {
      const { error } = await supabase
        .from('activities_likes')
        .insert({
          activity_id: dbActivity.value.id,
          user_id: user.value.id,
        })

      if (error) throw error
    }

    await Promise.all([loadStats(), loadUserLike()])
  } catch (error) {
    console.error('Failed to toggle activity like:', error)
    userHasLiked.value = previousLiked
    stats.value.likes = previousLikes
    heartAnimClass.value = ''
    isHeartAnimating.value = false
  } finally {
    likeLoading.value = false
  }
}

async function submitComment() {
  if (!user.value || !dbActivity.value || !trimmedComment.value || commentLoading.value) return

  commentLoading.value = true
  commentFeedback.value = {
    type: '',
    message: '',
  }

  const body = trimmedComment.value
  const previousNewComment = newComment.value

  try {
    const { error } = await supabase
      .from('activities_comments')
      .insert({
        activity_id: dbActivity.value.id,
        user_id: user.value.id,
        body,
      })

    if (error) throw error

    newComment.value = ''
    commentFeedback.value = {
      type: 'success',
      message: 'Comment submitted for review. It will appear after approval.',
    }

    await Promise.all([loadComments(), loadStats()])
  } catch (error) {
    console.error('Failed to submit activity comment:', error)
    newComment.value = previousNewComment
    commentFeedback.value = {
      type: 'error',
      message: 'Failed to submit comment. Please try again.',
    }
  } finally {
    commentLoading.value = false
  }
}

async function deleteComment(comment: ActivityComment) {
  if (!user.value || comment.user_id !== user.value.id) return
  if (deletingCommentIds.value[comment.id]) return

  deletingCommentIds.value = {
    ...deletingCommentIds.value,
    [comment.id]: true,
  }

  const previousComments = [...comments.value]
  const previousCommentsCount = stats.value.comments

  comments.value = comments.value.filter((item) => item.id !== comment.id)
  stats.value.comments = Math.max(0, stats.value.comments - 1)

  try {
    const { error } = await supabase.rpc('soft_delete_activity_comment', {
      p_comment_id: comment.id,
    })

    if (error) throw error

    await Promise.all([loadComments(), loadStats()])
  } catch (error) {
    console.error('Failed to delete activity comment:', error)
    comments.value = previousComments
    stats.value.comments = previousCommentsCount
  } finally {
    deletingCommentIds.value = {
      ...deletingCommentIds.value,
      [comment.id]: false,
    }
  }
}

function parseQueryTags(): string[] {
  const q = route.query?.tags
  if (!q) return []

  if (Array.isArray(q)) {
    return q
      .flatMap((s) => String(s).split(','))
      .map((s) => s.trim())
      .filter(Boolean)
  }

  return String(q)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

const title = computed(
  () =>
    dbActivity.value?.name ??
    metaActivity?.name ??
    metaActivity?.title ??
    (routeSlug.value ? routeSlug.value.replace(/-/g, ' ') : 'Activity')
)

const tags = computed<string[]>(() =>
  (dbActivity.value?.tags ?? metaActivity?.tags ?? parseQueryTags() ?? []).filter(Boolean)
)

function extractIframeSrc(raw: string): string {
  const value = raw.trim()

  if (!value.startsWith('<iframe')) return value

  const match = value.match(/\ssrc=["']([^"']+)["']/i)
  return match?.[1] || value
}

function resolveActivityFrameUrl(raw?: string | null): string {
  if (!raw) return ''

  const value = extractIframeSrc(String(raw).trim())
  if (!value) return ''

  if (/^[a-z][a-z0-9+\-.]*:\/\//i.test(value)) return value
  if (/^[a-z][a-z0-9+\-.]*:/i.test(value)) return value
  if (value.startsWith('//')) return `${window.location.protocol}${value}`

  if (value.startsWith('/')) {
    return new URL(value, window.location.origin).toString()
  }

  return new URL(`/${value.replace(/^\/+/, '')}`, window.location.origin).toString()
}

function resolveStorageAvatar(path?: string | null): string {
  if (!path) return ''

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  const cleanPath = String(path).replace(/^\/+/, '')
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(cleanPath)
  return data?.publicUrl || ''
}

function getInitial(name?: string) {
  const safe = (name || 'U').trim()
  return safe.charAt(0).toUpperCase()
}

function clearCommentFeedback() {
  if (!commentFeedback.value.message) return

  commentFeedback.value = {
    type: '',
    message: '',
  }
}

function timeAgo(dateString?: string) {
  if (!dateString) return ''

  const now = Date.now()
  const then = new Date(dateString).getTime()
  const diffSeconds = Math.max(1, Math.floor((now - then) / 1000))

  if (diffSeconds < 60) return 'just now'

  const minutes = Math.floor(diffSeconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`

  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks} week${weeks === 1 ? '' : 's'} ago`

  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`

  const years = Math.floor(days / 365)
  return `${years} year${years === 1 ? '' : 's'} ago`
}

const effectiveSlug = computed(
  () => dbActivity.value?.slug || routeSlug.value || metaActivity?.slug || 'activity'
)

const rawFrameUrl = computed(() => {
  const override = route.query.url as string | undefined
  if (override) return override

  if (dbActivity.value?.external_url) {
    return dbActivity.value.external_url
  }

  const slug = dbActivity.value?.slug || routeSlug.value || metaActivity?.slug || ''
  if (!slug) return ''

  return `/godot_games/${slug}/index.html`
})

const iframeSrc = computed(() => resolveActivityFrameUrl(rawFrameUrl.value))

function originOf(url: string): string | null {
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

const childOrigin = computed(() => originOf(iframeSrc.value))

function onFrameLoad() {
  if (!childOrigin.value) return

  const payload = {
    version: '1.0.0',
    activity_id: dbActivity.value?.id || effectiveSlug.value,
    slug: dbActivity.value?.slug || effectiveSlug.value,
  }

  frameEl.value?.contentWindow?.postMessage(
    { type: 'parent:init', payload },
    childOrigin.value
  )
}

function onMessage(e: MessageEvent<any>) {
  if (!childOrigin.value || e.origin !== childOrigin.value) return
  if (e.data?.type === 'request:fullscreen') requestFullscreen()
}

function requestFullscreen() {
  const target: any = frameEl.value || frameWrap.value || document.documentElement
  const req =
    target.requestFullscreen ||
    target.webkitRequestFullscreen ||
    target.msRequestFullscreen

  if (req) req.call(target)
}

onMounted(async () => {
  window.addEventListener('message', onMessage)

  await loadUser()
  await loadActivity()
})

watch([routeSlug, routeId], async () => {
  await loadActivity()
})

onBeforeUnmount(() => {
  window.removeEventListener('message', onMessage)

  for (const timer of heartBurstTimers) {
    window.clearTimeout(timer)
  }

  heartBurstTimers.length = 0
  heartBursts.value = []
})
</script>

<style scoped>
/* Header */
.title-head {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-bottom: 1.5rem;
}

/* Home button */
.home-button {
  position: relative;
  top: 16px;
  left: 16px;
  background: transparent;
  border: none;
  padding: 0;
  width: 38px;
  height: 38px;
  cursor: pointer;
  z-index: 1000;
}

.home-button img {
  width: 100%;
  height: 100%;
  pointer-events: none;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, .25));
  transition: transform .12s ease-in-out;
}

.home-button:hover img {
  transform: scale(1.06);
}

/* Title with 3D depth */
.title-head .title {
  color: var(--main-title-color);
  margin: 0;
  line-height: 1.2;
  font-size: clamp(1.25rem, 2.5vw, 2rem);
  font-weight: 800;
  text-align: center;
  text-shadow:
    0 1px 0 rgba(255, 255, 255, 0.25),
    0 2px 0 rgba(0, 0, 0, 0.35),
    0 6px 14px rgba(0, 0, 0, 0.55);
}

.runner-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem 0;
  padding-bottom: 2rem;
}

/* Frame wrapper: centered, 16:9, ~80% width (max 1200px) */
.frame-wrap {
  position: relative;
  width: min(80vw, 1200px);
  aspect-ratio: 16 / 9;
  background: #0f0f10;
  border-radius: 16px;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.18);
  box-shadow:
    0 10px 30px rgba(0, 0, 0, 0.35),
    0 0 0 1px rgba(255, 255, 255, 0.04) inset;
}

/* iFrame fills the wrapper */
iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}

/* Buttons */
.btn {
  appearance: none;
  border: none;
  outline: none;
  padding: 0.7rem 1.05rem;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 0.06s ease,
    box-shadow 0.2s ease,
    filter 0.15s ease;
}

.btn.primary {
  background: #22c55e;
  color: #06110a;
  box-shadow: 0 6px 16px rgba(34, 197, 94, 0.35);
}

.btn.primary:hover {
  filter: brightness(1.06);
}

.btn.primary:active {
  transform: translateY(1px) scale(0.995);
}

.btn.primary:focus-visible {
  box-shadow:
    0 0 0 3px rgba(34, 197, 94, 0.35),
    0 6px 16px rgba(34, 197, 94, 0.35);
}

/* Under-frame actions */
.under-actions {
  display: flex;
  justify-content: center;
  width: 100%;
}

/* Engagement */
.activity-engagement-bar {
  width: min(80vw, 1200px);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.activity-stats {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  color: var(--main-text-soft, rgba(255, 255, 255, 0.82));
  font-size: 0.95rem;
}

.activity-stat {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.activity-stat-icon {
  width: 16px;
  height: 16px;
  fill: currentColor;
  flex: 0 0 auto;
}

.activity-heart-button {
  appearance: none;
  border: none;
  outline: none;
  width: 76px;
  height: 76px;
  display: grid;
  place-items: center;
  background: transparent;
  color: #ef4444;
  cursor: pointer;
  padding: 0;
  user-select: none;
  transition:
    transform 120ms ease,
    filter 120ms ease,
    opacity 120ms ease;
}

.activity-heart-button:hover:enabled {
  transform: translateY(-1px) scale(1.05);
  filter: brightness(1.05);
}

.activity-heart-button:active:enabled {
  transform: translateY(0) scale(0.96);
}

.activity-heart-button:disabled {
  cursor: not-allowed;
  opacity: 0.85;
}

.activity-heart-icon {
  width: 58px;
  height: 58px;
  stroke: #ef4444;
  stroke-width: 1.75;
  fill: #fff;
  filter:
    drop-shadow(0 8px 14px rgba(0, 0, 0, 0.24))
    drop-shadow(0 1px 3px rgba(239, 68, 68, 0.22));
  pointer-events: none;
  transition:
    fill 140ms ease,
    stroke 140ms ease,
    filter 140ms ease,
    opacity 140ms ease;
}

.activity-heart-button.is-liked .activity-heart-icon {
  fill: #ef4444;
  stroke: #ef4444;
  filter:
    drop-shadow(0 8px 16px rgba(239, 68, 68, 0.34))
    drop-shadow(0 2px 5px rgba(0, 0, 0, 0.22));
}

.activity-heart-burst-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 9999;
}

.activity-heart-burst {
  position: absolute;
  font-size: var(--size);
  opacity: var(--alpha);
  transform: translate(-50%, -50%);
  color: color-mix(in srgb, #ef4444 75%, #4081ff 25%);
  text-shadow: 0 10px 26px rgba(0, 0, 0, 0.26);
  animation:
    activityBurstUp var(--durUp) cubic-bezier(0.16, 1, 0.3, 1) var(--delay) forwards,
    activityBurstFall var(--durFall) cubic-bezier(0.18, 0.7, 0.18, 1)
      calc(var(--delay) + var(--durUp) * 0.35)
      forwards;
}

@keyframes activityBurstUp {
  0% {
    transform: translate(-50%, -50%) scale(0.7) rotate(0deg);
  }

  70% {
    transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1.02) rotate(var(--rot));
  }

  100% {
    transform: translate(calc(-50% + (var(--dx) * 0.75)), calc(-50% + (var(--dy) * 0.75))) scale(1)
      rotate(calc(var(--rot) * 1.05));
  }
}

@keyframes activityBurstFall {
  0% {
    opacity: var(--alpha);
  }

  100% {
    transform: translate(calc(-50% + (var(--dx) * 0.75)), calc(-50% + (var(--dy) * 0.75) + 820px))
      rotate(calc(var(--rot) * 1.25));
    opacity: 0;
  }
}

.anim-bounce {
  animation: activityHeartBounce 520ms cubic-bezier(0.2, 1.2, 0.2, 1) both;
}

@keyframes activityHeartBounce {
  0% {
    transform: scale(1);
  }

  25% {
    transform: scale(1.14) translateY(-6px);
  }

  55% {
    transform: scale(0.96) translateY(2px);
  }

  100% {
    transform: scale(1);
  }
}

.anim-spin {
  animation: activityHeartSpin 720ms cubic-bezier(0.2, 1, 0.2, 1) both;
}

@keyframes activityHeartSpin {
  0% {
    transform: scale(1) rotate(0deg);
  }

  45% {
    transform: scale(1.08) rotate(180deg);
  }

  100% {
    transform: scale(1) rotate(360deg);
  }
}

.anim-wiggle {
  animation: activityHeartWiggle 620ms ease-in-out both;
}

@keyframes activityHeartWiggle {
  0% {
    transform: rotate(0deg) scale(1);
  }

  15% {
    transform: rotate(-9deg) scale(1.05);
  }

  30% {
    transform: rotate(11deg) scale(1.06);
  }

  45% {
    transform: rotate(-11deg) scale(1.06);
  }

  60% {
    transform: rotate(9deg) scale(1.04);
  }

  100% {
    transform: rotate(0deg) scale(1);
  }
}

.anim-pop {
  animation: activityHeartPop 520ms cubic-bezier(0.2, 1.4, 0.2, 1) both;
}

@keyframes activityHeartPop {
  0% {
    transform: scale(1);
    filter: brightness(1);
  }

  35% {
    transform: scale(1.2);
    filter: brightness(1.08);
  }

  100% {
    transform: scale(1);
    filter: brightness(1);
  }
}

.anim-squash {
  animation: activityHeartSquash 560ms cubic-bezier(0.2, 1, 0.2, 1) both;
}

@keyframes activityHeartSquash {
  0% {
    transform: scale(1);
  }

  25% {
    transform: scale(1.18, 0.84);
  }

  55% {
    transform: scale(0.94, 1.12);
  }

  100% {
    transform: scale(1);
  }
}

.anim-float {
  animation: activityHeartFloat 860ms cubic-bezier(0.2, 1, 0.2, 1) both;
}

@keyframes activityHeartFloat {
  0% {
    transform: translateY(0) scale(1);
  }

  35% {
    transform: translateY(-10px) scale(1.08);
  }

  100% {
    transform: translateY(0) scale(1);
  }
}

.activity-comment-submit,
.activity-comment-delete {
  appearance: none;
  border: none;
  outline: none;
  border-radius: 12px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.activity-comment-submit:disabled,
.activity-comment-delete:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Tags as chips */
.tags {
  width: min(80vw, 1200px);
  margin-top: 0.25rem;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.chip {
  font-size: 0.85rem;
  line-height: 1;
  padding: 0.5rem 0.65rem;
  border-radius: 999px;
  color: #e7eefc;
  background: rgba(64, 129, 255, 0.18);
  border: 1px solid rgba(64, 129, 255, 0.35);
  user-select: none;
}

/* Comments */
.activity-comments-section {
  width: min(80vw, 1200px);
  margin-top: 1rem;
}

.activity-comments-title {
  margin: 0 0 0.9rem;
  font-size: 1.35rem;
  font-weight: 900;
  color: var(--main-title-color);
  text-shadow: var(--main-title-shadow);
}

.activity-comment-form {
  margin: 1rem 0 1.5rem;
}

.activity-comment-input {
  width: 100%;
  resize: vertical;
  min-height: 120px;
  box-sizing: border-box;
  border-radius: 14px;
  padding: 0.85rem 0.95rem;
  font: inherit;
  border: 1px solid rgba(255, 255, 255, 0.24);
  background: #fff;
  color: #1f2937;
}

.activity-comment-form-footer {
  margin-top: 0.65rem;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  color: var(--main-text-soft, rgba(255, 255, 255, 0.82));
}

.activity-comment-submit {
  padding: 0.7rem 1.05rem;
  background: #4081ff;
  color: #fff;
}

.activity-comment-feedback {
  margin: 0.65rem 0 0;
  font-size: 0.92rem;
  line-height: 1.45;
}

.activity-comment-feedback.is-success {
  color: #9be7b3;
}

.activity-comment-feedback.is-error {
  color: #ffb4b4;
}

.activity-login-note,
.activity-no-comments {
  color: var(--main-text-soft, rgba(255, 255, 255, 0.82));
}

.activity-comments-list {
  display: grid;
  gap: 0.75rem;
}

.activity-comment-card {
  padding: 0.9rem 1rem;
  border-radius: 14px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
}

.activity-comment-top {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.65rem;
}

.activity-comment-user {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.activity-comment-avatar {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  object-fit: cover;
  display: block;
  background: #d1d5db;
  flex: 0 0 auto;
}

.activity-comment-avatar--fallback {
  display: grid;
  place-items: center;
  font-weight: 800;
  color: #111827;
  background: #e5e7eb;
}

.activity-comment-user-meta {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.activity-comment-name {
  font-size: 0.95rem;
  color: #111827;
}

.activity-comment-time {
  font-size: 0.82rem;
  color: #6b7280;
}

.activity-comment-body {
  margin: 0;
  line-height: 1.5;
  color: #1f2937;
  white-space: pre-wrap;
}

.activity-comment-delete {
  padding: 0.5rem 0.75rem;
  background: #e5e7eb;
  color: #374151;
  font-size: 0.85rem;
}

/* Achievements placeholder */
.achievements {
  width: min(80vw, 1200px);
  margin-top: 0.5rem;
}

.section-title {
  color: #fff;
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
}

.badges {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
}

.badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  min-height: 100px;
}

.badge .icon {
  font-size: 1.6rem;
  margin-bottom: 0.35rem;
}

.badge .label {
  font-size: 0.85rem;
  color: #cfd6e6;
}

.badge.locked {
  opacity: 0.78;
}

.note {
  display: block;
  margin-top: 0.35rem;
  color: #9aa3b2;
}

/* Empty state */
.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #888;
}

@media (max-width: 640px) {
  .frame-wrap,
  .tags,
  .activity-engagement-bar,
  .activity-comments-section {
    width: min(100%, calc(100vw - 20px));
  }

  .activity-engagement-bar {
    align-items: flex-start;
  }

  .activity-heart-button {
    width: 66px;
    height: 66px;
  }

  .activity-heart-icon {
    width: 50px;
    height: 50px;
  }

  .activity-comment-top {
    flex-direction: column;
    align-items: flex-start;
  }

  .activity-comment-form-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .activity-comment-submit {
    width: 100%;
  }

  .activity-comment-avatar {
    width: 36px;
    height: 36px;
  }
}
</style>