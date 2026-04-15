import Link from 'next/link';
import styles from './site-header.module.css';

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo}>
          🎨 AI 工具站
        </Link>
        <nav className={styles.nav}>
          <Link href="/image" className={styles.navLink}>图片生成</Link>
          <Link href="/video" className={styles.navLink}>视频生成</Link>
          <Link href="/audio" className={styles.navLink}>语音生成</Link>
          <Link href="/dashboard" className={styles.navLink}>我的创作</Link>
          <Link href="/dashboard" className={styles.navBtn}>登录</Link>
        </nav>
      </div>
    </header>
  );
}
