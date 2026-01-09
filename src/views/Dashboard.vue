<!-- src/views/Dashboard.vue -->
<template>
  <main class="dashboard">
    <div class="dashboard__content">
      <!-- Bento Grid -->
      <section class="dashboard__grid" aria-label="Dashboard sections">
        <!-- Row 1 -->
        <section class="dashboard__card dashboard__card--wotd" aria-label="Word of the Day">
          <header class="dashboard__cardHead">
            <h2 class="dashboard__cardTitle">Word of the Day</h2>
          </header>

          <div class="dashboard__cardBody dashboard__cardBody--padded">
            <DailyWord />
          </div>
        </section>

        <section class="dashboard__card dashboard__card--games" aria-label="Games">
          <header class="dashboard__cardHead">
            <h2 class="dashboard__cardTitle">
              <RouterLink class="dashboard__titleLink" to="/activities">Games</RouterLink>
            </h2>
          </header>

          <div class="dashboard__cardBody">
            <ActivitiesIconGrid mode="games" width="100%" height="100%" />
          </div>
        </section>

        <section class="dashboard__card dashboard__card--teacherTools" aria-label="Teacher Tools">
          <header class="dashboard__cardHead">
            <h2 class="dashboard__cardTitle">
              <RouterLink class="dashboard__titleLink" to="/activities">Teacher Tools</RouterLink>
            </h2>
          </header>

          <div class="dashboard__cardBody">
            <ActivitiesIconGrid mode="tools" width="100%" height="100%" />
          </div>
        </section>

        <!-- Row 2 -->
        <section class="dashboard__card dashboard__card--textbooks" aria-label="Textbooks">
          <header class="dashboard__cardHead dashboard__cardHead--split">
            <h2 class="dashboard__cardTitle">
              <RouterLink class="dashboard__titleLink" to="/textbooks">Textbooks & Flashcard Games</RouterLink>
            </h2>

            <div class="dashboard__headRight">
              <CustomDeckButton :max-height="30" :scale="0.7" />
            </div>
          </header>

          <div class="dashboard__cardBody dashboard__cardBody--wall">
            <ScrollingImageWall
              :images="textbookImages"
              :tile-width="200"
              :tile-height="300"
              :gap="0"
              :speed-px-per-sec="30"
              direction="left"
              :visible-count="5"
              :draggable="true"
            />
          </div>
        </section>

        <!-- Hide until populated 
        <section class="dashboard__card dashboard__card--tutorials" aria-label="Tutorials">
          <header class="dashboard__cardHead">
            <h2 class="dashboard__cardTitle">Tutorials</h2>
          </header>
          <div class="dashboard__cardBody">
            <Tutorials />
          </div>
        </section>
        -->

        <!-- Hide for now 
          -- The levels system is hardly ever used I feel.
          -- And it needs a layout redesign I think

        <section class="dashboard__card dashboard__card--profile" aria-label="User Profile">
          <header class="dashboard__cardHead">
            <h2 class="dashboard__cardTitle">Progress</h2>
          </header>

          <div class="dashboard__cardBody dashboard__cardBody--fill">
              <UserLevels />
          </div>
        </section>
        -->

        <section class="dashboard__card dashboard__card--community" aria-label="Community">
          <header class="dashboard__cardHead">
            <h2 class="dashboard__cardTitle">Community</h2>
          </header>

          <div class="dashboard__cardBody ">
            <CommunityLikesCounter />
          </div>
        </section>
      </section>
    </div>

    <!-- Footer -->
    <footer class="dashboard__footer" aria-label="Footer">
      <div class="dashboard__footerLeft">
        <RouterLink class="dashboard__footerLink" to="/terms">Terms of Service</RouterLink>
        <span class="dashboard__footerDot" aria-hidden="true">•</span>
        <RouterLink class="dashboard__footerLink" to="/privacy-policy">Privacy Policy</RouterLink>
      </div>

      <div class="dashboard__footerRight">
        <a class="dashboard__brandLink" href="https://griffiigames.com" target="_blank" rel="noopener noreferrer">
          Griffii Games
        </a>
      </div>
    </footer>
  </main>
