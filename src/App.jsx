import { useState, useMemo, useEffect, useCallback } from "react";
import { SignIn, SignedIn, SignedOut, UserButton, useUser, useAuth } from "@clerk/clerk-react";
import { supabase } from "./supabase";

// ════════════════════════════════════════════════════════════
// FORMELN
// ════════════════════════════════════════════════════════════
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
// SUPABASE HOOK – Rezepte
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
// SUPABASE HOOK – Feature Flags
// ════════════════════════════════════════════════════════════
function useFeatureFlags() {
  const [flags, setFlags] = useState(null);

  const reload = useCallback(async () => {
    const { data } = await supabase.from("feature_flags").select("*");
    if (data) {
      const map = {};
      data.forEach(f => { map[f.id] = f; });
      setFlags(map);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { flags, reload };
}

// ════════════════════════════════════════════════════════════
// ROLLEN-SYSTEM
// Hierarchie: guest (0) < user (1) < premium (2) < admin (3)
// ════════════════════════════════════════════════════════════
const ROLE_RANK   = { guest: 0, user: 1, premium: 2, admin: 3 };
const ROLE_LABELS = { guest: "Gast", user: "Registriert", premium: "Premium", admin: "Admin" };
const ROLE_OPTIONS = ["user", "premium", "admin"];

function getUserRole(user, isSignedIn) {
  if (!isSignedIn || !user) return "guest";
  const meta = user.publicMetadata || {};
  if (meta.role === "admin")   return "admin";
  if (meta.role === "premium" || meta.isPremium === true) return "premium";
  return "user";
}

function hasAccess(requiredRole, userRole) {
  return (ROLE_RANK[userRole] || 0) >= (ROLE_RANK[requiredRole] || 0);
}

// ════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ════════════════════════════════════════════════════════════
const FH = "'Lora', Georgia, serif";
const FB = "'Raleway', system-ui, sans-serif";

const C = {
  bg:         "#F5F0E8",
  surface:    "#FDFAF5",
  surface2:   "#EDE8DE",
  border:     "#DDD8CC",

  green:      "#228B22",
  green2:     "#1A6B1A",
  greenMid:   "#2E9D2E",
  greenLight: "#5BA85B",
  greenPale:  "#EBF4EB",

  coin:       "#C67B5C",
  coinBg:     "#FAF0EA",
  coinText:   "#7A3618",
  coinBorder: "rgba(198,123,92,.2)",

  text:       "#1C1B18",
  sub:        "#5C5C50",
  muted:      "#9E9E90",

  premBg:     "#FFFBF0",
  premBorder: "#EDD698",
  premText:   "#6B3A00",

  adminBg:    "#F0F4FF",
  adminBorder:"#C7D2FE",
  adminText:  "#3730A3",
};

const sh = {
  xs: "0 1px 3px rgba(28,27,24,.07), 0 2px 6px rgba(28,27,24,.04)",
  sm: "0 2px 8px rgba(28,27,24,.09), 0 4px 16px rgba(28,27,24,.06)",
};

// ════════════════════════════════════════════════════════════
// FIELD DEFINITIONS
// ════════════════════════════════════════════════════════════
const FIELD_DEFS = {
  kcal:    { label: "Kalorien (kcal)", step: 1 },
  fett:    { label: "Fett gesamt (g)", step: 0.1 },
  gesF:    { label: "Gesättigte Fettsäuren (g)", step: 0.1 },
  ungesF:  { label: "Ungesättigte Fettsäuren (g)", step: 0.1 },
  kh:      { label: "Kohlenhydrate (g)", step: 0.1 },
  zucker:  { label: "davon Zucker (g)", step: 0.1 },
  protein: { label: "Protein / Eiweiß (g)", step: 0.1 },
  bst:     { label: "Ballaststoffe (g)", step: 0.1 },
  salz:    { label: "Salz (g)", step: 0.1 },
};
const SYS_FIELDS = {
  coins:    ["kcal", "gesF", "zucker", "protein", "bst", "salz"],
  personal: ["kcal", "gesF", "ungesF", "zucker", "protein", "bst"],
  smart:    ["kcal", "gesF", "zucker", "protein"],
  pro:      ["protein", "kh", "fett", "bst"],
  classic:  ["kcal", "fett"],
};
const SYSTEMS = [
  { id: "coins",    label: "weight friends Coins", sub: "Österreich · aktuell" },
  { id: "personal", label: "PersonalPoints™",      sub: "WW 2022+" },
  { id: "smart",    label: "SmartPoints™",          sub: "WW 2015–21" },
  { id: "pro",      label: "ProPoints™",            sub: "WW 2010–15" },
  { id: "classic",  label: "Classic Points",        sub: "WW bis 2010" },
];

const FLAG_DEFS = [
  { id: "tab_calc",    label: "Berechnen",   desc: "Punkte- und Coins-Rechner" },
  { id: "tab_budget",  label: "Tagesbudget", desc: "Persönliches Tagesbudget (Mifflin-St-Jeor)" },
  { id: "tab_recipes", label: "WF Rezepte",  desc: "Rezepte von weightfriends.at" },
  { id: "tab_info",    label: "Info",        desc: "Informationen zu den Systemen" },
];

// ════════════════════════════════════════════════════════════
// SMALL COMPONENTS
// ════════════════════════════════════════════════════════════
function Field({ id, def, value, onChange }) {
  return (
    <div>
      <label htmlFor={id} style={{ fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 5, display: "block", fontFamily: FB, letterSpacing: ".03em" }}>
        {def.label}
      </label>
      <input
        id={id} type="number" min={0} step={def.step}
        className="app-input"
        style={{ padding: "11px 13px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14, fontFamily: FB, color: C.text, background: C.surface, outline: "none", width: "100%", boxSizing: "border-box" }}
        value={value} placeholder="0"
        onChange={e => onChange(id, e.target.value)}
      />
    </div>
  );
}

function ScoreBlock({ value, label, bg, textColor, borderColor }) {
  return (
    <div style={{ flex: "1 1 90px", minWidth: 72, background: bg, border: `1px solid ${borderColor || "transparent"}`, borderRadius: 16, padding: "14px 12px", textAlign: "center" }}>
      <div style={{ fontSize: 46, fontWeight: 700, fontFamily: FH, fontStyle: "italic", color: textColor, lineHeight: 1, letterSpacing: "-.02em" }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: textColor, fontWeight: 600, marginTop: 8, opacity: 0.75, letterSpacing: ".04em", fontFamily: FB }}>
        {label}
      </div>
    </div>
  );
}

function RecipeCard({ recipe, onSelect, selected }) {
  return (
    <div
      className={`recipe-card${selected ? " recipe-card--open" : ""}`}
      style={{ background: C.surface, border: `1.5px solid ${selected ? C.green : C.border}`, borderRadius: 18, padding: "16px 18px", cursor: "pointer", boxShadow: selected ? `0 0 0 3px ${C.greenPale}, ${sh.sm}` : sh.xs }}
      onClick={() => onSelect(selected ? null : recipe.id)}
    >
      <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: C.coinBg, border: `1px solid ${C.coinBorder}`, color: C.coinText, fontWeight: 700, fontFamily: FH, fontStyle: "italic", fontSize: 14, padding: "4px 12px 4px 10px", borderRadius: 999, marginBottom: 9 }}>
        🪙 {recipe.coins} Coins
      </div>
      <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 9, lineHeight: 1.4, fontFamily: FB }}>
        {recipe.name}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {[recipe.kategorie, `⏱ ${recipe.zeit}`, `👥 ${recipe.portionen} Port.`].map((tag, i) => (
          <span key={i} style={{ padding: "4px 10px", borderRadius: 999, background: C.surface2, color: C.sub, fontSize: 11, fontWeight: 600, fontFamily: FB }}>{tag}</span>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 12, color: selected ? C.green : C.muted, fontWeight: 700 }}>
          {selected ? "▲" : "▼"}
        </span>
      </div>
      {selected && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: C.muted, marginBottom: 8, fontFamily: FB }}>Zutaten</div>
          <ul style={{ margin: "0 0 14px", padding: "0 0 0 18px", lineHeight: 1.9, textAlign: "left", fontSize: 13, color: C.text, fontFamily: FB }}>
            {recipe.zutaten.map((z, i) => <li key={i}>{z}</li>)}
          </ul>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: C.muted, marginBottom: 8, fontFamily: FB }}>Zubereitung</div>
          <p style={{ margin: "0 0 12px", lineHeight: 1.8, fontSize: 13, color: C.text, fontFamily: FB }}>{recipe.zubereitung}</p>
          {recipe.hinweis && (
            <div style={{ background: C.greenPale, border: `1px solid rgba(34,139,34,.15)`, borderRadius: 9, padding: "8px 12px", fontSize: 12, color: C.green2, marginBottom: 12, fontFamily: FB }}>
              ℹ️ {recipe.hinweis}
            </div>
          )}
          <a href={recipe.url} target="_blank" rel="noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: C.green, fontWeight: 700, textDecoration: "none", fontFamily: FB, cursor: "pointer" }}
            onClick={e => e.stopPropagation()}>
            → Rezept auf weightfriends.at
          </a>
        </div>
      )}
    </div>
  );
}

