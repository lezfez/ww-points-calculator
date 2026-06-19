import styles from './ScoreBlock.module.css';

export default function ScoreBlock({ value, label, bg, textColor, borderColor }) {
  return (
    <div
      className={styles.block}
      style={{ background: bg, border: `1px solid ${borderColor || "transparent"}` }}
    >
      <div className={styles.value} style={{ color: textColor }}>{value}</div>
      <div className={styles.label} style={{ color: textColor }}>{label}</div>
    </div>
  );
}