</template>

<script setup lang="ts">

import DailyWord from '@/components/DailyWord.vue'
import ScrollingImageWall from '@/components/ScrollingImageWall.vue'
import CustomDeckButton from '@/components/CustomDeckButton.vue'
import UserLevels from '@/components/UserLevels.vue'
import ActivitiesIconGrid from '@/components/ActivitiesIconGrid.vue'
import CommunityLikesCounter from '@/components/CommunityLikesCounter.vue'
import Tutorials from '@/components/Tutorials.vue'

/* ------------------------------------------
   Textbook Images
------------------------------------------ */
const textbookImages = [
  { src: new URL('@/assets/images/screenshots/textbook-covers/lets-try-1-2018.png', import.meta.url).href },
  { src: new URL('@/assets/images/screenshots/textbook-covers/lets-try-2-2018.png', import.meta.url).href },
  { src: new URL('@/assets/images/screenshots/textbook-covers/new-horizon-5-2024.jpg', import.meta.url).href },
  { src: new URL('@/assets/images/screenshots/textbook-covers/new-horizon-6-2024.jpg', import.meta.url).href },
  { src: new URL('@/assets/images/screenshots/textbook-covers/my-picture-dictionary-new-horizon-2024.jpg', import.meta.url).href },
  { src: new URL('@/assets/images/screenshots/textbook-covers/new-crown-1-2025.png', import.meta.url).href },
  { src: new URL('@/assets/images/screenshots/textbook-covers/holidays.png', import.meta.url).href },
]
</script>

<style scoped>
/* ==========================================================================
   Dashboard Layout
   ========================================================================== */

.dashboard {
  min-block-size: 100dvh;
  display: flex;
  flex-direction: column;

  /* AppHeader is not fixed now; do not reserve header height here */
  padding-top: 0;
}

.dashboard__content {
  flex: 1;
  min-height: 0;
  display: flex;
  justify-content: center;
  padding: var(--dashboard-page-pad, 18px);
  box-sizing: border-box;
}

/* ==========================================================================
   Grid
   ========================================================================== */

.dashboard__grid {
  width: 100%;
  max-width: var(--dashboard-max-width, 1200px);
  margin: 0 auto;

  display: grid;
  gap: var(--dashboard-gap, 22px);

  grid-template-columns: 1fr;
  grid-auto-rows: var(--dashboard-row-height, 350px);

  min-height: 0;
}

@media (min-width: 980px) {
  .dashboard__grid {
    width: 80vw;
    grid-template-columns: repeat(12, minmax(0, 1fr));
  }
}

/* ==========================================================================
   Card Base
   ========================================================================== */

.dashboard__card {
  border-radius: var(--radius-lg);
  overflow: hidden;

  background: var(--table-surface);
  border: 2px solid var(--table-border);
  box-shadow: var(--table-shadow);

  display: grid;
  grid-template-rows: auto 1fr;
  min-height: 0;
}

.dashboard__cardHead {
  padding: 14px 16px 5px;
  border-bottom: 1px solid color-mix(in srgb, var(--table-border) 70%, transparent);
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
}

.dashboard__cardHead--split {
  justify-content: space-between;
}

.dashboard__headRight {
  display: flex;
  align-items: center;
  gap: 5px;
}

.dashboard__cardTitle {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 900;
  letter-spacing: 0.02em;
  color: var(--table-on-surface);
}

.dashboard__titleLink {
  color: inherit;
  text-decoration: none;
}
.dashboard__titleLink:hover {
  text-decoration: underline;
}

.dashboard__cardBody {
  min-height: 0;
}

/* padding helper */
.dashboard__cardBody--padded {
  padding: 14px 16px;
}

/* Wall fill */
.dashboard__cardBody--wall {
  padding: 0;
  overflow: hidden;
}

/* Full-height fill helpers (Profile/UserLevels) */
.dashboard__cardBody--fill {
  display: flex;
  align-items: center;
  min-height: 0;
}
.dashboard__fillWrap {
  flex: 1;
  min-height: 0;
  display: flex;
}
.dashboard__fillChild {
  flex: 1;
  min-height: 0;
  height: 100%;
}

