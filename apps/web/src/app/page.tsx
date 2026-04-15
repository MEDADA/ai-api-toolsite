import Link from 'next/link';
import styles from './page.module.css';
import { SiteHeader } from '@/components/site-header';
import { FeatureCard } from '@/components/feature-card';

export default function HomePage() {
  return (
    <main className={styles.main}>
      <SiteHeader />

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            AI 创作，一触即达
          </h1>
          <p className={styles.heroSubtitle}>
            选择模型 → 输入需求 → 点生成 → 下载结果
            <br />
            无需 API Key，按次计费，新用户赠送 5 元体验金
          </p>
          <div className={styles.heroCta}>
            <Link href="/image" className={styles.ctaPrimary}>
              立即体验 →
            </Link>
            <Link href="/dashboard" className={styles.ctaSecondary}>
              查看我的创作
            </Link>
          </div>
        </div>
      </section>

      {/* Three Entry Cards */}
      <section className={styles.entries}>
        <h2 className={styles.sectionTitle}>开始创作</h2>
        <div className={styles.entryGrid}>
          <FeatureCard
            href="/image"
            icon="🎨"
            title="图片生成"
            description="FLUX.2 / 万相 2.6 — 文生图、图生图，支持写实、动漫、插画多种风格"
            price="¥0.5 起"
            badge="热门"
          />
          <FeatureCard
            href="/video"
            icon="🎬"
            title="视频生成"
            description="Seedance 2.0 / Kling 3.0 — 文字转视频，支持 3-15 秒时长，高清输出"
            price="¥1.5/秒"
            badge="新品"
          />
          <FeatureCard
            href="/audio"
            icon="🎙️"
            title="语音生成"
            description="TTS 文字转语音 / ASR 语音转文字 / 声音克隆 — 10+ 音色可选"
            price="¥0.3/千字"
            badge={null}
          />
        </div>
      </section>

      {/* Hot Models */}
      <section className={styles.hotModels}>
        <h2 className={styles.sectionTitle}>热门模型</h2>
        <div className={styles.modelGrid}>
          {[
            { slug: 'flux-2-schnell', name: 'FLUX.2 schnell', type: '图片', price: '¥0.5/张', speed: '⚡ 快速' },
            { slug: 'wanxiang-2-6', name: '万相 2.6', type: '图片', price: '¥0.5/张', speed: '🔥 高质量' },
            { slug: 'seedance-2-0', name: 'Seedance 2.0', type: '视频', price: '¥3.0/秒', speed: '🆕 最新' },
            { slug: 'cosyvoice-v3-flash', name: 'CosyVoice V3', type: '语音', price: '¥0.3/千字', speed: '🎯 精准' },
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
        <p>© 2026 AI 工具站 — 让创作更简单</p>
      </footer>
    </main>
  );
}
