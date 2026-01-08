<!-- src/views/legal/Terms.vue -->
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
          <RouterLink class="legal-link" to="/privacy-policy">{{ t.privacyLink }}</RouterLink>
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
    title: 'Terms of Service',
    subtitle: 'Please read these terms carefully before using EiTake.',
    langToggleAria: 'Switch language',
    sections: [
      {
        h: '1. Terms',
        blocks: [
          {
            type: 'p',
            html:
              'By accessing or using EiTake (the “Service”), operated by Griffii Games (“we,” “us,” or “our”), you agree to be bound by these Terms of Service (“Terms”) and all applicable laws and regulations. If you do not agree with any of these Terms, you must not use the Service.'
          }
        ]
      },
      {
        h: '2. Accounts',
        blocks: [
          {
            type: 'p',
            html:
              'EiTake may allow you to create an account. For login and account administration purposes, we store your <strong>email address</strong> and <strong>username</strong> (and related authentication data required to operate sign-in).'
          },
          {
            type: 'p',
            html:
              'You are responsible for maintaining the confidentiality of your credentials and for all activity under your account.'
          }
        ]
      },
      {
        h: '3. Acceptable Use',
        blocks: [
          { type: 'p', html: 'You agree not to misuse the Service. This includes, without limitation:' },
          {
            type: 'ul',
            items: [
              'Attempting to access systems or data you are not authorized to access.',
              'Interfering with or disrupting the integrity or performance of the Service.',
              'Uploading or transmitting malicious code, or engaging in abusive or unlawful behavior.',
              'Using the Service in a way that violates applicable laws, school policies, or classroom rules.'
            ]
          }
        ]
      },
      {
        h: '4. Educational Use and Donations',
        blocks: [
          {
            type: 'p',
            html:
              'EiTake is designed to be student-friendly and suitable for classroom and educational use. We strive to remain ad-free. Donations are welcome to help cover maintenance costs such as servers and web hosting. Donations are voluntary and do not create additional obligations unless explicitly stated.'
          }
        ]
      },
      {
        h: '5. Third-Party Services and Content',
        blocks: [
          {
            type: 'p',
            html:
              'The Service may display information from third-party services (for example, a “word of the day” widget). We do not control third-party services and are not responsible for their availability, accuracy, or content. Your use of third-party services may be subject to their own terms and privacy policies.'
          }
        ]
      },
      {
        h: '6. Disclaimers',
        blocks: [
          {
            type: 'p',
            html:
              'The Service is provided on an “as is” and “as available” basis. To the maximum extent permitted by law, we disclaim all warranties, express or implied, including implied warranties of merchantability, fitness for a particular purpose, and non-infringement.'
          }
        ]
      },
      {
        h: '7. Limitation of Liability',
        blocks: [
          {
            type: 'p',
            html:
              'To the maximum extent permitted by law, Griffii Games will not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of data, profits, or revenues arising from your use of (or inability to use) the Service.'
          }
        ]
      },
      {
        h: '8. Changes, Suspension, and Termination',
        blocks: [
          {
            type: 'p',
            html:
              'We may modify, suspend, or discontinue the Service at any time. We may suspend or terminate access to the Service immediately, without prior notice or liability, for any reason, including if you breach these Terms or if required to protect the Service or other users.'
          }
        ]
      },
      {
        h: '9. Privacy',
        blocks: [
          {
            type: 'p',
            html:
              'Our collection and use of information is described in our Privacy Policy. By using the Service, you agree to the collection and use of information as described there.'
          }
        ]
      },
      {
        h: '10. Contact and Data Deletion Requests',
        blocks: [
          {
            type: 'p',
            html:
              'At any point, you may contact Griffii Games via our website to request that your information be erased for any reason. We will make reasonable efforts to process requests in accordance with applicable law and operational requirements.'
          }
        ]
      }
    ],
    effective: 'Effective as of: September 1, 2025',
    updated: 'Updated: January 8, 2026',
    privacyLink: 'Privacy Policy',
    contactLink: 'Contact'
  },

  ja: {
    title: '利用規約',
    subtitle: 'EiTake をご利用になる前に、以下の規約をよくお読みください。',
    langToggleAria: '言語を切り替える',
    sections: [
      {
        h: '1. 規約への同意',
        blocks: [
          {
            type: 'p',
            html:
              'EiTake（以下「本サービス」）は Griffii Games（以下「当社」）が運営します。本サービスにアクセスまたは利用することにより、利用規約（以下「本規約」）および適用される法令等に同意したものとみなされます。本規約に同意いただけない場合は、本サービスを利用しないでください。'
          }
        ]
      },
      {
        h: '2. アカウント',
        blocks: [
          {
            type: 'p',
            html:
              '本サービスではアカウント作成機能を提供する場合があります。ログインおよびアカウント管理の目的で、<strong>メールアドレス</strong>と<strong>ユーザー名</strong>（およびサインインに必要な認証関連データ）を保存します。'
          },
          {
            type: 'p',
            html:
              '利用者は、認証情報の管理責任を負い、アカウントを通じて行われる一切の行為について責任を負うものとします。'
          }
        ]
      },
      {
        h: '3. 禁止事項（適正利用）',
        blocks: [
          { type: 'p', html: '利用者は本サービスを不正に利用しないものとします。これには以下が含まれます（例示）：'},
          {
            type: 'ul',
            items: [
              '権限のないシステムまたはデータへのアクセスの試み。',
              '本サービスの運用、完全性、または性能の妨害・阻害。',
              '悪意あるコードの送信、または迷惑行為・違法行為。',
              '法令、学校の方針、教室内ルール等に反する利用。'
            ]
          }
        ]
      },
      {
        h: '4. 教育利用と寄付',
        blocks: [
          {
            type: 'p',
            html:
              'EiTake は教室・教育現場での利用を想定し、学習者に配慮した設計を目指しています。また、可能な限り広告のない運用を目指しています。サーバーやホスティング等の維持費を支えるため、寄付は歓迎します。寄付は任意であり、明示がない限り追加の権利や義務を生じさせません。'
          }
        ]
      },
      {
        h: '5. 外部サービス（第三者）',
        blocks: [
          {
            type: 'p',
            html:
              '本サービスは、第三者サービスから提供される情報（例：Word of the Day ウィジェット等）を表示する場合があります。当社は第三者サービスを管理せず、その可用性、正確性、内容について責任を負いません。第三者サービスの利用には、それぞれの利用規約・プライバシーポリシーが適用される場合があります。'
          }
        ]
      },
      {
        h: '6. 免責事項',
        blocks: [
          {
            type: 'p',
            html:
              '本サービスは「現状有姿」および「提供可能な範囲」で提供されます。法令で認められる最大限の範囲で、当社は明示または黙示を問わず、商品性、特定目的適合性、非侵害等の保証を行いません。'
          }
        ]
      },
      {
        h: '7. 責任の制限',
        blocks: [
          {
            type: 'p',
            html:
              '法令で認められる最大限の範囲で、当社は、本サービスの利用または利用不能に起因する間接損害、付随的損害、特別損害、結果損害、懲罰的損害、データ・利益・収益の損失等について責任を負いません。'
          }
        ]
      },
      {
        h: '8. 変更・停止・終了',
        blocks: [
          {
            type: 'p',
            html:
              '当社は、いつでも本サービスの内容を変更、停止、または終了することができます。また、本規約違反やサービス保護等の理由により、事前通知なく利用停止・終了を行う場合があります。'
          }
        ]
      },
      {
        h: '9. プライバシー',
        blocks: [
          {
            type: 'p',
            html:
              '当社の情報の取り扱いはプライバシーポリシーに定めます。本サービスを利用することで、同ポリシーに基づく情報の収集・利用に同意したものとみなされます。'
          }
        ]
      },
      {
        h: '10. お問い合わせ・削除依頼',
        blocks: [
          {
            type: 'p',
            html:
              '利用者は、理由を問わず、当社ウェブサイトの窓口からいつでも情報の削除を依頼できます。当社は、適用法令および運用上の要件に従い、合理的な範囲で対応します。'
          }
        ]
      }
    ],
    effective: '施行日：2025年9月1日',
    updated: '更新日：2026年1月8日',
    privacyLink: 'プライバシーポリシー',
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
  .legal-hero-row {
    align-items: flex-start;
  }
  .legal-title {
    font-size: 1.85rem;
  }
  .legal-subtitle {
    font-size: 1rem;
  }
}
</style>
