import styles from './RecipeCard.module.css';

export default function RecipeCard({ recipe, onSelect, selected, isFavorite = false, onToggleFavorite }) {
  const toggleRecipe = () => onSelect(selected ? null : recipe.id);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleRecipe();
    }
  };

  const hasShortDescriptionHtml = !!String(recipe.shortDescriptionHtml || "").trim();
  const hasInstructionsHtml = !!String(recipe.instructionsHtml || "").trim();

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={selected}
      className={`${styles.card}${selected ? ` ${styles.open}` : ''}`}
      onClick={toggleRecipe}
      onKeyDown={handleKeyDown}
    >
      {recipe.image_url && (
        <img
          src={recipe.image_url}
          alt={`Rezeptbild: ${recipe.name}`}
          loading="lazy"
          className={styles.image}
        />
      )}

      <div className={styles.coinBadge}>
        🪙 {recipe.coins} Coins
      </div>

      <div className={styles.title}>{recipe.name}</div>

      <div className={styles.tags}>
        {[recipe.kategorie, `⏱ ${recipe.zeit}`, `👥 ${recipe.portionen} Port.`].filter(Boolean).map(tag => (
          <span key={tag} className={styles.tag}>{tag}</span>
        ))}
        {onToggleFavorite && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(recipe.id); }}
            aria-label={isFavorite ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
            className={`${styles.favBtn}${isFavorite ? ` ${styles.active}` : ''}`}
          >
            {isFavorite ? "❤️" : "🤍"}
          </button>
        )}
        <span className={`${styles.arrow}${selected ? ` ${styles.open}` : ''}`}>
          {selected ? "▲" : "▼"}
        </span>
      </div>

      {selected && (
        <div className={styles.detail}>
          {hasShortDescriptionHtml && (
            <div
              className={styles.prose}
              onClick={e => e.stopPropagation()}
              dangerouslySetInnerHTML={{ __html: recipe.shortDescriptionHtml }}
            />
          )}
          <div className={styles.sectionLabel}>Zutaten</div>
          <ul className={styles.ingredients}>
            {recipe.zutaten.map(z => <li key={z}>{z}</li>)}
          </ul>
          <div className={styles.sectionLabel}>Zubereitung</div>
          {hasInstructionsHtml ? (
            <div
              className={styles.prose}
              onClick={e => e.stopPropagation()}
              dangerouslySetInnerHTML={{ __html: recipe.instructionsHtml }}
            />
          ) : (
            <p className={styles.prose}>{recipe.zubereitung}</p>
          )}
          {recipe.hinweis && (
            <div className={styles.hinweis}>ℹ️ {recipe.hinweis}</div>
          )}
          <a
            href={recipe.url}
            target="_blank"
            rel="noreferrer"
            className={styles.sourceLink}
            onClick={e => e.stopPropagation()}
          >
            → Rezeptquelle
          </a>
        </div>
      )}
    </div>
  );
}
