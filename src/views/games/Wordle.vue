<template>
  <div class="wordle-container">
    <!-- Floating Back (top-left of the entire page) -->
    <button class="back-floating" type="button" aria-label="Back" title="Back" @click="goBack">
      <img :src="backIcon" alt="" />
    </button>

    <!-- Top Left: Theme Selector Button -->
    <button class="top-corner-btn left" @click="showThemeSelector = true">
      📚 Themes
    </button>

    <!-- Top Right: View Words Button -->
    <button
      class="top-corner-btn right"
      @click="openWordList"
      :disabled="selectedTheme === 'all'"
      title="Word list is hidden in All Words mode"
    >
      📖 View Words
    </button>

    <div class="wordle-header">
      <h1>Wordle</h1>
      <p class="theme-label">{{ currentThemeLabel }}</p>
    </div>

    <div class="game-board">
      <div
        v-for="(row, rowIndex) in guesses"
        :key="rowIndex"
        class="guess-row"
        :class="{ 'winning-row': won && rowIndex === currentRow }"
      >
        <div
          v-for="(letter, letterIndex) in row"
          :key="letterIndex"
          class="letter-box"
          :class="getLetterClass(rowIndex, letterIndex)"
        >
          {{ letter }}
        </div>
      </div>
    </div>

    <!-- Keyboard -->
    <div class="keyboard" :aria-hidden="gameOver">
      <div v-for="(row, index) in keyboardLayout" :key="index" class="keyboard-row">
        <button
          v-for="key in row"
          :key="key"
          class="key"
          :class="[
            getKeyClass(key),
            {
              'special-key': key === 'ENTER' || key === 'BACK',
              'enter-key': key === 'ENTER',
              'back-key': key === 'BACK'
            }
          ]"
          @click="handleKeyPress(key)"
          @mouseenter="playSfx('click')"
        >
          {{ key === 'BACK' ? '⌫' : key }}
        </button>
      </div>
    </div>

    <!-- Game Over Modal -->
    <div v-if="gameOver" class="modal-overlay" @click.self="resetGame">
      <div class="modal-content small">
        <div class="modal-header">
          <h2 v-if="won">🎉 You won!</h2>
          <h2 v-else>Game Over</h2>
          <button class="close-btn" @click="resetGame">×</button>
        </div>
        <p class="gameover-text">
          The word was: <strong>{{ targetWord }}</strong>
        </p>
        <div class="modal-actions">
          <button class="btn-primary" @click="resetGame">Play Again</button>
        </div>
      </div>
    </div>

    <!-- Theme Selector Modal -->
    <div v-if="showThemeSelector" class="modal-overlay" @click.self="showThemeSelector = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Select Theme</h2>
          <button class="close-btn" @click="showThemeSelector = false">×</button>
        </div>
        <div class="theme-grid">
          <button
            v-for="(words, theme) in wordLists"
            :key="theme"
            class="theme-card"
            :class="{ active: selectedTheme === theme }"
            @click="selectTheme(theme)"
          >
            <span class="theme-icon">{{ getThemeIcon(theme) }}</span>
            <span class="theme-name">{{ formatThemeName(theme) }}</span>
            <span class="word-count">{{ words.length }} words</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Word List Modal -->
    <div v-if="showWordList" class="modal-overlay" @click.self="showWordList = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>{{ currentThemeLabel }} Words</h2>
          <button class="close-btn" @click="showWordList = false">×</button>
        </div>
        <div class="word-grid">
          <div v-for="word in currentWordList" :key="word" class="word-item">
            {{ word }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// --- New: module URL imports for audio (robust with Vite) ---
import clickUrl from '@/assets/sounds/Type_Click.ogg'
import revealUrl from '@/assets/sounds/Wood_Block.ogg'
import wrongUrl from '@/assets/sounds/arcade_beep_01.mp3'
import wordCompleteUrl from '@/assets/sounds/fortunegame/chukichi.mp3'
import perfectUrl from '@/assets/sounds/fanfare.mp3'
import hintUrl from '@/assets/sounds/fortunegame/shokichi.mp3'
import backIcon from '@/assets/images/icons/back-icon.png'

export default {
  name: 'WordleGame',

  data() {
    return {
      backIcon,
      selectedTheme: 'all',
      targetWord: '',
      guesses: Array(6)
        .fill(null)
        .map(() => Array(5).fill('')),
      currentRow: 0,
      currentCol: 0,
      gameOver: false,
      won: false,
      letterStates: {},
      showThemeSelector: false,
      showWordList: false,
      keyboardLayout: [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['BACK', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'ENTER']
      ],

      // Expanded 5-letter word lists (duplicates avoided)
      wordLists: {
        verbs: [
          'THINK','WRITE','SPEAK','LEARN','TEACH','DANCE','STUDY','DRIVE','SLEEP','LAUGH',
          'SMILE','JUMPS','WALKS','SWIMS','BEGIN','CLOSE','SHARE','GUESS','BUILD','CARRY',
          'FIXES','MOVES','PLANT','POINT','TRAIN','PRESS','START','PAUSE','READS','PLAYS',
          'DRINK','SMOKE','CHECK'
        ],
        food: [
          'PIZZA','PASTA','BREAD','STEAK','SALAD','FRUIT','BACON','SUGAR','CREAM','JUICE',
          'CANDY','APPLE','GRAPE','LEMON','BERRY','MELON','ONION','GARLIC','HONEY','RAMEN',
          'SOUPY','BENTO','SUSHI','COCOA','CURRY','DONUT','MOCHI'
        ],
        animals: [
          'TIGER','HORSE','SNAKE','WHALE','SHARK','EAGLE','MOUSE','ZEBRA','PANDA','KOALA',
          'SLOTH','OTTER','RAVEN','GOOSE','SHEEP','LLAMA','DOGGO','WOLFS','RABIT','CRANE'
        ],
        halloween: [
          'WITCH','GHOST','CANDY','SKULL','SPOOK','MAGIC','TREAT','SCARY','GRAVE','BROOM',
          'HAUNT','CURSE','CREEP','MASKS','NIGHT','BLACK','BONED','CLOAK','FANGS','SPIDER'
        ],
        christmas: [
          'SANTA','GIFTS','BELLS','HOLLY','MERRY','FROST','CAROL','ANGEL','SNOWY','PEACE',
          'LIGHT','FEAST','CHEER','NORTH','ELVES','RUDOL','TREES','STARS','WRAPS','STOCK'
        ],
        sports: [
          'SCORE','MATCH','THROW','CATCH','SHOOT','SKATE','PITCH','RUGBY','BOXER','DRILL',
          'SERVE','BLOCK','GUARD','RALLY','SWING','DRIVE','JOGGS','CHASE','FIELD','COURT'
        ],
        places: [
          'BEACH','WOODS','CAVES','PEAKS','HILLS','RIVER','OCEAN','PLAZA','TOWER','TRAIL',
          'COAST','FIELD','TEMPO','BRIDGE','PORTS','TOKYO','SCHOOL','HOUSE','PARKS','STATION'
        ]
        // "all" will be injected in created()
      },

      // --- New: central SFX registry ---
      sfx: {}
    };
  },

  computed: {
    currentWordList() {
      return this.wordLists[this.selectedTheme];
    },
    currentThemeLabel() {
      return this.formatThemeName(this.selectedTheme);
    }
  },

  created() {
    this.buildAllWordList();
  },

  mounted() {
    this.initGame();
    this.initSfx();
    window.addEventListener('keydown', this.handlePhysicalKeyboard);
  },

  beforeUnmount() {
    window.removeEventListener('keydown', this.handlePhysicalKeyboard);
  },

  methods: {
    goBack() {
      this.$router.back();
    },

    // ---------- WORD LISTS ----------
    buildAllWordList() {
      const allWords = new Set();
      Object.entries(this.wordLists).forEach(([theme, words]) => {
        if (theme === 'all') return;
        words.forEach((w) => allWords.add(w));
      });
      // Sorted just to feel a bit “curated”
      this.wordLists.all = Array.from(allWords).sort();
    },

    openWordList() {
      if (this.selectedTheme === 'all') {
        // Classic Wordle mode: no list peeking
        alert('In "All" mode the word list is hidden — just like classic Wordle!');
        return;
      }
      this.showWordList = true;
    },

    // ---------- AUDIO ----------
    initSfx() {
      const make = (url, vol = 0.55) => {
        const a = new Audio(url);
        a.preload = 'auto';
        a.volume = vol;
        return a;
      };

      this.sfx = {
        click: make(clickUrl, 0.35),
        reveal: make(revealUrl, 0.55),
        wrong: make(wrongUrl, 0.5),
        wordComplete: make(wordCompleteUrl, 0.6),
        perfect: make(perfectUrl, 0.65),
        hint: make(hintUrl, 0.45)
      };
    },

    playSfx(name) {
      const a = this.sfx?.[name];
      if (!a) return;
      const node = a.cloneNode();
      node.volume = a.volume;
      node.play().catch(() => {});
    },

    // ---------- GAME ----------
    initGame() {
      const words = this.currentWordList;
      this.targetWord = words[Math.floor(Math.random() * words.length)];
    },

    selectTheme(theme) {
      this.selectedTheme = theme;
      this.showThemeSelector = false;
      this.showWordList = false;
      this.resetGame();
    },

    formatThemeName(theme) {
      if (theme === 'all') return 'All Words';
      return theme.charAt(0).toUpperCase() + theme.slice(1);
    },

    getThemeIcon(theme) {
      const icons = {
        verbs: '🏃',
        food: '🍕',
        animals: '🦁',
        halloween: '🎃',
        christmas: '🎄',
        sports: '⚽',
        places: '🗺️',
        all: '🌐'
      };
      return icons[theme] || '📝';
    },

    handlePhysicalKeyboard(event) {
      if (this.gameOver) return;
      const key = event.key.toUpperCase();
      if (key === 'ENTER') this.handleKeyPress('ENTER');
      else if (key === 'BACKSPACE') this.handleKeyPress('BACK');
      else if (/^[A-Z]$/.test(key)) this.handleKeyPress(key);
    },

    handleKeyPress(key) {
      if (this.gameOver) return;

      if (key === 'ENTER') {
        this.submitGuess();
      } else if (key === 'BACK') {
        this.deleteLetter();
        this.playSfx('wrong');
      } else if (this.currentCol < 5) {
        this.addLetter(key);
        this.playSfx('reveal');
      }
    },

    addLetter(letter) {
      if (this.currentCol < 5) {
        this.guesses[this.currentRow][this.currentCol] = letter;
        this.currentCol++;
      }
    },

    deleteLetter() {
      if (this.currentCol > 0) {
        this.currentCol--;
        this.guesses[this.currentRow][this.currentCol] = '';
      }
    },

    submitGuess() {
      if (this.currentCol !== 5) {
        this.playSfx('wrong');
        alert('Not enough letters');
        return;
      }

      const guess = this.guesses[this.currentRow].join('');

      // Uncomment if you want only words in the list to be accepted
      //if (!this.currentWordList.includes(guess)) {
      //  this.playSfx('wrong');
      //  alert('Word not in list');
      //  return;
      //}

      this.updateLetterStates(guess);

      if (guess === this.targetWord) {
        this.won = true;
        this.gameOver = true;
        this.playSfx('wordComplete');
        setTimeout(() => this.playSfx('perfect'), 120);
        return;
      }

      if (this.currentRow < 5) {
        this.currentRow++;
        this.currentCol = 0;
      } else {
        this.gameOver = true;
      }
    },

    updateLetterStates(guess) {
      const targetLetters = this.targetWord.split('');
      const guessLetters = guess.split('');

      // First mark correct
      guessLetters.forEach((letter, index) => {
        if (letter === targetLetters[index]) {
          if (!this.letterStates[letter] || this.letterStates[letter] !== 'correct') {
            this.letterStates[letter] = 'correct';
          }
        }
      });

      // Then mark present/absent
      guessLetters.forEach((letter, index) => {
        if (letter !== targetLetters[index]) {
          if (targetLetters.includes(letter)) {
            if (!this.letterStates[letter]) this.letterStates[letter] = 'present';
          } else {
            if (!this.letterStates[letter]) this.letterStates[letter] = 'absent';
          }
        }
      });
    },

    getLetterClass(rowIndex, letterIndex) {
      if (!this.guesses[rowIndex][letterIndex]) return '';
      if (rowIndex === this.currentRow && !this.gameOver) return 'filled';

      if (rowIndex < this.currentRow || this.gameOver) {
        const letter = this.guesses[rowIndex][letterIndex];
        const targetLetter = this.targetWord[letterIndex];
        if (letter === targetLetter) return 'correct';
        else if (this.targetWord.includes(letter)) return 'present';
        else return 'absent';
      }
      return 'filled';
    },

    getKeyClass(key) {
      if (key === 'ENTER' || key === 'BACK') return '';
      return this.letterStates[key] || '';
    },

    resetGame() {
      this.guesses = Array(6)
        .fill(null)
        .map(() => Array(5).fill(''));
      this.currentRow = 0;
      this.currentCol = 0;
      this.gameOver = false;
      this.won = false;
      this.letterStates = {};
      this.initGame();
    }
  }
};
</script>

<style scoped>
.wordle-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center; /* vertically center content */
  /* Ensure padding provides a consistent right-side margin & safe-area support */
  padding: 20px;
  padding-right: max(20px, env(safe-area-inset-right)); /* right margin / safe area */
  font-family: var(--main-title-font);
  max-width: 500px;
  width: 100%;
  margin: 0 auto;
  position: relative;
  min-height: 100vh;
  box-sizing: border-box;
  overflow-x: hidden;
}

