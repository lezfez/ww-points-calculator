import { useState, useMemo, useEffect } from "react";
import { SignIn, SignedIn, SignedOut, UserButton, useUser } from "@clerk/clerk-react";
import { supabase } from "./supabase";

// ════════════════════════════════════════════════════════════
// FORMELN
// ════════════════════════════════════════════════════════════
// Classic Points (bis 2010):    (kcal × 0.0165) + (fett × 0.11)
// ProPoints (2010–2015):        protein×0.36 + kh×0.16 + fett×0.24 − bst×0.18
// SmartPoints (2015–2021):      (kcal×0.0305) + (gesF×0.275) + (zuck×0.12) − (prot×0.098)
// PersonalPoints (2022+):       SmartPoints − (bst×0.14) − (ungesF×0.07)
// weight friends Coins:         (kcal×0.022) + (gesF×0.20) + (zucker×0.10) + (salz×0.15) − (prot×0.10) − (bst×0.15)
//   Coins = abgeleitet aus WF-Programmbeschreibung: kcal, gesätt. Fett, Zucker, Eiweiß, Ballaststoffe, Salz
//   Faktorgewichte reverse-engineered aus bekannten Rezept-Coins (z.B. Reisfleisch 7C/1P, Krautpfanne 5C/4P …)

function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }

function calcClassic({ kcal, fett }) {
  return Math.max(0, Math.round(kcal * 0.0165 + fett * 0.11));
}
function calcProPoints({ protein, kh, fett, bst }) {
  return Math.max(0, Math.round(protein * 0.36 + kh * 0.16 + fett * 0.24 - clamp(bst, 0, 10) * 0.18 + 0.14));
}
function calcSmartPoints({ kcal, gesF, zucker, protein }) {
  return Math.max(0, Math.round(kcal * 0.0305 + gesF * 0.275 + zucker * 0.12 - protein * 0.098));
}
function calcPersonalPoints({ kcal, gesF, ungesF, zucker, protein, bst }) {
  const sp = kcal * 0.0305 + gesF * 0.275 + zucker * 0.12 - protein * 0.098;
  return Math.max(0, Math.round(sp - clamp(bst, 0, 10) * 0.14 - clamp(ungesF, 0, 20) * 0.07));
}
function calcCoins({ kcal, gesF, zucker, protein, bst, salz }) {
  const raw = kcal * 0.022 + gesF * 0.20 + zucker * 0.10 + salz * 0.15
    - clamp(protein, 0, 50) * 0.10 - clamp(bst, 0, 10) * 0.15;
  return Math.max(0, Math.round(raw));
}
function calcDailyBudget({ gewicht, groesse, alter, geschlecht, aktivitaet }) {
  const bmr = geschlecht === "m"
    ? 10 * gewicht + 6.25 * groesse - 5 * alter + 5
    : 10 * gewicht + 6.25 * groesse - 5 * alter - 161;
  const f = { sitzend: 1.2, leicht: 1.375, maessig: 1.55, aktiv: 1.725 }[aktivitaet] || 1.2;
  return { ww: clamp(Math.round(bmr * f / 30), 18, 44), coins: clamp(Math.round(bmr * f / 28), 18, 50) };
}

// ════════════════════════════════════════════════════════════
// SUPABASE HOOK
// ════════════════════════════════════════════════════════════
function useRecipes() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("recipes")
        .select(`id, name, coins, portionen, zeit, kategorie, hinweis, url,
          recipe_ingredients(ingredient, position),
          recipe_steps(step_text, position)`)
        .order("id");

      if (!error) {
        const mapped = data.map(r => ({
          ...r,
          zutaten: [...r.recipe_ingredients]
            .sort((a, b) => a.position - b.position)
            .map(i => i.ingredient),
          zubereitung: [...r.recipe_steps]
            .sort((a, b) => a.position - b.position)
            .map(s => s.step_text)
            .join(" "),
        }));
        setRecipes(mapped);
      }
      setLoading(false);
    }
    load();
  }, []);

  return { recipes, loading };
}

