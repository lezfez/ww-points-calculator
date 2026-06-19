import { useMemo, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import { useDailyJournal } from "../../hooks/useDailyJournal";
import { useFavorites, FREE_FAV_LIMIT } from "../../hooks/useFavorites";
import FoodSearch from "../FoodSearch";
import styles from "./TabFood.module.css";

const MEALS = [
  { id: "fruehstueck", label: "Frühstück" },
  { id: "snack1", label: "Snack 1" },
  { id: "mittag", label: "Mittag" },
  { id: "abend", label: "Abend" },
  { id: "snack2", label: "Snack 2" },
];

function toISODate(d) { return d.toISOString().slice(0, 10); }

export default function TabFood({ isSignedIn, onSignIn, isPremium = false }) {
  const { getToken } = useAuth();
  const [date, setDate] = useState(toISODate(new Date()));
  const [mealSlot, setMealSlot] = useState("mittag");
  const [showSearch, setShowSearch] = useState(false);
  const [lastAdded, setLastAdded] = useState(null);
  const [favQuery, setFavQuery] = useState("");

  const { entry, loading, saveState, updateMeal } = useDailyJournal(date);
  const { favorites, favStatus, atLimit, addFavorite, removeFavorite } = useFavorites(getToken, isPremium);

  const mealItems = useMemo(() => entry?.meals?.[mealSlot] || [], [entry, mealSlot]);
  const mealCoins = useMemo(
    () => mealItems.reduce((sum, item) => sum + (parseInt(item.coins, 10) || 0), 0),
    [mealItems]
  );

  const addItemToMeal = (item) => {
    const next = [...(entry?.meals?.[mealSlot] || []), item];
    updateMeal(mealSlot, next);
    setLastAdded(item);
  };

  if (!isSignedIn) {
    return (
      <div className="tab-content">
        <Card className={styles.guestCard}>
          <div className={styles.guestEmoji}>🥗</div>
          <div className={styles.guestTitle}>Food</div>
          <p className={styles.guestText}>
            Bitte melde dich an, damit du Lebensmittel suchen, scannen und als Mahlzeit eintragen kannst.
          </p>
          <Button onClick={onSignIn}>Anmelden</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className={`tab-content ${styles.column}`}>
      <Card>
        <div className={styles.title}>🥗 Food</div>
        <p className={styles.subtitle}>Lebensmittel suchen, scannen und direkt in dein Tagebuch eintragen.</p>
      </Card>

      <Card>
        <div className="section-label">Mahlzeit-Ziel</div>
        <div className={styles.goalGrid}>
          <label className={styles.fieldLabel}>
            Datum
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={styles.dateInput} />
          </label>
          <label className={styles.fieldLabel}>
            Slot
            <select value={mealSlot} onChange={e => setMealSlot(e.target.value)} className={styles.slotSelect}>
              {MEALS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </label>
        </div>

        <div className={styles.statusRow}>
          <span className={styles.statusText}>
            {loading ? "Lade…" : `${mealItems.length} Einträge · ${mealCoins} Coins`}
          </span>
          {saveState !== "idle" && (
            <span className={saveState === "saved" ? styles.saveOk : saveState === "error" ? styles.saveErr : styles.statusText}>
              {saveState === "saving" ? "Speichert…" : saveState === "saved" ? "✓ gespeichert" : "✗ Fehler"}
            </span>
          )}
        </div>

        {lastAdded && (
          <div className={styles.lastAdded}>
            <div className={styles.lastAddedText}>✓ Eingetragen: {lastAdded.name}</div>
          </div>
        )}
      </Card>

      <Card>
        <div className="section-label">Suche &amp; Scan</div>
        <p className={styles.searchHint}>
          Lebensmittel suchen oder Barcode scannen und direkt in den gewählten Slot eintragen.
        </p>
        {!showSearch && (
          <Button onClick={() => setShowSearch(true)} style={{ width: "auto", padding: "10px 16px" }}>
            🔎 Suche öffnen
          </Button>
        )}
        {showSearch && (
          <div className={styles.searchWrap}>
            <FoodSearch
              inline
              onClose={() => setShowSearch(false)}
              onAdd={(item) => { addItemToMeal(item); setShowSearch(false); }}
              favorites={favorites}
              onToggleFavorite={(_food, favName, favCoins, existingFav) => {
                if (existingFav) removeFavorite(existingFav);
                else addFavorite({ name: favName, coins: favCoins });
              }}
            />
          </div>
        )}
      </Card>

      <Card>
        <div className={styles.favHeader}>
          <div className="section-label" style={{ marginBottom: 0 }}>Favoriten</div>
          {favStatus === "loading" && <span className={styles.favStatus}>Lade…</span>}
          {favStatus === "error"   && <span className={styles.favError}>Sync-Fehler</span>}
          {!isPremium && favStatus !== "loading" && (
            <span className={`${styles.favCount}${atLimit ? ` ${styles.atLimit}` : ''}`}>
              {favorites.length} / {FREE_FAV_LIMIT}
            </span>
          )}
        </div>

        {favorites.length === 0 && favStatus !== "loading" ? (
          <div className={styles.favEmpty}>
            Noch keine Favoriten. Tippe in der Suche auf ❤️ um Lebensmittel zu speichern.
          </div>
        ) : (
          <>
            {favorites.length > 4 && (
              <input
                placeholder="Favoriten filtern…"
                value={favQuery}
                onChange={e => setFavQuery(e.target.value)}
                className={styles.favFilterInput}
              />
            )}
            {atLimit && (
              <div className={styles.limitWarning}>
                <div className={styles.limitTitle}>Limit erreicht ({FREE_FAV_LIMIT} Favoriten)</div>
                <div className={styles.limitSub}>Mit Premium kannst du unbegrenzt Favoriten speichern.</div>
              </div>
            )}
          </>
        )}

        <div className={styles.favList}>
          {favQuery && !favorites.some(f => f.name.toLowerCase().includes(favQuery.toLowerCase())) && (
            <div className={styles.favNoMatch}>Kein Favorit gefunden.</div>
          )}
          {favorites.filter(fav => !favQuery || fav.name.toLowerCase().includes(favQuery.toLowerCase())).map(fav => (
            <div key={fav.id} className={styles.favItem}>
              <div className={styles.favItemName}>
                <div className={styles.favItemLabel}>{fav.name}</div>
                <div className={styles.favItemCoins}>{fav.coins} Coins</div>
              </div>
              <button onClick={() => addItemToMeal({ id: Date.now(), name: fav.name, coins: fav.coins })} className={styles.favAddBtn}>
                + Mahlzeit
              </button>
              <button onClick={() => removeFavorite(fav)} className={styles.favRemoveBtn}>✕</button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