// Rolle-Badge
function RoleBadge({ role }) {
  const styles = {
    guest:   { bg: C.surface2,  color: C.sub,       border: C.border },
    user:    { bg: "#EEF2FF",   color: "#3730A3",    border: "#C7D2FE" },
    premium: { bg: C.coinBg,    color: C.coinText,   border: C.coinBorder },
    admin:   { bg: "#FEF2F2",   color: "#991B1B",    border: "rgba(153,27,27,.2)" },
  };
  const s = styles[role] || styles.user;
  return (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, fontFamily: FB, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {ROLE_LABELS[role] || role}
    </span>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN APP
// ════════════════════════════════════════════════════════════
export default function App() {
  const [tab, setTab]                   = useState("calc");
  const [system, setSystem]             = useState("coins");
  const [vals, setVals]                 = useState({ kcal: "", fett: "", gesF: "", ungesF: "", kh: "", zucker: "", protein: "", bst: "", salz: "" });
  const [result, setResult]             = useState(null);
  const [budget, setBudget]             = useState({ gewicht: "", groesse: "", alter: "", geschlecht: "w", aktivitaet: "sitzend" });
  const [budgetResult, setBudgetResult] = useState(null);
  const [openRecipe, setOpenRecipe]     = useState(null);
  const [search, setSearch]             = useState("");
  const [kat, setKat]                   = useState("Alle");
  const [sort, setSort]                 = useState("default");
  const [showSignIn, setShowSignIn]     = useState(false);

  // Admin state
  const [adminFlagDraft, setAdminFlagDraft]   = useState({});
  const [adminFlagSaving, setAdminFlagSaving] = useState(false);
  const [adminFlagMsg, setAdminFlagMsg]       = useState(null);
  const [adminUserQuery, setAdminUserQuery]   = useState("");
  const [adminUsers, setAdminUsers]           = useState([]);
  const [adminUserLoading, setAdminUserLoading] = useState(false);
  const [adminRoleSaving, setAdminRoleSaving]   = useState({});
  const [adminRoleSelected, setAdminRoleSelected] = useState({});
  const [bootstrapMsg, setBootstrapMsg]       = useState(null);

  const { recipes, loading }  = useRecipes();
  const { flags, reload: reloadFlags } = useFeatureFlags();
  const { isSignedIn, user }  = useUser();
  const { getToken }          = useAuth();
  const userRole              = getUserRole(user, isSignedIn);
  const isPremium             = userRole === "premium" || userRole === "admin";
  const premiumSuccess        = new URLSearchParams(window.location.search).get("premium") === "success";

  // Admin fetch helper (always sends Bearer token)
  const adminFetch = useCallback(async (url, options = {}) => {
    const token = await getToken();
    if (!token) throw new Error("Kein Session-Token – bitte neu einloggen.");
    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
  }, [getToken]);

  // Tab visibility: admins see everything; others see only enabled tabs they can access
  const isTabEnabled = (tabId) => {
    if (userRole === "admin") return true;
    const flag = flags?.[`tab_${tabId}`];
    return !flag || flag.enabled;
  };
  const isTabLocked = (tabId) => {
    if (userRole === "admin") return false;
    const flag = flags?.[`tab_${tabId}`];
    if (!flag) return false;
    return !hasAccess(flag.required_role, userRole);
  };

  const startCheckout = async () => {
    if (!isSignedIn) { setShowSignIn(true); return; }
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, userEmail: user.primaryEmailAddress?.emailAddress }),
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
  };

  const n = k => parseFloat(vals[k]) || 0;
  const b = k => parseFloat(budget[k]) || 0;
  const handleVal    = (k, v) => { setVals(p => ({ ...p, [k]: v })); setResult(null); };
  const handleBudget = (k, v) => { setBudget(p => ({ ...p, [k]: v })); setBudgetResult(null); };

  const calculate = () => {
    const d = { kcal: n("kcal"), fett: n("fett"), gesF: n("gesF"), ungesF: n("ungesF"), kh: n("kh"), zucker: n("zucker"), protein: n("protein"), bst: n("bst"), salz: n("salz") };
    setResult({ coins: calcCoins(d), personal: calcPersonalPoints(d), smart: calcSmartPoints(d), pro: calcProPoints(d), classic: calcClassic(d) });
  };

  const calcBudget = () => {
    setBudgetResult(calcDailyBudget({ gewicht: b("gewicht"), groesse: b("groesse"), alter: b("alter"), geschlecht: budget.geschlecht, aktivitaet: budget.aktivitaet }));
  };

  // Admin: save feature flag
  const saveFlag = async (id) => {
    const draft = adminFlagDraft[id] || {};
    const original = flags?.[id] || {};
    const payload = {
      id,
      required_role: draft.required_role ?? original.required_role,
      enabled: draft.enabled ?? original.enabled,
    };
    setAdminFlagSaving(true);
    try {
      const res = await adminFetch("/api/admin-set-flag", { method: "POST", body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      await reloadFlags();
      setAdminFlagDraft(p => { const n = { ...p }; delete n[id]; return n; });
      setAdminFlagMsg({ type: "ok", text: "Gespeichert" });
    } catch {
      setAdminFlagMsg({ type: "err", text: "Fehler beim Speichern" });
    }
    setAdminFlagSaving(false);
    setTimeout(() => setAdminFlagMsg(null), 2500);
  };

  // Admin: search users
  const searchUsers = async () => {
    setAdminUserLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin-get-users?query=${encodeURIComponent(adminUserQuery)}`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      const data = await res.json();
      const users = data.users || [];
      setAdminUsers(users);
      // init role selectors
      const init = {};
      users.forEach(u => { init[u.id] = u.role; });
      setAdminRoleSelected(init);
    } catch {
      setAdminUsers([]);
    }
    setAdminUserLoading(false);
  };

  // Admin: set user role
  const applyUserRole = async (userId) => {
    const role = adminRoleSelected[userId];
    if (!role) return;
    setAdminRoleSaving(p => ({ ...p, [userId]: true }));
    try {
      const res = await adminFetch("/api/admin-set-role", { method: "POST", body: JSON.stringify({ userId, role }) });
      if (!res.ok) throw new Error();
      setAdminUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    } catch {
      alert("Fehler beim Speichern der Rolle");
    }
    setAdminRoleSaving(p => ({ ...p, [userId]: false }));
  };

  // Admin Bootstrap
  const doBootstrap = async () => {
    try {
      const res = await adminFetch("/api/admin-bootstrap", { method: "POST" });
      const data = await res.json();
      const msg = data.message || data.error || "Unbekannte Antwort";
      setBootstrapMsg(data.detail ? `${msg} (${data.detail})` : msg);
      if (data.success) setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      setBootstrapMsg(e?.message || "Netzwerkfehler");
    }
  };

  const kategorien = useMemo(() =>
    ["Alle", ...Array.from(new Set(recipes.map(r => r.kategorie)))], [recipes]);

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

  const TABS = [
    { id: "calc",    label: "Berechnen" },
    { id: "budget",  label: "Tagesbudget" },
    { id: "recipes", label: "WF Rezepte" },
    { id: "info",    label: "Info" },
    ...(userRole === "admin" ? [{ id: "admin", label: "Admin" }] : []),
  ].filter(t => t.id === "admin" || isTabEnabled(t.id));

  useEffect(() => { if (isSignedIn) setShowSignIn(false); }, [isSignedIn]);

  // ── Shared style fragments ──
  const card = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: "20px 22px", marginBottom: 16, boxShadow: sh.xs };
  const sectionLabel = { fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 14, fontFamily: FB };
  const inputStyle = { padding: "11px 13px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14, fontFamily: FB, color: C.text, background: C.surface, outline: "none", width: "100%", boxSizing: "border-box" };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 5, display: "block", fontFamily: FB, letterSpacing: ".03em" };
  const primaryBtn = (coinStyle) => ({
    width: "100%", padding: "14px 0",
    background: coinStyle ? `linear-gradient(135deg, ${C.coin} 0%, #A34D08 100%)` : `linear-gradient(135deg, ${C.green} 0%, ${C.greenLight} 100%)`,
    color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, fontFamily: FB, cursor: "pointer", marginTop: 14,
    letterSpacing: ".04em",
    boxShadow: coinStyle ? "0 3px 12px rgba(198,123,92,.35)" : "0 3px 12px rgba(34,139,34,.3)",
  });
  const filterChip = (active) => ({
    padding: "7px 14px", borderRadius: 999,
    border: `1.5px solid ${active ? C.green : C.border}`,
    background: active ? C.greenPale : C.surface,
    color: active ? C.green2 : C.sub,
    fontWeight: active ? 700 : 500,
    fontSize: 12, fontFamily: FB, cursor: "pointer", whiteSpace: "nowrap",
    minHeight: 36, transition: "all .15s",
  });

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: FB, color: C.text }}>

      {/* Sign-In Modal */}
      {showSignIn && !isSignedIn && (
        <div onClick={() => setShowSignIn(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div onClick={e => e.stopPropagation()}>
            <SignIn routing="hash" forceRedirectUrl={window.location.origin} signUpForceRedirectUrl={window.location.origin} />
          </div>
        </div>
      )}

      {/* Premium success */}
      {premiumSuccess && (
        <div style={{ background: C.green, color: "#fff", textAlign: "center", padding: "12px 16px", fontSize: 14, fontWeight: 600, fontFamily: FB }}>
          🎉 Premium freigeschaltet! Danke für dein Abo.
        </div>
      )}

      {/* Upgrade banner */}
      {isSignedIn && !isPremium && (
        <div style={{ background: C.premBg, borderBottom: `1px solid ${C.premBorder}`, padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: C.premText, fontWeight: 600, fontFamily: FB }}>
            🌿 Tagesbudget &amp; mehr freischalten
          </span>
          <button onClick={startCheckout} className="btn-primary"
            style={{ background: `linear-gradient(135deg, ${C.coin} 0%, #A34D08 100%)`, color: "#fff", border: "none", borderRadius: 9, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FB, whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(198,123,92,.3)" }}>
            Premium – 2,99 €/Monat
          </button>
        </div>
      )}

      {/* Header */}
      <header style={{ background: `linear-gradient(135deg, ${C.green2} 0%, ${C.green} 60%, ${C.greenMid} 100%)`, padding: "14px 20px", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 46, height: 46, borderRadius: 14, flexShrink: 0, background: "rgba(255,255,255,.15)", border: "1.5px solid rgba(255,255,255,.25)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 18 }}>
          wf
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 19, color: "#fff", letterSpacing: "-.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            weight friends &amp; WW Rechner
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.65)", letterSpacing: ".08em", textTransform: "uppercase", fontFamily: FB }}>
              Coins · PersonalPoints · SmartPoints · ProPoints
            </div>
            {isSignedIn && (
              <span style={{ fontSize: 10, background: "rgba(255,255,255,.15)", color: "#fff", borderRadius: 999, padding: "2px 8px", fontFamily: FB, letterSpacing: ".04em", fontWeight: 600 }}>
                {ROLE_LABELS[userRole]}
              </span>
            )}
          </div>
        </div>
        <SignedOut>
          <button onClick={() => setShowSignIn(true)}
            style={{ background: "rgba(255,255,255,.14)", border: "1.5px solid rgba(255,255,255,.3)", color: "#fff", borderRadius: 10, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FB, whiteSpace: "nowrap", flexShrink: 0, minHeight: 44 }}>
            Anmelden
          </button>
        </SignedOut>
        <SignedIn>
          <UserButton appearance={{ elements: { avatarBox: { width: 38, height: 38 } } }} />
        </SignedIn>
      </header>

      {/* Navigation */}
      <nav className="nav-scroll" style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "10px 16px", display: "flex", gap: 6, overflowX: "auto" }}>
        {TABS.map(t => {
          const locked = isTabLocked(t.id);
          const isAdmin = t.id === "admin";
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                padding: "9px 18px", border: "none", borderRadius: 999,
                background: tab === t.id
                  ? (isAdmin ? C.adminText : C.green)
                  : "transparent",
                color: tab === t.id ? "#fff" : (isAdmin ? C.adminText : C.sub),
                fontWeight: tab === t.id ? 700 : 500,
                fontSize: 13, fontFamily: FB, cursor: "pointer", whiteSpace: "nowrap",
                transition: "background .18s, color .18s",
                letterSpacing: ".03em", minHeight: 44,
              }}>
              {t.label}{locked ? " 🔒" : ""}
            </button>
          );
        })}
      </nav>

      {/* Main */}
      <main style={{ maxWidth: 860, margin: "0 auto", padding: "22px 16px 80px" }}>

        {/* ══ BERECHNEN ══ */}
        {tab === "calc" && !isTabLocked("calc") && (
          <div className="tab-content">
            <div style={card}>
              <div style={sectionLabel}>Punktesystem wählen</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {SYSTEMS.map(s => (
                  <button key={s.id} onClick={() => { setSystem(s.id); setResult(null); }}
                    style={{ padding: "10px 14px", border: `1.5px solid ${system === s.id ? C.green : C.border}`, borderRadius: 12, background: system === s.id ? C.greenPale : C.surface, cursor: "pointer", textAlign: "left", fontFamily: FB, transition: "all .15s", display: "flex", flexDirection: "column", gap: 2, minHeight: 52 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: system === s.id ? C.green2 : C.text }}>{s.label}</span>
                    <span style={{ fontSize: 10, color: C.muted, fontWeight: 400 }}>{s.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={card}>
              <div style={sectionLabel}>Nährwerte pro Portion</div>
              <div className="field-grid">
                {SYS_FIELDS[system].map(fid => (
                  <Field key={fid} id={fid} def={FIELD_DEFS[fid]} value={vals[fid]} onChange={handleVal} />
                ))}
              </div>
              <button className="btn-primary" style={primaryBtn(system === "coins")} onClick={calculate}>
                {system === "coins" ? "🪙 Coins berechnen" : "Punkte berechnen"}
              </button>
            </div>

            {result && (
              <div style={card}>
                <div style={sectionLabel}>Ergebnis – alle Systeme im Vergleich</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
                  <ScoreBlock value={result.coins}    label="🌿 Coins (wf)"   bg={C.coinBg}    textColor={C.coinText} borderColor={C.coinBorder} />
                  <ScoreBlock value={result.personal} label="PersonalPoints™" bg={C.greenPale} textColor={C.green}    borderColor="rgba(34,139,34,.14)" />
                  <ScoreBlock value={result.smart}    label="SmartPoints™"    bg={C.greenPale} textColor={C.greenMid} borderColor="rgba(34,139,34,.1)" />
                  <ScoreBlock value={result.pro}      label="ProPoints™"      bg={C.surface2}  textColor={C.sub}      borderColor={C.border} />
                  <ScoreBlock value={result.classic}  label="Classic Points"  bg={C.surface2}  textColor={C.sub}      borderColor={C.border} />
                </div>
              </div>
            )}

            <div style={{ ...card, background: C.greenPale, borderColor: "rgba(34,139,34,.14)" }}>
              <div style={sectionLabel}>Verwendete Formeln</div>
              <div style={{ fontSize: 12, color: C.text, lineHeight: 2.1, fontFamily: "'JetBrains Mono','Fira Code','Courier New',monospace" }}>
                <b style={{ color: C.coinText }}>Coins (wf):</b> kcal×0.022 + gesF×0.20 + Zucker×0.10 + Salz×0.15 − Protein×0.10 − Bst×0.15<br />
                <b style={{ color: C.green }}>PersonalPoints:</b> SmartPoints − Bst×0.14 − ungesF×0.07<br />
                <b style={{ color: C.green }}>SmartPoints:</b> kcal×0.0305 + gesF×0.275 + Zucker×0.12 − Protein×0.098<br />
                <b style={{ color: C.sub }}>ProPoints:</b> Protein×0.36 + KH×0.16 + Fett×0.24 − Bst×0.18<br />
                <b style={{ color: C.sub }}>Classic:</b> kcal×0.0165 + Fett×0.11
              </div>
              <p style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 14, fontStyle: "italic", lineHeight: 1.6, fontFamily: FB }}>
                ⚠️ Alle Formeln sind Näherungen / reverse-engineered. Weder WW noch weight friends veröffentlichen offizielle Formeln.
              </p>
            </div>
          </div>
        )}

        {/* ══ BUDGET – kein Zugriff ══ */}
        {tab === "budget" && isTabLocked("budget") && (
          <div className="tab-content" style={{ ...card, textAlign: "center", padding: "52px 28px" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🌿</div>
            <div style={{ fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 24, color: C.green, marginBottom: 10 }}>Premium-Funktion</div>
            <p style={{ fontSize: 14, color: C.sub, lineHeight: 1.75, maxWidth: 340, margin: "0 auto 28px", fontFamily: FB }}>
              Das persönliche Tagesbudget ist exklusiv für Premium-Mitglieder verfügbar.
            </p>
            <button className="btn-primary" onClick={startCheckout}
              style={{ ...primaryBtn(true), width: "auto", padding: "14px 32px", display: "inline-block" }}>
              🌿 Premium – 2,99 €/Monat
            </button>
          </div>
        )}

        {/* ══ BUDGET – freigeschaltet ══ */}
        {tab === "budget" && !isTabLocked("budget") && (
          <div className="tab-content" style={card}>
            <div style={sectionLabel}>Tages-Budget berechnen</div>
            <p style={{ fontSize: 13, color: C.sub, marginTop: 0, marginBottom: 18, lineHeight: 1.7, fontFamily: FB }}>
              Berechnung via <strong>Mifflin-St-Jeor-Formel</strong> (Grundumsatz × Aktivitätsfaktor).<br />
              weight friends und WW verwenden beide individuelle Budgets basierend auf diesem Prinzip.
            </p>
            <div className="field-grid">
              {[{ id: "gewicht", label: "Gewicht (kg)" }, { id: "groesse", label: "Größe (cm)" }, { id: "alter", label: "Alter (Jahre)" }].map(f => (
                <div key={f.id}>
                  <label style={labelStyle}>{f.label}</label>
                  <input type="number" className="app-input" style={inputStyle} value={budget[f.id]} placeholder="–" onChange={e => handleBudget(f.id, e.target.value)} />
                </div>
              ))}
              <div>
                <label style={labelStyle}>Geschlecht</label>
                <select className="app-select" style={inputStyle} value={budget.geschlecht} onChange={e => handleBudget("geschlecht", e.target.value)}>
                  <option value="w">Weiblich</option><option value="m">Männlich</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Aktivitätsniveau</label>
                <select className="app-select" style={inputStyle} value={budget.aktivitaet} onChange={e => handleBudget("aktivitaet", e.target.value)}>
                  <option value="sitzend">Überwiegend sitzend</option>
                  <option value="leicht">Leicht aktiv</option>
                  <option value="maessig">Mäßig aktiv</option>
                  <option value="aktiv">Sehr aktiv</option>
                </select>
              </div>
            </div>
            <button className="btn-primary" style={primaryBtn(false)} onClick={calcBudget}>Budget berechnen</button>
            {budgetResult && (
              <>
                <div style={{ borderTop: `1px solid ${C.border}`, margin: "22px 0 18px" }} />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
                  <ScoreBlock value={budgetResult.coins} label="🌿 Coins/Tag (wf)"  bg={C.coinBg}    textColor={C.coinText} borderColor={C.coinBorder} />
                  <ScoreBlock value={budgetResult.ww}    label="WW Points/Tag"       bg={C.greenPale} textColor={C.green}    borderColor="rgba(34,139,34,.14)" />
                </div>
                <p style={{ fontSize: 12, color: C.sub, textAlign: "center", marginTop: 14, lineHeight: 1.7, fontFamily: FB }}>
                  Typischer Bereich: <b>18–44 WW Punkte</b> · <b>18–50 Coins</b> pro Tag.<br />
                  Leitsatz-Bonus bei weight friends: +1 Coin pro erfülltem Leitsatz (max. 6 zusätzlich).
                </p>
              </>
            )}
          </div>
        )}

        {/* ══ REZEPTE ══ */}
        {tab === "recipes" && !isTabLocked("recipes") && (
          <div className="tab-content">
            <div style={card}>
              <div style={{ fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 22, color: C.text, marginBottom: 4 }}>
                Rezepte von weight friends
              </div>
              <div style={{ fontSize: 13, color: C.sub, marginBottom: 16, fontFamily: FB }}>
                {loading ? "Rezepte werden geladen…" : `${recipes.length} Rezepte mit Coins-Werten – direkt von weightfriends.at`}
              </div>
              <input className="app-input" style={{ ...inputStyle, marginBottom: 14 }} placeholder="Rezept oder Zutat suchen…" value={search} onChange={e => setSearch(e.target.value)} />
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 10 }}>
                {kategorien.map(k => <button key={k} style={filterChip(kat === k)} onClick={() => setKat(k)}>{k}</button>)}
              </div>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {[["default", "🔀 Standard"], ["coins-asc", "🪙 Coins ↑"], ["coins-desc", "🪙 Coins ↓"]].map(([v, label]) => (
                  <button key={v} style={filterChip(sort === v)} onClick={() => setSort(v)}>{label}</button>
                ))}
              </div>
            </div>
            {loading ? (
              <div style={{ ...card, textAlign: "center", color: C.muted, padding: "44px 24px" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>🌿</div>
                <span style={{ fontFamily: FB }}>Rezepte werden geladen…</span>
              </div>
            ) : filteredRecipes.length === 0 ? (
              <div style={{ ...card, textAlign: "center", color: C.muted, padding: "44px 24px", fontFamily: FB }}>Keine Rezepte gefunden.</div>
            ) : (
              <div className="recipe-grid">
                {filteredRecipes.map(r => <RecipeCard key={r.id} recipe={r} selected={openRecipe === r.id} onSelect={setOpenRecipe} />)}
              </div>
            )}
            <p style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 18, fontStyle: "italic", lineHeight: 1.6, fontFamily: FB }}>
              Rezepte und Coins-Werte stammen von weightfriends.at. Alle Rechte beim Inhaber. Diese App ist kein offizielles Produkt von weight friends.
            </p>
          </div>
        )}

        {/* ══ INFO ══ */}
        {tab === "info" && !isTabLocked("info") && (
          <div className="tab-content">

            {/* App-Beschreibung */}
            <div style={{ ...card, background: `linear-gradient(135deg, ${C.greenPale} 0%, ${C.surface} 100%)`, borderColor: "rgba(34,139,34,.18)" }}>
              <div style={{ fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 22, color: C.green2, marginBottom: 8 }}>
                Über diese App
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.85, color: C.text, marginBottom: 14, fontFamily: FB }}>
                Der <strong>WW &amp; weight friends Punkte-Rechner</strong> hilft dir dabei, Lebensmittel schnell und einfach
                in allen gängigen Punktesystemen zu bewerten – egal ob du gerade bei weight friends oder WW bist,
                oder einfach mehrere Systeme vergleichen möchtest.
              </p>
              <p style={{ fontSize: 13, lineHeight: 1.85, color: C.text, marginBottom: 0, fontFamily: FB }}>
                Gib einfach die Nährwerte vom Etikett ein und erhalte sofort die Punkte für alle fünf Systeme gleichzeitig:
                weight friends Coins, WW PersonalPoints™, SmartPoints™, ProPoints™ und Classic Points.
              </p>
            </div>

            {/* Premium-Vorteile */}
            <div style={{ ...card, background: C.premBg, borderColor: C.premBorder }}>
              <div style={{ fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 18, color: C.premText, marginBottom: 12 }}>
                🌟 Premium-Vorteile
              </div>
              <ul style={{ fontSize: 13, lineHeight: 2.1, color: C.text, paddingLeft: 0, marginBottom: 16, fontFamily: FB, listStyle: "none" }}>
                <li style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ color: C.coin, fontWeight: 700, flexShrink: 0 }}>✦</span>
                  <span><b>Persönliches Tagesbudget</b> – berechne dein individuelles Tages-Limit für Coins und WW-Punkte basierend auf deinem Körpergewicht, deiner Größe, deinem Alter und deiner Aktivität.</span>
                </li>
                <li style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ color: C.coin, fontWeight: 700, flexShrink: 0 }}>✦</span>
                  <span><b>Zugang zu weiteren Funktionen</b> – zukünftige Premium-Features wie Lebensmittel-Favoriten, Tagesprotokoll und Produktdatenbank stehen dir als Erster zur Verfügung.</span>
                </li>
                <li style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ color: C.coin, fontWeight: 700, flexShrink: 0 }}>✦</span>
                  <span><b>Unterstützung der Weiterentwicklung</b> – mit deinem Abo hilfst du dabei, die App weiterzuentwickeln und neue Rezepte, Formeln und Funktionen hinzuzufügen.</span>
                </li>
              </ul>
              {!isPremium && (
                <button onClick={startCheckout} className="btn-primary"
                  style={{ ...primaryBtn(true), marginTop: 0, width: "auto", padding: "12px 28px", display: "inline-block", fontSize: 14 }}>
                  🌿 Jetzt Premium werden – 2,99 €/Monat
                </button>
              )}
              {isPremium && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.greenPale, border: `1px solid rgba(34,139,34,.2)`, borderRadius: 10, padding: "10px 16px", fontFamily: FB, fontSize: 13, fontWeight: 700, color: C.green2 }}>
                  ✓ Du bist Premium-Mitglied
                </div>
              )}
            </div>

            <div style={card}>
              <div style={{ fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 20, color: C.green, marginBottom: 12 }}>
                🌿 weight friends Coins – wie funktioniert's?
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.85, color: C.text, marginBottom: 12, fontFamily: FB }}>
                <strong>weight friends</strong> ist ein österreichisches Abnehmprogramm mit Sitz in Wien.
                Jedes Lebensmittel erhält einen Wert in <strong>Coins</strong>, basierend auf:
              </p>
              <ul style={{ fontSize: 13, lineHeight: 2.1, color: C.text, paddingLeft: 0, marginBottom: 12, fontFamily: FB, listStyle: "none" }}>
                <li>⬆️ <b>Kalorien (kcal)</b> – erhöht den Coin-Wert</li>
                <li>⬆️ <b>Gesättigte Fettsäuren</b> – erhöht den Coin-Wert</li>
                <li>⬆️ <b>Zucker</b> – erhöht den Coin-Wert</li>
                <li>⬆️ <b>Salzgehalt</b> – erhöht den Coin-Wert</li>
                <li>⬇️ <b>Eiweiß (Protein)</b> – senkt den Coin-Wert</li>
                <li>⬇️ <b>Ballaststoffe</b> – senkt den Coin-Wert</li>
              </ul>
              <p style={{ fontSize: 13, lineHeight: 1.85, color: C.text, fontFamily: FB }}>
                Zusätzlich gibt es <b>Bonus-Coins</b> für gesunde Verhaltensweisen (Leitsätze):
                Gemüse &amp; Obst essen, gesunde Fette, ausreichend trinken, bewusst genießen, Bewegung, Erholung.
                Für jeden erfüllten Leitsatz +1 Coin auf das Tagesbudget.
              </p>
            </div>
            <div style={card}>
              <div style={{ fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 20, color: C.greenMid, marginBottom: 10 }}>
                WW PersonalPoints – aktuelles System (2022+)
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.85, color: C.text, fontFamily: FB }}>
                WW (Weight Watchers) berechnet Punkte auf Basis von kcal, gesättigten Fetten, Zucker (negativ)
                und Protein, Ballaststoffen, ungesättigten Fetten (positiv / punktsenkend).
                Über 200 ZeroPoint-Lebensmittel müssen nicht getrackt werden.
                Das individuelle Tagesbudget basiert auf der Mifflin-St-Jeor-Formel.
              </p>
            </div>
            <div style={{ ...card, background: C.greenPale, borderColor: "rgba(34,139,34,.14)" }}>
              <div style={sectionLabel}>Coins-Formel – Herleitung</div>
              <p style={{ fontSize: 12, lineHeight: 1.85, color: C.text, marginBottom: 14, fontFamily: FB }}>
                weight friends veröffentlicht keine offizielle Formel. Die hier verwendete Formel wurde durch
                Auswertung der bekannten Rezept-Coins (z. B. Reisfleisch 7C, Waldviertler Topfenkäse 2C,
                Krautpfanne 5C, Ritschert 5C, Malakofftorte 10C) in Kombination mit den 6 genannten
                Nährwertkategorien abgeleitet (least-squares-Näherung).
              </p>
              <code style={{ fontSize: 12, display: "block", background: "rgba(34,139,34,.08)", border: "1px solid rgba(34,139,34,.15)", padding: "12px 16px", borderRadius: 10, color: C.green2, lineHeight: 1.9, fontFamily: "'JetBrains Mono','Fira Code','Courier New',monospace" }}>
                Coins = kcal×0.022 + gesF×0.20 + Zucker×0.10 + Salz×0.15{"\n"}
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;− Protein×0.10 − Ballaststoffe×0.15{"\n"}
                Minimum: 0, gerundet auf ganze Zahl
              </code>
              <p style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 14, fontStyle: "italic", lineHeight: 1.6, fontFamily: FB }}>
                ⚠️ Nicht-offizielle Näherung. Ergebnisse können von der offiziellen weight friends App abweichen.
              </p>
            </div>
          </div>
        )}

        {/* Lock screens für gesperrte Tabs */}
        {(tab === "calc" || tab === "recipes" || tab === "info") && isTabLocked(tab) && (
          <div className="tab-content" style={{ ...card, textAlign: "center", padding: "52px 28px" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
            <div style={{ fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 22, color: C.green, marginBottom: 10 }}>
              {flags?.[`tab_${tab}`]?.required_role === "user" ? "Anmeldung erforderlich" : "Premium-Funktion"}
            </div>
            <p style={{ fontSize: 14, color: C.sub, lineHeight: 1.75, maxWidth: 340, margin: "0 auto 28px", fontFamily: FB }}>
              {flags?.[`tab_${tab}`]?.required_role === "user"
                ? "Bitte melde dich an, um diesen Bereich zu nutzen."
                : "Dieser Bereich ist für Premium-Mitglieder exklusiv."}
            </p>
            {flags?.[`tab_${tab}`]?.required_role === "user"
              ? <button onClick={() => setShowSignIn(true)} className="btn-primary" style={{ ...primaryBtn(false), width: "auto", padding: "14px 32px", display: "inline-block" }}>Jetzt anmelden</button>
              : <button onClick={startCheckout} className="btn-primary" style={{ ...primaryBtn(true), width: "auto", padding: "14px 32px", display: "inline-block" }}>🌿 Premium – 2,99 €/Monat</button>
            }
          </div>
        )}

        {/* ══ ADMIN ══ */}
        {tab === "admin" && userRole === "admin" && (
          <div className="tab-content">

            {/* Header */}
            <div style={{ ...card, background: C.adminBg, borderColor: C.adminBorder }}>
              <div style={{ fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 22, color: C.adminText, marginBottom: 4 }}>
                Admin-Bereich
              </div>
              <div style={{ fontSize: 13, color: C.adminText, opacity: .7, fontFamily: FB }}>
                Zugriffssteuerung und Benutzerverwaltung
              </div>
            </div>

            {/* Feature Flags */}
            <div style={card}>
              <div style={{ ...sectionLabel, color: C.adminText }}>Zugriffssteuerung – Feature Flags</div>
              <p style={{ fontSize: 12, color: C.sub, marginBottom: 16, lineHeight: 1.6, fontFamily: FB }}>
                Lege fest, welche Rolle für jeden Tab/jede Funktion mindestens erforderlich ist.
                Als Admin siehst du immer alles, unabhängig von diesen Einstellungen.
              </p>

              {flags ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {FLAG_DEFS.map(def => {
                    const current = flags[def.id] || {};
                    const draft = adminFlagDraft[def.id] || {};
                    const reqRole = draft.required_role ?? current.required_role ?? "guest";
                    const enabled  = draft.enabled      ?? current.enabled      ?? true;
                    const isDirty = draft.required_role !== undefined || draft.enabled !== undefined;

                    return (
                      <div key={def.id} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "12px 14px", background: isDirty ? "#FFFBF0" : C.surface2, borderRadius: 12, border: `1px solid ${isDirty ? C.premBorder : C.border}` }}>
                        <div style={{ flex: "1 1 140px", minWidth: 120 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: C.text, fontFamily: FB }}>{def.label}</div>
                          <div style={{ fontSize: 11, color: C.muted, fontFamily: FB }}>{def.desc}</div>
                        </div>

                        {/* Mindestrolle */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: ".08em", textTransform: "uppercase", fontFamily: FB }}>Mindestrolle</label>
                          <select
                            className="app-select"
                            style={{ ...inputStyle, width: "auto", padding: "7px 11px", fontSize: 13, minHeight: 36 }}
                            value={reqRole}
                            onChange={e => setAdminFlagDraft(p => ({ ...p, [def.id]: { ...p[def.id], required_role: e.target.value } }))}
                          >
                            <option value="guest">Gast (alle)</option>
                            <option value="user">Registriert</option>
                            <option value="premium">Premium</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>

                        {/* Aktiv-Toggle */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: ".08em", textTransform: "uppercase", fontFamily: FB }}>Status</label>
                          <button
                            onClick={() => setAdminFlagDraft(p => ({ ...p, [def.id]: { ...p[def.id], enabled: !(draft.enabled ?? current.enabled ?? true) } }))}
                            style={{ padding: "7px 14px", borderRadius: 9, border: `1.5px solid ${enabled ? C.green : C.border}`, background: enabled ? C.greenPale : C.surface2, color: enabled ? C.green2 : C.sub, fontSize: 12, fontWeight: 700, fontFamily: FB, cursor: "pointer", minHeight: 36 }}>
                            {enabled ? "● Aktiv" : "○ Deaktiviert"}
                          </button>
                        </div>

                        {/* Speichern */}
                        <button
                          onClick={() => saveFlag(def.id)}
                          disabled={!isDirty || adminFlagSaving}
                          style={{ padding: "8px 16px", borderRadius: 9, border: "none", background: isDirty ? C.green : C.surface2, color: isDirty ? "#fff" : C.muted, fontSize: 12, fontWeight: 700, fontFamily: FB, cursor: isDirty ? "pointer" : "default", minHeight: 36, opacity: adminFlagSaving ? .6 : 1 }}>
                          {adminFlagSaving ? "…" : "Speichern"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ color: C.muted, fontFamily: FB, fontSize: 13 }}>Lade Flags…</div>
              )}

              {adminFlagMsg && (
                <div style={{ marginTop: 12, padding: "8px 14px", borderRadius: 9, background: adminFlagMsg.type === "ok" ? C.greenPale : "#FEE2E2", color: adminFlagMsg.type === "ok" ? C.green2 : "#991B1B", fontSize: 13, fontWeight: 600, fontFamily: FB }}>
                  {adminFlagMsg.type === "ok" ? "✓ " : "✗ "}{adminFlagMsg.text}
                </div>
              )}
            </div>

            {/* Benutzerverwaltung */}
            <div style={card}>
              <div style={{ ...sectionLabel, color: C.adminText }}>Benutzerverwaltung</div>
              <p style={{ fontSize: 12, color: C.sub, marginBottom: 14, lineHeight: 1.6, fontFamily: FB }}>
                Suche nach Benutzern und weise ihnen eine Rolle zu.
                Mögliche Rollen: <b>Registriert</b> · <b>Premium</b> · <b>Admin</b>
              </p>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <input
                  className="app-input"
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder="E-Mail oder Name suchen…"
                  value={adminUserQuery}
                  onChange={e => setAdminUserQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && searchUsers()}
                />
                <button
                  onClick={searchUsers}
                  disabled={adminUserLoading}
                  style={{ padding: "11px 18px", borderRadius: 10, border: "none", background: C.green, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: FB, cursor: "pointer", whiteSpace: "nowrap", opacity: adminUserLoading ? .7 : 1, minHeight: 44 }}>
                  {adminUserLoading ? "…" : "Suchen"}
                </button>
              </div>

              {adminUsers.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {adminUsers.map(u => (
                    <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "12px 14px", background: C.surface2, borderRadius: 12, border: `1px solid ${C.border}` }}>
                      <div style={{ flex: "1 1 160px" }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: C.text, fontFamily: FB }}>{u.email}</div>
                        <div style={{ fontSize: 11, color: C.muted, fontFamily: FB }}>
                          {u.firstName} {u.lastName} · ID: {u.id.slice(0, 12)}…
                        </div>
                      </div>
                      <RoleBadge role={u.role} />
                      <select
                        className="app-select"
                        style={{ ...inputStyle, width: "auto", padding: "7px 11px", fontSize: 13, minHeight: 36 }}
                        value={adminRoleSelected[u.id] || u.role}
                        onChange={e => setAdminRoleSelected(p => ({ ...p, [u.id]: e.target.value }))}>
                        {ROLE_OPTIONS.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                      <button
                        onClick={() => applyUserRole(u.id)}
                        disabled={adminRoleSaving[u.id]}
                        style={{ padding: "8px 16px", borderRadius: 9, border: "none", background: C.green, color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: FB, cursor: "pointer", opacity: adminRoleSaving[u.id] ? .6 : 1, minHeight: 36 }}>
                        {adminRoleSaving[u.id] ? "…" : "Speichern"}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {adminUsers.length === 0 && adminUserQuery && !adminUserLoading && (
                <div style={{ color: C.muted, fontFamily: FB, fontSize: 13, textAlign: "center", padding: "16px 0" }}>Keine Benutzer gefunden.</div>
              )}
            </div>

            {/* Admin Bootstrap */}
            {userRole !== "admin" && isSignedIn && (
              <div style={{ ...card, borderColor: C.adminBorder, background: C.adminBg }}>
                <div style={{ ...sectionLabel, color: C.adminText }}>Admin einrichten</div>
                <p style={{ fontSize: 13, color: C.sub, marginBottom: 14, fontFamily: FB, lineHeight: 1.6 }}>
                  Klicke hier um dich als Admin einzurichten (funktioniert nur wenn deine E-Mail in der ADMIN_EMAILS Umgebungsvariable steht).
                </p>
                <button onClick={doBootstrap} className="btn-primary"
                  style={{ ...primaryBtn(false), marginTop: 0, background: C.adminText }}>
                  Als Admin einrichten
                </button>
                {bootstrapMsg && (
                  <div style={{ marginTop: 10, fontSize: 13, color: C.sub, fontFamily: FB }}>{bootstrapMsg}</div>
                )}
              </div>
            )}

          </div>
        )}

        {/* Bootstrap-Hinweis wenn eingeloggt aber kein Admin und kein Admin-Tab */}
        {isSignedIn && userRole !== "admin" && tab !== "admin" && (
          <div style={{ textAlign: "center", marginTop: 8 }}>
            <button onClick={doBootstrap} style={{ fontSize: 11, color: C.muted, background: "none", border: "none", cursor: "pointer", fontFamily: FB, textDecoration: "underline" }}>
              Als Admin einrichten
            </button>
            {bootstrapMsg && <div style={{ fontSize: 11, color: C.sub, fontFamily: FB, marginTop: 4 }}>{bootstrapMsg}</div>}
          </div>
        )}

      </main>
    </div>
  );
}