// ════════════════════════════════════════════════════════════
// DESIGN
// ════════════════════════════════════════════════════════════
const C = {
  bg: "#F5F7FA", surface: "#FFFFFF", border: "#E2E8F0",
  accent: "#7C3AED",
  accent2: "#5B21B6",
  coin: "#D97706",
  coinBg: "#FEF3C7",
  green: "#059669", greenBg: "#ECFDF5",
  text: "#1E1B4B", sub: "#6B7280", muted: "#9CA3AF",
  ww: "#00A551",
  chipUp: "#FEE2E2", chipUpText: "#B91C1C",
  chipDn: "#D1FAE5", chipDnText: "#065F46",
};
const S = {
  wrap: { minHeight: "100vh", background: C.bg, fontFamily: "'Inter',system-ui,sans-serif", color: C.text },
  header: {
    background: "linear-gradient(135deg,#7C3AED 0%,#5B21B6 100%)",
    padding: "18px 24px 16px", display: "flex", alignItems: "center", gap: 14
  },
  logo: { width: 42, height: 42, borderRadius: 12, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 20 },
  headerText: { color: "#fff" },
  nav: { background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 20px", display: "flex", gap: 2, overflowX: "auto" },
  navBtn: (a) => ({
    padding: "14px 18px", border: "none", background: "none", cursor: "pointer",
    fontWeight: a ? 700 : 500, fontSize: 14, whiteSpace: "nowrap",
    color: a ? C.accent : C.sub, borderBottom: a ? `2px solid ${C.accent}` : "2px solid transparent",
    transition: "all .15s",
  }),
  main: { maxWidth: 820, margin: "0 auto", padding: "24px 16px 60px" },
  card: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "20px 22px", marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 14 },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: "12px 16px" },
  label: { fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 4, display: "block" },
  input: { padding: "9px 11px", border: `1.5px solid ${C.border}`, borderRadius: 9, fontSize: 14, color: C.text, background: C.bg, outline: "none", width: "100%", boxSizing: "border-box" },
  select: { padding: "9px 11px", border: `1.5px solid ${C.border}`, borderRadius: 9, fontSize: 14, color: C.text, background: C.bg, outline: "none", width: "100%", boxSizing: "border-box" },
  btn: (col) => ({ width: "100%", padding: "12px 0", background: col || C.accent, color: "#fff", border: "none", borderRadius: 11, fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 10, letterSpacing: ".02em" }),
  divider: { borderTop: `1px solid ${C.border}`, margin: "18px 0" },
  pill: (col, bg) => ({ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, color: col, background: bg }),
  resultRow: { display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center", padding: "20px 0 8px" },
  scoreBig: () => ({ textAlign: "center", flex: "1 1 120px" }),
  scoreNum: (col) => ({ fontSize: 44, fontWeight: 900, color: col, lineHeight: 1 }),
  scoreLbl: { fontSize: 12, color: C.muted, marginTop: 3 },
  recipeGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16, alignItems: "start" },
  recipeCard: (open) => ({
    background: C.surface, border: `1px solid ${open ? C.accent : C.border}`,
    borderRadius: 14, padding: "16px 18px", cursor: "pointer",
    transition: "border-color .15s, box-shadow .15s",
    boxShadow: open ? "0 0 0 3px rgba(124,58,237,.12)" : "none",
  }),
  coinBadge: { display: "inline-flex", alignItems: "center", gap: 4, background: C.coinBg, color: C.coin, fontWeight: 800, fontSize: 15, padding: "3px 10px", borderRadius: 20, marginBottom: 8 },
  disclaimer: { fontSize: 11, color: C.muted, textAlign: "center", marginTop: 14, fontStyle: "italic", lineHeight: 1.5 },
  searchBar: { padding: "10px 14px", border: `1.5px solid ${C.border}`, borderRadius: 11, fontSize: 14, width: "100%", boxSizing: "border-box", marginBottom: 16, background: C.bg, color: C.text, outline: "none" },
  filterRow: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 },
  filterBtn: (a) => ({ padding: "6px 13px", borderRadius: 20, border: `1.5px solid ${a ? C.accent : C.border}`, background: a ? "rgba(124,58,237,.08)" : C.surface, color: a ? C.accent2 : C.sub, fontWeight: a ? 700 : 500, fontSize: 12, cursor: "pointer" }),
};

