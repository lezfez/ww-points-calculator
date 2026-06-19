import styles from './Button.module.css';

export default function Button({
  children,
  variant = 'primary',
  coinStyle = false,
  size,
  pill = false,
  className = '',
  ...props
}) {
  const base = styles.btn;
  const variantClass = coinStyle ? styles.coin : styles[variant] ?? styles.primary;
  const sizeClass = size === 'sm' ? styles.sm : '';
  const pillClass = pill ? styles.pill : '';

  return (
    <button
      className={[base, variantClass, sizeClass, pillClass, className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </button>
  );
}
