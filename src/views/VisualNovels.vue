<template>
  <main class="visual-novels">
    <div class="top-offset" aria-hidden="true"></div>

    <section class="page-header">
      <h1 class="page-title">Visual Novels</h1>
      <p class="page-subtitle">
        Play interactive stories and English-learning visual novels.
      </p>
    </section>

    <section v-if="loading" class="state-message">
      Loading visual novels...
    </section>

    <section v-else-if="error" class="state-message error-message">
      {{ error }}
    </section>

    <section v-else-if="novels.length === 0" class="state-message">
      No visual novels available yet.
    </section>

    <section v-else class="grid">
      <RouterLink
        v-for="vn in novels"
        :key="vn.slug"
        :to="`/visual-novels/${vn.slug}`"
        class="card"
      >
        <div class="cover">
          <img
            v-if="vn.cover_image_url && !imageErrors[vn.slug]"
            :src="vn.cover_image_url"
            :alt="`${vn.title} cover image`"
            @error="handleImageError(vn.slug)"
          />
          <div v-else class="cover-fallback">
            <span>{{ vn.title }}</span>
          </div>
        </div>

        <div class="content">
          <h2 class="title">{{ vn.title }}</h2>

          <p v-if="vn.author_name" class="author">
            by {{ vn.author_name }}
          </p>

          <p class="description">
            {{ vn.short_description || vn.description || 'No description available.' }}
          </p>

          <div class="stats">
            <div class="stat" aria-label="Views">
              <svg viewBox="0 0 24 24" class="stat-icon" aria-hidden="true">
                <path
                  d="M12 5c5.5 0 9.5 4.5 10.7 6-1.2 1.5-5.2 6-10.7 6S2.5 12.5 1.3 11C2.5 9.5 6.5 5 12 5Zm0 2C8.1 7 5 9.8 3.5 11 5 12.2 8.1 15 12 15s7-2.8 8.5-4C19 9.8 15.9 7 12 7Zm0 1.5A2.5 2.5 0 1 1 9.5 11 2.5 2.5 0 0 1 12 8.5Z"
                />
              </svg>
              <span>{{ vn.views_count }}</span>
            </div>

            <div class="stat" aria-label="Likes">
              <svg viewBox="0 0 24 24" class="stat-icon" aria-hidden="true">
                <path
                  d="M12 21.35 10.55 20C5.4 15.24 2 12.09 2 8.5A4.5 4.5 0 0 1 6.5 4 5 5 0 0 1 12 7.09 5 5 0 0 1 17.5 4 4.5 4.5 0 0 1 22 8.5c0 3.59-3.4 6.74-8.55 11.5L12 21.35Z"
                />
              </svg>
              <span>{{ vn.likes_count }}</span>
            </div>

            <div class="stat" aria-label="Comments">
              <svg viewBox="0 0 24 24" class="stat-icon" aria-hidden="true">
                <path
                  d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 2v9h2v1.17L8.71 15H20V6Z"
                />
              </svg>
              <span>{{ vn.comments_count }}</span>
            </div>
          </div>
        </div>
      </RouterLink>
    </section>
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { supabase } from '@/lib/supabase'

const loading = ref(true)
const error = ref('')
const novels = ref([])
const imageErrors = ref({})

function handleImageError(slug) {
  imageErrors.value = {
    ...imageErrors.value,
    [slug]: true,
  }
}

async function fetchVisualNovels() {
  loading.value = true
  error.value = ''

  try {
    const { data, error: fetchError } = await supabase
      .from('visual_novels')
      .select(`
        slug,
        title,
        description,
        short_description,
        cover_image_url,
        author_name,
        visual_novel_stats (
          views_count,
          likes_count,
          comments_count
        )
      `)
      .eq('is_published', true)
      .order('created_at', { ascending: false })

    if (fetchError) throw fetchError

    novels.value = (data || []).map((row) => {
      const stats = Array.isArray(row.visual_novel_stats)
        ? (row.visual_novel_stats[0] || {})
        : (row.visual_novel_stats || {})

      return {
        slug: row.slug,
        title: row.title,
        description: row.description,
        short_description: row.short_description,
        cover_image_url: row.cover_image_url,
        author_name: row.author_name,
        views_count: Number(stats.views_count || 0),
        likes_count: Number(stats.likes_count || 0),
        comments_count: Number(stats.comments_count || 0),
      }
    })
  } catch (err) {
    console.error('Error fetching visual novels:', err)
    error.value = err?.message || 'Failed to load visual novels.'
  } finally {
    loading.value = false
  }
}

onMounted(fetchVisualNovels)
</script>

<style scoped>
.visual-novels {
  width: min(1200px, calc(100% - 32px));
  margin: 0 auto;
  padding: 32px 0 48px;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  margin: 0 0 8px;
  font-size: clamp(2rem, 4vw, 2.8rem);
  font-weight: 800;
  color: var(--main-title-color);
  text-shadow: var(--main-title-shadow);
}

.page-subtitle {
  margin: 0;
  font-size: 1rem;
  color: var(--main-text-soft, rgba(255, 255, 255, 0.8));
}

.state-message {
  padding: 24px 0;
  font-size: 1rem;
  color: var(--main-text-soft, rgba(255, 255, 255, 0.8));
}

.error-message {
  color: var(--accent-danger, #d33);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
}

.card {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: inherit;
  border-radius: 16px;
  overflow: hidden;
  background: transparent;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.24);
}

.cover {
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #111;
  overflow: hidden;
}

.cover img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.cover-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  padding: 16px;
  text-align: center;
  background: #111;
  color: #fff;
  font-weight: 700;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  background: #ffffff;
  color: #1f2937;
  min-height: 170px;
}

.title {
  margin: 0;
  font-size: 1.08rem;
  font-weight: 800;
  line-height: 1.25;
  color: #111827;

  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

.author {
  margin: 0;
  font-size: 0.85rem;
  color: #4b5563;
  font-weight: 600;
}

.description {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.45;
  color: #374151;

  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
}

.stats {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  padding-top: 8px;
  border-top: 1px solid #e5e7eb;
}

.stat {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.82rem;
  color: #4b5563;
  font-weight: 700;
}

.stat-icon {
  width: 15px;
  height: 15px;
  fill: currentColor;
  flex: 0 0 auto;
}

@media (max-width: 900px) {
  .visual-novels {
    width: min(100%, calc(100% - 24px));
    padding: 24px 0 40px;
  }

  .grid {
    grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
    gap: 16px;
  }
}

@media (max-width: 640px) {
  .page-title {
    font-size: 1.8rem;
  }

  .grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
  }

  .content {
    min-height: 155px;
    padding: 12px;
  }

  .title {
    font-size: 1rem;
  }

  .description {
    font-size: 0.86rem;
  }

  .stat {
    font-size: 0.76rem;
  }
}
</style>