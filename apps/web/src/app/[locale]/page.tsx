'use client';

import Link from 'next/link';
import styles from './page.module.css';
import { SiteHeader } from '@/components/site-header';
import { useTranslations, useLocale } from 'next-intl';
import { useEffect, useRef } from 'react';

const SHOWROOM_IMAGES = [
  { src: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80', tag: 'FLUX.2  ·  写实人像' },
  { src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80', tag: '万相 2.6  ·  艺术插画' },
  { src: 'https://images.unsplash.com/photo-1686191128892-3b37add4c844?w=600&q=80', tag: 'Seedance  ·  视频' },
  { src: 'https://images.unsplash.com/photo-1614850715649-1d0106293bd1?w=600&q=80', tag: 'CosyVoice  ·  语音' },
  { src: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&q=80', tag: '风格迁移' },
];

export default function HomePage() {
  const t = useTranslations('home');
  const tf = useTranslations('footer');
  const locale = useLocale();
  const L = (path: string) => `/${locale}${path}`;
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bgRef.current;
    if (!el) return;
    requestAnimationFrame(() => el.classList.add('loaded'));
  }, []);

  return (
    <main className={styles.main}>
      <SiteHeader />

      {/* ── Full-screen Hero ─────────────────── */}
      <section className={styles.hero}>
        <div ref={bgRef} className={styles.heroBg} />
        <div className={styles.heroOverlay} />

        <div className={styles.heroContent}>
          <div className={styles.heroEyebrow}>
            <span>✦</span>
            AI 在线生成平台
            <span>✦</span>
          </div>

          <h1 className={styles.heroTitle}>
            一句话，<em>生成万物</em>
          </h1>

          <p className={styles.heroSubtitle}>
            选择模型 → 描述需求 → 点生成 → 下载结果<br />
            无需 API Key，按次计费，新用户赠送体验金
          </p>

          <div className={styles.heroCta}>
            <Link href={L("/image")} className={styles.ctaPrimary}>
              🎨 {t('ctaPrimary')}
            </Link>
            <Link href={L("/video")} className={styles.ctaSecondary}>
              ▶ {t('nav.video')}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Showroom ─────────────────────────── */}
      <section className={styles.showroom}>
        <p className={styles.showroomLabel}>Gallery</p>
        <h2 className={styles.showroomTitle}>{t('sectionTitle.hotModels')}</h2>
        <div className={styles.showroomGrid}>
          {SHOWROOM_IMAGES.map((img, i) => (
            <div key={i} className={styles.showroomItem}>
              <img src={img.src} alt={img.tag} loading="lazy" />
              <div className={styles.showroomOverlay}>
                <span className={styles.showroomTag}>{img.tag}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Entry Cards ───────────────────────── */}
      <section className={styles.entries}>
        <h2 className={styles.sectionTitle}>{t('sectionTitle.start')}</h2>
        <div className={styles.entryGrid}>
          {[
            {
              href: L("/image"),
              icon: '🎨',
              title: t('nav.image'),
              desc: 'FLUX.2 / 万相 2.6 — 文生图、图生图，支持写实、动漫、插画',
              price: '¥0.5 起',
              badge: t('badge.hot'),
              accent: '#818cf8',
            },
            {
              href: L("/video"),
              icon: '🎬',
              title: t('nav.video'),
              desc: 'Seedance 2.0 / Kling 3.0 — 文字转视频，支持 3-15 秒高清',
              price: '¥1.5/秒',
              badge: t('badge.new'),
              accent: '#f472b6',
            },
            {
              href: L("/audio"),
              icon: '🎙️',
              title: t('nav.audio'),
              desc: 'TTS 文字转语音 / ASR 语音转文字 / 声音克隆',
              price: '¥0.3/千字',
              badge: null,
              accent: '#34d399',
            },
          ].map((card) => (
            <Link key={card.href} href={card.href} style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              padding: '28px 24px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16,
              textDecoration: 'none',
              transition: 'all 0.25s',
              position: 'relative',
              overflow: 'hidden',
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.07)';
                (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-3px)';
                (e.currentTarget as HTMLAnchorElement).style.borderColor = card.accent + '55';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.04)';
                (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.08)';
              }}
            >
              <span style={{ fontSize: '2rem' }}>{card.icon}</span>
              <div>
                <h3 style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '1.1rem', marginBottom: 6 }}>
                  {card.title}
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.85rem', lineHeight: 1.6 }}>
                  {card.desc}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 8 }}>
                <span style={{ color: card.accent, fontWeight: 700, fontSize: '0.9rem' }}>{card.price}</span>
                {card.badge && (
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 100,
                    background: card.accent + '22',
                    color: card.accent,
                    letterSpacing: '0.05em',
                  }}>
                    {card.badge}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Footer ───────────────────────────── */}
      <footer className={styles.footer}>
        <p>© 2026 AI 工具站 — {tf('copyright')}</p>
      </footer>
    </main>
  );
}
