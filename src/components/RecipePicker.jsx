import { useState } from "react";
import { C, FH, FB } from "../styles/theme";

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
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 200 }}
      />
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 201,
        background: C.bg, borderRadius: "20px 20px 0 0",
        boxShadow: "0 -6px 40px rgba(0,0,0,.18)",
        maxHeight: "72vh", display: "flex", flexDirection: "column",
      }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: C.border }} />
        </div>

        {/* Header */}
        <div style={{ padding: "10px 20px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 17, color: C.text }}>
            Rezept hinzufügen
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: C.muted, lineHeight: 1, padding: 0 }}>✕</button>
        </div>

        {/* Search */}
        <div style={{ padding: "0 16px 10px" }}>
          <input
            className="app-input"
            placeholder="Rezept suchen…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            style={{
              width: "100%", padding: "9px 14px", borderRadius: 10,
              border: `1.5px solid ${C.border}`, background: C.surface,
              fontFamily: FB, fontSize: 13, color: C.text, boxSizing: "border-box",
            }}
          />
          {hasFavs && (
            <button
              onClick={() => setOnlyFavs(v => !v)}
              style={{
                marginTop: 8,
                padding: "6px 14px",
                borderRadius: 999,
                border: `1.5px solid ${onlyFavs ? "#E53E3E" : C.border}`,
                background: onlyFavs ? "#FFF5F5" : C.surface,
                color: onlyFavs ? "#C53030" : C.muted,
                fontFamily: FB, fontSize: 12, fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {onlyFavs ? "❤️" : "🤍"} Nur Favoriten
            </button>
          )}
        </div>

        {/* List */}
        <div style={{ overflowY: "auto", padding: "0 16px 28px", flex: 1 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "28px 0", color: C.muted, fontFamily: FB, fontSize: 13 }}>
              {onlyFavs ? "Keine Favoriten gefunden." : "Keine Rezepte gefunden."}
            </div>
          ) : filtered.map(r => (
            <button
              key={r.id}
              onClick={() => { onSelect(r); onClose(); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "10px 12px", marginBottom: 7,
                background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
                cursor: "pointer", textAlign: "left",
              }}>
              {r.image_url
                ? <img src={r.image_url} alt="" style={{ width: 46, height: 34, borderRadius: 7, objectFit: "cover", flexShrink: 0 }} />
                : <div style={{ width: 46, height: 34, borderRadius: 7, background: C.surface2, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🍽️</div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: FB, fontWeight: 700, fontSize: 13, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {r.name}
                </div>
                {r.kategorie && (
                  <div style={{ fontSize: 11, color: C.muted, fontFamily: FB, marginTop: 2 }}>{r.kategorie}</div>
                )}
              </div>
              <div style={{
                flexShrink: 0, background: C.coinBg, border: `1px solid ${C.coinBorder}`,
                borderRadius: 999, padding: "3px 10px",
                fontSize: 12, fontWeight: 700, fontFamily: FH, fontStyle: "italic", color: C.coinText,
              }}>
                🪙 {r.coins}
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
