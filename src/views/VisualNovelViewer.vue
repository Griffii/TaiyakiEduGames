<template>
    <main class="vn-viewer-page" v-if="novel">
        <section class="vn-header">
            <h1 class="vn-title">{{ novel.title }}</h1>

            <p v-if="novel.author_name" class="vn-author">
                By {{ novel.author_name }}
            </p>

            <p v-if="headerDescription" class="vn-description">
                {{ headerDescription }}
            </p>
        </section>

        <section class="vn-player-section">
            <div ref="playerShellRef" class="vn-player-shell">
                <iframe ref="playerFrameRef" class="vn-player" :src="novel.build_url" :title="novel.title"
                    allow="autoplay; fullscreen" allowfullscreen
                    referrerpolicy="strict-origin-when-cross-origin"></iframe>
            </div>

            <div class="vn-engagement-bar">
                <div class="vn-stats">
                    <span class="vn-stat">
                        <svg viewBox="0 0 24 24" class="vn-stat-icon" aria-hidden="true">
                            <path
                                d="M12 5c5.5 0 9.5 4.5 10.7 6-1.2 1.5-5.2 6-10.7 6S2.5 12.5 1.3 11C2.5 9.5 6.5 5 12 5Zm0 2C8.1 7 5 9.8 3.5 11 5 12.2 8.1 15 12 15s7-2.8 8.5-4C19 9.8 15.9 7 12 7Zm0 1.5A2.5 2.5 0 1 1 9.5 11 2.5 2.5 0 0 1 12 8.5Z" />
                        </svg>
                        {{ stats.views }} views
                    </span>

                    <span class="vn-stat">
                        <svg viewBox="0 0 24 24" class="vn-stat-icon" aria-hidden="true">
                            <path
                                d="M12 21.35 10.55 20C5.4 15.24 2 12.09 2 8.5A4.5 4.5 0 0 1 6.5 4 5 5 0 0 1 12 7.09 5 5 0 0 1 17.5 4 4.5 4.5 0 0 1 22 8.5c0 3.59-3.4 6.74-8.55 11.5L12 21.35Z" />
                        </svg>
                        {{ stats.likes }} likes
                    </span>

                    <span class="vn-stat">
                        <svg viewBox="0 0 24 24" class="vn-stat-icon" aria-hidden="true">
                            <path
                                d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 2v9h2v1.17L8.71 15H20V6Z" />
                        </svg>
                        {{ stats.comments }} comments
                    </span>
                </div>

                <div class="vn-actions">
                    <button class="vn-like-button" :class="{ 'is-liked': userHasLiked }"
                        :disabled="likeLoading || !user" @click="toggleLike">
                        {{ userHasLiked ? 'Unlike' : 'Like' }}
                    </button>

                    <button class="vn-fullscreen-button" @click="openFullscreen">
                        Fullscreen
                    </button>
                </div>
            </div>
        </section>

        <section class="vn-comments-section">
            <h2 class="vn-comments-title">Comments</h2>

            <div v-if="user" class="vn-comment-form">
                <textarea v-model="newComment" class="vn-comment-input" rows="4" maxlength="1000"
                    placeholder="Leave a comment..."></textarea>

                <div class="vn-comment-form-footer">
                    <span>{{ newComment.length }}/1000</span>
                    <button class="vn-comment-submit" :disabled="commentLoading || !trimmedComment"
                        @click="submitComment">
                        Post Comment
                    </button>
                </div>
            </div>

            <p v-else class="vn-login-note">
                You must be logged in to leave a comment.
            </p>

            <div class="vn-comments-list">
                <article v-for="comment in comments" :key="comment.id" class="vn-comment-card">
                    <div class="vn-comment-top">
                        <div class="vn-comment-user">
                            <img v-if="comment.avatar_url" :src="comment.avatar_url"
                                :alt="`${comment.display_name || 'User'} avatar`" class="vn-comment-avatar" />
                            <div v-else class="vn-comment-avatar vn-comment-avatar--fallback">
                                {{ getInitial(comment.display_name) }}
                            </div>

                            <div class="vn-comment-user-meta">
                                <strong class="vn-comment-name">
                                    {{ comment.display_name || 'User' }}
                                </strong>
                                <span class="vn-comment-time">
                                    {{ timeAgo(comment.created_at) }}
                                </span>
                            </div>
                        </div>

                        <button v-if="comment.user_id === currentUserId" class="vn-comment-delete"
                            :disabled="deletingCommentIds[comment.id]" @click="deleteComment(comment)">
                            Delete
                        </button>
                    </div>

                    <p class="vn-comment-body">{{ comment.body }}</p>
                </article>

                <p v-if="!comments.length" class="vn-no-comments">
                    No comments yet.
                </p>
            </div>
        </section>
    </main>

    <main v-else-if="loading" class="vn-state">
        <h1 class="vn-state-title">Loading…</h1>
    </main>

    <main v-else class="vn-not-found">
        <h1 class="vn-state-title">Visual novel not found</h1>
        <p class="vn-state-text">The requested visual novel could not be loaded.</p>
    </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '@/lib/supabase'

