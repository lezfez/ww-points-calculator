import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import Card from "./ui/Card";
import styles from "./AdminFoods.module.css";

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
    { label: "Gesamt",    value: stats.total,      color: "var(--c-text)" },
    { label: "OFF",       value: stats.off,        color: "var(--c-sub)" },
    { label: "Manuell",   value: stats.manual,     color: "var(--c-amber)" },
    { label: "Lückenhaft",value: stats.incomplete, color: "var(--c-danger)" },
  ];
  return (
    <div className={styles.statsGrid}>
      {items.map(i => (
        <div key={i.label} className={styles.statCard}>
          {/* color stays inline — data-driven per stat type */}
          <div className={styles.statNum} style={{ color: i.color }}>{i.value ?? "–"}</div>
          <div className={styles.statLabel}>{i.label}</div>
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
    <div className={styles.editRowWrap}>
      <div className={styles.editFieldRow}>
        <div className={styles.editFieldFlex2}>
          <div className={styles.editFieldLabel}>Name</div>
          <input className={`app-input ${styles.editInputSm}`}
            value={draft.name} onChange={e => set("name", e.target.value)} />
        </div>
        <div className={styles.editFieldFlex1}>
          <div className={styles.editFieldLabel}>Marke</div>
          <input className={`app-input ${styles.editInputSm}`}
            value={draft.brand || ""} onChange={e => set("brand", e.target.value)} />
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <div className={styles.editFieldLabel}>Barcode (EAN/GTIN)</div>
        <input className={`app-input ${styles.editInputSm}`}
          value={draft.barcode || ""} onChange={e => set("barcode", e.target.value.replace(/\D/g, ""))} placeholder="z.B. 9002490203541" />
      </div>
      <div className={styles.editNutrGrid}>
        {NUTR_FIELDS.map(f => (
          <div key={f.id}>
            <div className={styles.editFieldLabel}>{f.label}/100g</div>
            <input type="number" step={f.step} className={`app-input ${styles.editInputSmRight}`}
              value={draft[f.id] ?? ""} onChange={e => set(f.id, e.target.value === "" ? null : parseFloat(e.target.value))} />
          </div>
        ))}
      </div>
      <div className={styles.editFieldRow} style={{ marginBottom: 8 }}>
        <div className={styles.editFieldFlex1}>
          <div className={styles.editFieldLabel}>Portion (g)</div>
          <input type="number" className={`app-input ${styles.editInputSmNum}`}
            value={draft.serving_g ?? ""} onChange={e => set("serving_g", e.target.value === "" ? null : parseFloat(e.target.value))} />
        </div>
        <div className={styles.editFieldFlex2}>
          <div className={styles.editFieldLabel}>Portionsbezeichnung</div>
          <input className={`app-input ${styles.editInputSmNum}`}
            value={draft.serving_label || ""} onChange={e => set("serving_label", e.target.value)} />
        </div>
      </div>
      <div className={styles.editBtnRow}>
        <button onClick={onCancel} className={styles.cancelBtn}>Abbrechen</button>
        <button onClick={() => onSave(draft)} className={styles.saveGreenBtn}>Speichern</button>
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
      <div className={styles.searchRow}>
        <input className={`app-input ${styles.flexInput}`} placeholder="Suchen…"
          value={q} onChange={e => handleSearch(e.target.value)} />
        <button onClick={() => setShowAdd(v => !v)} className={styles.addBtn}>+ Manuell</button>
      </div>

      {showAdd && (
        <ManualAddForm authFetch={authFetch} onSaved={() => { setShowAdd(false); load(); }} onCancel={() => setShowAdd(false)} />
      )}

      <div className={styles.countMsg}>{loading ? "Lade…" : `${total} Einträge`}</div>

      <div className={styles.foodList}>
        {foods.map(food => (
          <div key={food.id} className={`${styles.foodItem}${editId === food.id ? ` ${styles.editing}` : ''}`}>
            <div className={styles.foodRow}>
              <div className={styles.foodMain}>
                <div className={styles.foodNameRow}>
                  <span className={styles.foodName}>{food.name}</span>
                  {food.brand && <span className={styles.foodBrand}>· {food.brand}</span>}
                  {food.barcode && <span className={styles.foodBarcode}>· #{food.barcode}</span>}
                  <span className={`${styles.sourceBadge}${food.source === "manual" ? ` ${styles.manual}` : ''}`}>
                    {food.source === "manual" ? "manuell" : "OFF"}
                  </span>
                </div>
                <div className={styles.nutrRow}>
                  {food.kcal_100g != null && <span className={styles.nutrVal}>{food.kcal_100g} kcal</span>}
                  {food.protein_100g != null && <span className={styles.nutrVal}>P {food.protein_100g}g</span>}
                  {food.carbs_100g != null && <span className={styles.nutrVal}>KH {food.carbs_100g}g</span>}
                  {food.fat_100g != null && <span className={styles.nutrVal}>F {food.fat_100g}g</span>}
                </div>
              </div>
              <div className={styles.foodCoins}>🪙 {food.coins_100g}</div>
              <button onClick={() => setEditId(editId === food.id ? null : food.id)}
                className={`${styles.editBtn}${editId === food.id ? ` ${styles.editing}` : ''}`}>
                ✎
              </button>
              <button onClick={() => handleDelete(food.id)} className={styles.deleteBtn}>✕</button>
            </div>
            {editId === food.id && (
              <EditRow food={food} onSave={handleSave} onCancel={() => setEditId(null)} />
            )}
          </div>
        ))}
        {!loading && foods.length === 0 && (
          <div className={styles.foodEmpty}>Keine Einträge gefunden.</div>
        )}
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button disabled={page === 1} onClick={() => { const p = page - 1; setPage(p); load(q, p); }} className={styles.pageBtn}>
            ‹ Zurück
          </button>
          <span className={styles.pageInfo}>Seite {page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => { const p = page + 1; setPage(p); load(q, p); }} className={styles.pageBtn}>
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
    <div className={styles.manualAddForm}>
      <div className={styles.manualTitle}>Neues Lebensmittel</div>
      <div className={styles.editFieldRow}>
        <div className={styles.editFieldFlex2}>
          <div className={styles.editFieldLabel}>Name *</div>
          <input className={`app-input ${styles.editInputSm}`} placeholder="z.B. Haferflocken" value={draft.name} onChange={e => set("name", e.target.value)} />
        </div>
        <div className={styles.editFieldFlex1}>
          <div className={styles.editFieldLabel}>Marke</div>
          <input className={`app-input ${styles.editInputSm}`} placeholder="Optional" value={draft.brand} onChange={e => set("brand", e.target.value)} />
        </div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <div className={styles.editFieldLabel}>Barcode (EAN/GTIN)</div>
        <input className={`app-input ${styles.editInputSm}`} placeholder="Optional" value={draft.barcode} onChange={e => set("barcode", e.target.value.replace(/\D/g, ""))} />
      </div>
      <div className={styles.editNutrGrid}>
        {NUTR_FIELDS.map(f => (
          <div key={f.id}>
            <div className={styles.editFieldLabel}>{f.label}/100g</div>
            <input type="number" step={f.step} className={`app-input ${styles.editInputSmRight}`}
              value={draft[f.id]} onChange={e => set(f.id, e.target.value)} />
          </div>
        ))}
      </div>
      <div className={styles.editFieldRow} style={{ marginBottom: 10 }}>
        <div className={styles.editFieldFlex1}>
          <div className={styles.editFieldLabel}>Portion (g)</div>
          <input type="number" className={`app-input ${styles.editInputSmNum}`} value={draft.serving_g} onChange={e => set("serving_g", e.target.value)} />
        </div>
        <div className={styles.editFieldFlex2}>
          <div className={styles.editFieldLabel}>Portionsbezeichnung</div>
          <input className={`app-input ${styles.editInputSmNum}`} placeholder="z.B. 1 Scheibe (30g)" value={draft.serving_label} onChange={e => set("serving_label", e.target.value)} />
        </div>
      </div>
      <div className={styles.manualBtnRow}>
        <button onClick={onCancel} className={styles.cancelBtn}>Abbrechen</button>
        <button onClick={handleSave} disabled={saving || !draft.name.trim()} className={styles.savePrimaryBtn}>
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
      <div className={styles.offSearchRow}>
        <input className={`app-input ${styles.flexInput}`} placeholder="Suche auf Open Food Facts…"
          value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === "Enter" && search()} />
        <button onClick={search} disabled={loading} className={styles.offSearchBtn}>
          {loading ? "…" : "Suchen"}
        </button>
      </div>

      {products.length > 0 && (
        <>
          <div className={styles.offToggleRow}>
            <button onClick={toggleAll} className={styles.offToggleBtn}>
              {selected.size === products.length ? "Alle abwählen" : "Alle auswählen"}
            </button>
            <span className={styles.offCount}>{selected.size} ausgewählt</span>
            {selected.size > 0 && (
              <button onClick={handleImport} disabled={importing} className={styles.offImportBtn}>
                {importing ? "Importiert…" : `${selected.size} importieren`}
              </button>
            )}
          </div>
          {msg && <div className={styles.offMsg}>{msg}</div>}
        </>
      )}

      <div className={styles.offList}>
        {loading && <div className={styles.offLoadingMsg}>Suche bei Open Food Facts…</div>}
        {!loading && products.length === 0 && q && <div className={styles.offLoadingMsg}>Keine Ergebnisse. Suchbegriff verfeinern.</div>}
        {products.map((p, i) => (
          <button key={p.off_id || i} onClick={() => toggleOne(i)}
            className={`${styles.offItem}${selected.has(i) ? ` ${styles.selected}` : ''}`}>
            <span className={`${styles.offCheckbox}${selected.has(i) ? ` ${styles.selected}` : ''}`}>
              {selected.has(i) && <span className={styles.offCheck}>✓</span>}
            </span>
            <div className={styles.offItemInfo}>
              <div className={styles.offItemName}>{p.name}{p.brand ? ` · ${p.brand}` : ""}</div>
              <div className={styles.offItemNutr}>
                {p.kcal_100g != null ? `${p.kcal_100g} kcal` : "–"} · P {p.protein_100g ?? "–"}g · KH {p.carbs_100g ?? "–"}g · F {p.fat_100g ?? "–"}g
              </div>
            </div>
            <div className={styles.offItemRight}>
              <span className={styles.offCoins}>🪙 {p.coins_100g}</span>
              {p._sourceLabel && <span className={styles.offSourceLabel}>{p._sourceLabel}</span>}
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
  const [activeTab, setActiveTab] = useState("local");

  const loadFullStats = useCallback(async () => {
    try {
      const res = await authFetch("/api/admin-foods?_stats=1");
      const data = await res.json();
      setStats({ total: data.total ?? 0, off: data.off ?? 0, manual: data.manual ?? 0, incomplete: data.incomplete ?? 0 });
    } catch { /* ignore */ }
  }, [authFetch]);

  useEffect(() => { loadFullStats(); }, [loadFullStats]);

  return (
    <Card>
      <div className="section-label">🥦 Lebensmitteldatenbank</div>

      <StatsCard stats={stats} />

      <div className={styles.tabToggle}>
        {[["local", "📋 Lokale DB"], ["import", "🌍 OFF importieren"]].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`${styles.tabBtn}${activeTab === id ? ` ${styles.active}` : ''}`}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === "local" && <LocalDB authFetch={authFetch} onStatsChange={loadFullStats} />}
      {activeTab === "import" && <OFFImport authFetch={authFetch} onImported={loadFullStats} />}
    </Card>
  );
}
