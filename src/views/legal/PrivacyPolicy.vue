<!-- src/views/legal/PrivacyPolicy.vue -->
<template>
  <main class="legal">
    <header class="legal-hero">
      <div class="legal-hero-row">
        <div class="legal-hero-left">
          <h1 class="legal-title">{{ t.title }}</h1>
          <p class="legal-subtitle">{{ t.subtitle }}</p>
        </div>

        <button class="lang-toggle" type="button" @click="toggleLang" :aria-label="t.langToggleAria">
          {{ lang === 'en' ? '日本語' : 'English' }}
        </button>
      </div>
    </header>

    <section class="legal-body">
      <article class="legal-section" v-for="sec in t.sections" :key="sec.h">
        <h2 class="legal-h2">{{ sec.h }}</h2>

        <template v-for="(block, i) in sec.blocks" :key="i">
          <p v-if="block.type === 'p'" class="legal-p" v-html="block.html" />
          <ul v-else-if="block.type === 'ul'" class="legal-ul">
            <li v-for="(li, idx) in block.items" :key="idx" v-html="li" />
          </ul>
        </template>
      </article>

      <footer class="legal-footer">
        <div class="legal-meta">
          <div>{{ t.effective }}</div>
          <div>{{ t.updated }}</div>
        </div>

        <div class="legal-links">
          <RouterLink class="legal-link" to="/terms">{{ t.termsLink }}</RouterLink>
          <span class="dot">•</span>
          <a class="legal-link" :href="contactHref" target="_blank" rel="noopener noreferrer">{{ t.contactLink }}</a>
        </div>
      </footer>
    </section>
  </main>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'

const STORAGE_KEY = 'eitake_legal_lang'
const lang = ref('en')

const contactHref = 'https://griffiigames.com/contact'

onMounted(() => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'ja' || saved === 'en') lang.value = saved
})

function toggleLang() {
  lang.value = lang.value === 'en' ? 'ja' : 'en'
  localStorage.setItem(STORAGE_KEY, lang.value)
}

