import styles from './Input.module.css';

export default function Input({ label, id, className = '', wrapperClassName = '', ...props }) {
  return (
    <div className={[styles.wrapper, wrapperClassName].filter(Boolean).join(' ')}>
      {label && <label className={styles.label} htmlFor={id}>{label}</label>}
      <input
        id={id}
        className={[styles.input, className].filter(Boolean).join(' ')}
        {...props}
      />
    </div>
  );
}
