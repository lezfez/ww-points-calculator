import { C, FH, FB, sh } from "../styles/theme";

export default function RecipeCard({ recipe, onSelect, selected }) {
  const toggleRecipe = () => onSelect(selected ? null : recipe.id);
  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleRecipe();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={selected}
      className={`recipe-card${selected ? " recipe-card--open" : ""}`}
      style={{ background: C.surface, border: `1.5px solid ${selected ? C.green : C.border}`, borderRadius: 18, padding: "16px 18px", cursor: "pointer", boxShadow: selected ? `0 0 0 3px ${C.greenPale}, ${sh.sm}` : sh.xs }}
      onClick={toggleRecipe}
      onKeyDown={handleKeyDown}
    >
      {recipe.image_url && (
        <img
          src={recipe.image_url}
          alt={`Rezeptbild: ${recipe.name}`}
          loading="lazy"
          style={{
            display: "block",
            width: "100%",
            aspectRatio: "4 / 3",
            objectFit: "cover",
            borderRadius: 12,
            marginBottom: 12,
            border: `1px solid ${C.border}`,
            background: C.surface2,
          }}
        />
      )}
      <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: C.coinBg, border: `1px solid ${C.coinBorder}`, color: C.coinText, fontWeight: 700, fontFamily: FH, fontStyle: "italic", fontSize: 14, padding: "4px 12px 4px 10px", borderRadius: 999, marginBottom: 9 }}>
        🪙 {recipe.coins} Coins
      </div>
      <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 9, lineHeight: 1.4, fontFamily: FB }}>
        {recipe.name}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {[recipe.kategorie, `⏱ ${recipe.zeit}`, `👥 ${recipe.portionen} Port.`].map(tag => (
          <span key={tag} style={{ padding: "4px 10px", borderRadius: 999, background: C.surface2, color: C.sub, fontSize: 11, fontWeight: 600, fontFamily: FB }}>{tag}</span>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 12, color: selected ? C.green : C.muted, fontWeight: 700 }}>
          {selected ? "▲" : "▼"}
        </span>
      </div>
      {selected && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: C.muted, marginBottom: 8, fontFamily: FB }}>Zutaten</div>
          <ul style={{ margin: "0 0 14px", padding: "0 0 0 18px", lineHeight: 1.9, textAlign: "left", fontSize: 13, color: C.text, fontFamily: FB }}>
            {recipe.zutaten.map(z => <li key={z}>{z}</li>)}
          </ul>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: C.muted, marginBottom: 8, fontFamily: FB }}>Zubereitung</div>
          <p style={{ margin: "0 0 12px", lineHeight: 1.8, fontSize: 13, color: C.text, fontFamily: FB }}>{recipe.zubereitung}</p>
          {recipe.hinweis && (
            <div style={{ background: C.greenPale, border: `1px solid rgba(34,139,34,.15)`, borderRadius: 9, padding: "8px 12px", fontSize: 12, color: C.green2, marginBottom: 12, fontFamily: FB }}>
              ℹ️ {recipe.hinweis}
            </div>
          )}
          <a href={recipe.url} target="_blank" rel="noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: C.green, fontWeight: 700, textDecoration: "none", fontFamily: FB, cursor: "pointer" }}
            onClick={e => e.stopPropagation()}>
            → Rezept auf weightfriends.at
          </a>
        </div>
      )}
    </div>
  );
}
