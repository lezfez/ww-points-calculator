import { useEffect, useMemo, useState } from "react";
import { C, FH, FB, card, sectionLabel, primaryBtn } from "../../styles/theme";
import { useDailyJournal } from "../../hooks/useDailyJournal";
import FoodSearch from "../FoodSearch";

const FOOD_FAVORITES_KEY = "food:favorites";
const LEGACY_FOOF_FAVORITES_KEY = "foof:favorites";
const MEALS = [
  { id: "fruehstueck", label: "Frühstück" },
  { id: "snack1", label: "Snack 1" },
  { id: "mittag", label: "Mittag" },
  { id: "abend", label: "Abend" },
  { id: "snack2", label: "Snack 2" },
];

function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

function readFavorites() {
  try {
    const currentRaw = localStorage.getItem(FOOD_FAVORITES_KEY);
    if (currentRaw) {
      const currentParsed = JSON.parse(currentRaw);
      return Array.isArray(currentParsed) ? currentParsed : [];
    }

    const legacyRaw = localStorage.getItem(LEGACY_FOOF_FAVORITES_KEY);
    if (!legacyRaw) return [];

    const legacyParsed = JSON.parse(legacyRaw);
    if (!Array.isArray(legacyParsed)) return [];
    localStorage.setItem(FOOD_FAVORITES_KEY, JSON.stringify(legacyParsed));
    return legacyParsed;
  } catch {
    return [];
  }
}

function saveFavorites(items) {
  localStorage.setItem(FOOD_FAVORITES_KEY, JSON.stringify(items));
}

export default function TabFood({ isSignedIn, onSignIn }) {
  const [date, setDate] = useState(toISODate(new Date()));
  const [mealSlot, setMealSlot] = useState("mittag");
  const [showSearch, setShowSearch] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [lastAdded, setLastAdded] = useState(null);

  const { entry, loading, saveState, updateMeal } = useDailyJournal(date);

  useEffect(() => {
    setFavorites(readFavorites());
  }, []);

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

  const addFavorite = (item) => {
    const existing = favorites.some((f) => f.name === item.name && Number(f.coins) === Number(item.coins));
    if (existing) return;
    const next = [{ name: item.name, coins: item.coins }, ...favorites].slice(0, 30);
    setFavorites(next);
    saveFavorites(next);
  };

  const removeFavorite = (idx) => {
    const next = favorites.filter((_, i) => i !== idx);
    setFavorites(next);
    saveFavorites(next);
  };

  if (!isSignedIn) {
    return (
      <div className="tab-content" style={{ ...card, textAlign: "center", padding: "40px 24px" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🥗</div>
        <div style={{ fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 20, color: C.text, marginBottom: 8 }}>
          Food
        </div>
        <p style={{ fontSize: 13, color: C.sub, fontFamily: FB, marginBottom: 14 }}>
          Bitte melde dich an, damit du Lebensmittel suchen, scannen und als Mahlzeit eintragen kannst.
        </p>
        <button className="btn-primary" style={primaryBtn(true)} onClick={onSignIn}>Anmelden</button>
      </div>
    );
  }

  return (
    <div className="tab-content" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={card}>
        <div style={{ fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 22, color: C.text, marginBottom: 4 }}>
          🥗 Food
        </div>
        <p style={{ fontFamily: FB, fontSize: 13, color: C.sub, lineHeight: 1.6, margin: 0 }}>
          Lebensmittel suchen, scannen und direkt in dein Tagebuch eintragen.
        </p>
      </div>

      <div style={card}>
        <div style={sectionLabel}>Mahlzeit-Ziel</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontFamily: FB, fontSize: 12, color: C.sub }}>
            Datum
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.surface, color: C.text, padding: "10px 12px", fontFamily: FB }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontFamily: FB, fontSize: 12, color: C.sub }}>
            Slot
            <select
              value={mealSlot}
              onChange={(e) => setMealSlot(e.target.value)}
              style={{ borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.surface, color: C.text, padding: "10px 12px", fontFamily: FB }}
            >
              {MEALS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </label>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <span style={{ fontFamily: FB, fontSize: 12, color: C.muted, alignSelf: "center" }}>
            {loading ? "Lade…" : `${mealItems.length} Einträge · ${mealCoins} Coins`}
          </span>
          {saveState !== "idle" && (
            <span style={{ fontFamily: FB, fontSize: 12, color: saveState === "saved" ? C.green : saveState === "error" ? "#B91C1C" : C.muted, alignSelf: "center" }}>
              {saveState === "saving" ? "Speichert…" : saveState === "saved" ? "✓ gespeichert" : "✗ Fehler"}
            </span>
          )}
        </div>

        {lastAdded && (
          <div style={{ marginTop: 10, padding: "8px 10px", background: C.greenPale, border: `1px solid ${C.border}`, borderRadius: 10, display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
            <div style={{ fontFamily: FB, fontSize: 12, color: C.sub, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              Zuletzt eingetragen: {lastAdded.name}
            </div>
            <button
              onClick={() => addFavorite(lastAdded)}
              style={{ border: "none", background: C.green, color: "#fff", borderRadius: 999, padding: "4px 10px", fontFamily: FB, fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}
            >
              Als Favorit
            </button>
          </div>
        )}
      </div>

      <div style={card}>
        <div style={sectionLabel}>Suche &amp; Scan</div>
        <p style={{ fontFamily: FB, fontSize: 12, color: C.muted, marginTop: 0, marginBottom: 10 }}>
          Lebensmittel suchen oder Barcode scannen und direkt in den gewählten Slot eintragen.
        </p>
        {!showSearch && (
          <button
            className="btn-primary"
            style={{ ...primaryBtn(true), width: "auto", padding: "10px 16px", display: "inline-block" }}
            onClick={() => setShowSearch(true)}
          >
            🔎 Suche öffnen
          </button>
        )}

        {showSearch && (
          <div style={{ marginTop: 8 }}>
            <FoodSearch
              inline
              onClose={() => setShowSearch(false)}
              onAdd={(item) => {
                addItemToMeal(item);
                setShowSearch(false);
              }}
            />
          </div>
        )}
      </div>

      <div style={card}>
        <div style={sectionLabel}>Favoriten</div>
        {favorites.length === 0 && (
          <div style={{ fontFamily: FB, fontSize: 12, color: C.muted }}>
            Noch keine Favoriten. Tippe nach dem Eintragen auf Als Favorit.
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {favorites.map((fav, idx) => (
            <div key={`${fav.name}-${idx}`} style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${C.border}`, borderRadius: 10, background: C.surface, padding: "8px 10px" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: FB, fontSize: 13, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fav.name}</div>
                <div style={{ fontFamily: FB, fontSize: 11, color: C.muted }}>{fav.coins} Coins</div>
              </div>
              <button
                onClick={() => addItemToMeal({ id: Date.now(), name: fav.name, coins: fav.coins })}
                style={{ border: "none", background: C.green, color: "#fff", borderRadius: 8, padding: "6px 10px", fontFamily: FB, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
              >
                + Mahlzeit
              </button>
              <button
                onClick={() => removeFavorite(idx)}
                style={{ border: `1px solid ${C.border}`, background: C.surface2, color: C.muted, borderRadius: 8, padding: "6px 8px", fontFamily: FB, fontSize: 12, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
