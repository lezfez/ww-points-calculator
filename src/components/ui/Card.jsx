import styles from './Card.module.css';

export default function Card({ children, flat = false, noPad = false, size, className = '', style, ...props }) {
  const classes = [
    styles.card,
    flat ? styles.flat : '',
    noPad ? styles.noPad : '',
    size === 'sm' ? styles.sm : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} style={style} {...props}>
      {children}
    </div>
  );
}
