'use client';

import Link from 'next/link';
import styles from './page.module.css';
import { SiteHeader } from '@/components/site-header';
import { FeatureCard } from '@/components/feature-card';
import { useTranslations } from 'next-intl';

export default function HomePage() {
  const t = useTranslations('home');
  const tf = useTranslations('footer');

  return (
    <main className={styles.main}>
      <SiteHeader />

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            {t('heroTitle')}
          </h1>
          <p className={styles.heroSubtitle}>
            {t('heroSubtitle')}
            <br />
            {t('heroSubtitleExtra')}
          </p>
          <div className={styles.heroCta}>
            <Link href="/image" className={styles.ctaPrimary}>
              {t('ctaPrimary')}
            </Link>
            <Link href="/dashboard" className={styles.ctaSecondary}>
              {t('ctaSecondary')}
            </Link>
          </div>
        </div>
      </section>

      {/* Three Entry Cards */}
      <section className={styles.entries}>
        <h2 className={styles.sectionTitle}>{t('sectionTitle.start')}</h2>
        <div className={styles.entryGrid}>
          <FeatureCard
            href="/image"
            icon="🎨"
            title={t('nav.image')}
            description="FLUX.2 / 万相 2.6 — 文生图、图生图，支持写实、动漫、插画多种风格"
            price="¥0.5 起"
            badge={t('badge.hot')}
          />
          <FeatureCard
            href="/video"
            icon="🎬"
            title={t('nav.video')}
            description="Seedance 2.0 / Kling 3.0 — 文字转视频，支持 3-15 秒时长，高清输出"
            price="¥1.5/秒"
            badge={t('badge.new')}
          />
          <FeatureCard
            href="/audio"
            icon="🎙️"
            title={t('nav.audio')}
            description="TTS 文字转语音 / ASR 语音转文字 / 声音克隆 — 10+ 音色可选"
            price="¥0.3/千字"
            badge={null}
          />
        </div>
      </section>

      {/* Hot Models */}
      <section className={styles.hotModels}>
        <h2 className={styles.sectionTitle}>{t('sectionTitle.hotModels')}</h2>
        <div className={styles.modelGrid}>
          {[
            { slug: 'flux-2-schnell', name: 'FLUX.2 schnell', type: t('model.type.image'), price: '¥0.5/张', speed: '⚡ 快速' },
            { slug: 'wanxiang-2-6', name: '万相 2.6', type: t('model.type.image'), price: '¥0.5/张', speed: '🔥 高质量' },
            { slug: 'seedance-2-0', name: 'Seedance 2.0', type: t('model.type.video'), price: '¥3.0/秒', speed: '🆕 最新' },
            { slug: 'cosyvoice-v3-flash', name: 'CosyVoice V3', type: t('model.type.audio'), price: '¥0.3/千字', speed: '🎯 精准' },
          ].map((model) => (
            <Link
              key={model.slug}
              href={`/image`}
              className={styles.modelCard}
            >
              <span className={styles.modelType}>{model.type}</span>
              <span className={styles.modelName}>{model.name}</span>
              <span className={styles.modelPrice}>{model.price}</span>
              <span className={styles.modelSpeed}>{model.speed}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>© 2026 AI 工具站 — {tf('copyright')}</p>
      </footer>
    </main>
  );
}