const copy = {
  en: {
    title: 'Privacy Policy',
    subtitle: 'Your privacy is important to us.',
    langToggleAria: 'Switch language',
    sections: [
      {
        h: '1. Overview',
        blocks: [
          {
            type: 'p',
            html:
              'Griffii Games (“we,” “us,” or “our”) operates EiTake (the “Service”). This Privacy Policy explains how we collect, use, and disclose information when you use the Service.'
          },
          {
            type: 'p',
            html:
              'By using the Service, you agree to the collection and use of information in accordance with this policy.'
          }
        ]
      },
      {
        h: '2. Information We Collect',
        blocks: [
          {
            type: 'p',
            html:
              'To provide the Service, we may collect the following categories of information:'
          },
          {
            type: 'ul',
            items: [
              '<strong>Account information:</strong> email address and username (stored for login and account administration).',
              '<strong>EiTake usage information:</strong> pages you visit within EiTake (we do not intentionally track your traffic outside EiTake).',
              '<strong>Analytics data:</strong> information routinely collected by Google Search Console and Google Analytics may also be collected (for example, page views and general usage patterns), depending on settings and applicable laws.'
            ]
          }
        ]
      },
      {
        h: '3. How We Use Information',
        blocks: [
          { type: 'p', html: 'We use collected information to:' },
          {
            type: 'ul',
            items: [
              'Provide, maintain, and improve the Service.',
              'Authenticate users and secure accounts.',
              'Understand feature usage and improve classroom usability.',
              'Respond to support requests, including deletion requests.'
            ]
          }
        ]
      },
      {
        h: '4. Cookies and Similar Technologies',
        blocks: [
          {
            type: 'p',
            html:
              'We may use cookies or similar technologies to operate the Service, remember preferences, and support analytics. You can manage cookies through your browser settings. If you disable cookies, some features may not function properly.'
          }
        ]
      },
      {
        h: '5. Third-Party Services',
        blocks: [
          {
            type: 'p',
            html:
              'EiTake may integrate or display information from third-party services (for example, a “word of the day” widget) and may use analytics providers. Third parties may collect information according to their own policies. We encourage you to review their privacy policies.'
          }
        ]
      },
      {
        h: '6. Data Sharing',
        blocks: [
          {
            type: 'p',
            html:
              'We do not sell your personal information. We may share information with service providers who help us operate the Service (such as hosting, authentication, and analytics), or when required to comply with legal obligations, enforce our terms, or protect the Service and users.'
          }
        ]
      },
      {
        h: '7. Data Retention and Deletion',
        blocks: [
          {
            type: 'p',
            html:
              'We retain information for as long as necessary to provide the Service and for legitimate operational, security, or legal purposes.'
          },
          {
            type: 'p',
            html:
              'At any point, you may contact Griffii Games via our website to request that your information be erased for any reason. We will make reasonable efforts to process deletion requests in accordance with applicable law and operational requirements.'
          }
        ]
      },
      {
        h: '8. Security',
        blocks: [
          {
            type: 'p',
            html:
              'We take reasonable measures to protect information. However, no method of transmission or storage is 100% secure, and we cannot guarantee absolute security.'
          }
        ]
      },
      {
        h: '9. Changes to This Policy',
        blocks: [
          {
            type: 'p',
            html:
              'We may update this Privacy Policy from time to time. Updates will be posted on this page with a revised effective date. Continued use of the Service after changes becomes acceptance of the updated policy.'
          }
        ]
      }
    ],
    effective: 'Effective as of: September 1, 2025',
    updated: 'Updated: January 8, 2026',
    termsLink: 'Terms of Service',
    contactLink: 'Contact'
  },

  ja: {
    title: 'プライバシーポリシー',
    subtitle: 'お客様のプライバシーは私たちにとって重要です。',
    langToggleAria: '言語を切り替える',
    sections: [
      {
        h: '1. 概要',
        blocks: [
          {
            type: 'p',
            html:
              'Griffii Games（以下「当社」）は EiTake（以下「本サービス」）を運営します。本ポリシーは、本サービスの利用に伴い当社が収集・利用・開示する情報の取り扱いについて説明します。'
          },
          {
            type: 'p',
            html:
              '本サービスを利用することで、本ポリシーに基づく情報の収集および利用に同意したものとみなされます。'
          }
        ]
      },
      {
        h: '2. 収集する情報',
        blocks: [
          {
            type: 'p',
            html:
              '当社は本サービス提供のため、以下の情報を収集する場合があります。'
          },
          {
            type: 'ul',
            items: [
              '<strong>アカウント情報：</strong>メールアドレスおよびユーザー名（ログインおよびアカウント管理のために保存）。',
              '<strong>EiTake 内の利用情報：</strong>EiTake 上で閲覧したページ等（EiTake 外のウェブ閲覧の追跡を意図的に行いません）。',
              '<strong>解析（アナリティクス）情報：</strong>Google Search Console や Google Analytics により通常収集される情報（例：ページビュー、一般的な利用傾向等）が、設定および適用法令に応じて収集される場合があります。'
            ]
          }
        ]
      },
      {
        h: '3. 情報の利用目的',
        blocks: [
          { type: 'p', html: '当社は収集した情報を以下の目的で利用します。' },
          {
            type: 'ul',
            items: [
              '本サービスの提供、維持、改善。',
              'ユーザー認証およびアカウントの安全確保。',
              '機能利用状況の把握と、教室での使いやすさ改善。',
              'サポート対応（削除依頼を含む）。'
            ]
          }
        ]
      },
      {
        h: '4. Cookie 等の利用',
        blocks: [
          {
            type: 'p',
            html:
              '当社は、本サービスの運用、設定の保持、解析等のために Cookie 等を利用する場合があります。Cookie はブラウザ設定で管理できますが、無効化すると一部機能が正しく動作しない場合があります。'
          }
        ]
      },
      {
        h: '5. 第三者サービス',
        blocks: [
          {
            type: 'p',
            html:
              'EiTake は第三者サービスと連携したり、第三者が提供する情報（例：Word of the Day ウィジェット）を表示する場合があります。また解析プロバイダーを利用する場合があります。第三者は各自のポリシーに従って情報を収集することがあります。各サービスのプライバシーポリシーをご確認ください。'
          }
        ]
      },
      {
        h: '6. 情報の共有',
        blocks: [
          {
            type: 'p',
            html:
              '当社は個人情報を販売しません。当社は、ホスティング、認証、解析等の運用を支援する事業者（委託先）に情報を共有する場合があります。また、法令遵守、規約の執行、本サービスや利用者の保護等のために必要な場合、情報を開示することがあります。'
          }
        ]
      },
      {
        h: '7. 保有期間と削除',
        blocks: [
          {
            type: 'p',
            html:
              '当社は、本サービスの提供に必要な期間、または正当な運用・セキュリティ・法令対応の目的に必要な期間、情報を保持します。'
          },
          {
            type: 'p',
            html:
              '利用者は、理由を問わず、当社ウェブサイトの窓口からいつでも情報の削除を依頼できます。当社は、適用法令および運用上の要件に従い、合理的な範囲で対応します。'
          }
        ]
      },
      {
        h: '8. セキュリティ',
        blocks: [
          {
            type: 'p',
            html:
              '当社は合理的な सुरक्षा対策を講じますが、通信や保管の方法に完全な安全性はありません。絶対的な安全性を保証するものではありません。'
          }
        ]
      },
      {
        h: '9. 本ポリシーの変更',
        blocks: [
          {
            type: 'p',
            html:
              '当社は本ポリシーを随時更新する場合があります。更新内容は本ページに掲載し、施行日を更新します。変更後も本サービスを利用する場合、更新後のポリシーに同意したものとみなされます。'
          }
        ]
      }
    ],
    effective: '施行日：2025年9月1日',
    updated: '更新日：2026年1月8日',
    termsLink: '利用規約',
    contactLink: 'お問い合わせ'
  }
}

