import { useState } from "react";
import { C, FH, FB } from "../styles/theme";
import { useFoodSearch } from "../hooks/useFoodSearch";

function NutriBadge({ label, value, unit = "g" }) {
  if (value == null) return null;
  return (
    <span style={{ fontSize: 10, color: C.muted, fontFamily: FB }}>
      <b style={{ color: C.sub }}>{label}</b> {value}{unit}
    </span>
  );
}

function PortionRow({ food, onAdd }) {
  const [grams, setGrams] = useState(food.serving_g || 100);
  const coins = Math.max(0, Math.round(food.coins_100g * grams / 100));

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, marginTop: 8,
      padding: "8px 10px", background: C.surface2, borderRadius: 9,
    }}>
      <input
        type="number" min="1" max="2000"
        value={grams}
        onChange={e => setGrams(Math.max(1, parseInt(e.target.value) || 1))}
        style={{
          width: 64, padding: "5px 8px", borderRadius: 7,
          border: `1.5px solid ${C.border}`, background: C.surface,
          fontFamily: FB, fontSize: 13, color: C.text, textAlign: "center",
        }}
      />
      <span style={{ fontFamily: FB, fontSize: 12, color: C.muted, flex: 1 }}>
        g
        {food.serving_label && (
          <button
            onClick={() => setGrams(food.serving_g || 100)}
            style={{ marginLeft: 6, fontSize: 10, color: C.green, background: "none", border: "none", cursor: "pointer", fontFamily: FB, padding: 0 }}>
            ({food.serving_label})
          </button>
        )}
      </span>
      <span style={{
        fontFamily: FH, fontStyle: "italic", fontWeight: 700,
        fontSize: 14, color: C.coinText, minWidth: 44, textAlign: "right",
      }}>
        🪙 {coins}
      </span>
      <button
        onClick={() => onAdd(food, grams, coins)}
        style={{
          padding: "6px 14px", borderRadius: 8, border: "none",
          background: C.green, color: "#fff", fontWeight: 700,
          fontSize: 13, cursor: "pointer", flexShrink: 0,
        }}>
        +
      </button>
    </div>
  );
}

export default function FoodSearch({ onAdd, onClose }) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(null);
  const { results, loading, search, clear } = useFoodSearch();

  const handleChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    setExpanded(null);
    search(v);
    if (!v) clear();
  };

  const handleAdd = (food, grams, coins) => {
    const label = grams === 100 ? "" : ` (${grams}g)`;
    const name = `${food.name}${food.brand ? ` · ${food.brand}` : ""}${label}`;
    onAdd({ id: Date.now(), name, coins });
    onClose();
  };

  return (
    <>
      <div onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 200 }} />

      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 201,
        background: C.bg, borderRadius: "20px 20px 0 0",
        boxShadow: "0 -6px 40px rgba(0,0,0,.18)",
        maxHeight: "80vh", display: "flex", flexDirection: "column",
      }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: C.border }} />
        </div>

        {/* Header */}
        <div style={{ padding: "10px 20px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 17, color: C.text }}>
            🔍 Lebensmittel suchen
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: C.muted, padding: 0 }}>✕</button>
        </div>

        {/* Search input */}
        <div style={{ padding: "0 16px 10px" }}>
          <input
            className="app-input"
            placeholder="z.B. Vollmilch, Haferflocken, Tofu…"
            value={query}
            onChange={handleChange}
            autoFocus
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 10,
              border: `1.5px solid ${C.border}`, background: C.surface,
              fontFamily: FB, fontSize: 14, color: C.text, boxSizing: "border-box",
            }}
          />
        </div>

        {/* Results */}
        <div style={{ overflowY: "auto", padding: "0 16px 28px", flex: 1 }}>
          {loading && (
            <div style={{ textAlign: "center", padding: "20px 0", color: C.muted, fontFamily: FB, fontSize: 13 }}>
              Suche…
            </div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div style={{ textAlign: "center", padding: "20px 0", color: C.muted, fontFamily: FB, fontSize: 13 }}>
              Keine Lebensmittel gefunden.
            </div>
          )}

          {!loading && results.map((food, i) => {
            const isOpen = expanded === i;
            return (
              <div key={food.off_id || food.id || i}
                style={{ marginBottom: 8, background: C.surface, border: `1px solid ${isOpen ? C.green : C.border}`, borderRadius: 12, overflow: "hidden", transition: "border-color .15s" }}>

                {/* Food row */}
                <button
                  onClick={() => setExpanded(isOpen ? null : i)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "11px 12px", background: "none", border: "none",
                    cursor: "pointer", textAlign: "left",
                  }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: FB, fontWeight: 700, fontSize: 13, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {food.name}
                    </div>
                    {food.brand && (
                      <div style={{ fontSize: 11, color: C.muted, fontFamily: FB }}>{food.brand}</div>
                    )}
                    <div style={{ display: "flex", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
                      <NutriBadge label="kcal" value={food.kcal_100g} unit="" />
                      <NutriBadge label="P" value={food.protein_100g} />
                      <NutriBadge label="KH" value={food.carbs_100g} />
                      <NutriBadge label="F" value={food.fat_100g} />
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: "right" }}>
                    <div style={{ fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 13, color: C.coinText }}>
                      🪙 {food.coins_100g}
                    </div>
                    <div style={{ fontSize: 10, color: C.muted, fontFamily: FB }}>/ 100g</div>
                  </div>
                  <span style={{ fontSize: 12, color: C.muted, flexShrink: 0 }}>{isOpen ? "▲" : "▼"}</span>
                </button>

                {/* Portion selector */}
                {isOpen && (
                  <div style={{ padding: "0 12px 12px", borderTop: `1px solid ${C.border}` }}>
                    <div style={{ fontFamily: FB, fontSize: 11, color: C.muted, marginBottom: 6, marginTop: 8 }}>
                      Menge eingeben:
                    </div>
                    <PortionRow food={food} onAdd={handleAdd} />
                  </div>
                )}
              </div>
            );
          })}

          {!query && (
            <div style={{ textAlign: "center", padding: "24px 0 8px", color: C.muted, fontFamily: FB, fontSize: 13 }}>
              Tippe mindestens 2 Zeichen um zu suchen.<br />
              <span style={{ fontSize: 11 }}>Daten von Open Food Facts</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
