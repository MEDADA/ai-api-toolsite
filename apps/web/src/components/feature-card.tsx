import Link from 'next/link';
import styles from './feature-card.module.css';

interface FeatureCardProps {
  href: string;
  icon: string;
  title: string;
  description: string;
  price: string;
  badge: string | null;
}

export function FeatureCard({ href, icon, title, description, price, badge }: FeatureCardProps) {
  return (
    <Link href={href} className={styles.card}>
      {badge && <span className={styles.badge}>{badge}</span>}
      <span className={styles.icon}>{icon}</span>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
      <div className={styles.footer}>
        <span className={styles.price}>{price}</span>
        <span className={styles.arrow}>→</span>
      </div>
    </Link>
  );
}
