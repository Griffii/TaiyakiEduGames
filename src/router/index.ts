// src/router/index.ts
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/stores/users'
import { pushLoading, popLoading } from '@/state/loading'
import { startFaviconSpinner, stopFaviconSpinner } from '@/utils/faviconSpinner'
import { useGameTransitStore } from '@/stores/gameTransit'

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: { name: 'dashboard' } }, // default to dashboard
  { path: '/dashboard', name: 'dashboard', component: () => import('@/views/Dashboard.vue') },
  { path: '/login', name: 'login', component: () => import('@/views/Login.vue') },
  { path: '/reset-password', name: 'reset-password', component: () => import('@/views/ResetPassword.vue'), },

  // Dev views
  { path: '/users', name: 'users', component: () => import('@/views/UsersList.vue'), meta: { authRequired: true, requiresDev: true } },

  // Admin Views
  { path: '/admin-panel', name: 'admin-panel', component: () => import('@/views/AdminPanel.vue'), meta: { authRequired: true } },
  { path: '/theme-editor', name: 'theme-editor', component: () => import('@/components/ThemeEditor.vue'), meta: { authRequired: true } },

  // First-run setup
  { path: '/auth/callback', name: 'auth-callback', component: () => import('@/views/AuthCallback.vue'), meta: { hideHeader: true } },
  { path: '/set-up', name: 'set-up', component: () => import('@/views/ProfileSetUp.vue'), meta: { requiresAuth: true } },

  // Textbook related views
  { path: '/textbooks', name: 'textbooks', component: () => import('@/views/flashcard-system/TextbookGridPage.vue') },
  { path: '/textbook/:id', name: 'textbook_details', component: () => import('@/views/flashcard-system/TextbookDetails.vue') },
  { path: '/deck/:id', name: 'deck', component: () => import('@/views/flashcard-system/DeckViewer.vue'), meta: { hideHeader: true } },
  { path: '/review/en/:id', name: 'FlashcardReview', component: () => import('@/views/flashcard-system/FlashcardReview.vue'), meta: { hideHeader: true } },
  { path: '/review/jp/:id', name: 'JapaneseFlashcardReview', component: () => import('@/views/flashcard-system/JapaneseFlashcardReview.vue'), meta: { hideHeader: true } },
  { path: '/bombgame/:id', name: 'bomb-game', component: () => import('@/views/flashcard-system/BombGame.vue'), meta: { hideHeader: true } },
  { path: '/sharknado/:id', name: 'sharknado', component: () => import('@/views/flashcard-system/Sharknado.vue'), meta: { hideHeader: true } },
  { path: '/headsup/:id', name: 'headsup', component: () => import('@/views/flashcard-system/HeadsUp.vue'), meta: { hideHeader: true } },
  {
    path: '/spellingblitz/:id',
    name: 'spellingblitz',
    component: () => import('@/views/flashcard-system/SpellingBlitz.vue'),
    meta: { hideHeader: true },
    props: route => {
      const t = useGameTransitStore()
      let cards = t.cards
      let startMode = (route.query.mode as 'easy' | 'hard') || t.startMode || 'easy'

      if (!cards?.length) {
        const raw = sessionStorage.getItem('eitake.spellingblitz.transit.v1')
        if (raw) {
          try {
            const parsed = JSON.parse(raw)
            cards = parsed.cards || []
            startMode = (route.query.mode as any) || parsed.startMode || 'easy'
          } catch { }
        }
      }

      return { cards, deckId: route.params.id as string, startMode }
    }
  },
  {
    path: '/spelling-guesser/:id',
    name: 'spellingguesser',
    component: () => import('@/views/flashcard-system/SpellingGuesser.vue'),
    props: route => ({
      deckId: route.params.id as string,
      deckName: (route.query.title as string) || undefined,
    }),
    meta: { hideHeader: true },
  },
  {
    path: '/sound-matcher/:deckId',
    name: 'sound-matcher',
    component: () => import('@/views/flashcard-system/SoundMatcher.vue'),
    meta: { hideHeader: true },
    props: true 
  },
  { path: '/bingo/:id', name: 'bingo', component: () => import('@/views/flashcard-system/Bingo.vue'), meta: { hideHeader: true } },

  // Custom Decks Views
  { path: '/custom-decks', name: 'custom-decks', component: () => import('@/views/flashcard-system/CustomDecks.vue'), meta: { authRequired: true } },


  // Activity related views
  { path: '/activities', name: 'activities', component: () => import('@/views/ActivitiesGrid.vue') },
  { path: '/activities/:slug', name: 'activity-runner', component: () => import('@/views/games/ActivityRunner.vue') },
  { path: '/roulette-wheel', name: 'roulette-wheel', component: () => import('@/views/tools/RouletteWheel.vue'), meta: { hideHeader: true } },
  { path: '/random-points', name: 'random-points', component: () => import('@/views/tools/RandomPoints.vue'), meta: { hideHeader: true } },
  { path: '/random-time', name: 'random-time', component: () => import('@/views/tools/RandomTime.vue'), meta: { hideHeader: true } },
  { path: '/hot-potato', name: 'hot-potato', component: () => import('@/views/tools/HotPotato.vue'), meta: { hideHeader: true } },
  { path: '/classroom-timer', name: 'classroom-timer', component: () => import('@/views/tools/ClassroomTimer.vue'), meta: { hideHeader: true } },

  // Other Games
  { path: '/wordle', name: 'wordle', component: () => import('@/views/games/Wordle.vue'), meta: { hideHeader: true } },
  { path: '/othello', name: 'othello', component: () => import('@/views/games/Othello.vue'), meta: { hideHeader: true } },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

/**
 * Debounce the global spinner so it only starts ONCE per navigation,
 * even if the guard redirects multiple times.
 */
let navInProgress = false

router.beforeEach(async (to) => {
  if (!navInProgress) {
    navInProgress = true
    pushLoading()
    startFaviconSpinner()
  }

  const store = useUserStore()

  //  Do NOT force sign-out on /login; just allow it.
  if (to.name === 'login') {
    // Optional: if already authed, bounce to where you want.
    // if (store.session && store.profile?.setup_complete) return { name: 'dashboard' }
    return true
  }

  if (!store.session) {
    await store.ensureIdentityLoaded()
  }

  // If a route explicitly requires auth, gate it
  if (to.meta.requiresAuth && !store.session) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // Load profile once you have a session
  if (store.session && !store.profile && !store.loadingProfile) {
    await store.loadProfile()
  }

  // Consider display_name OR name for setup completeness
  const hasName = !!(store.profile?.display_name || store.profile?.name)
  const needsSetup = !!store.profile && (store.profile.setup_complete === false || !hasName)

  // If authed but setup incomplete → send them to /set-up
  if (store.session && needsSetup && to.name !== 'set-up') {
    return { name: 'set-up' }
  }

  // If setup complete and they try to hit /set-up → dash
  if (store.session && !needsSetup && to.name === 'set-up') {
    return { name: 'dashboard' }
  }

  return true
})

router.afterEach(() => {
  // Stop loading logic (exactly once per nav)
  if (navInProgress) {
    navInProgress = false
    popLoading()
    stopFaviconSpinner()
  }
})

router.onError(() => {
  if (navInProgress) {
    navInProgress = false
    popLoading()
    stopFaviconSpinner()
  }
})

export default router