/* ==========================================================================
   Section mappings (12-col bento)
   ========================================================================== */

@media (min-width: 980px) {
  .dashboard__card--wotd { grid-column: span 3; }
  .dashboard__card--games { grid-column: span 5; }
  .dashboard__card--teacherTools { grid-column: span 4; }

  .dashboard__card--tutorials { grid-column: span 5; } /** Hidden */
  .dashboard__card--textbooks { grid-column: span 7; } 

  .dashboard__card--profile { grid-column: span 6; } /** Hidden */
  .dashboard__card--community { grid-column: span 5; }
}

/* ==========================================================================
   Theme-token borders per section
   (Uses existing role tokens where available + core accents where not)
   ========================================================================== */

/* Games */
.dashboard__card--games {
  background: var(--activities-surface);
  border-color: var(--activities-border);
  box-shadow: var(--activities-shadow);
  color: var(--activities-on-surface);
}
.dashboard__card--games .dashboard__cardTitle { color: var(--activities-on-surface); }

/* Textbooks */
.dashboard__card--textbooks {
  background: var(--textbook-surface);
  border-color: var(--textbook-border);
  box-shadow: var(--textbook-shadow);
  color: var(--textbook-on-surface);
}
.dashboard__card--textbooks .dashboard__cardTitle { color: var(--textbook-on-surface); }

/* Everything else: keep table surface/shadow, but theme the borders via accents */
.dashboard__card--wotd { border-color: color-mix(in srgb, var(--accent-warning) 55%, var(--table-border) 45%); }
.dashboard__card--teacherTools { border-color: color-mix(in srgb, var(--accent-secondary) 55%, var(--table-border) 45%); }
.dashboard__card--tutorials { border-color: color-mix(in srgb, var(--accent-primary) 45%, var(--table-border) 55%); }
.dashboard__card--profile { border-color: color-mix(in srgb, var(--accent-primary) 55%, var(--table-border) 45%); }
.dashboard__card--community { border-color: color-mix(in srgb, var(--accent-success) 55%, var(--table-border) 45%); }

/* ==========================================================================
   WOTD placeholder styling
   ========================================================================== */

.wotd {
  display: grid;
  gap: 6px;
  color: var(--table-on-surface);
}
.wotd__word {
  font-size: 1.4rem;
  font-weight: 1000;
  letter-spacing: 0.01em;
}
.wotd__pos {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--table-muted);
}
.wotd__def,
.wotd__ex {
  font-size: 0.98rem;
  line-height: 1.35;
  color: var(--table-on-surface);
}

/* ==========================================================================
   Community layout: hint top, greeters bottom
   ========================================================================== */

.dashboard__cardBody--community {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 14px 16px;
  gap: 10px;
}

.community__hint {
  margin: 0;
  color: var(--table-muted);
  font-weight: 700;
}

.community__greeters {
  margin-top: auto;     /* pins to bottom */
  min-height: 0;
  display: flex;
  align-items: flex-end;
}

/* ==========================================================================
   Footer (match AppHeader tokens)
   ========================================================================== */

.dashboard__footer {
  width: 100%;
  margin-top: auto;

  background: var(--header-surface);
  border-top: var(--header-border-width) solid var(--header-border-color);
  box-shadow: var(--header-shadow);

  padding: var(--dashboard-footer-pad-y, 12px) var(--dashboard-footer-pad-x, 16px);

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  box-sizing: border-box;
}

.dashboard__footerLeft {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.dashboard__footerLink {
  font-size: 0.7rem;
  color: var(--header-on-surface);
  text-decoration: none;
}
.dashboard__footerLink:hover { text-decoration: underline; }

.dashboard__footerDot {
  color: color-mix(in srgb, var(--header-on-surface) 45%, transparent);
}

.dashboard__footerRight {
  font-size: 0.92rem;
  white-space: nowrap;
}

.dashboard__brandLink {
  color: var(--header-on-surface);
  text-decoration: none;
  font-weight: 900;
}
.dashboard__brandLink:hover {
  text-decoration: underline;
}
</style>
