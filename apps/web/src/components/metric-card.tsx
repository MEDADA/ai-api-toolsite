import styles from './metric-card.module.css';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: string;
  color?: 'green' | 'blue' | 'purple' | 'gray';
}

const colorMap = {
  green: styles.green,
  blue: styles.blue,
  purple: styles.purple,
  gray: styles.gray,
};

export function MetricCard({ label, value, icon, color = 'blue' }: MetricCardProps) {
  return (
    <div className={`${styles.card} ${colorMap[color]}`}>
      {icon && <span className={styles.icon}>{icon}</span>}
      <div className={styles.content}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{value}</span>
      </div>
    </div>
  );
}