// ════════════════════════════════════════════════════════════
// FIELD DEFINITIONS
// ════════════════════════════════════════════════════════════
const FIELD_DEFS = {
  kcal:   { label: "Kalorien (kcal)", step: 1 },
  fett:   { label: "Fett gesamt (g)", step: 0.1 },
  gesF:   { label: "Gesättigte Fettsäuren (g)", step: 0.1 },
  ungesF: { label: "Ungesättigte Fettsäuren (g)", step: 0.1 },
  kh:     { label: "Kohlenhydrate (g)", step: 0.1 },
  zucker: { label: "davon Zucker (g)", step: 0.1 },
  protein:{ label: "Protein / Eiweiß (g)", step: 0.1 },
  bst:    { label: "Ballaststoffe (g)", step: 0.1 },
  salz:   { label: "Salz (g)", step: 0.1 },
};
const SYS_FIELDS = {
  coins:    ["kcal", "gesF", "zucker", "protein", "bst", "salz"],
  personal: ["kcal", "gesF", "ungesF", "zucker", "protein", "bst"],
  smart:    ["kcal", "gesF", "zucker", "protein"],
  pro:      ["protein", "kh", "fett", "bst"],
  classic:  ["kcal", "fett"],
};
const SYSTEMS = [
  { id: "coins",    label: "💜 weight friends Coins", sub: "Österreich" },
  { id: "personal", label: "PersonalPoints™", sub: "WW 2022+" },
  { id: "smart",    label: "SmartPoints™",    sub: "WW 2015–21" },
  { id: "pro",      label: "ProPoints™",      sub: "WW 2010–15" },
  { id: "classic",  label: "Classic Points",  sub: "WW bis 2010" },
];

// ════════════════════════════════════════════════════════════
// SMALL COMPONENTS
// ════════════════════════════════════════════════════════════
function Field({ id, def, value, onChange }) {
  return (
    <div>
      <label style={S.label} htmlFor={id}>{def.label}</label>
      <input id={id} type="number" min={0} step={def.step} style={S.input}
        value={value} placeholder="0"
        onChange={e => onChange(id, e.target.value)} />
    </div>
  );
}