/* Floating back icon (matches HotPotato) */
.back-floating {
  position: fixed;
  top: clamp(12px, 2vw, 20px);
  left: clamp(12px, 2vw, 20px);
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  z-index: 60;
  line-height: 0;
  transition: transform 0.12s ease;
}
.back-floating img {
  width: clamp(28px, 4.5vw, 40px);
  height: clamp(28px, 4.5vw, 40px);
  display: block;
}
@media (hover:hover) {
  .back-floating:hover {
    transform: scale(1.08);
  }
}

/* Apply box-sizing to children to keep math sane on tiny screens */
.wordle-container * {
  box-sizing: border-box;
}

/* Top Corner Buttons */
.top-corner-btn {
  position: absolute;
  top: clamp(12px, 3vw, 20px);
  padding: 10px 16px;
  background: var(--modal-surface);
  color: var(--modal-on-surface);
  border: 2px solid var(--modal-border);
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--elevation-1);
  transition: all 0.2s ease;
  z-index: 10;
}
.top-corner-btn:not(:disabled):hover {
  background: var(--table-row-hover);
  transform: translateY(-2px);
  box-shadow: var(--elevation-2);
}
.top-corner-btn.left {
  left: clamp(12px, 3vw, 20px);
}
.top-corner-btn.right {
  right: clamp(12px, 3vw, 20px);
}
.top-corner-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  transform: none;
}