const BUCKET = 'public-assets'

const route = useRoute()
const slug = computed(() => String(route.params.slug || ''))

const loading = ref(true)
const novel = ref(null)
const user = ref(null)
const playerShellRef = ref(null)
const playerFrameRef = ref(null)

const stats = ref({
    views: 0,
    likes: 0,
    comments: 0,
})

const comments = ref([])
const newComment = ref('')
const likeLoading = ref(false)
const commentLoading = ref(false)
const userHasLiked = ref(false)
const hasIncrementedView = ref(false)
const deletingCommentIds = ref({})

const trimmedComment = computed(() => newComment.value.trim())
const currentUserId = computed(() => user.value?.id || '')

const headerDescription = computed(() => {
    if (!novel.value) return ''
    return novel.value.short_description || novel.value.description || ''
})

function getInitial(name) {
    const safe = (name || 'U').trim()
    return safe.charAt(0).toUpperCase()
}

function resolveStorageAvatar(path) {
    if (!path) return ''

    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path
    }

    const cleanPath = String(path).replace(/^\/+/, '')
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(cleanPath)
    return data?.publicUrl || ''
}

function timeAgo(dateString) {
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

async function openFullscreen() {
    const el = playerShellRef.value || playerFrameRef.value
    if (!el) return

    try {
        if (document.fullscreenElement) {
            await document.exitFullscreen()
        } else if (el.requestFullscreen) {
            await el.requestFullscreen()
        }
    } catch (error) {
        console.error('Failed to toggle fullscreen:', error)
    }
}

async function loadUser() {
    const { data, error } = await supabase.auth.getUser()
    if (error) {
        console.error('Failed to load user:', error)
        return
    }
    user.value = data.user ?? null
}

async function loadNovel() {
    const { data, error } = await supabase
        .from('visual_novels')
        .select(`
      slug,
      title,
      description,
      short_description,
      build_url,
      author_name,
      is_published
    `)
        .eq('slug', slug.value)
        .eq('is_published', true)
        .maybeSingle()

    if (error) {
        console.error('Failed to load visual novel:', error)
        novel.value = null
        return
    }

    novel.value = data ?? null
}

async function loadStats() {
    if (!novel.value) return

    const { data, error } = await supabase
        .from('visual_novel_stats')
        .select('views_count, likes_count, comments_count')
        .eq('slug', novel.value.slug)
        .maybeSingle()

    if (error) {
        console.error('Failed to load VN stats:', error)
        return
    }

    stats.value.views = data?.views_count ?? 0
    stats.value.likes = data?.likes_count ?? 0
    stats.value.comments = data?.comments_count ?? 0
}

async function loadComments() {
    if (!novel.value) return

    const { data: rawComments, error } = await supabase
        .from('visual_novel_comments_view')
        .select('id, slug, user_id, body, created_at, display_name')
        .eq('slug', novel.value.slug)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Failed to load VN comments:', error)
        return
    }

    const safeComments = rawComments ?? []
    const userIds = [...new Set(safeComments.map((item) => item.user_id).filter(Boolean))]

    let profileMap = {}

    if (userIds.length) {
        const { data: profiles, error: profilesError } = await supabase.rpc(
            'get_public_profiles_by_ids',
            { p_ids: userIds }
        )

        if (profilesError) {
            console.error('Failed to load comment profiles:', profilesError)
        } else {
            profileMap = Object.fromEntries(
                (profiles ?? []).map((profile) => [profile.id, profile])
            )
        }
    }

    comments.value = safeComments.map((comment) => {
        const profile = profileMap[comment.user_id] || null

        return {
            ...comment,
            display_name: profile?.display_name || comment.display_name || 'User',
            avatar_url: resolveStorageAvatar(profile?.avatar_url || ''),
        }
    })
}

async function loadUserLike() {
    if (!novel.value || !user.value) {
        userHasLiked.value = false
        return
    }

    const { data, error } = await supabase
        .from('visual_novel_likes')
        .select('id')
        .eq('slug', novel.value.slug)
        .eq('user_id', user.value.id)
        .maybeSingle()

    if (error) {
        console.error('Failed to load user like:', error)
        return
    }

    userHasLiked.value = !!data
}

