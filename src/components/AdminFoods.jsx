import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import { C, FB, FH, card, sectionLabel, inputStyle, primaryBtn } from "../styles/theme";

const PAGE_SIZE = 25;

const NUTR_FIELDS = [
  { id: "kcal_100g",    label: "kcal",  step: 1  },
  { id: "protein_100g", label: "Prot.", step: 0.1 },
  { id: "carbs_100g",   label: "KH",   step: 0.1 },
  { id: "sugar_100g",   label: "Zuck.", step: 0.1 },
  { id: "fat_100g",     label: "Fett", step: 0.1 },
  { id: "sat_fat_100g", label: "Ges.F",step: 0.1 },
  { id: "fiber_100g",   label: "Bst.", step: 0.1 },
  { id: "salt_100g",    label: "Salz", step: 0.1 },
];

function useAdminFoodApi() {
  const { getToken } = useAuth();

  const authFetch = useCallback(async (url, options = {}) => {
    const token = await getToken();
    return fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) },
    });
  }, [getToken]);

  return { authFetch };
}

// ─── Stats card ─────────────────────────────────────────────
function StatsCard({ stats }) {
  if (!stats) return null;
  const items = [
    { label: "Gesamt",   value: stats.total,   color: C.text },
    { label: "OFF",      value: stats.off,     color: C.sub },
    { label: "Manuell",  value: stats.manual,  color: "#B45309" },
    { label: "Lückenhaft", value: stats.incomplete, color: "#DC2626" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
      {items.map(i => (
        <div key={i.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 12px", textAlign: "center" }}>
          <div style={{ fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 20, color: i.color }}>{i.value ?? "–"}</div>
          <div style={{ fontFamily: FB, fontSize: 10, color: C.muted, marginTop: 2 }}>{i.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Inline Edit Row ────────────────────────────────────────
function EditRow({ food, onSave, onCancel }) {
  const [draft, setDraft] = useState({ ...food });
  const set = (k, v) => setDraft(p => ({ ...p, [k]: v }));

  return (
    <div style={{ padding: "12px 14px", background: C.surface2, borderTop: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 2 }}>
          <div style={{ fontFamily: FB, fontSize: 10, color: C.muted, marginBottom: 3 }}>Name</div>
          <input className="app-input" style={{ ...inputStyle, padding: "7px 10px", fontSize: 12 }}
            value={draft.name} onChange={e => set("name", e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FB, fontSize: 10, color: C.muted, marginBottom: 3 }}>Marke</div>
          <input className="app-input" style={{ ...inputStyle, padding: "7px 10px", fontSize: 12 }}
            value={draft.brand || ""} onChange={e => set("brand", e.target.value)} />
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontFamily: FB, fontSize: 10, color: C.muted, marginBottom: 3 }}>Barcode (EAN/GTIN)</div>
        <input className="app-input" style={{ ...inputStyle, padding: "7px 10px", fontSize: 12 }}
          value={draft.barcode || ""} onChange={e => set("barcode", e.target.value.replace(/\D/g, ""))} placeholder="z.B. 9002490203541" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 10 }}>
        {NUTR_FIELDS.map(f => (
          <div key={f.id}>
            <div style={{ fontFamily: FB, fontSize: 10, color: C.muted, marginBottom: 2 }}>{f.label}/100g</div>
            <input type="number" step={f.step} className="app-input"
              style={{ ...inputStyle, padding: "6px 8px", fontSize: 12, textAlign: "right" }}
              value={draft[f.id] ?? ""} onChange={e => set(f.id, e.target.value === "" ? null : parseFloat(e.target.value))} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FB, fontSize: 10, color: C.muted, marginBottom: 2 }}>Portion (g)</div>
          <input type="number" className="app-input" style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }}
            value={draft.serving_g ?? ""} onChange={e => set("serving_g", e.target.value === "" ? null : parseFloat(e.target.value))} />
        </div>
        <div style={{ flex: 2 }}>
          <div style={{ fontFamily: FB, fontSize: 10, color: C.muted, marginBottom: 2 }}>Portionsbezeichnung</div>
          <input className="app-input" style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }}
            value={draft.serving_label || ""} onChange={e => set("serving_label", e.target.value)} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, fontFamily: FB, fontSize: 12, cursor: "pointer", color: C.sub }}>
          Abbrechen
        </button>
        <button onClick={() => onSave(draft)} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: C.green, color: "#fff", fontFamily: FB, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
          Speichern
        </button>
      </div>
    </div>
  );
}

