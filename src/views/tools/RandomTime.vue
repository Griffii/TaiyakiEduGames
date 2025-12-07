<!-- src/views/games/RandomTime.vue -->
<template>
  <section class="rt-wrap">
    <!-- Top bar -->
    <header
      class="topbar"
      :class="{
        'is-quiz': stage==='quiz',
        'is-practice': stage==='practice'
      }"
    >
      <!-- LEFT -->
      <div class="topbar-side left">
        <!-- Back (uses HOME icon per request) -->
        <button class="icon-btn back-btn" title="Back" @click="goBack" aria-label="Back">
          <img :src="homeIcon" alt="Back" class="back-icon" />
        </button>

        <!-- Title (hide on small screens to preserve space) -->
        <h2 v-if="!isMobile" class="title">Random Time</h2>
      </div>

      <!-- CENTER (quiz only) -->
      <div v-if="stage==='quiz'" class="topbar-center">
        <div class="quiz-chips">
          <span class="chip info">Q {{ quizIndex+1 }} / {{ quizCount }}</span>
          <span class="chip warn">{{ difficulty==='hard' ? 'Hard' : 'Easy' }}</span>
          <span class="chip timer">⏱ {{ elapsed.toFixed(1) }}s</span>
        </div>
      </div>

      <!-- RIGHT -->
      <div class="topbar-side right" ref="rightSideEl">
        <!-- PRACTICE: Back + Settings; Back & Settings are far-right -->
        <template v-if="stage==='practice'">
          <!-- Keep both visible on all sizes; order ensures Back & Settings at far right -->
          <button class="icon-btn home-btn" title="Home" @click="backToChoose" aria-label="Home">
            <!-- Home button shows BACK icon per request -->
            <img :src="backIcon" alt="Home" class="home-icon" />
          </button>
          <button
            class="icon-btn settings-trigger"
            title="Settings"
            @click="settingsOpen = true"
            aria-label="Settings"
          >
            <img :src="settingsIcon" alt="Settings" class="settings-icon" />
          </button>
        </template>

        <!-- QUIZ -->
        <template v-else-if="stage==='quiz'">
          <!-- Large screens: inline controls (Home is right-most, shows BACK icon) -->
          <template v-if="!isMobile">
            <button class="btn subtle" @click="giveUp">Skip</button>
            <button class="btn danger" @click="endQuizEarly">End</button>
            <button class="icon-btn home-btn" title="Home" @click="backToChoose" aria-label="Home">
              <img :src="backIcon" alt="Home" class="home-icon" />
            </button>
          </template>

          <!-- Small screens: single SETTINGS icon that opens popup (Skip/End/Home) -->
          <template v-else>
            <button
              class="icon-btn menu-btn"
              :aria-expanded="menuOpen ? 'true' : 'false'"
              aria-haspopup="menu"
              title="Menu"
              @click.stop="toggleMenu"
            >
              <img :src="settingsIcon" alt="Menu" class="settings-icon" />
            </button>

            <div
              v-if="menuOpen"
              class="menu-dropdown"
              role="menu"
              @click.stop
            >
              <button role="menuitem" class="menu-item" @click="giveUp(); closeMenu()">Skip</button>
              <button role="menuitem" class="menu-item danger" @click="endQuizEarly(); closeMenu()">End</button>
              <button role="menuitem" class="menu-item" @click="backToChoose(); closeMenu()">Home</button>
            </div>
          </template>
        </template>
      </div>
    </header>

    <!-- Choose -->
    <div v-if="stage==='choose'" class="centered">
      <div class="chooser card">
        <form class="choose-grid">
          <fieldset>
            <legend>Mode</legend>
            <div class="btn-group">
              <button type="button" class="pick" :class="{active: mode==='practice'}" @click="mode='practice'">Practice</button>
              <button type="button" class="pick" :class="{active: mode==='quiz'}" @click="mode='quiz'">Quiz</button>
            </div>
          </fieldset>

          <fieldset>
            <legend>Accuracy</legend>
            <div class="btn-group wrap">
              <button
                v-for="opt in granularityOptions" :key="opt.value" type="button"
                class="pick" :class="{active: granularity===opt.value}"
                @click="setGranularity(opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
          </fieldset>

          <!-- 24h toggle ONLY in practice -->
          <fieldset v-if="mode==='practice'">
            <legend>Clock Format</legend>
            <div class="btn-group">
              <button type="button" class="pick" :class="{active: !use24h}" @click="use24h=false">12-hour</button>
              <button type="button" class="pick" :class="{active: use24h}" @click="use24h=true">24-hour</button>
            </div>
          </fieldset>

          <fieldset v-if="mode==='practice'">
            <legend>Practice Display</legend>
            <label class="row between">
              <span>Show digital clock</span>
              <input type="checkbox" v-model="showDigital" />
            </label>
            <label class="row between">
              <span>Show written English</span>
              <input type="checkbox" v-model="showWords" />
            </label>
          </fieldset>

          <fieldset v-if="mode==='quiz'">
            <legend>Quiz</legend>
            <div class="row between">
              <label>Questions</label>
              <input class="num big" type="number" min="1" max="10" v-model.number="quizCount" />
            </div>
            <div class="btn-group">
              <button type="button" class="pick" :class="{active: difficulty==='easy'}" @click="difficulty='easy'">Easy (Digital)</button>
              <button type="button" class="pick" :class="{active: difficulty==='hard'}" @click="difficulty='hard'">Hard (Analog)</button>
            </div>
          </fieldset>
        </form>

        <!-- Start button area -->
        <div class="actions actions-start">
          <button class="btn success huge" @click="start">Start</button>
        </div>
      </div>
    </div>

    <!-- Practice -->
    <div v-else-if="stage==='practice'" class="centered">
      <div class="play two-col">
        <div class="left column-center">
          <AnalogClock
            :hour="hour"
            :minute="minute"
            :interactive="false"
            :with-sliders="false"
            :spinOnClick="true"
            :step="stepSize"
            @spin-finished="onPracticeSpinFinished"
          />
          <div class="hint">Click the clock to get a new random time.</div>
        </div>

        <div class="right">
          <!-- bigger digital; AM/PM always in 12h mode, even at :00 -->
          <div v-if="showDigital" class="panel pad-lg">
            <div class="digital-clock bigger">
              <div class="digits">
                <span class="d">{{ displayHourPractice[0] }}</span>
                <span class="d">{{ displayHourPractice[1] }}</span>
                <span class="colon">:</span>
                <span class="d">{{ displayMinutePractice[0] }}</span>
                <span class="d">{{ displayMinutePractice[1] }}</span>
              </div>
              <div v-if="showAmPmPractice" class="ampm-block" aria-label="AM or PM">
                <div class="ampm-emoji" aria-hidden="true">{{ isPM(hour) ? '🌙' : '☀️' }}</div>
                <div class="ampm">{{ isPM(hour) ? 'PM' : 'AM' }}</div>
              </div>
            </div>
          </div>

          <!-- spacing between digital and words -->
          <div v-if="showDigital && showWords" class="spacer-tall"></div>

          <div v-if="showWords" class="panel pad-lg">
            <div class="words bigger-words">{{ timeToWordsPractice(hour, minute) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quiz -->
    <div v-else-if="stage==='quiz'" class="centered">
      <div class="play two-col">
        <!-- LEFT -->
        <div class="left column-center">
          <!-- Hard: analog adjustable -->
          <AnalogClock
            ref="analogRef"
            v-if="difficulty==='hard'"
            :hour="guessHour"
            :minute="guessMinute"
            :interactive="true"
            :with-sliders="true"
            :spinOnClick="false"
            :step="stepSize"
            @update-time="onDragAdjust"
          />

          <!-- Easy: adjustable digital only -->
          <div v-else class="panel lifted">
            <div class="digital-setup">
              <div class="digit-grid" role="group" aria-label="Set time">
                <!-- ↑ -->
                <button class="arrow up col-1" @click="bumpDigit(0, +1)" aria-label="Increase tens of hour">▲</button>
                <button class="arrow up col-2" @click="bumpDigit(1, +1)" aria-label="Increase ones of hour">▲</button>
                <div class="colon-spacer col-3" aria-hidden="true"></div>
                <button class="arrow up col-4" @click="bumpDigit(2, +1)" aria-label="Increase tens of minute">▲</button>
                <button class="arrow up col-5" @click="bumpDigit(3, +1)" aria-label="Increase ones of minute">▲</button>

                <!-- digits -->
                <span class="digit col-1">{{ displayHourQuiz[0] }}</span>
                <span class="digit col-2">{{ displayHourQuiz[1] }}</span>
                <span class="colon col-3">:</span>
                <span class="digit col-4">{{ displayMinuteQuiz[0] }}</span>
                <span class="digit col-5">{{ displayMinuteQuiz[1] }}</span>

                <!-- ↓ -->
                <button class="arrow down col-1" @click="bumpDigit(0, -1)" aria-label="Decrease tens of hour">▼</button>
                <button class="arrow down col-2" @click="bumpDigit(1, -1)" aria-label="Decrease ones of hour">▼</button>
                <div class="colon-spacer col-3" aria-hidden="true"></div>
                <button class="arrow down col-4" @click="bumpDigit(2, -1)" aria-label="Decrease tens of minute">▼</button>
                <button class="arrow down col-5" @click="bumpDigit(3, -1)" aria-label="Decrease ones of minute">▼</button>
              </div>
            </div>
          </div>

          <!-- Big Check -->
          <button class="btn primary huge check-btn" @click="onCheckAnswer">Check</button>
        </div>

        <!-- RIGHT -->
        <div class="right">
          <div class="panel callout">
            <h3>Set the clock to:</h3>
            <div class="callout-time big-words">{{ timeToWordsQuiz(targetHour, targetMinute) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Summary -->
    <div v-else-if="stage==='summary'" class="centered">
      <div class="panel glass summary-card">
        <div class="total-xp-wrap">
          <div class="total-xp-label">Total XP</div>
          <div class="total-xp-count">{{ totalXp }}</div>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>#</th><th>Target</th><th>Your Answer</th><th>Time (s)</th><th>XP</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r,i) in results" :key="i">
              <td>{{ i+1 }}</td>
              <td>{{ r.targetWords }}</td>
              <td>{{ r.answerWords }}</td>
              <td>{{ r.time.toFixed(1) }}</td>
              <td>{{ r.xp }}</td>
            </tr>
          </tbody>
        </table>
        <div class="actions">
          <button class="btn primary huge" @click="backToChoose">Done</button>
        </div>
      </div>
    </div>

    <!-- Correct popup -->
    <transition name="pop">
      <div v-if="showCorrectPopup" class="correct-popup">✓ Correct!</div>
    </transition>

    <!-- Settings Modal (practice only) -->
    <div v-if="settingsOpen && stage==='practice'" class="modal" @click.self="settingsOpen=false">
      <div class="modal-card">
        <header class="modal-head">
          <h3>Settings</h3>
          <button class="icon-btn modal-close" @click="settingsOpen=false" aria-label="Close">✕</button>
        </header>

        <div class="modal-body">
          <fieldset>
            <legend>Accuracy</legend>
            <div class="btn-group wrap">
              <button
                v-for="opt in granularityOptions" :key="opt.value" type="button"
                class="pick" :class="{active: granularity===opt.value}"
                @click="setGranularity(opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
          </fieldset>

          <fieldset>
            <legend>Clock Format</legend>
            <div class="btn-group">
              <button type="button" class="pick" :class="{active: !use24h}" @click="use24h=false">12-hour</button>
              <button type="button" class="pick" :class="{active: use24h}" @click="use24h=true">24-hour</button>
            </div>
          </fieldset>

          <fieldset>
            <legend>Practice Display</legend>
            <label class="row between">
              <span>Show digital clock</span>
              <input type="checkbox" v-model="showDigital" />
            </label>
            <label class="row between">
              <span>Show written English</span>
              <input type="checkbox" v-model="showWords" />
            </label>
          </fieldset>
        </div>

        <footer class="modal-foot">
          <button class="btn" @click="goHome">Home</button>
          <div class="spacer"></div>
          <button class="btn primary" @click="settingsOpen=false">Done</button>
        </footer>
      </div>
    </div>
  </section>

  <!-- UserLevels overlay -->
  <UserLevels ref="ulRef" :overlay="true" />
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import AnalogClock from '../../components/AnalogClock.vue'
const analogRef = ref<InstanceType<typeof AnalogClock> | null>(null)

import UserLevels from '@/components/UserLevels.vue'
const ulRef = ref<InstanceType<typeof UserLevels> | null>(null)

import settingsIcon from '@/assets/images/icons/settings-icon.png'
import backIcon from '@/assets/images/icons/back-icon.png'
import homeIcon from '@/assets/images/icons/home-icon.png'

/* SFX */
import correctUrl from '@/assets/sounds/fanfare.mp3'
import wrongUrl from '@/assets/sounds/arcade_beep_01.mp3'
import celebrateUrl from '@/assets/sounds/anime-wow-sound-effect.mp3'
import tickUrl from '@/assets/sounds/Type_Click.ogg'

const sfxCorrect = new Audio(correctUrl)
sfxCorrect.volume = 0.42
const sfxWrong   = new Audio(wrongUrl)
const sfxCelebrate = new Audio(celebrateUrl)
sfxCelebrate.volume = 0.38
const sfxTick = new Audio(tickUrl)
function playTick(){ try { sfxTick.currentTime=0; sfxTick.play() } catch {} }

const router = useRouter()

/* Utils */
const clamp = (v:number, min:number, max:number) => Math.min(max, Math.max(min, v))
const mod = (n:number, m:number) => ((n % m) + m) % m
const round = (n:number) => Math.round(n)
const gcd = (a:number,b:number):number => (b ? gcd(b, a%b) : Math.abs(a))
const lcm = (a:number,b:number):number => Math.abs(a*b)/gcd(a,b)

/* Time helpers */
const isPM = (h:number)=> h>=12
const to12 = (h:number)=> { const v = h % 12; return v === 0 ? 12 : v }
const hStr12 = (h:number)=> to12(h).toString().padStart(2,'0')
const hStr24 = (h:number)=> (h%24).toString().padStart(2,'0')
const mStr = (m:number)=> m.toString().padStart(2,'0')

/* Words */
function numberToWords(n:number): string {
  const ones = ['zero','one','two','three','four','five','six','seven','eight','nine']
  const teens = ['ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen']
  const tens = ['','','twenty','thirty','forty','fifty']
  if (n < 10) return ones[n]
  if (n < 20) return teens[n-10]
  const t = Math.floor(n/10), o = n%10
  return o ? `${tens[t]}-${ones[o]}` : tens[t]
}
const capFirst = (s:string)=> s.charAt(0).toUpperCase() + s.slice(1)

/* Practice wording */
function timeToWordsPractice(h:number, m:number){
  if (m === 0) return `${capFirst(numberToWords(to12(h)))} o'clock`
  const ampm = use24h.value ? '' : (isPM(h) ? ' p.m.' : ' a.m.')
  const hWord = capFirst(numberToWords(to12(h)))
  const mWord = m < 10 ? `o' ${numberToWords(m)}` : numberToWords(m)
  return `${hWord} ${mWord}${ampm}`
}

/* Quiz wording */
function timeToWordsQuiz(h:number, m:number){
  if (m === 0) return `${capFirst(numberToWords(to12(h)))} o'clock`
  const hWord = capFirst(numberToWords(to12(h)))
  const mWord = m < 10 ? `o' ${numberToWords(m)}` : numberToWords(m)
  return `${hWord} ${mWord}`
}

/* State */
type Gran = '1' | '5' | '10' | '30' | '60'

const settingsOpen = ref(false)
const stage = ref<'choose'|'practice'|'quiz'|'summary'>('choose')
const mode = ref<'practice'|'quiz'>('practice')
const granularity = ref<Gran>('5')
const use24h = ref(false)

const showDigital = ref(true)
const showWords = ref(true)

const quizCount = ref(5)
const difficulty = ref<'easy'|'hard'>('hard')

const granularityOptions = [
  { value: '1',  label: '1 min' },
  { value: '5',  label: '5 mins' },
  { value: '10', label: '10 mins' },
  { value: '30', label: '30 mins' },
  { value: '60', label: 'Hour' },
] as const satisfies ReadonlyArray<{ value: Gran; label: string }>

function setGranularity(v: Gran) { granularity.value = v }

/* practice time */
const hour = ref(3)
const minute = ref(0)

/* quiz target & guess */
const targetHour = ref(0)
const targetMinute = ref(0)
const guessHour = ref(0)
const guessMinute = ref(0)
const quizIndex = ref(0)
const results = reactive<Array<{targetWords:string, answerWords:string, time:number, xp:number}>>([])

const stepSize = computed(()=> Number(granularity.value))

/* Correctness */
const hoursEqual = computed(() => to12(targetHour.value) === to12(guessHour.value))
const isCorrect = computed(() => hoursEqual.value && targetMinute.value === guessMinute.value)

/* Display strings */
const displayHourPractice = computed(()=> (use24h.value ? hStr24(hour.value) : hStr12(hour.value)))
const displayMinutePractice = computed(()=> mStr(minute.value))
const showAmPmPractice = computed(()=> !use24h.value)
const displayHourQuiz = computed(()=> hStr12(guessHour.value))
const displayMinuteQuiz = computed(()=> mStr(guessMinute.value))

/* Timer / XP */
const baseXp = 10
const elapsed = ref(0)
let rafId:number|undefined
let prevTs = 0
const paused = ref(false)
const difficultyBonus = computed(()=> difficulty.value==='hard' ? 2 : 1)
function speedMultiplier(t:number){ if (t<=5) return 5; if (t<=10) return 3; if (t<=20) return 2; return 1 }

/* Total XP */
const totalXp = computed(()=> results.reduce((a,b)=> a + b.xp, 0))

/* Correct popup */
const showCorrectPopup = ref(false)

/* Pause rules */
function setPaused(v:boolean){ paused.value = v }
watch(settingsOpen, v => setPaused(v && stage.value==='quiz'))
function onVisibilityChange(){ if (stage.value==='quiz') setPaused(document.hidden) }
function onBlur(){ if(stage.value==='quiz') setPaused(true) }
function onFocus(){ if(stage.value==='quiz') setPaused(false) }

/* Responsive: window width */
const windowWidth = ref<number>(typeof window !== 'undefined' ? window.innerWidth : 1200)
const isMobile = computed(()=> windowWidth.value < 768)
function onResize(){ windowWidth.value = window.innerWidth }

/* Quiz menu state */
const menuOpen = ref(false)
const rightSideEl = ref<HTMLElement|null>(null)
function toggleMenu(){ menuOpen.value = !menuOpen.value }
function closeMenu(){ menuOpen.value = false }
function onGlobalClick(e: MouseEvent){
  if (!menuOpen.value) return
  const target = e.target as Node
  if (rightSideEl.value && !rightSideEl.value.contains(target)) menuOpen.value = false
}

/* Lifecycle */
onMounted(()=>{
  randomizePracticeNow()
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('blur', onBlur)
  window.addEventListener('focus', onFocus)
  window.addEventListener('resize', onResize, { passive: true })
  document.addEventListener('click', onGlobalClick, { passive: true })
})
onUnmounted(()=>{
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('blur', onBlur)
  window.removeEventListener('focus', onFocus)
  window.removeEventListener('resize', onResize)
  document.removeEventListener('click', onGlobalClick)
  cancelTimer()
})

/* Entering quiz: close settings + force 12h */
watch(stage, (s)=>{ if (s==='quiz') settingsOpen.value = false })
watch(mode,  (m)=>{ if (m==='quiz') use24h.value = false })

/* Nav */
function goHome(){ settingsOpen.value=false; backToChoose() }
function goBack(){ router.back() }

/* Flow */
function start(){
  if(mode.value==='practice'){
    stage.value='practice'
    randomizePracticeNow()
  }else{
    use24h.value = false
    stage.value='quiz'
    quizIndex.value = 0
    results.splice(0)
    newQuestion()
  }
}
function backToChoose(){ cancelTimer(); stage.value='choose' }

/* Practice */
function onPracticeSpinFinished(hh:number, mm:number){ hour.value=hh; minute.value=mm }
function randomizePracticeNow(){ const {h,m}=randomTime(); hour.value=h; minute.value=m }

/* Quiz */
async function newQuestion(){
  const t = randomTime()
  targetHour.value = t.h
  targetMinute.value = t.m

  // Reset user-set time for EASY mode to 00:00 after each question
  if (difficulty.value === 'easy') {
    guessHour.value = 0
    guessMinute.value = 0
  }

  if (difficulty.value === 'hard') {
    if (!analogRef.value) await nextTick()
    analogRef.value?.spinToRandom()
  }

  elapsed.value = 0
  prevTs = performance.now()
  cancelTimer()
  rafId = requestAnimationFrame(tick)
}
function tick(ts:number){
  if (!paused.value) elapsed.value += (ts - prevTs)/1000
  prevTs = ts
  if (!isCorrect.value || paused.value) rafId = requestAnimationFrame(tick)
}
function cancelTimer(){ if(rafId!==undefined){ cancelAnimationFrame(rafId); rafId=undefined } }

function onDragAdjust(hh:number, mm:number){ guessHour.value=hh; guessMinute.value=mm }

function bumpDigit(place:number, dir:number){
  if (place===0) addMinutesToGuess(dir * 600)
  else if (place===1) addMinutesToGuess(dir * 60)
  else if (place===2) { const delta = lcm(10, stepSize.value); addMinutesToGuess(dir * delta) }
  else if (place===3) addMinutesToGuess(dir * stepSize.value)
}
function addMinutesToGuess(delta:number){
  const before = guessHour.value*60 + guessMinute.value
  const total = mod(before + delta, 1440)
  guessHour.value = Math.floor(total/60)
  guessMinute.value = total%60
  const step = stepSize.value
  if (step>1) guessMinute.value = (Math.round(guessMinute.value/step)*step) % 60
  const after = guessHour.value*60 + guessMinute.value
  if (after !== before) playTick()
}

/* Check / Skip / End */
function onCheckAnswer(){
  const correct = isCorrect.value
  const xp = correct ? round(baseXp * speedMultiplier(elapsed.value) * difficultyBonus.value) : 0
  results.push({
    targetWords: timeToWordsQuiz(targetHour.value, targetMinute.value),
    answerWords: timeToWordsQuiz(guessHour.value, guessMinute.value),
    time: elapsed.value,
    xp
  })
  if (correct){
    playCorrect()
    showCorrectPopup.value = true
    setPaused(true)
    setTimeout(()=>{
      showCorrectPopup.value = false
      setPaused(false)
      if(quizIndex.value < quizCount.value-1){ quizIndex.value++; newQuestion() } else { finishQuiz() }
    }, 800)
  } else {
    playWrong()
  }
}
function giveUp(){
  results.push({
    targetWords: timeToWordsQuiz(targetHour.value, targetMinute.value),
    answerWords: timeToWordsQuiz(guessHour.value, guessMinute.value),
    time: elapsed.value,
    xp: 0
  })
  if(quizIndex.value < quizCount.value-1){ quizIndex.value++; newQuestion() } else finishQuiz()
}
function endQuizEarly(){ finishQuiz() }

function finishQuiz(){
  cancelTimer()
  stage.value='summary'
  const gained = totalXp.value
  nextTick(() => {
    ulRef.value?.open?.()
    ulRef.value?.addReadingXp?.(gained)
  })
}

/* Random time using granularity */
function randomTime(){
  const step = Number(granularity.value)
  const h = Math.floor(Math.random()*24)
  const stepsPerHour = 60/step
  const mStep = Math.floor(Math.random()*stepsPerHour)
  const m = (mStep*step)%60
  return {h, m}
}

/* SFX (safe play) */
function playCorrect(){ try { sfxCorrect.currentTime=0; sfxCorrect.play() } catch {} }
function playWrong(){   try { sfxWrong.currentTime=0;   sfxWrong.play() } catch {} }
function playCelebrate(){ try { sfxCelebrate.currentTime=0; sfxCelebrate.play() } catch {} }
</script>

<style scoped>
/* Layout */
.rt-wrap{ min-height:100vh; display:flex; flex-direction:column; }

/* ---------- TOP BAR (uses header tokens) ---------- */
.topbar{
  display:grid;
  grid-template-columns: max-content 1fr max-content; /* left | center | right */
  align-items:center;
  gap: clamp(8px, 2vw, 16px);
  padding: clamp(10px, 1.6vw, 16px) clamp(12px, 2vw, 20px);
  background: var(--header-surface);
  color: var(--header-on-surface);
  border-bottom: var(--header-border-width) solid var(--header-border-color);
  box-shadow: var(--header-shadow);
}
.topbar-side.left,
.topbar-side.right{
  display:inline-flex; align-items:center; gap: clamp(6px, 1.5vw, 12px); min-width:0;
}
.topbar-side.left{ justify-self:start; }
.topbar-side.right{ justify-self:end; position:relative; justify-content:flex-end; }
.topbar-center{ display:flex; justify-content:center; align-items:center; min-width:0; }
.title{
  margin:0; 
  color: var(--header-on-surface); 
  font-weight:800; letter-spacing:.2px;
  font-size: clamp(16px, 2.2vw, 22px);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* Chips (quiz info) — semantic accents */
.quiz-chips{ display:inline-flex; align-items:center; gap: clamp(6px, 1.2vw, 10px); max-width:100%; }
.chip{
  padding: clamp(4px, 0.9vw, 6px) clamp(8px, 1.6vw, 10px);
  border-radius:999px; font-weight:700; border:1px solid var(--table-border);
  white-space: nowrap; font-size: clamp(12px, 1.6vw, 14px);
  color: var(--header-on-surface);
  background: var(--table-surface);
}
.chip.info{  background: color-mix(in srgb, var(--accent-success) 20%, var(--table-surface)); }
.chip.warn{  background: color-mix(in srgb, var(--accent-warning) 26%, var(--table-surface)); }
.chip.timer{ background: color-mix(in srgb, var(--accent-primary) 18%, var(--table-surface)); }

/* Icons (use ghost-like button tokens) */
.icon-btn{
  background: var(--btn-ghost-bg); border:2px solid var(--btn-ghost-border);
  border-radius: clamp(10px, 1.2vw, 12px); padding: clamp(6px, .9vw, 8px);
  cursor:pointer; box-shadow: var(--elevation-1);
  transition: transform .06s ease, box-shadow .12s ease;
  white-space: nowrap; color: var(--btn-ghost-on);
}
.icon-btn:hover{ transform: translateY(-1px); box-shadow: var(--elevation-2); }
.settings-icon, .home-icon, .back-icon{ width: clamp(18px, 2.2vw, 22px); height: clamp(18px, 2.2vw, 22px); display:block; }
.back-btn{ margin-right:6px; }
.menu-btn{ 
  width: clamp(32px, 3vw, 38px); 
  height: clamp(32px, 3vw, 38px); 
  display:grid; 
  place-items:center; 
}

/* Popup menu (small screens in quiz) — modal tokens for pop */
.menu-dropdown{
  position:absolute; right:0; top: calc(100% + 8px);
  background: var(--modal-surface);
  border: 1px solid var(--modal-border);
  border-radius: var(--modal-radius);
  box-shadow: var(--modal-shadow);
  padding: 8px;
  min-width: clamp(160px, 40vw, 240px);
  z-index: 50;
  color: var(--modal-on-surface);
}
.menu-item{
  display:block; width:100%; text-align:left;
  background:transparent; border:1px solid transparent;
  padding: clamp(8px, 1.4vw, 12px);
  border-radius:10px; font-weight:800; color: var(--modal-on-surface);
  font-size: clamp(14px, 1.8vw, 16px);
}
.menu-item:hover{ 
  background: color-mix(in srgb, var(--modal-on-surface) 6%, var(--modal-surface) 94%); }
.menu-item.danger{ color: var(--accent-danger); }

/* Buttons — use button token set */
.btn, select, input{
  border:1px solid var(--btn-ghost-border);
  background: var(--btn-ghost-bg);
  color: var(--btn-ghost-on);
  border-radius:16px;
  padding: clamp(8px, 1.2vw, 10px) clamp(12px, 1.8vw, 14px);
  font-weight:800;
  transition: transform .06s ease, box-shadow .12s ease, filter .12s ease;
  box-shadow: var(--elevation-1);
  white-space: nowrap;
  font-size: clamp(12px, 1.6vw, 14px);
}
.btn:hover{ transform: translateY(-1px); box-shadow: var(--elevation-2); }
.btn:active{ transform: translateY(1px); box-shadow: 0 2px 0 rgba(0,0,0,.06); }

.btn.primary{
  background: var(--btn-primary-bg);
  color: var(--btn-primary-on);
  border-color: var(--btn-primary-border);
}
.btn.success{
  background: var(--btn-success-bg);
  color: var(--btn-success-on);
  border-color: var(--btn-success-border);
}
.btn.danger{
  background: var(--btn-danger-bg);
  color: var(--btn-danger-on);
  border-color: var(--btn-danger-border);
}
.btn.subtle{
  background: var(--btn-ghost-bg);
  color: var(--btn-ghost-on);
  border-color: var(--btn-ghost-border);
}

/* Bigger CTA */
.btn.huge{ font-size: clamp(16px, 2.0vw, 18px); padding: clamp(12px, 1.8vw, 14px) clamp(18px, 2.4vw, 22px); }
.check-btn{ margin-top:14px; }

/* Centering */
.centered{ flex:1; display:flex; align-items:center; justify-content:center; padding: clamp(12px, 2vw, 16px); }
.column-center{ display:flex; flex-direction:column; align-items:center; }

/* Cards / panels — table tokens */
.card, .panel{
  background: var(--table-surface);
  border:1px solid var(--table-border);
  border-radius: var(--table-radius);
  padding:14px;
  color: var(--table-on-surface);
  box-shadow: var(--table-shadow);
}
.panel.lifted{ box-shadow: var(--table-shadow); }
.panel.pad-lg{ padding: clamp(14px, 3vw, 22px); }
.panel.callout{
  background: var(--table-header-surface);
  color: var(--table-on-surface);
}

/* Choose form */
.choose-grid{ display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:16px; }
.row{ display:flex; align-items:center; gap:10px; margin:6px 0; color: var(--table-on-surface); }
.row.between{ justify-content:space-between; }
.num{ width:3.6ch; text-align:center; font-variant-numeric:tabular-nums; color: var(--table-on-surface); background: var(--table-surface); }
.num.big{ width:7.5ch; height:48px; font-size:22px; padding:6px 10px; border-radius:14px; }

/* Button groups (toggle pills) */
.btn-group{ display:flex; gap:10px; flex-wrap:nowrap; }
.btn-group.wrap{ flex-wrap:wrap; }
.pick{
  border:1px solid var(--btn-ghost-border);
  background: var(--btn-ghost-bg);
  color: var(--btn-ghost-on);
  padding:10px 14px; border-radius:14px; font-weight:900;
  box-shadow: var(--elevation-1); transition: transform .06s, box-shadow .12s, filter .12s;
}
.pick:hover{ transform:translateY(-1px); box-shadow: var(--elevation-2); }
.pick:active{ transform:translateY(1px); box-shadow: 0 2px 0 rgba(0,0,0,.06); }
.pick.active{
  background: color-mix(in srgb, var(--accent-primary) 80%, var(--btn-ghost-bg));
  border-color: color-mix(in srgb, var(--accent-secondary) 40%, var(--btn-ghost-border));
  filter:saturate(1.05);
}

/* Start button container */
.actions-start{
  display:flex; justify-content:center;
  margin-top: clamp(12px, 3.2vw, 24px);
}

/* Gameplay two-column */
.play.two-col{
  display:grid;
  grid-template-columns: minmax(360px, 560px) minmax(360px, 560px);
  gap:24px; width:min(1200px, 95vw);
}

/* Helper text */
.hint{ color: var(--main-text-soft); font-size:14px; margin-top:8px; }

/* Digital clock (practice) */
.digital-clock{
  display:flex; align-items:flex-end; gap:12px; padding:12px 14px;
  border-radius:14px; border:1px solid var(--table-border); background: var(--table-surface);
  color: var(--table-on-surface);
}
.digital-clock.bigger .d{ font-size: clamp(42px, 10vw, 88px); padding: clamp(8px, 2vw, 16px) clamp(8px, 2vw, 18px); }
.digits{ display:flex; align-items:center; gap: clamp(4px, 1.6vw, 8px); }
.d{
  font-size: clamp(36px, 9vw, 64px); line-height:1; padding: clamp(6px, 1.5vw, 10px) clamp(6px, 1.5vw, 12px);
  min-width:0.9em; text-align:center;
  font-family: "DS-Digital","DSEG7 Classic","Orbitron","Share Tech Mono",monospace;
  background: var(--table-header-surface);
  border-radius:12px;
  box-shadow: inset 0 -3px 6px rgba(0,0,0,.06);
  color: var(--table-on-surface);
}
.colon{ font-size: clamp(32px, 8vw, 56px); line-height:1; margin:0 2px; opacity:.95; color: var(--table-on-surface); }

/* AM/PM block */
.ampm-block{ display:flex; flex-direction:column; align-items:center; justify-content:center; margin-left: 10px; gap: 4px; padding: 4px 6px; }
.ampm-emoji{ font-size: clamp(20px, 6vw, 36px); line-height: 1; }
.ampm{
  font-family: "DS-Digital","DSEG7 Classic","Orbitron","Share Tech Mono",monospace;
  font-size: clamp(22px, 6vw, 42px); line-height: 1; padding: 6px 10px; border-radius:12px;
  border:1px solid var(--table-border); background: var(--table-header-surface); color: var(--table-on-surface);
}

/* Spacing between digital and words in practice */
.spacer-tall{ height: clamp(10px, 3vw, 18px); }

/* Words */
.words{ font-size: clamp(18px, 5vw, 28px); line-height:1.25; letter-spacing:.2px; color: var(--table-on-surface); }
.bigger-words{ font-size: clamp(22px, 6vw, 40px); font-weight:800; }
.big-words{ font-size: clamp(22px, 6.5vw, 42px); font-weight:800; line-height:1.15; }

/* Easy-mode adjustable digital */
.digital-setup{ display:flex; align-items:center; justify-content:center; padding:10px; }
.digit-grid{
  display:grid;
  grid-template-columns:
    clamp(56px, 22vw, 84px)
    clamp(56px, 22vw, 84px)
    clamp(18px, 8vw, 28px)
    clamp(56px, 22vw, 84px)
    clamp(56px, 22vw, 84px);
  grid-template-rows: auto auto auto;
  align-items:center; justify-items:center;
  gap: clamp(6px, 2.5vw, 12px) clamp(8px, 3vw, 12px);
  width: 100%;
  max-width: 520px;
}
.col-1{ grid-column:1; } .col-2{ grid-column:2; } .col-3{ grid-column:3; } .col-4{ grid-column:4; } .col-5{ grid-column:5; }
.digit-grid .up{ grid-row: 1; }
.digit-grid .digit, .digit-grid .colon{ grid-row: 2; }
.digit-grid .down{ grid-row: 3; }
.colon{ font-size: clamp(36px, 10vw, 64px); line-height:1; color: var(--table-on-surface); }
.colon-spacer{ width:100%; height:1px; display:block; }
.digit{
  font-size: clamp(36px, 12vw, 80px); line-height:1;
  padding: clamp(8px, 2vw, 14px) clamp(8px, 2vw, 14px); min-width:0.9em; text-align:center;
  font-family:"DS-Digital","DSEG7 Classic","Orbitron","Share Tech Mono",monospace;
  background: var(--table-header-surface);
  border:1px solid var(--table-border);
  border-radius:12px;
  box-shadow: inset 0 -3px 6px rgba(0,0,0,.06);
  color: var(--table-on-surface);
}
.arrow{
  width: clamp(56px, 22vw, 84px);
  height: clamp(36px, 10vw, 44px);
  border-radius:14px; border:1px solid var(--btn-ghost-border);
  cursor:pointer; font-weight:900;
  transition: transform .06s ease, box-shadow .12s ease, background .12s ease;
  box-shadow: var(--elevation-1);
  color: var(--btn-ghost-on);
  background: var(--btn-ghost-bg);
}
.arrow.up{   background: color-mix(in srgb, var(--accent-primary)   16%, var(--btn-ghost-bg)); }
.arrow.down{ background: color-mix(in srgb, var(--accent-secondary) 16%, var(--btn-ghost-bg)); }
.arrow:hover{ transform: translateY(-1px); box-shadow: var(--elevation-2); }
.arrow:active{ transform: translateY(1px); box-shadow: 0 2px 0 rgba(0,0,0,.06); }

/* Feedback popup */
.correct-popup{
  position:fixed; left:50%; top:24%; transform:translate(-50%, -50%);
  background: color-mix(in srgb, var(--accent-success) 20%, var(--table-surface)); color:#145c2d;
  border:2px solid color-mix(in srgb, var(--accent-success) 55%, #000);
  padding:18px 28px; font-size:36px; font-weight:900; border-radius:18px;
  box-shadow: var(--elevation-3); z-index:50;
}
.pop-enter-active, .pop-leave-active{ transition: opacity .2s ease, transform .2s ease; }
.pop-enter-from, .pop-leave-to{ opacity:0; transform:translate(-50%, -46%) scale(.95); }

/* Summary XP header */
.summary-card{ position:relative; padding-top:100px; }
.total-xp-wrap{
  position:absolute; top:14px; left:50%; transform:translateX(-50%);
  text-align:center;
}
.total-xp-label{ font-size:16px; color: var(--main-text-soft); letter-spacing:.2px; }
.total-xp-count{
  margin-top:2px;
  font-size:54px; font-weight:1000; letter-spacing:.5px;
  color:#824b00;
  text-shadow: 0 2px 0 #ffd37e, 0 6px 18px rgba(255, 170, 0, .35);
}

/* Summary table */
.table{ width:min(920px, 95vw); border-collapse:collapse; margin-top:10px; color: var(--table-on-surface); }
.table th,.table td{ border-bottom:1px dashed var(--table-border); padding:10px 12px; text-align:left; }

/* Settings Modal (practice only) — modal tokens + frosted overlay */
.modal{
  position:fixed; inset:0; display:grid; place-items:center;
  background: var(--modal-overlay-bg);
  -webkit-backdrop-filter: var(--modal-overlay-filter);
  backdrop-filter: var(--modal-overlay-filter);
  z-index:30;
}
.modal-card{
  width:min(780px, 92vw); max-height:90vh; overflow:auto;
  background: var(--modal-surface); color: var(--modal-on-surface);
  border:1px solid var(--modal-border); border-radius: var(--modal-radius);
  box-shadow: var(--modal-shadow);
}
.modal-head, .modal-foot{
  display:flex; align-items:center; gap:10px; padding:14px 16px;
  border-bottom:1px solid var(--modal-border);
}
.modal-foot{ border-top:1px solid var(--modal-border); border-bottom:none; justify-content:flex-end; }
.modal-body{ display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:18px; padding:16px; }
.modal-head{ position:sticky; top:0; background: var(--modal-surface); z-index:1; }
.modal-head h3{ margin:0; color: var(--modal-on-surface); }
/* Modal close (red circular X, tokenized) */
.modal-close{
  margin-left: auto;
  inline-size: 36px;
  block-size: 36px;
  display: grid;
  place-items: center;
  border-radius: 9999px;
  border: 1px solid var(--modal-close-border);
  background: var(--modal-close-bg);
  color: var(--modal-close-on);
  font-weight: 900;
  line-height: 1;
  cursor: pointer;
  box-shadow: var(--elevation-1);
  transition: transform .12s ease, box-shadow .12s ease, filter .15s ease;
}
.modal-close:hover{
  transform: scale(1.06);
  box-shadow: var(--elevation-2);
  filter: brightness(1.02);
}
.modal-close:active{
  transform: scale(0.98);
  box-shadow: 0 2px 0 rgba(0,0,0,.06);
}
.modal-close:focus-visible{
  outline: none;
  box-shadow: var(--focus-ring), var(--elevation-2);
}


/* ---------- Responsive rules ---------- */
@media (max-width: 1024px){
  .play.two-col{
    grid-template-columns: 1fr;
    width: min(820px, 96vw);
  }
  .right, .left{
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .check-btn{ width: 100%; max-width: 200px; }
}

/* Small screens:
   - In QUIZ, hide inline right-side buttons & home icon (use menu).
   - In PRACTICE, keep Back, Settings visible and aligned hard-right. */
@media (max-width: 768px){
  .topbar{ padding: 10px 12px; }

  /* PRACTICE: push right group to the edge, keep all icons visible */
  .topbar.is-practice .topbar-side.left{ margin-right:auto; }
  .topbar.is-practice .topbar-side.right{
    margin-left:auto;
    justify-content:flex-end;
    gap: 8px;
  }
  .topbar.is-practice .title{ display:none; }

  /* QUIZ-only hides (does NOT affect practice) */
  .topbar.is-quiz .topbar-side.right .btn{ display:none; }
  .topbar.is-quiz .topbar-side.right .icon-btn.home-btn{ display:none; }
}
</style>