/* Header */
.wordle-header {
  margin-bottom: 30px;
  text-align: center;
  margin-top: 20px;
}
.wordle-header h1 {
  font-size: var(--main-title-size);
  font-weight: bold;
  margin: 0;
  color: var(--main-title-color);
  text-shadow: var(--main-title-shadow);
}
.theme-label {
  font-size: var(--main-subtitle-size);
  color: var(--main-subtitle-color);
  text-shadow: var(--main-subtitle-shadow);
  margin-top: 8px;
  font-weight: 500;
}

/* Game Board */
.game-board {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 30px;
}
.guess-row {
  display: flex;
  gap: 5px;
  flex-wrap: nowrap;
}

/* Winning row bounce animation */
.winning-row {
  animation: bounce 0.6s ease-in-out;
}
@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  25% {
    transform: translateY(-15px);
  }
  50% {
    transform: translateY(-7px);
  }
  75% {
    transform: translateY(-10px);
  }
}

.letter-box {
  width: 60px;
  height: 60px;
  border: 2px solid var(--modal-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: bold;
  text-transform: uppercase;
  background-color: var(--modal-surface);
  color: var(--modal-on-surface);
  border-radius: var(--radius-sm);
  transition: all 0.3s ease;
  box-shadow: var(--elevation-1);
}
.letter-box.filled {
  border-color: var(--neutral-600);
  background-color: var(--modal-surface);
}
.letter-box.correct {
  background-color: var(--accent-success);
  border-color: var(--accent-success);
  color: var(--neutral-0);
}
.letter-box.present {
  background-color: var(--accent-warning);
  border-color: var(--accent-warning);
  color: var(--neutral-900);
}
.letter-box.absent {
  background-color: var(--neutral-700);
  border-color: var(--neutral-700);
  color: var(--neutral-0);
}

/* Keyboard */
.keyboard {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-self: stretch;
}
.keyboard-row {
  display: flex;
  justify-content: center;
  gap: 6px;
  flex-wrap: nowrap;
}

/* Keys default (desktop/tablet) */
.key {
  min-width: 43px;
  height: 58px;
  padding: 0 10px;
  background-color: var(--neutral-300);
  color: var(--neutral-900);
  border: 2px solid var(--modal-border);
  border-radius: var(--radius-sm);
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: var(--elevation-1);
  display: flex;
  align-items: center;
  justify-content: center;
}
.key:hover {
  background-color: var(--neutral-600);
  color: var(--neutral-0);
  transform: translateY(-1px);
}
.key.special-key {
  font-size: 0.85rem;
  padding: 0 15px;
  min-width: 65px;
  background-color: var(--btn-ghost-bg);
  color: var(--btn-ghost-on);
}
.key.enter-key {
  min-width: 80px;
  font-size: 0.9rem;
  font-weight: 700;
  background-color: var(--btn-primary-bg);
  color: var(--btn-primary-on);
  border-color: var(--btn-primary-border);
}
.key.enter-key:hover {
  background-color: var(--accent-primary);
  transform: translateY(-2px) scale(1.02);
}

/* BACK key = red (warning) */
.key.back-key {
  background: var(--accent-danger);
  color: var(--neutral-900);
  border-color: var(--accent-danger);
}
.key.back-key:hover {
  filter: brightness(0.95);
  transform: translateY(-2px);
}

/* Key states */
.key.correct {
  background-color: var(--accent-success);
  color: var(--neutral-0);
  border-color: var(--btn-success-border);
}
.key.present {
  background-color: var(--accent-warning);
  color: var(--neutral-900);
  border-color: var(--accent-warning);
}
.key.absent {
  background-color: var(--neutral-700);
  color: var(--neutral-0);
  border-color: var(--neutral-700);
}

/* Modal Overlay (shared) */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--modal-overlay-bg);
  backdrop-filter: var(--modal-overlay-filter);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background: var(--modal-surface);
  padding: 30px;
  border-radius: var(--modal-radius);
  max-width: 90vw;
  width: 800px;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
  box-shadow: var(--modal-shadow);
  border: 2px solid var(--modal-border);
}
.modal-content.small {
  width: 420px;
  max-width: 92vw;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid var(--modal-border);
}
.modal-header h2 {
  color: var(--modal-on-surface);
  font-size: 1.8rem;
  margin: 0;
}
.close-btn {
  background: var(--modal-close-bg);
  color: var(--modal-close-on);
  border: 2px solid var(--modal-close-border);
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  font-size: 1.5rem;
  cursor: pointer;
  font-weight: bold;
  line-height: 1;
  transition: all 0.2s ease;
}
.close-btn:hover {
  transform: scale(1.1);
}
.gameover-text {
  color: var(--modal-on-surface);
  text-align: center;
  font-size: 1.1rem;
}
.modal-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
}

