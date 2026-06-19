import { ROLE_LABELS } from "../lib/roles";
import styles from './RoleBadge.module.css';

export default function RoleBadge({ role }) {
  return (
    <span className={`${styles.badge} ${styles[role] ?? styles.user}`}>
      {ROLE_LABELS[role] || role}
    </span>
  );
}