const t = computed(() => copy[lang.value])
</script>

<style scoped>
.legal {
  max-width: 980px;
  margin: 0 auto;
  padding: 28px 18px 44px;
  background-color: #ffffff;
}

.legal-hero {
  margin-bottom: 14px;
}

.legal-hero-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.legal-title {
  margin: 0;
  font-size: 2.1rem;
  letter-spacing: -0.02em;
  color: var(--text-primary, #1f2328);
}

.legal-subtitle {
  margin: 8px 0 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-secondary, #2f363d);
}

.lang-toggle {
  flex: 0 0 auto;
  margin-top: 4px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.12));
  background: var(--bg-panel, #ffffff);
  color: var(--text-primary, #1f2328);
  cursor: pointer;
  font-weight: 600;
}

.lang-toggle:hover {
  filter: brightness(0.98);
}

.legal-body {
  margin-top: 12px;
}

.legal-section {
  padding: 14px 0;
  border-top: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
}

.legal-section:first-of-type {
  border-top: 0;
  padding-top: 6px;
}

.legal-h2 {
  margin: 0 0 10px;
  font-size: 1.15rem;
  color: var(--text-primary, #1f2328);
}

.legal-p {
  margin: 0 0 10px;
  line-height: 1.7;
  color: var(--text-secondary, #2f363d);
}

.legal-ul {
  margin: 0 0 10px 20px;
  padding: 0;
  line-height: 1.7;
  color: var(--text-secondary, #2f363d);
}

.legal-footer {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
}

.legal-meta {
  color: var(--text-muted, #586069);
  font-size: 0.95rem;
  line-height: 1.6;
  margin-bottom: 10px;
}

.legal-links {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.legal-link {
  color: var(--accent-primary, #2563eb);
  text-decoration: none;
  font-weight: 600;
}

.legal-link:hover {
  text-decoration: underline;
}

.dot {
  opacity: 0.6;
}

@media (max-width: 520px) {
  .legal-title {
    font-size: 1.85rem;
  }
  .legal-subtitle {
    font-size: 1rem;
  }
}
</style>
