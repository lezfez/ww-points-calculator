import { useState, useMemo } from "react";
import { useAuth } from "@clerk/clerk-react";
import RecipeCard from "../RecipeCard";
import Card from "../ui/Card";
import Button from "../ui/Button";
import { useDebounce } from "../../hooks/useDebounce";
import { useRecipeFavorites, FREE_RECIPE_FAV_LIMIT } from "../../hooks/useRecipeFavorites";
import styles from "./TabRecipes.module.css";

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
    ["Alle", ...Array.from(new Set(recipes.flatMap(r => r.kategorienLabels || [])))],
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
    if (favIds.has(id)) await removeFavorite(id);
    else await addFavorite(id);
  };

  return (
    <div className="tab-content">
      <Card>
        <div className={styles.title}>Rezepte</div>
        <div className={styles.subtitle}>
          {loading
            ? "Rezepte werden geladen…"
            : error
              ? "Rezepte sind gerade nicht erreichbar."
              : `${recipes.length} Rezepte mit Coins-Werten – direkt von weightfriends.at`}
        </div>

        <input className={`app-input ${styles.searchInput}`} placeholder="Rezept oder Zutat suchen…" value={search} onChange={e => setSearch(e.target.value)} />

        <div className={styles.filterRow}>
          {isSignedIn && (
            <button
              className={`${styles.chip}${showOnlyFavs ? ` ${styles.active}` : ''}`}
              onClick={() => setShowOnlyFavs(v => !v)}
            >
              {showOnlyFavs ? "❤️" : "🤍"} Favoriten
              {isSignedIn && favStatus !== "loading" && favorites.length > 0 && (
                <span className={styles.chipCount}>({favorites.length})</span>
              )}
            </button>
          )}
          {kategorien.map(k => (
            <button key={k} className={`${styles.chip}${kat === k ? ` ${styles.active}` : ''}`} onClick={() => setKat(k)}>{k}</button>
          ))}
        </div>

        <div className={styles.sortRow}>
          {[["default", "🔀 Standard"], ["coins-asc", "🪙 Coins ↑"], ["coins-desc", "🪙 Coins ↓"]].map(([v, label]) => (
            <button key={v} className={`${styles.chip}${sort === v ? ` ${styles.active}` : ''}`} onClick={() => setSort(v)}>{label}</button>
          ))}
        </div>

        {isSignedIn && atLimit && (
          <div className={styles.limitWarning}>
            <div className={styles.limitTitle}>Limit erreicht ({FREE_RECIPE_FAV_LIMIT} Favoriten)</div>
            <div className={styles.limitSub}>Mit Premium kannst du unbegrenzt Rezepte als Favoriten speichern.</div>
          </div>
        )}
      </Card>

      {loading ? (
        <Card className={styles.stateCard}>
          <div className={styles.stateIcon}>🌿</div>
          <span>Rezepte werden geladen…</span>
        </Card>
      ) : error ? (
        <Card className={styles.stateCard}>
          <div className={styles.errorTitle}>Rezepte konnten nicht geladen werden</div>
          <p className={styles.errorDesc}>
            Die Verbindung zur Datenbank ist fehlgeschlagen. Bitte prüfe die Verbindung oder versuche es erneut.
          </p>
          <Button onClick={onReload} style={{ width: "auto", padding: "12px 24px" }}>
            Erneut laden
          </Button>
        </Card>
      ) : filteredRecipes.length === 0 ? (
        <Card className={styles.stateCard}>
          {showOnlyFavs && favorites.length === 0
            ? "Noch keine Favoriten. Tippe auf 🤍 bei einem Rezept, um es zu speichern."
            : recipes.length === 0 ? "Noch keine Rezepte vorhanden." : "Keine Rezepte gefunden."}
        </Card>
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

      <p className={styles.footerNote}>Rezepte und Bilder wurden von einer KI erstellt.</p>
    </div>
  );
}