function RecipeCard({ recipe, onSelect, selected }) {
  return (
    <div style={S.recipeCard(selected)} onClick={() => onSelect(selected ? null : recipe.id)}>
      <div style={S.coinBadge}>🪙 {recipe.coins} Coins</div>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{recipe.name}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: selected ? 12 : 0 }}>
        <span style={S.pill(C.sub, C.bg)}>{recipe.kategorie}</span>
        <span style={S.pill(C.sub, C.bg)}>⏱ {recipe.zeit}</span>
        <span style={S.pill(C.sub, C.bg)}>👥 {recipe.portionen} Port.</span>
      </div>
      {selected && (
        <div style={{ marginTop: 10, fontSize: 13, color: C.text, textAlign: "left" }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: C.accent }}>Zutaten</div>
          <ul style={{ margin: "0 0 12px", padding: "0 0 0 18px", lineHeight: 1.8, textAlign: "left" }}>
            {recipe.zutaten.map((z, i) => <li key={i}>{z}</li>)}
          </ul>
          <div style={{ fontWeight: 700, marginBottom: 6, color: C.accent }}>Zubereitung</div>
          <p style={{ margin: "0 0 8px", lineHeight: 1.7 }}>{recipe.zubereitung}</p>
          {recipe.hinweis && (
            <div style={{ ...S.pill(C.green, C.greenBg), fontSize: 12 }}>ℹ️ {recipe.hinweis}</div>
          )}
          <a href={recipe.url} target="_blank" rel="noreferrer"
            style={{ display: "block", marginTop: 10, fontSize: 12, color: C.accent, textDecoration: "underline" }}>
            → Rezept auf weightfriends.at
          </a>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN APP
// ════════════════════════════════════════════════════════════
export default function App() {
  const [tab, setTab] = useState("calc");
  const [system, setSystem] = useState("coins");
  const [vals, setVals] = useState({ kcal:"", fett:"", gesF:"", ungesF:"", kh:"", zucker:"", protein:"", bst:"", salz:"" });
  const [result, setResult] = useState(null);
  const [budget, setBudget] = useState({ gewicht:"", groesse:"", alter:"", geschlecht:"w", aktivitaet:"sitzend" });
  const [budgetResult, setBudgetResult] = useState(null);
  const [openRecipe, setOpenRecipe] = useState(null);
  const [search, setSearch] = useState("");
  const [kat, setKat] = useState("Alle");
  const [sort, setSort] = useState("default");
  const [showSignIn, setShowSignIn] = useState(false);
  const { recipes, loading } = useRecipes();
  const { isSignedIn } = useUser();

  const n = k => parseFloat(vals[k]) || 0;
  const b = k => parseFloat(budget[k]) || 0;

  const handleVal = (k, v) => { setVals(p => ({ ...p, [k]: v })); setResult(null); };
  const handleBudget = (k, v) => { setBudget(p => ({ ...p, [k]: v })); setBudgetResult(null); };

  const calculate = () => {
    let r = {};
    const d = { kcal: n("kcal"), fett: n("fett"), gesF: n("gesF"), ungesF: n("ungesF"), kh: n("kh"), zucker: n("zucker"), protein: n("protein"), bst: n("bst"), salz: n("salz") };
    r.coins    = calcCoins(d);
    r.personal = calcPersonalPoints(d);
    r.smart    = calcSmartPoints(d);
    r.pro      = calcProPoints(d);
    r.classic  = calcClassic(d);
    setResult(r);
  };

  const calcBudget = () => {
    const br = calcDailyBudget({ gewicht: b("gewicht"), groesse: b("groesse"), alter: b("alter"), geschlecht: budget.geschlecht, aktivitaet: budget.aktivitaet });
    setBudgetResult(br);
  };

  const kategorien = useMemo(() =>
    ["Alle", ...Array.from(new Set(recipes.map(r => r.kategorie)))],
    [recipes]);

  const filteredRecipes = useMemo(() => {
    const filtered = recipes.filter(r =>
      (kat === "Alle" || r.kategorie === kat) &&
      (search === "" || r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.zutaten.some(z => z.toLowerCase().includes(search.toLowerCase())))
    );
    if (sort === "coins-asc")  return [...filtered].sort((a, b) => a.coins - b.coins);
    if (sort === "coins-desc") return [...filtered].sort((a, b) => b.coins - a.coins);
    return filtered;
  }, [recipes, kat, search, sort]);

  const tabs = [
    { id: "calc",    label: "🔢 Berechnen" },
    { id: "budget",  label: "📅 Tagesbudget" },
    { id: "recipes", label: "🍽️ WF Rezepte" },
    { id: "info",    label: "ℹ️ Info" },
  ];

  useEffect(() => { if (isSignedIn) setShowSignIn(false); }, [isSignedIn]);

  return (
    <div style={S.wrap}>
      {/* ─ Sign-In Modal ─ */}
      {showSignIn && !isSignedIn && (
        <div onClick={() => setShowSignIn(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div onClick={e => e.stopPropagation()}>
            <SignIn routing="hash" />
          </div>
        </div>
      )}
      {/* ─ Header ─ */}
      <header style={S.header}>
        <div style={S.logo}>WF</div>
        <div style={{ ...S.headerText, flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-.02em" }}>weight friends & WW Rechner</div>
          <div style={{ fontSize: 12, opacity: .8 }}>Coins · PersonalPoints · SmartPoints · ProPoints · Classic</div>
        </div>
        <SignedOut>
          <button onClick={() => setShowSignIn(true)}
            style={{ background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.4)", color: "#fff", borderRadius: 9, padding: "7px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Anmelden
          </button>
        </SignedOut>
        <SignedIn>
          <UserButton appearance={{ elements: { avatarBox: { width: 36, height: 36 } } }} />
        </SignedIn>
      </header>

      {/* ─ Nav ─ */}
      <nav style={S.nav}>
        {tabs.map(t => <button key={t.id} style={S.navBtn(tab === t.id)} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </nav>

      <main style={S.main}>

        {/* ══ TAB: BERECHNEN ══ */}
        {tab === "calc" && (
          <>
            <div style={S.card}>
              <div style={S.sectionTitle}>Punktesystem wählen</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {SYSTEMS.map(s => (
                  <button key={s.id} onClick={() => { setSystem(s.id); setResult(null); }}
                    style={{ ...S.filterBtn(system === s.id), display: "flex", flexDirection: "column", alignItems: "flex-start", padding: "8px 14px" }}>
                    <span style={{ fontSize: 13 }}>{s.label}</span>
                    <span style={{ fontSize: 10, fontWeight: 400, opacity: .7 }}>{s.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={S.card}>
              <div style={S.sectionTitle}>Nährwerte pro Portion eingeben</div>
              <div style={S.grid2}>
                {SYS_FIELDS[system].map(fid => (
                  <Field key={fid} id={fid} def={FIELD_DEFS[fid]} value={vals[fid]} onChange={handleVal} />
                ))}
              </div>
              <button style={S.btn(system === "coins" ? C.coin : C.accent)} onClick={calculate}>
                {system === "coins" ? "🪙 Coins berechnen" : "Punkte berechnen"}
              </button>
            </div>

            {result && (
              <div style={S.card}>
                <div style={S.sectionTitle}>Ergebnis – alle Systeme im Vergleich</div>
                <div style={S.resultRow}>
                  <div style={S.scoreBig()}>
                    <div style={S.scoreNum(C.coin)}>{result.coins}</div>
                    <div style={S.scoreLbl}>💜 Coins (wf)</div>
                  </div>
                  <div style={S.scoreBig()}>
                    <div style={S.scoreNum(C.ww)}>{result.personal}</div>
                    <div style={S.scoreLbl}>PersonalPoints</div>
                  </div>
                  <div style={S.scoreBig()}>
                    <div style={S.scoreNum(C.ww)}>{result.smart}</div>
                    <div style={S.scoreLbl}>SmartPoints</div>
                  </div>
                  <div style={S.scoreBig()}>
                    <div style={S.scoreNum(C.sub)}>{result.pro}</div>
                    <div style={S.scoreLbl}>ProPoints</div>
                  </div>
                  <div style={S.scoreBig()}>
                    <div style={S.scoreNum(C.sub)}>{result.classic}</div>
                    <div style={S.scoreLbl}>Classic</div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ ...S.card, background: "#FAF5FF", borderColor: "#DDD6FE" }}>
              <div style={S.sectionTitle}>Verwendete Formeln</div>
              <div style={{ fontSize: 12, color: C.text, lineHeight: 2, fontFamily: "monospace" }}>
                <b style={{ color: C.coin }}>Coins (wf):</b> kcal×0.022 + gesF×0.20 + Zucker×0.10 + Salz×0.15 − Protein×0.10 − Bst×0.15<br />
                <b style={{ color: C.ww }}>PersonalPoints:</b> SmartPoints − Bst×0.14 − ungesF×0.07<br />
                <b style={{ color: C.ww }}>SmartPoints:</b> kcal×0.0305 + gesF×0.275 + Zucker×0.12 − Protein×0.098<br />
                <b style={{ color: C.sub }}>ProPoints:</b> Protein×0.36 + KH×0.16 + Fett×0.24 − Bst×0.18<br />
                <b style={{ color: C.sub }}>Classic:</b> kcal×0.0165 + Fett×0.11
              </div>
              <p style={S.disclaimer}>
                ⚠️ Alle Formeln sind Näherungen / reverse-engineered. Weder WW noch weight friends veröffentlichen offizielle Formeln.
                Die Coins-Formel wurde aus den bekannten Rezeptwerten und der Programminfo (kcal, gesätt. Fett, Zucker, Eiweiß, Ballaststoffe, Salz) abgeleitet.
              </p>
            </div>
          </>
        )}

        {/* ══ TAB: BUDGET ══ */}
        {tab === "budget" && (
          <div style={S.card}>
            <div style={S.sectionTitle}>Persönliches Tages-Budget schätzen</div>
            <p style={{ fontSize: 13, color: C.sub, marginTop: 0, marginBottom: 18, lineHeight: 1.6 }}>
              Berechnung via <strong>Mifflin-St-Jeor-Formel</strong> (Grundumsatz × Aktivitätsfaktor).<br />
              weight friends und WW verwenden beide individuelle Budgets basierend auf diesem Prinzip.
            </p>
            <div style={S.grid2}>
              {[
                { id: "gewicht", label: "Gewicht (kg)", type: "number" },
                { id: "groesse", label: "Größe (cm)", type: "number" },
                { id: "alter",   label: "Alter (Jahre)", type: "number" },
              ].map(f => (
                <div key={f.id}>
                  <label style={S.label}>{f.label}</label>
                  <input type="number" style={S.input} value={budget[f.id]} placeholder="–"
                    onChange={e => handleBudget(f.id, e.target.value)} />
                </div>
              ))}
              <div>
                <label style={S.label}>Geschlecht</label>
                <select style={S.select} value={budget.geschlecht} onChange={e => handleBudget("geschlecht", e.target.value)}>
                  <option value="w">Weiblich</option>
                  <option value="m">Männlich</option>
                </select>
              </div>
              <div>
                <label style={S.label}>Aktivitätsniveau</label>
                <select style={S.select} value={budget.aktivitaet} onChange={e => handleBudget("aktivitaet", e.target.value)}>
                  <option value="sitzend">Überwiegend sitzend</option>
                  <option value="leicht">Leicht aktiv</option>
                  <option value="maessig">Mäßig aktiv</option>
                  <option value="aktiv">Sehr aktiv</option>
                </select>
              </div>
            </div>
            <button style={S.btn()} onClick={calcBudget}>Budget berechnen</button>
            {budgetResult && (
              <>
                <div style={S.divider} />
                <div style={S.resultRow}>
                  <div style={S.scoreBig()}>
                    <div style={S.scoreNum(C.coin)}>{budgetResult.coins}</div>
                    <div style={S.scoreLbl}>💜 Coins/Tag (wf)</div>
                  </div>
                  <div style={S.scoreBig()}>
                    <div style={S.scoreNum(C.ww)}>{budgetResult.ww}</div>
                    <div style={S.scoreLbl}>WW Points/Tag</div>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: C.sub, textAlign: "center", marginTop: 10, lineHeight: 1.6 }}>
                  Typischer Bereich: <b>18–44 WW Punkte</b> · <b>18–50 Coins</b> pro Tag.<br />
                  Leitsatz-Bonus bei weight friends: +1 Coin pro erfülltem Leitsatz (max. 6 zusätzlich).
                </p>
              </>
            )}
          </div>
        )}

        {/* ══ TAB: REZEPTE ══ */}
        {tab === "recipes" && (
          <>
            <div style={S.card}>
              <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 4 }}>🍽️ Rezepte von weight friends</div>
              <div style={{ fontSize: 13, color: C.sub, marginBottom: 16 }}>
                {loading ? "Lade Rezepte…" : `${recipes.length} Rezepte mit Coins-Werten – direkt von weightfriends.at`}
              </div>
              <input style={S.searchBar} placeholder="Suche nach Rezept oder Zutat …"
                value={search} onChange={e => setSearch(e.target.value)} />
              <div style={S.filterRow}>
                {kategorien.map(k => (
                  <button key={k} style={S.filterBtn(kat === k)} onClick={() => setKat(k)}>{k}</button>
                ))}
              </div>
              <div style={S.filterRow}>
                <button style={S.filterBtn(sort === "default")}   onClick={() => setSort("default")}>🔀 Standard</button>
                <button style={S.filterBtn(sort === "coins-asc")} onClick={() => setSort("coins-asc")}>🪙 Coins ↑</button>
                <button style={S.filterBtn(sort === "coins-desc")} onClick={() => setSort("coins-desc")}>🪙 Coins ↓</button>
              </div>
            </div>

            {loading ? (
              <div style={{ ...S.card, textAlign: "center", color: C.muted }}>Rezepte werden geladen…</div>
            ) : filteredRecipes.length === 0 ? (
              <div style={{ ...S.card, textAlign: "center", color: C.muted }}>Keine Rezepte gefunden.</div>
            ) : (
              <div style={S.recipeGrid}>
                {filteredRecipes.map(r => (
                  <RecipeCard key={r.id} recipe={r} selected={openRecipe === r.id} onSelect={setOpenRecipe} />
                ))}
              </div>
            )}

            <p style={S.disclaimer}>
              Rezepte und Coins-Werte stammen von weightfriends.at. Alle Rechte beim Inhaber.
              Diese App ist kein offizielles Produkt von weight friends.
            </p>
          </>
        )}

        {/* ══ TAB: INFO ══ */}
        {tab === "info" && (
          <>
            <div style={S.card}>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12, color: C.accent }}>💜 weight friends Coins – wie funktioniert's?</div>
              <p style={{ fontSize: 13, lineHeight: 1.8, color: C.text }}>
                <strong>weight friends</strong> ist ein österreichisches Abnehmprogramm mit Sitz in Wien.
                Jedes Lebensmittel erhält einen Wert in <strong>Coins</strong>, basierend auf:
              </p>
              <ul style={{ fontSize: 13, lineHeight: 2, color: C.text, paddingLeft: 20 }}>
                <li>⬆️ <b>Kalorien (kcal)</b> – erhöht den Coin-Wert</li>
                <li>⬆️ <b>Gesättigte Fettsäuren</b> – erhöht den Coin-Wert</li>
                <li>⬆️ <b>Zucker</b> – erhöht den Coin-Wert</li>
                <li>⬆️ <b>Salzgehalt</b> – erhöht den Coin-Wert</li>
                <li>⬇️ <b>Eiweiß (Protein)</b> – senkt den Coin-Wert</li>
                <li>⬇️ <b>Ballaststoffe</b> – senkt den Coin-Wert</li>
              </ul>
              <p style={{ fontSize: 13, lineHeight: 1.8, color: C.text, marginTop: 0 }}>
                Zusätzlich gibt es <b>Bonus-Coins</b> für gesunde Verhaltensweisen (Leitsätze):
                Gemüse & Obst essen, gesunde Fette, ausreichend trinken, bewusst genießen, Bewegung, Erholung.
                Für jeden erfüllten Leitsatz +1 Coin auf das Tagesbudget.
              </p>
            </div>
            <div style={S.card}>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 10, color: C.ww }}>🟢 WW PersonalPoints – aktuelles System (2022+)</div>
              <p style={{ fontSize: 13, lineHeight: 1.8, color: C.text }}>
                WW (Weight Watchers) berechnet Punkte auf Basis von kcal, gesättigten Fetten, Zucker (negativ)
                und Protein, Ballaststoffen, ungesättigte Fette (positiv / punktsenkend).
                Über 200 ZeroPoint-Lebensmittel müssen nicht getrackt werden.
                Das individuelle Tagesbudget basiert auf der Mifflin-St-Jeor-Formel.
              </p>
            </div>
            <div style={{ ...S.card, background: "#FAF5FF", borderColor: "#DDD6FE" }}>
              <div style={S.sectionTitle}>Coins-Formel – Herleitung</div>
              <p style={{ fontSize: 12, lineHeight: 1.8, color: C.text }}>
                weight friends veröffentlicht keine offizielle Formel. Die hier verwendete Formel wurde durch
                Auswertung der bekannten Rezept-Coins (z. B. Reisfleisch 7C, Waldviertler Topfenkäse 2C,
                Krautpfanne 5C, Ritschert 5C, Malakofftorte 10C) in Kombination mit den 6 genannten
                Nährwertkategorien abgeleitet (least-squares-Näherung).
              </p>
              <code style={{ fontSize: 12, display: "block", background: "#EDE9FE", padding: "10px 14px", borderRadius: 8, color: C.accent2, lineHeight: 1.8 }}>
                Coins = kcal×0.022 + gesF×0.20 + Zucker×0.10 + Salz×0.15{"\n"}
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;− Protein×0.10 − Ballaststoffe×0.15{"\n"}
                Minimum: 0, gerundet auf ganze Zahl
              </code>
              <p style={S.disclaimer}>⚠️ Nicht-offizielle Näherung. Ergebnisse können von der offiziellen weight friends App abweichen.</p>
            </div>
          </>
        )}

      </main>
    </div>
  );
}