async function refreshEngagementState() {
    await Promise.all([
        loadStats(),
        loadComments(),
        loadUserLike(),
    ])
}

async function incrementView() {
    if (!novel.value || hasIncrementedView.value) return

    hasIncrementedView.value = true
    stats.value.views += 1

    const { error } = await supabase.rpc('increment_visual_novel_view', {
        p_slug: novel.value.slug,
    })

    if (error) {
        console.error('Failed to increment view:', error)
        stats.value.views = Math.max(0, stats.value.views - 1)
        hasIncrementedView.value = false
        return
    }

    await loadStats()
}

async function toggleLike() {
    if (!user.value || !novel.value || likeLoading.value) return

    likeLoading.value = true

    const previousLiked = userHasLiked.value
    const previousLikes = stats.value.likes

    userHasLiked.value = !previousLiked
    stats.value.likes = previousLiked
        ? Math.max(0, stats.value.likes - 1)
        : stats.value.likes + 1

    try {
        if (previousLiked) {
            const { error } = await supabase
                .from('visual_novel_likes')
                .delete()
                .eq('slug', novel.value.slug)
                .eq('user_id', user.value.id)

            if (error) throw error
        } else {
            const { error } = await supabase
                .from('visual_novel_likes')
                .insert({
                    slug: novel.value.slug,
                    user_id: user.value.id,
                })

            if (error) throw error
        }

        await Promise.all([loadStats(), loadUserLike()])
    } catch (error) {
        console.error('Failed to toggle like:', error)
        userHasLiked.value = previousLiked
        stats.value.likes = previousLikes
    } finally {
        likeLoading.value = false
    }
}

async function submitComment() {
    if (!user.value || !novel.value || !trimmedComment.value || commentLoading.value) return

    commentLoading.value = true

    const tempId = `temp-${Date.now()}`
    const optimisticComment = {
        id: tempId,
        slug: novel.value.slug,
        user_id: user.value.id,
        body: trimmedComment.value,
        created_at: new Date().toISOString(),
        display_name:
            user.value.user_metadata?.display_name ||
            user.value.user_metadata?.name ||
            user.value.email?.split('@')[0] ||
            'You',
        avatar_url: resolveStorageAvatar(user.value.user_metadata?.avatar_url || ''),
    }

    const previousComments = [...comments.value]
    const previousCommentsCount = stats.value.comments
    const previousNewComment = newComment.value

    comments.value = [optimisticComment, ...comments.value]
    stats.value.comments += 1
    newComment.value = ''

    try {
        const { error } = await supabase
            .from('visual_novel_comments')
            .insert({
                slug: novel.value.slug,
                user_id: user.value.id,
                body: optimisticComment.body,
            })

        if (error) throw error

        await Promise.all([loadComments(), loadStats()])
    } catch (error) {
        console.error('Failed to submit comment:', error)
        comments.value = previousComments
        stats.value.comments = previousCommentsCount
        newComment.value = previousNewComment
    } finally {
        commentLoading.value = false
    }
}

async function deleteComment(comment) {
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
    const { error } = await supabase.rpc('soft_delete_visual_novel_comment', {
      p_comment_id: comment.id,
    })

    if (error) throw error

    await Promise.all([loadComments(), loadStats()])
  } catch (error) {
    console.error('Failed to delete comment:', error)
    comments.value = previousComments
    stats.value.comments = previousCommentsCount
  } finally {
    deletingCommentIds.value = {
      ...deletingCommentIds.value,
      [comment.id]: false,
    }
  }
}

onMounted(async () => {
    loading.value = true

    await loadUser()
    await loadNovel()

    if (novel.value) {
        await refreshEngagementState()
        await incrementView()
    }

    loading.value = false
})
</script>