/* Buttons */
.btn-primary {
  padding: 12px 24px;
  font-size: 1rem;
  background-color: var(--btn-primary-bg);
  color: var(--btn-primary-on);
  border: 2px solid var(--btn-primary-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
  box-shadow: var(--elevation-1);
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: var(--elevation-2);
}

/* Theme Grid / Word Grid */
.theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 15px;
}
@media (min-width: 1024px) {
  .theme-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
@media (min-width: 768px) and (max-width: 1023px) {
  .theme-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (min-width: 480px) and (max-width: 767px) {
  .theme-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 479px) {
  .theme-grid {
    grid-template-columns: 1fr;
  }
}
.theme-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 15px;
  background: var(--table-surface);
  border: 2px solid var(--table-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: var(--elevation-1);
}
.theme-card:hover {
  background: var(--table-row-hover);
  transform: translateY(-3px);
  box-shadow: var(--elevation-2);
}
.theme-card.active {
  background: var(--activities-chip-bg);
  border-color: var(--activities-accent);
  border-width: 3px;
}
.theme-icon {
  font-size: 2rem;
}
.theme-name {
  font-weight: 600;
  color: var(--table-on-surface);
  font-size: 1rem;
}
.word-count {
  font-size: 0.85rem;
  color: var(--table-muted);
}

.word-grid {
  display: grid;
  gap: 10px;
}
@media (min-width: 1024px) {
  .word-grid {
    grid-template-columns: repeat(5, 1fr);
  }
}
@media (min-width: 768px) and (max-width: 1023px) {
  .word-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
@media (min-width: 480px) and (max-width: 767px) {
  .word-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (max-width: 479px) {
  .word-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
.word-item {
  padding: 12px;
  background: var(--textbook-chip-bg);
  color: var(--textbook-chip-on);
  border-radius: var(--radius-sm);
  text-align: center;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.95rem;
  border: 2px solid var(--textbook-border);
  transition: all 0.2s ease;
}
.word-item:hover {
  transform: scale(1.05);
  background: var(--textbook-accent);
  color: var(--neutral-0);
}

/* ---------- Mobile / small-screen containment tweaks ---------- */
@media (max-width: 600px) {
  .wordle-container {
    padding-left: max(14px, env(safe-area-inset-left));
    padding-right: max(16px, env(safe-area-inset-right));
  }

  .top-corner-btn {
    font-size: 12px;
    padding: 8px 12px;
  }
  .letter-box {
    width: 50px;
    height: 50px;
    font-size: 1.5rem;
  }

  .keyboard {
    gap: 6px;
  }
  .keyboard-row {
    justify-content: stretch;
    gap: 4px;
    flex-wrap: nowrap;
  }
  .key {
    height: 50px;
    font-size: 0.9rem;
    padding: 0 6px;
    min-width: 0;
    flex: 1 1 0;
  }
  .key.special-key {
    flex: 1.2 1 0;
  }
  .key.enter-key {
    flex: 1.4 1 0;
    min-width: 0;
  }
  .key.back-key {
    flex: 1.2 1 0;
    min-width: 0;
  }

  .modal-content {
    padding: 20px;
    width: 95vw;
  }
  .modal-header h2 {
    font-size: 1.4rem;
  }
}

/* Ultra-narrow device fallback */
@media (max-width: 360px) {
  .letter-box {
    width: 46px;
    height: 46px;
    font-size: 1.35rem;
  }
  .key {
    height: 46px;
    font-size: 0.85rem;
  }
}
</style>
