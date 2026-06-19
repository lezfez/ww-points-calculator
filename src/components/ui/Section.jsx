import styles from './Section.module.css';

export default function Section({ label, children, className = '' }) {
  return (
    <div className={className}>
      {label && <div className={styles.label}>{label}</div>}
      {children}
    </div>
  );
}