// ─── Local DB view ──────────────────────────────────────────
function LocalDB({ authFetch, onStatsChange }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [foods, setFoods] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const debounce = useRef(null);

  const load = useCallback(async (query = q, pg = page) => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/admin-foods?q=${encodeURIComponent(query)}&page=${pg}`);
      const data = await res.json();
      setFoods(data.foods || []);
      setTotal(data.total || 0);
      onStatsChange();
    } finally {
      setLoading(false);
    }
  }, [authFetch, q, page, onStatsChange]);

  useEffect(() => { load(); }, []); // initial load

  const handleSearch = (v) => {
    setQ(v);
    setPage(1);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => load(v, 1), 400);
  };

  const handleDelete = async (id) => {
    if (!confirm("Lebensmittel wirklich löschen?")) return;
    await authFetch(`/api/admin-foods?id=${id}`, { method: "DELETE" });
    load();
  };

  const handleSave = async (draft) => {
    await authFetch(`/api/admin-foods?id=${draft.id}`, { method: "PUT", body: JSON.stringify(draft) });
    setEditId(null);
    load();
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      {/* Search + add */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input className="app-input" placeholder="Suchen…"
          value={q} onChange={e => handleSearch(e.target.value)}
          style={{ ...inputStyle, flex: 1, padding: "8px 12px", fontSize: 13 }} />
        <button onClick={() => setShowAdd(v => !v)}
          style={{ padding: "8px 14px", borderRadius: 9, border: "none", background: C.green, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", flexShrink: 0 }}>
          + Manuell
        </button>
      </div>

      {/* Manual add form */}
      {showAdd && (
        <ManualAddForm authFetch={authFetch} onSaved={() => { setShowAdd(false); load(); }} onCancel={() => setShowAdd(false)} />
      )}

      {/* Count */}
      <div style={{ fontFamily: FB, fontSize: 11, color: C.muted, marginBottom: 10 }}>
        {loading ? "Lade…" : `${total} Einträge`}
      </div>

      {/* Food list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {foods.map(food => (
          <div key={food.id} style={{ background: C.surface, border: `1px solid ${editId === food.id ? C.green : C.border}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: FB, fontWeight: 700, fontSize: 13, color: C.text }}>{food.name}</span>
                  {food.brand && <span style={{ fontSize: 11, color: C.muted, fontFamily: FB }}>· {food.brand}</span>}
                  {food.barcode && <span style={{ fontSize: 10, color: C.muted, fontFamily: FB }}>· #{food.barcode}</span>}
                  <span style={{ fontSize: 10, background: food.source === "manual" ? "#FEF3C7" : C.surface2, color: food.source === "manual" ? "#B45309" : C.muted, borderRadius: 999, padding: "1px 7px", fontFamily: FB }}>
                    {food.source === "manual" ? "manuell" : "OFF"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
                  {food.kcal_100g != null && <span style={{ fontSize: 10, color: C.muted, fontFamily: FB }}>{food.kcal_100g} kcal</span>}
                  {food.protein_100g != null && <span style={{ fontSize: 10, color: C.muted, fontFamily: FB }}>P {food.protein_100g}g</span>}
                  {food.carbs_100g != null && <span style={{ fontSize: 10, color: C.muted, fontFamily: FB }}>KH {food.carbs_100g}g</span>}
                  {food.fat_100g != null && <span style={{ fontSize: 10, color: C.muted, fontFamily: FB }}>F {food.fat_100g}g</span>}
                </div>
              </div>
              <div style={{ fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 13, color: C.coinText, flexShrink: 0 }}>
                🪙 {food.coins_100g}
              </div>
              <button onClick={() => setEditId(editId === food.id ? null : food.id)}
                style={{ padding: "5px 10px", borderRadius: 7, border: `1px solid ${C.border}`, background: editId === food.id ? C.greenPale : C.surface2, cursor: "pointer", fontSize: 13, color: C.sub }}>
                ✎
              </button>
              <button onClick={() => handleDelete(food.id)}
                style={{ padding: "5px 10px", borderRadius: 7, border: `1px solid ${C.border}`, background: C.surface2, cursor: "pointer", fontSize: 13, color: "#DC2626" }}>
                ✕
              </button>
            </div>
            {editId === food.id && (
              <EditRow food={food} onSave={handleSave} onCancel={() => setEditId(null)} />
            )}
          </div>
        ))}
        {!loading && foods.length === 0 && (
          <div style={{ textAlign: "center", padding: "28px 0", color: C.muted, fontFamily: FB, fontSize: 13 }}>
            Keine Einträge gefunden.
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, justifyContent: "center" }}>
          <button disabled={page === 1} onClick={() => { const p = page - 1; setPage(p); load(q, p); }}
            style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface2, cursor: page === 1 ? "default" : "pointer", color: page === 1 ? C.border : C.sub, fontFamily: FB, fontSize: 12 }}>
            ‹ Zurück
          </button>
          <span style={{ fontFamily: FB, fontSize: 12, color: C.muted }}>Seite {page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => { const p = page + 1; setPage(p); load(q, p); }}
            style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface2, cursor: page === totalPages ? "default" : "pointer", color: page === totalPages ? C.border : C.sub, fontFamily: FB, fontSize: 12 }}>
            Weiter ›
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Manual Add Form ────────────────────────────────────────
function ManualAddForm({ authFetch, onSaved, onCancel }) {
  const empty = { name: "", brand: "", barcode: "", kcal_100g: "", protein_100g: "", carbs_100g: "", sugar_100g: "", fat_100g: "", sat_fat_100g: "", fiber_100g: "", salt_100g: "", serving_g: "", serving_label: "" };
  const [draft, setDraft] = useState(empty);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setDraft(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!draft.name.trim()) return;
    setSaving(true);
    const body = {};
    Object.entries(draft).forEach(([k, v]) => { body[k] = v === "" ? null : isNaN(v) ? v : parseFloat(v); });
    await authFetch("/api/admin-foods", { method: "POST", body: JSON.stringify(body) });
    setSaving(false);
    onSaved();
  };

  return (
    <div style={{ background: C.surface, border: `1.5px solid ${C.green}`, borderRadius: 12, padding: "14px", marginBottom: 12 }}>
      <div style={{ fontFamily: FB, fontSize: 12, fontWeight: 700, color: C.green, marginBottom: 10 }}>Neues Lebensmittel</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 2 }}>
          <div style={{ fontFamily: FB, fontSize: 10, color: C.muted, marginBottom: 2 }}>Name *</div>
          <input className="app-input" style={{ ...inputStyle, padding: "7px 10px", fontSize: 12 }} placeholder="z.B. Haferflocken" value={draft.name} onChange={e => set("name", e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FB, fontSize: 10, color: C.muted, marginBottom: 2 }}>Marke</div>
          <input className="app-input" style={{ ...inputStyle, padding: "7px 10px", fontSize: 12 }} placeholder="Optional" value={draft.brand} onChange={e => set("brand", e.target.value)} />
        </div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontFamily: FB, fontSize: 10, color: C.muted, marginBottom: 2 }}>Barcode (EAN/GTIN)</div>
        <input className="app-input" style={{ ...inputStyle, padding: "7px 10px", fontSize: 12 }} placeholder="Optional" value={draft.barcode} onChange={e => set("barcode", e.target.value.replace(/\D/g, ""))} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 8 }}>
        {NUTR_FIELDS.map(f => (
          <div key={f.id}>
            <div style={{ fontFamily: FB, fontSize: 10, color: C.muted, marginBottom: 2 }}>{f.label}/100g</div>
            <input type="number" step={f.step} className="app-input" style={{ ...inputStyle, padding: "6px 8px", fontSize: 12, textAlign: "right" }}
              value={draft[f.id]} onChange={e => set(f.id, e.target.value)} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FB, fontSize: 10, color: C.muted, marginBottom: 2 }}>Portion (g)</div>
          <input type="number" className="app-input" style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }} value={draft.serving_g} onChange={e => set("serving_g", e.target.value)} />
        </div>
        <div style={{ flex: 2 }}>
          <div style={{ fontFamily: FB, fontSize: 10, color: C.muted, marginBottom: 2 }}>Portionsbezeichnung</div>
          <input className="app-input" style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }} placeholder="z.B. 1 Scheibe (30g)" value={draft.serving_label} onChange={e => set("serving_label", e.target.value)} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, fontFamily: FB, fontSize: 12, cursor: "pointer", color: C.sub }}>Abbrechen</button>
        <button onClick={handleSave} disabled={saving || !draft.name.trim()}
          style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: C.green, color: "#fff", fontFamily: FB, fontWeight: 700, fontSize: 12, cursor: "pointer", opacity: saving ? .6 : 1 }}>
          {saving ? "Speichert…" : "Speichern"}
        </button>
      </div>
    </div>
  );
}

