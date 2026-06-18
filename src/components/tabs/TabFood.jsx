import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { C, FH, FB, card, sectionLabel, primaryBtn } from "../../styles/theme";
import { useDailyJournal } from "../../hooks/useDailyJournal";
import FoodSearch from "../FoodSearch";

const FOOD_FAVORITES_CACHE_KEY = "food:favorites:cache";
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

function readCache() {
  try {
    const raw = localStorage.getItem(FOOD_FAVORITES_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCache(items) {
  try {
    localStorage.setItem(FOOD_FAVORITES_CACHE_KEY, JSON.stringify(items));
  } catch {
    /* storage quota exceeded — ignore */
  }
}

function useFavorites(getToken) {
  const [favorites, setFavorites] = useState(readCache);
  const [favStatus, setFavStatus] = useState("loading"); // idle | loading | error
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchFavorites = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch("/api/user-profile?action=favorites", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (!mountedRef.current) return;
      setFavorites(data);
      writeCache(data);
      setFavStatus("idle");
    } catch {
      if (mountedRef.current) setFavStatus("error");
    }
  }, [getToken]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchFavorites();
  }, [fetchFavorites]);

  const addFavorite = useCallback(async (item) => {
    const already = favorites.some(
      (f) => f.name === item.name && Number(f.coins) === Number(item.coins)
    );
    if (already) return;

    // optimistic
    const optimistic = [{ id: `tmp-${Date.now()}`, name: item.name, coins: item.coins }, ...favorites];
    setFavorites(optimistic);
    writeCache(optimistic);

    try {
      const token = await getToken();
      const res = await fetch("/api/user-profile?action=favorites", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: item.name, coins: item.coins }),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved = await res.json();
      if (!mountedRef.current) return;
      // replace optimistic entry with real id
      setFavorites((prev) => {
        const next = prev.map((f) => (f.id === optimistic[0].id ? saved : f));
        writeCache(next);
        return next;
      });
    } catch {
      // revert
      if (mountedRef.current) {
        setFavorites(favorites);
        writeCache(favorites);
      }
    }
  }, [favorites, getToken]);

  const removeFavorite = useCallback(async (fav) => {
    // optimistic
    const next = favorites.filter((f) => f.id !== fav.id);
    setFavorites(next);
    writeCache(next);

    try {
      const token = await getToken();
      await fetch("/api/user-profile?action=favorites", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: fav.id }),
      });
    } catch {
      // revert
      if (mountedRef.current) {
        setFavorites(favorites);
        writeCache(favorites);
      }
    }
  }, [favorites, getToken]);

  return { favorites, favStatus, addFavorite, removeFavorite };
}

export default function TabFood({ isSignedIn, onSignIn }) {
  const { getToken } = useAuth();
  const [date, setDate] = useState(toISODate(new Date()));
  const [mealSlot, setMealSlot] = useState("mittag");
  const [showSearch, setShowSearch] = useState(false);
  const [lastAdded, setLastAdded] = useState(null);
  const [favQuery, setFavQuery] = useState("");

  const { entry, loading, saveState, updateMeal } = useDailyJournal(date);
  const { favorites, favStatus, addFavorite, removeFavorite } = useFavorites(getToken);

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
          <div style={{ marginTop: 10, padding: "8px 10px", background: C.greenPale, border: `1px solid ${C.border}`, borderRadius: 10 }}>
            <div style={{ fontFamily: FB, fontSize: 12, color: C.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              ✓ Eingetragen: {lastAdded.name}
            </div>
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
              favorites={favorites}
              onToggleFavorite={(_food, favName, favCoins, existingFav) => {
                if (existingFav) {
                  removeFavorite(existingFav);
                } else {
                  addFavorite({ name: favName, coins: favCoins });
                }
              }}
            />
          </div>
        )}
      </div>

      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={sectionLabel}>Favoriten</div>
          {favStatus === "loading" && (
            <span style={{ fontFamily: FB, fontSize: 11, color: C.muted }}>Lade…</span>
          )}
          {favStatus === "error" && (
            <span style={{ fontFamily: FB, fontSize: 11, color: "#B91C1C" }}>Sync-Fehler</span>
          )}
        </div>
        {favorites.length === 0 && favStatus !== "loading" ? (
          <div style={{ fontFamily: FB, fontSize: 12, color: C.muted }}>
            Noch keine Favoriten. Tippe in der Suche auf ❤️ um Lebensmittel zu speichern.
          </div>
        ) : favorites.length > 4 && (
          <input
            placeholder="Favoriten filtern…"
            value={favQuery}
            onChange={e => setFavQuery(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.surface, color: C.text, fontFamily: FB, fontSize: 13, marginBottom: 10 }}
          />
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {favQuery && !favorites.some(f => f.name.toLowerCase().includes(favQuery.toLowerCase())) && (
            <div style={{ fontFamily: FB, fontSize: 12, color: C.muted }}>Kein Favorit gefunden.</div>
          )}
          {favorites.filter(fav => !favQuery || fav.name.toLowerCase().includes(favQuery.toLowerCase())).map((fav) => (
            <div key={fav.id} style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${C.border}`, borderRadius: 10, background: C.surface, padding: "8px 10px" }}>
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
                onClick={() => removeFavorite(fav)}
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