<style scoped>
.vn-viewer-page {
    width: min(1200px, calc(100% - 32px));
    margin: 0 auto;
    padding: 32px 0 48px;
    color: var(--main-text, #f5f5f5);
}

.vn-header {
    margin-bottom: 20px;
}

.vn-title {
    margin: 0 0 8px;
    font-size: clamp(2rem, 4vw, 3rem);
    line-height: 1.1;
    font-weight: 900;
    color: var(--main-title-color);
    text-shadow: var(--main-title-shadow);
}

.vn-author {
    margin: 0 0 8px;
    font-size: 1rem;
    font-weight: 700;
    color: var(--main-text, #f5f5f5);
}

.vn-description {
    margin: 0 0 10px;
    font-size: 1rem;
    line-height: 1.5;
    color: var(--main-text-soft, rgba(255, 255, 255, 0.82));
    max-width: 900px;
}

.vn-player-section {
    margin-bottom: 36px;
}

.vn-player-shell {
    width: 100%;
    aspect-ratio: 16 / 9;
    background: #111;
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}

.vn-player {
    width: 100%;
    height: 100%;
    border: 0;
    display: block;
    background: #000;
}

.vn-engagement-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    margin-top: 14px;
    padding: 4px 2px 0;
}

.vn-stats {
    display: flex;
    gap: 18px;
    flex-wrap: wrap;
    opacity: 0.95;
    font-size: 0.95rem;
    color: var(--main-text-soft, rgba(255, 255, 255, 0.82));
}

.vn-stat {
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.vn-stat-icon {
    width: 16px;
    height: 16px;
    fill: currentColor;
    flex: 0 0 auto;
}

.vn-actions {
    display: flex;
    gap: 12px;
}

.vn-like-button,
.vn-fullscreen-button,
.vn-comment-submit,
.vn-comment-delete {
    border: none;
    border-radius: 12px;
    padding: 10px 16px;
    cursor: pointer;
    font: inherit;
    font-weight: 700;
}

.vn-fullscreen-button {
    background: #e5e7eb;
    color: #1f2937;
}

.vn-like-button {
    background: var(--accent-primary, #4f7cff);
    color: #fff;
}

.vn-like-button.is-liked {
    background: var(--accent-success, #2d9d62);
}

.vn-comment-submit {
    background: var(--accent-primary, #4f7cff);
    color: #fff;
}

.vn-comment-delete {
    padding: 8px 12px;
    background: #e5e7eb;
    color: #374151;
    font-size: 0.85rem;
}

.vn-like-button:disabled,
.vn-fullscreen-button:disabled,
.vn-comment-submit:disabled,
.vn-comment-delete:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.vn-comments-section {
    margin-top: 8px;
}

.vn-comments-title {
    margin: 0 0 14px;
    font-size: 1.4rem;
    font-weight: 900;
    color: var(--main-title-color);
    text-shadow: var(--main-title-shadow);
}

.vn-comment-form {
    margin: 16px 0 24px;
}

.vn-comment-input {
    width: 100%;
    resize: vertical;
    min-height: 120px;
    border-radius: 14px;
    padding: 12px 14px;
    font: inherit;
    border: 1px solid color-mix(in srgb, var(--table-border, #ccc) 75%, transparent);
    background: #fff;
    color: #1f2937;
    box-sizing: border-box;
}

.vn-comment-form-footer {
    margin-top: 10px;
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: center;
    color: var(--main-text-soft, rgba(255, 255, 255, 0.82));
}

.vn-comments-list {
    display: grid;
    gap: 12px;
}

.vn-comment-card {
    padding: 14px 16px;
    border-radius: 14px;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
}

.vn-comment-top {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
}

.vn-comment-user {
    display: flex;
    align-items: center;
    gap: 10px;
}

.vn-comment-avatar {
    width: 40px;
    height: 40px;
    border-radius: 999px;
    object-fit: cover;
    display: block;
    background: #d1d5db;
    flex: 0 0 auto;
}

.vn-comment-avatar--fallback {
    display: grid;
    place-items: center;
    font-weight: 800;
    color: #111827;
    background: #e5e7eb;
}

.vn-comment-user-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.vn-comment-name {
    font-size: 0.95rem;
    color: #111827;
}

.vn-comment-time {
    font-size: 0.82rem;
    color: #6b7280;
}

.vn-comment-body {
    margin: 0;
    line-height: 1.5;
    color: #1f2937;
    white-space: pre-wrap;
}

.vn-login-note,
.vn-no-comments,
.vn-state-text {
    color: var(--main-text-soft, rgba(255, 255, 255, 0.82));
}

.vn-not-found,
.vn-state {
    width: min(900px, calc(100% - 32px));
    margin: 0 auto;
    padding: 48px 0;
}

.vn-state-title {
    margin: 0 0 10px;
    color: var(--main-title-color);
    text-shadow: var(--main-title-shadow);
}

@media (max-width: 640px) {
    .vn-viewer-page {
        width: min(100%, calc(100% - 20px));
        padding: 24px 0 36px;
    }

    .vn-engagement-bar {
        align-items: flex-start;
    }

    .vn-stats {
        gap: 12px;
        font-size: 0.9rem;
    }

    .vn-comment-top {
        align-items: flex-start;
        flex-direction: column;
    }

    .vn-comment-avatar {
        width: 36px;
        height: 36px;
    }
}
</style>