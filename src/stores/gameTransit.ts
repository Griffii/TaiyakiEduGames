// src/stores/gameTransit.ts
import { defineStore } from 'pinia'

/** ===== Types kept for backward compatibility ===== */
export type Flashcard = {
  id: string
  english: string
  image_url: string
  japanese?:
    | { kanji?: string | null; furigana?: string | null }
    | null
}

/** Old games sometimes import these exact names */
export type Mode =
  | 'bomb'
  | 'sharknado'
  | 'headsup'
  | 'spellingblitz'
  | 'spellingguesser'
  | 'mushroom'
  | 'listening'
  | 'bingo'
  | 'memory'
  | 'missing'
  | 'shuffle'

/** Newer code sometimes aliases this; keep it equal to Mode */
export type GameKind = Mode
export type StartMode = 'easy' | 'hard'

/** Some code imported TransitCard before; keep it as an alias to Flashcard */
export type TransitCard = Flashcard

export interface GameTransitState {
  cards: Flashcard[]
  mode: Mode
  startedAt: number
  startMode?: StartMode
  deckName: string
  deckId?: string | null
  // Listening game prefs (non-breaking defaults)
  audioLocale?: string | null // e.g., 'en-US'
  ttsRate?: number | null     // 1.0 normal
}

/** Payload for set(); allow partial updates incl. deckName */
type SetPayload = Partial<GameTransitState> & { deckName?: string }

export const useGameTransitStore = defineStore('gameTransit', {
  state: (): GameTransitState => ({
    cards: [],
    mode: 'bomb',
    startedAt: 0,
    startMode: 'easy',
    deckName: '',
    deckId: null,         
    audioLocale: 'en-US', 
    ttsRate: 1.0,        
  }),
  actions: {
    /**
     * Back-compat exact shape: set({ cards, mode })
     * Newer flexible shape: set({ cards?, mode?, startMode?, deckName? })
     */
    set(payload: SetPayload | { cards: Flashcard[]; mode: Mode; startMode?: StartMode; deckName?: string }) {
      if (payload.cards) this.cards = payload.cards
      if (payload.mode) this.mode = payload.mode as Mode
      if (payload.startMode) this.startMode = payload.startMode as StartMode
      if (typeof (payload as any).deckName === 'string') this.deckName = (payload as any).deckName 
      if (typeof (payload as any).deckId === 'string') this.deckId = (payload as any).deckId 

      if (typeof (payload as any).audioLocale === 'string') this.audioLocale = (payload as any).audioLocale 
      if (typeof (payload as any).ttsRate === 'number') this.ttsRate = (payload as any).ttsRate 

      
      this.startedAt = Date.now()
    },
    /** convenience setter for audio/tts prefs without touching cards/mode */
    setAudioPrefs(prefs: { audioLocale?: string; ttsRate?: number }) {
      if (typeof prefs.audioLocale === 'string') this.audioLocale = prefs.audioLocale
      if (typeof prefs.ttsRate === 'number') this.ttsRate = prefs.ttsRate
    },

    /** one-liner to seed for listening game */
    seedForListening(params: {
      deckId?: string
      deckName?: string
      cards: Flashcard[]
      startMode?: StartMode
      audioLocale?: string
      ttsRate?: number
    }) {
      this.cards = params.cards ?? []
      if (params.startMode) this.startMode = params.startMode
      if (typeof params.deckName === 'string') this.deckName = params.deckName
      if (typeof params.deckId === 'string') this.deckId = params.deckId
      if (typeof params.audioLocale === 'string') this.audioLocale = params.audioLocale
      if (typeof params.ttsRate === 'number') this.ttsRate = params.ttsRate
      this.mode = 'listening'
      this.startedAt = Date.now()
    },


    clear() {
      this.cards = []
      this.startedAt = 0
      this.deckName = ''
      this.deckId = null
      
    },
  },
})