// ─── OFF Import view ────────────────────────────────────────
function OFFImport({ authFetch, onImported }) {
  const [q, setQ] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [importing, setImporting] = useState(false);
  const [msg, setMsg] = useState("");

  const search = async () => {
    if (!q.trim() || q.trim().length < 2) return;
    setLoading(true);
    setProducts([]);
    setSelected(new Set());
    setMsg("");
    try {
      const res = await authFetch(`/api/admin-foods?off=1&q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setProducts(data.products || []);
    } finally {
      setLoading(false);
    }
  };

  const toggleAll = () => {
    if (selected.size === products.length) setSelected(new Set());
    else setSelected(new Set(products.map((_, i) => i)));
  };

  const toggleOne = (i) => {
    const next = new Set(selected);
    next.has(i) ? next.delete(i) : next.add(i);
    setSelected(next);
  };

  const handleImport = async () => {
    if (selected.size === 0) return;
    setImporting(true);
    const foods = [...selected].map(i => products[i]);
    const res = await authFetch("/api/admin-foods", { method: "POST", body: JSON.stringify({ import: true, foods }) });
    const data = await res.json();
    if (data.error) {
      setMsg(`✗ Fehler: ${data.error}`);
    } else {
      setMsg(`✓ ${data.imported} Lebensmittel importiert`);
    }
    setSelected(new Set());
    setImporting(false);
    onImported();
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input className="app-input" placeholder="Suche auf Open Food Facts…"
          value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === "Enter" && search()}
          style={{ ...inputStyle, flex: 1, padding: "8px 12px", fontSize: 13 }} />
        <button onClick={search} disabled={loading}
          style={{ padding: "8px 16px", borderRadius: 9, border: "none", background: C.green, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", flexShrink: 0, opacity: loading ? .6 : 1 }}>
          {loading ? "…" : "Suchen"}
        </button>
      </div>

      {products.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <button onClick={toggleAll} style={{ fontSize: 12, fontFamily: FB, color: C.green, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              {selected.size === products.length ? "Alle abwählen" : "Alle auswählen"}
            </button>
            <span style={{ fontSize: 11, color: C.muted, fontFamily: FB }}>{selected.size} ausgewählt</span>
            {selected.size > 0 && (
              <button onClick={handleImport} disabled={importing}
                style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 8, border: "none", background: C.green, color: "#fff", fontFamily: FB, fontWeight: 700, fontSize: 12, cursor: "pointer", opacity: importing ? .6 : 1 }}>
                {importing ? "Importiert…" : `${selected.size} importieren`}
              </button>
            )}
          </div>
          {msg && <div style={{ fontFamily: FB, fontSize: 12, color: C.green, marginBottom: 10 }}>{msg}</div>}
        </>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {loading && <div style={{ textAlign: "center", padding: "20px", color: C.muted, fontFamily: FB, fontSize: 13 }}>Suche bei Open Food Facts…</div>}
        {!loading && products.length === 0 && q && <div style={{ textAlign: "center", padding: "20px", color: C.muted, fontFamily: FB, fontSize: 13 }}>Keine Ergebnisse. Suchbegriff verfeinern.</div>}
        {products.map((p, i) => (
          <button key={p.off_id || i} onClick={() => toggleOne(i)}
            style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", textAlign: "left",
              background: selected.has(i) ? C.greenPale : C.surface,
              border: `1.5px solid ${selected.has(i) ? C.green : C.border}`,
              borderRadius: 11, cursor: "pointer", transition: "all .1s",
            }}>
            <span style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${selected.has(i) ? C.green : C.border}`, background: selected.has(i) ? C.green : C.surface, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {selected.has(i) && <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>✓</span>}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: FB, fontWeight: 700, fontSize: 12, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {p.name}{p.brand ? ` · ${p.brand}` : ""}
              </div>
              <div style={{ fontSize: 10, color: C.muted, fontFamily: FB, marginTop: 2 }}>
                {p.kcal_100g != null ? `${p.kcal_100g} kcal` : "–"} · P {p.protein_100g ?? "–"}g · KH {p.carbs_100g ?? "–"}g · F {p.fat_100g ?? "–"}g
              </div>
            </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
                <span style={{ fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 12, color: C.coinText }}>🪙 {p.coins_100g}</span>
                {p._sourceLabel && (
                  <span style={{ fontSize: 9, fontFamily: FB, color: C.muted, background: C.surface2, borderRadius: 999, padding: "1px 6px" }}>{p._sourceLabel}</span>
                )}
              </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main AdminFoods ─────────────────────────────────────────
export default function AdminFoods() {
  const { authFetch } = useAdminFoodApi();
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState("local"); // local | import

  const loadFullStats = useCallback(async () => {
    try {
      const res = await authFetch("/api/admin-foods?_stats=1");
      const data = await res.json();
      setStats({
        total: data.total ?? 0,
        off: data.off ?? 0,
        manual: data.manual ?? 0,
        incomplete: data.incomplete ?? 0,
      });
    } catch { /* ignore */ }
  }, [authFetch]);

  useEffect(() => { loadFullStats(); }, [loadFullStats]);

  return (
    <div style={{ ...card }}>
      <div style={sectionLabel}>🥦 Lebensmitteldatenbank</div>

      <StatsCard stats={stats} />

      {/* Tab toggle */}
      <div style={{ display: "flex", background: C.surface2, borderRadius: 10, padding: 3, marginBottom: 14, gap: 3 }}>
        {[["local", "📋 Lokale DB"], ["import", "🌍 OFF importieren"]].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            style={{
              flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer",
              fontFamily: FB, fontWeight: 700, fontSize: 12,
              background: activeTab === id ? C.surface : "transparent",
              color: activeTab === id ? C.green : C.muted,
              boxShadow: activeTab === id ? "0 1px 4px rgba(0,0,0,.08)" : "none",
              transition: "all .15s",
            }}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === "local" && (
        <LocalDB authFetch={authFetch} onStatsChange={loadFullStats} />
      )}
      {activeTab === "import" && (
        <OFFImport authFetch={authFetch} onImported={loadFullStats} />
      )}
    </div>
  );
}
