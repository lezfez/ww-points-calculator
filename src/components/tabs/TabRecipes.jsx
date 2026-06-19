import { useState, useMemo } from "react";
import { useAuth } from "@clerk/clerk-react";
import RecipeCard from "../RecipeCard";
import { C, FH, FB, card, inputStyle, primaryBtn, filterChip } from "../../styles/theme";
import { useDebounce } from "../../hooks/useDebounce";
import { useRecipeFavorites, FREE_RECIPE_FAV_LIMIT } from "../../hooks/useRecipeFavorites";

export default function TabRecipes({ recipes, loading, error, onReload, isSignedIn = false, isPremium = false }) {
  const { getToken } = useAuth();
  const [search, setSearch] = useState("");
  const [kat, setKat] = useState("Alle");
  const [sort, setSort] = useState("default");
  const [openRecipe, setOpenRecipe] = useState(null);
  const [showOnlyFavs, setShowOnlyFavs] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const { favorites, favIds, favStatus, atLimit, addFavorite, removeFavorite } = useRecipeFavorites(getToken, isPremium, isSignedIn);

  const kategorien = useMemo(() =>
    [
      "Alle",
      ...Array.from(new Set(recipes.flatMap(r => r.kategorienLabels || []))),
    ],
  [recipes]);

  const filteredRecipes = useMemo(() => {
    const filtered = recipes.filter(r =>
      (!showOnlyFavs || favIds.has(String(r.id))) &&
      (kat === "Alle" || (r.kategorienLabels || []).includes(kat)) &&
      (debouncedSearch === "" || r.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        r.zutaten.some(z => z.toLowerCase().includes(debouncedSearch.toLowerCase())))
    );
    if (sort === "coins-asc")  return [...filtered].sort((a, b) => a.coins - b.coins);
    if (sort === "coins-desc") return [...filtered].sort((a, b) => b.coins - a.coins);
    return filtered;
  }, [recipes, kat, debouncedSearch, sort, showOnlyFavs, favIds]);

  const handleToggleFavorite = async (recipeId) => {
    const id = String(recipeId);
    if (favIds.has(id)) {
      await removeFavorite(id);
    } else {
      await addFavorite(id);
    }
  };

  return (
    <div className="tab-content">
      <div style={card}>
        <div style={{ fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 22, color: C.text, marginBottom: 4 }}>
          Rezepte
        </div>
        <div style={{ fontSize: 13, color: C.sub, marginBottom: 16, fontFamily: FB }}>
          {loading
            ? "Rezepte werden geladen…"
            : error
              ? "Rezepte sind gerade nicht erreichbar."
              : `${recipes.length} Rezepte mit Coins-Werten – direkt von weightfriends.at`}
        </div>
        <input className="app-input" style={{ ...inputStyle, marginBottom: 14 }} placeholder="Rezept oder Zutat suchen…" value={search} onChange={e => setSearch(e.target.value)} />
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 10 }}>
          {isSignedIn && (
            <button
              style={{
                ...filterChip(showOnlyFavs),
                display: "flex", alignItems: "center", gap: 4,
              }}
              onClick={() => setShowOnlyFavs(v => !v)}
            >
              {showOnlyFavs ? "❤️" : "🤍"} Favoriten
              {isSignedIn && favStatus !== "loading" && favorites.length > 0 && (
                <span style={{ fontSize: 10, opacity: 0.75 }}>({favorites.length})</span>
              )}
            </button>
          )}
          {kategorien.map(k => <button key={k} style={filterChip(kat === k)} onClick={() => setKat(k)}>{k}</button>)}
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {[["default", "🔀 Standard"], ["coins-asc", "🪙 Coins ↑"], ["coins-desc", "🪙 Coins ↓"]].map(([v, label]) => (
            <button key={v} style={filterChip(sort === v)} onClick={() => setSort(v)}>{label}</button>
          ))}
        </div>

        {isSignedIn && atLimit && (
          <div style={{ marginTop: 12, padding: "8px 12px", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 10 }}>
            <div style={{ fontFamily: FB, fontSize: 12, color: "#92400E", fontWeight: 700, marginBottom: 2 }}>
              Limit erreicht ({FREE_RECIPE_FAV_LIMIT} Favoriten)
            </div>
            <div style={{ fontFamily: FB, fontSize: 11, color: "#B45309" }}>
              Mit Premium kannst du unbegrenzt Rezepte als Favoriten speichern.
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ ...card, textAlign: "center", color: C.muted, padding: "44px 24px" }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>🌿</div>
          <span style={{ fontFamily: FB }}>Rezepte werden geladen…</span>
        </div>
      ) : error ? (
        <div style={{ ...card, textAlign: "center", color: C.sub, padding: "44px 24px", fontFamily: FB }}>
          <div style={{ fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 21, color: C.coinText, marginBottom: 8 }}>
            Rezepte konnten nicht geladen werden
          </div>
          <p style={{ margin: "0 auto 18px", maxWidth: 440, fontSize: 13, lineHeight: 1.7 }}>
            Die Verbindung zur Datenbank ist fehlgeschlagen. Bitte prüfe die Verbindung oder versuche es erneut.
          </p>
          <button onClick={onReload} className="btn-primary" style={{ ...primaryBtn(false), width: "auto", padding: "12px 24px", display: "inline-block", marginTop: 0 }}>
            Erneut laden
          </button>
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div style={{ ...card, textAlign: "center", color: C.muted, padding: "44px 24px", fontFamily: FB }}>
          {showOnlyFavs && favorites.length === 0
            ? "Noch keine Favoriten. Tippe auf 🤍 bei einem Rezept, um es zu speichern."
            : recipes.length === 0 ? "Noch keine Rezepte vorhanden." : "Keine Rezepte gefunden."}
        </div>
      ) : (
        <div className="recipe-grid">
          {filteredRecipes.map(r => (
            <RecipeCard
              key={r.id}
              recipe={r}
              selected={openRecipe === r.id}
              onSelect={setOpenRecipe}
              isFavorite={favIds.has(String(r.id))}
              onToggleFavorite={isSignedIn ? handleToggleFavorite : undefined}
            />
          ))}
        </div>
      )}

      <p style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 18, fontStyle: "italic", lineHeight: 1.6, fontFamily: FB }}>
        Rezepte und Bilder wurden von einer KI erstellt.
      </p>
    </div>
  );
}
