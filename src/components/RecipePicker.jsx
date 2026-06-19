import { useState } from "react";
import styles from "./RecipePicker.module.css";

export default function RecipePicker({ recipes = [], favIds, onSelect, onClose }) {
  const [search, setSearch] = useState("");
  const [onlyFavs, setOnlyFavs] = useState(false);

  const hasFavs = favIds && favIds.size > 0;

  const filtered = recipes.filter(r =>
    (!onlyFavs || (favIds && favIds.has(String(r.id)))) &&
    (!search || r.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.kategorie?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      <div onClick={onClose} className={styles.overlay} />
      <div className={styles.sheet}>
        <div className={styles.handle}>
          <div className={styles.handleBar} />
        </div>

        <div className={styles.header}>
          <span className={styles.headerTitle}>Rezept hinzufügen</span>
          <button onClick={onClose} className={styles.closeBtn}>✕</button>
        </div>

        <div className={styles.searchArea}>
          <input
            className={styles.searchInput}
            placeholder="Rezept suchen…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          {hasFavs && (
            <button
              onClick={() => setOnlyFavs(v => !v)}
              className={`${styles.favToggle}${onlyFavs ? ` ${styles.active}` : ''}`}
            >
              {onlyFavs ? "❤️" : "🤍"} Nur Favoriten
            </button>
          )}
        </div>

        <div className={styles.list}>
          {filtered.length === 0 ? (
            <div className={styles.empty}>
              {onlyFavs ? "Keine Favoriten gefunden." : "Keine Rezepte gefunden."}
            </div>
          ) : filtered.map(r => (
            <button key={r.id} onClick={() => { onSelect(r); onClose(); }} className={styles.item}>
              {r.image_url
                ? <img src={r.image_url} alt="" className={styles.itemThumb} />
                : <div className={styles.itemThumbPlaceholder}>🍽️</div>
              }
              <div className={styles.itemInfo}>
                <div className={styles.itemName}>{r.name}</div>
                {r.kategorie && <div className={styles.itemKat}>{r.kategorie}</div>}
              </div>
              <div className={styles.coinBadge}>🪙 {r.coins}</div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
