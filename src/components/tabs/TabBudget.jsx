import { useState, useId, useEffect } from "react";
import { C, FH, FB, card, sectionLabel, inputStyle, labelStyle, primaryBtn } from "../../styles/theme";
import { calcDailyBudget } from "../../lib/points";
import ScoreBlock from "../ScoreBlock";
import DonutChart from "../DonutChart";
import WeekStrip from "../WeekStrip";
import StatsView from "../StatsView";
import RecipePicker from "../RecipePicker";
import FoodSearch from "../FoodSearch";
import { useUserProfile } from "../../hooks/useUserProfile";
import { useDailyJournal } from "../../hooks/useDailyJournal";
import { useWeeklyJournal } from "../../hooks/useWeeklyJournal";
import { useStats } from "../../hooks/useStats";

// ─── helpers ───────────────────────────────────────────────
const MEALS = [
  { id: "fruehstueck", label: "Frühstück",  icon: "🌅" },
  { id: "snack1",      label: "Snack 1",     icon: "🍎" },
  { id: "mittag",      label: "Mittag",       icon: "☀️" },
  { id: "abend",       label: "Abend",        icon: "🌙" },
  { id: "snack2",      label: "Snack 2",      icon: "🫐" },
];

const WELLNESS_ITEMS = [
  { id: "gemuese",         label: "Gemüse",           max: 5, icon: "🥕" },
  { id: "oel",             label: "Öl",               max: 3, icon: "🫙" },
  { id: "getraenke",       label: "Getränke (0,25l)", max: 8, icon: "💧" },
  { id: "bewusste_mahlzeit", label: "Bewusste Mahlzeit", max: 1, icon: "🍽️" },
];

function toISODate(d) { return d.toISOString().slice(0, 10); }
function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const today = toISODate(new Date());
  const yest = toISODate(new Date(Date.now() - 86400000));
  if (dateStr === today) return "Heute";
  if (dateStr === yest) return "Gestern";
  return d.toLocaleDateString("de-AT", { weekday: "short", day: "numeric", month: "short" });
}
function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toISODate(d);
}
function mealCoins(items) { return (items || []).reduce((s, i) => s + (parseInt(i.coins) || 0), 0); }

// ─── MealSlot ──────────────────────────────────────────────
function MealSlot({ meal, items = [], onChange, onOpenPicker, onOpenFoodSearch }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ name: "", coins: "" });
  const uid = useId();
  const total = mealCoins(items);

  const addItem = () => {
    if (!draft.name.trim() && !draft.coins) return;
    const newItem = { id: Date.now(), name: draft.name.trim() || "–", coins: parseInt(draft.coins) || 0 };
    onChange([...items, newItem]);
    setDraft({ name: "", coins: "" });
  };

  const removeItem = (id) => onChange(items.filter(i => i.id !== id));

  return (
    <div style={{ background: C.surface, border: `1.5px solid ${open ? C.green : C.border}`, borderRadius: 14, overflow: "hidden", transition: "border-color .15s" }}>
      {/* Header row */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>{meal.icon}</span>
        <span style={{ flex: 1, fontWeight: 700, fontSize: 14, color: C.text, fontFamily: FB }}>{meal.label}</span>
        {total > 0 && (
          <span style={{ background: C.coinBg, color: C.coinText, border: `1px solid ${C.coinBorder}`, borderRadius: 999, fontSize: 12, fontWeight: 700, fontFamily: FH, fontStyle: "italic", padding: "2px 10px" }}>
            🪙 {total}
          </span>
        )}
        <span style={{ fontSize: 12, color: C.muted, marginLeft: 4 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ padding: "0 16px 14px", borderTop: `1px solid ${C.border}` }}>
          {/* Items */}
          {items.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingTop: 12, marginBottom: 12 }}>
              {items.map(item => (
                <span key={item.id} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: C.coinBg, border: `1px solid ${C.coinBorder}`, borderRadius: 999, padding: "4px 10px", fontSize: 12, color: C.coinText, fontFamily: FB }}>
                  {item.name}
                  {item.coins > 0 && <b style={{ fontFamily: FH, fontStyle: "italic" }}> · {item.coins}🪙</b>}
                  <button onClick={() => removeItem(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 13, padding: "0 0 0 2px", lineHeight: 1 }}>×</button>
                </span>
              ))}
            </div>
          )}

          {/* Add form */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              className="app-input"
              style={{ ...inputStyle, flex: 1, padding: "8px 11px", fontSize: 13 }}
              placeholder="Speise…"
              value={draft.name}
              onChange={e => setDraft(p => ({ ...p, name: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && addItem()}
              aria-label={`Speise für ${meal.label}`}
            />
            <input
              className="app-input"
              type="number" min="0"
              style={{ ...inputStyle, width: 56, padding: "8px 6px", fontSize: 13, textAlign: "center" }}
              placeholder="🪙"
              value={draft.coins}
              onChange={e => setDraft(p => ({ ...p, coins: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && addItem()}
              aria-label="Coins"
            />
            <button
              onClick={addItem}
              style={{ padding: "8px 12px", borderRadius: 9, border: "none", background: C.green, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", flexShrink: 0 }}>
              +
            </button>
            <button
              onClick={onOpenFoodSearch}
              title="Lebensmittel suchen"
              style={{ padding: "8px 10px", borderRadius: 9, border: `1.5px solid ${C.border}`, background: C.surface2, fontSize: 15, cursor: "pointer", flexShrink: 0 }}>
              🔍
            </button>
            {onOpenPicker && (
              <button
                onClick={onOpenPicker}
                title="Aus Rezepten wählen"
                style={{ padding: "8px 10px", borderRadius: 9, border: `1.5px solid ${C.border}`, background: C.surface2, fontSize: 15, cursor: "pointer", flexShrink: 0 }}>
                📖
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ActivityTracker ───────────────────────────────────────
const BLOCK_COLS = 8;

function BlockRow({ count, onChange, color }) {
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
      {Array.from({ length: BLOCK_COLS }, (_, i) => (
        <button
          key={i}
          onClick={() => onChange(count === i + 1 ? i : i + 1)}
          style={{
            width: 24, height: 24, borderRadius: 6, border: "none",
            background: i < count ? color : C.surface2,
            outline: `1.5px solid ${i < count ? color : C.border}`,
            cursor: "pointer", transition: "background .1s, outline .1s",
          }}
        />
      ))}
      <button onClick={() => onChange(count + 1)}
        style={{ width: 24, height: 24, borderRadius: 6, border: `1.5px solid ${C.border}`, background: "none", cursor: "pointer", color: C.muted, fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
        +
      </button>
      {count > BLOCK_COLS && (
        <span style={{ fontSize: 11, color: C.muted, fontFamily: FB }}>+{count - BLOCK_COLS} weitere</span>
      )}
    </div>
  );
}

function ActivityTracker({ activityBlocks, recoveryBlocks, onChangeActivity, onChangeRecovery }) {
  const earned = activityBlocks + recoveryBlocks;
  return (
    <div style={card}>
      <div style={sectionLabel}>🏃 Aktivität & verdiente Coins</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontFamily: FB, fontSize: 13, fontWeight: 600, color: C.text }}>Aktiv <span style={{ color: C.muted, fontWeight: 400 }}>(je 10 Min)</span></span>
            <span style={{ fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 14, color: C.green }}>+{activityBlocks} 🪙</span>
          </div>
          <BlockRow count={activityBlocks} onChange={onChangeActivity} color={C.green} />
          <div style={{ fontSize: 11, color: C.muted, fontFamily: FB, marginTop: 5 }}>
            {activityBlocks} × 10 Min = {activityBlocks * 10} Minuten aktiv
          </div>
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontFamily: FB, fontSize: 13, fontWeight: 600, color: C.text }}>Erholung <span style={{ color: C.muted, fontWeight: 400 }}>(je 1 Std)</span></span>
            <span style={{ fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 14, color: "#5B8E5B" }}>+{recoveryBlocks} 🪙</span>
          </div>
          <BlockRow count={recoveryBlocks} onChange={onChangeRecovery} color="#5B8E5B" />
          <div style={{ fontSize: 11, color: C.muted, fontFamily: FB, marginTop: 5 }}>
            {recoveryBlocks} × 1 Std = {recoveryBlocks} Stunden Erholung
          </div>
        </div>

        {earned > 0 && (
          <div style={{ background: C.greenPale, border: `1px solid rgba(34,139,34,.18)`, borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: FB, fontSize: 13, color: C.green2, fontWeight: 600 }}>Heute verdient</span>
            <span style={{ fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 18, color: C.green }}>+{earned} 🪙</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── WellnessRow ───────────────────────────────────────────
function WellnessRow({ item, value, onChange }) {
  if (item.max === 1) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 16 }}>{item.icon}</span>
        <span style={{ flex: 1, fontSize: 13, color: C.text, fontFamily: FB }}>{item.label}</span>
        <button
          onClick={() => onChange(!value)}
          style={{ width: 32, height: 32, borderRadius: "50%", border: `2px solid ${value ? C.green : C.border}`, background: value ? C.green : C.surface, color: "#fff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}>
          {value ? "✓" : ""}
        </button>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 16 }}>{item.icon}</span>
      <span style={{ flex: 1, fontSize: 13, color: C.text, fontFamily: FB }}>{item.label}</span>
      <div style={{ display: "flex", gap: 4 }}>
        {Array.from({ length: item.max }, (_, i) => (
          <button key={i}
            onClick={() => onChange(value === i + 1 ? 0 : i + 1)}
            style={{ width: 26, height: 26, borderRadius: "50%", border: `1.5px solid ${i < value ? C.green : C.border}`, background: i < value ? C.greenPale : C.surface, cursor: "pointer", transition: "all .1s" }} />
        ))}
      </div>
      <span style={{ fontSize: 12, color: C.muted, fontFamily: FB, minWidth: 20, textAlign: "right" }}>{value}</span>
    </div>
  );
}

// ─── Budget-Setup (first visit) ────────────────────────────
function BudgetSetup({ onSave, initialProfile }) {
  const [calc, setCalc] = useState({
    gewicht: initialProfile?.gewicht || "",
    groesse: initialProfile?.groesse || "",
    alter:   initialProfile?.alter_j || "",
    geschlecht: initialProfile?.geschlecht || "w",
    aktivitaet: initialProfile?.aktivitaet || "sitzend",
  });
  const [result, setResult] = useState(null);
  const [manual, setManual] = useState(initialProfile?.daily_budget ? String(initialProfile.daily_budget) : "");
  const [weekly, setWeekly] = useState(initialProfile?.weekly_bonus ? String(initialProfile.weekly_bonus) : "49");

  const b = k => parseFloat(calc[k]) || 0;
  const handleCalc = (k, v) => { setCalc(p => ({ ...p, [k]: v })); setResult(null); };
  const compute = () => setResult(calcDailyBudget({ gewicht: b("gewicht"), groesse: b("groesse"), alter: b("alter"), geschlecht: calc.geschlecht, aktivitaet: calc.aktivitaet }));

  const budget = result ? result.coins : (parseInt(manual) || null);

  return (
    <div style={card}>
      <div style={{ fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 20, color: C.text, marginBottom: 4 }}>
        Mein Tagesbudget festlegen
      </div>
      <p style={{ fontSize: 13, color: C.sub, marginBottom: 18, lineHeight: 1.7, fontFamily: FB }}>
        Berechne dein persönliches Budget oder trage es manuell ein.
      </p>

      <div style={{ ...sectionLabel }}>Budget berechnen</div>
      <div className="field-grid" style={{ marginBottom: 14 }}>
        {[{ id: "gewicht", label: "Gewicht (kg)" }, { id: "groesse", label: "Größe (cm)" }, { id: "alter", label: "Alter (Jahre)" }].map(f => (
          <div key={f.id}>
            <label style={labelStyle}>{f.label}</label>
            <input type="number" className="app-input" style={inputStyle} value={calc[f.id]} placeholder="–"
              onChange={e => handleCalc(f.id, e.target.value)} />
          </div>
        ))}
        <div>
          <label style={labelStyle}>Geschlecht</label>
          <select className="app-select" style={inputStyle} value={calc.geschlecht} onChange={e => handleCalc("geschlecht", e.target.value)}>
            <option value="w">Weiblich</option><option value="m">Männlich</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Aktivitätsniveau</label>
          <select className="app-select" style={inputStyle} value={calc.aktivitaet} onChange={e => handleCalc("aktivitaet", e.target.value)}>
            <option value="sitzend">Überwiegend sitzend</option>
            <option value="leicht">Leicht aktiv</option>
            <option value="maessig">Mäßig aktiv</option>
            <option value="aktiv">Sehr aktiv</option>
          </select>
        </div>
      </div>
      <button className="btn-primary" style={{ ...primaryBtn(false), marginBottom: 16 }} onClick={compute}>Budget berechnen</button>

      {result && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginBottom: 18 }}>
          <ScoreBlock value={result.coins} label="🌿 Coins/Tag (wf)" bg={C.coinBg} textColor={C.coinText} borderColor={C.coinBorder} />
          <ScoreBlock value={result.ww} label="WW Points/Tag" bg={C.greenPale} textColor={C.green} borderColor="rgba(34,139,34,.14)" />
        </div>
      )}

      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <label style={labelStyle}>Tages-Budget (Coins) {result ? `– Vorschlag: ${result.coins}` : ""}</label>
          <input type="number" className="app-input" style={inputStyle} placeholder={result ? result.coins : "z.B. 35"}
            value={manual || (result ? result.coins : "")} onChange={e => setManual(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Wochenbonus (Coins)</label>
          <input type="number" className="app-input" style={inputStyle} placeholder="49" value={weekly}
            onChange={e => setWeekly(e.target.value)} />
          <div style={{ fontSize: 11, color: C.muted, fontFamily: FB, marginTop: 4 }}>
            Standard bei weight friends: 49 Bonus-Coins pro Woche
          </div>
        </div>
        <button
          className="btn-primary"
          style={{ ...primaryBtn(true), marginTop: 6 }}
          disabled={!budget}
          onClick={() => onSave({
            daily_budget: budget,
            weekly_bonus: parseInt(weekly) || 49,
            gewicht: parseFloat(calc.gewicht) || null,
            groesse: parseFloat(calc.groesse) || null,
            alter_j: parseInt(calc.alter) || null,
            geschlecht: calc.geschlecht,
            aktivitaet: calc.aktivitaet,
          })}>
          🌿 Budget speichern & Journal starten
        </button>
      </div>
    </div>
  );
}

// ─── Main TabBudget ────────────────────────────────────────
export default function TabBudget({ locked, onUpgrade, checkoutLoading, isSignedIn, recipes = [] }) {
  const [date, setDate] = useState(toISODate(new Date()));
  const [showSettings, setShowSettings] = useState(false);
  const [activeView, setActiveView] = useState("journal"); // "journal" | "stats"
  const [pickerSlot, setPickerSlot] = useState(null); // meal id or null
  const [foodSlot, setFoodSlot] = useState(null);    // meal id for food search

  const { profile, loading: profileLoading, updateProfile } = useUserProfile();
  const { entry, weeklyUsed, loading: journalLoading, saveState, updateEntry, updateMeal } = useDailyJournal(date);
  const { week, streak, reload: reloadWeek } = useWeeklyJournal(date);
  const { data: statsData, loading: statsLoading, reload: reloadStats } = useStats();

  useEffect(() => {
    if (saveState === "saved") { reloadWeek(); reloadStats(); }
  }, [saveState]);

  const handleRecipeSelect = (recipe) => {
    if (!pickerSlot) return;
    const newItem = { id: Date.now(), name: recipe.name, coins: recipe.coins || 0 };
    updateMeal(pickerSlot, [...(entry.meals[pickerSlot] || []), newItem]);
  };

  if (locked) {
    return (
      <div className="tab-content" style={{ ...card, textAlign: "center", padding: "52px 28px" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🌿</div>
        <div style={{ fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 24, color: C.green, marginBottom: 10 }}>Premium-Funktion</div>
        <p style={{ fontSize: 14, color: C.sub, lineHeight: 1.75, maxWidth: 340, margin: "0 auto 28px", fontFamily: FB }}>
          Das persönliche Tagesjournal ist exklusiv für Premium-Mitglieder verfügbar.
        </p>
        <button className="btn-primary" onClick={onUpgrade} disabled={checkoutLoading}
          style={{ ...primaryBtn(true), width: "auto", padding: "14px 32px", display: "inline-block" }}>
          {checkoutLoading ? "Weiterleitung…" : "🌿 Premium – 20 €/Monat"}
        </button>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="tab-content" style={{ ...card, textAlign: "center", padding: "40px 24px" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📒</div>
        <div style={{ fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 20, color: C.text, marginBottom: 8 }}>Tagesjournal</div>
        <p style={{ fontSize: 13, color: C.sub, fontFamily: FB }}>Bitte melde dich an, um dein persönliches Journal zu nutzen.</p>
      </div>
    );
  }

  if (profileLoading) return (
    <div className="tab-content" style={{ textAlign: "center", padding: "40px 0", color: C.muted, fontFamily: FB }}>Lade…</div>
  );

  // First visit: no profile set → show setup
  if (!profile?.daily_budget || showSettings) {
    return (
      <div className="tab-content">
        {showSettings && (
          <button onClick={() => setShowSettings(false)}
            style={{ background: "none", border: "none", color: C.green, fontFamily: FB, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: "0 0 12px", display: "flex", alignItems: "center", gap: 4 }}>
            ← Zurück zum Journal
          </button>
        )}
        <BudgetSetup initialProfile={profile} onSave={async (data) => { await updateProfile(data); setShowSettings(false); }} />
      </div>
    );
  }

  // Derived values
  const { daily_budget, weekly_bonus } = profile;
  const weeklyRemaining = Math.max(weekly_bonus - weeklyUsed, 0);
  const allMealItems = Object.values(entry.meals).flat();
  const totalUsed = allMealItems.reduce((s, i) => s + (parseInt(i.coins) || 0), 0);
  const earnedCoins = (entry.activity_blocks || 0) + (entry.recovery_blocks || 0);
  const totalAvailable = daily_budget + earnedCoins + (entry.used_bonus_coins || 0);
  const today = toISODate(new Date());
  const isToday = date === today;
  const isFuture = date > today;

  return (
    <div className="tab-content">

      {/* Journal / Statistiken toggle */}
      <div style={{ display: "flex", background: C.surface2, borderRadius: 12, padding: 4, marginBottom: 16, gap: 4 }}>
        {[["journal", "📒 Journal"], ["stats", "📊 Statistiken"]].map(([id, label]) => (
          <button key={id} onClick={() => setActiveView(id)}
            style={{
              flex: 1, padding: "9px 0", borderRadius: 9, border: "none", cursor: "pointer",
              fontFamily: FB, fontWeight: 700, fontSize: 13,
              background: activeView === id ? C.surface : "transparent",
              color: activeView === id ? C.green : C.muted,
              boxShadow: activeView === id ? "0 1px 4px rgba(0,0,0,.08)" : "none",
              transition: "all .15s",
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Stats view */}
      {activeView === "stats" && (
        <StatsView days={statsData?.days || []} stats={statsData?.stats || {}} loading={statsLoading} />
      )}

      {/* Journal view */}
      {activeView === "journal" && <>

      {/* Week strip with day selection */}
      <WeekStrip
        week={week}
        streak={streak}
        selectedDate={date}
        onSelectDate={setDate}
        onPrevWeek={() => setDate(d => addDays(d, -7))}
        onNextWeek={() => setDate(d => addDays(d, 7))}
      />

      {/* Selected day label */}
      <div style={{ textAlign: "center", fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 18, color: C.text, marginBottom: 14, marginTop: -6 }}>
        {formatDate(date)}
      </div>

      {/* Budget summary + Donut */}
      <div style={{ ...card, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontFamily: FB, fontSize: 12, color: C.sub }}>
            Budget: <b style={{ color: C.text, fontFamily: FH, fontStyle: "italic" }}>{daily_budget} Coins/Tag</b>
          </div>
          <button onClick={() => setShowSettings(true)}
            style={{ background: "none", border: "none", color: C.green, fontFamily: FB, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            Einstellungen ›
          </button>
        </div>

        {journalLoading
          ? <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontFamily: FB }}>Lade…</div>
          : <DonutChart used={totalUsed} budget={daily_budget} earnedToday={earnedCoins} bonusUsed={entry.used_bonus_coins || 0} />
        }

        {/* Budget breakdown */}
        {!journalLoading && (earnedCoins > 0 || entry.used_bonus_coins > 0) && (
          <div style={{ marginTop: 12, display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontFamily: FB, color: C.muted }}>
              {daily_budget} Budget
              {earnedCoins > 0 && <> + <span style={{ color: C.green, fontWeight: 700 }}>+{earnedCoins} Aktiv</span></>}
              {entry.used_bonus_coins > 0 && <> + <span style={{ color: C.coin, fontWeight: 700 }}>+{entry.used_bonus_coins} Bonus</span></>}
              {" "}= <b style={{ color: C.text }}>{totalAvailable} gesamt</b>
            </span>
          </div>
        )}

        {/* Save indicator */}
        {saveState !== "idle" && (
          <div style={{ marginTop: 8, fontSize: 11, fontFamily: FB, color: saveState === "saved" ? C.green : saveState === "error" ? "#DC2626" : C.muted }}>
            {saveState === "saving" ? "Speichert…" : saveState === "saved" ? "✓ Gespeichert" : "✗ Fehler beim Speichern"}
          </div>
        )}
      </div>

      {/* Aktivitäts-Tracker */}
      {!isFuture && (
        <ActivityTracker
          activityBlocks={entry.activity_blocks || 0}
          recoveryBlocks={entry.recovery_blocks || 0}
          onChangeActivity={v => updateEntry({ activity_blocks: v, recovery_blocks: entry.recovery_blocks || 0 })}
          onChangeRecovery={v => updateEntry({ activity_blocks: entry.activity_blocks || 0, recovery_blocks: v })}
        />
      )}

      {/* Meal slots */}
      {!isFuture && (
        <div style={{ ...card }}>
          <div style={sectionLabel}>Mahlzeiten</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {MEALS.map(meal => (
              <MealSlot
                key={meal.id}
                meal={meal}
                items={entry.meals[meal.id] || []}
                onChange={items => updateMeal(meal.id, items)}
                onOpenPicker={recipes.length > 0 ? () => setPickerSlot(meal.id) : null}
                onOpenFoodSearch={() => setFoodSlot(meal.id)}
              />
            ))}
          </div>
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: FB, fontSize: 13, color: C.sub }}>Tagesverbrauch</span>
            <span style={{ fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 18, color: totalUsed > totalAvailable ? "#DC2626" : C.coinText }}>
              🪙 {totalUsed} / {totalAvailable}
            </span>
          </div>
        </div>
      )}

      {/* Wochenbonus */}
      {!isFuture && (
        <div style={card}>
          <div style={sectionLabel}>Wochenbonus</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FB, fontSize: 13, color: C.text, fontWeight: 600 }}>Heute genutzt</div>
                <div style={{ fontFamily: FB, fontSize: 11, color: C.muted }}>Gesamt noch verfügbar: {weeklyRemaining + entry.used_bonus_coins} von {weekly_bonus}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button onClick={() => updateEntry({ used_bonus_coins: Math.max(0, entry.used_bonus_coins - 1) })}
                  style={{ width: 32, height: 32, borderRadius: "50%", border: `1.5px solid ${C.border}`, background: C.surface2, cursor: "pointer", fontSize: 18, fontWeight: 700, color: C.sub }}>
                  −
                </button>
                <span style={{ fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 20, color: C.coinText, minWidth: 28, textAlign: "center" }}>
                  {entry.used_bonus_coins}
                </span>
                <button onClick={() => updateEntry({ used_bonus_coins: Math.min(weeklyRemaining + entry.used_bonus_coins, entry.used_bonus_coins + 1) })}
                  style={{ width: 32, height: 32, borderRadius: "50%", border: `1.5px solid ${C.green}`, background: C.greenPale, cursor: "pointer", fontSize: 18, fontWeight: 700, color: C.green }}>
                  +
                </button>
              </div>
            </div>

            {/* Weekly bar */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted, fontFamily: FB, marginBottom: 5 }}>
                <span>Woche verbraucht: {weeklyUsed}</span>
                <span>Noch: {weeklyRemaining}</span>
              </div>
              <div style={{ height: 8, background: C.surface2, borderRadius: 999, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min((weeklyUsed / weekly_bonus) * 100, 100)}%`, background: weeklyUsed > weekly_bonus * 0.8 ? "#DC2626" : C.coin, borderRadius: 999, transition: "width .3s" }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wellness Checkliste */}
      {!isFuture && (
        <div style={card}>
          <div style={sectionLabel}>Wohlbefinden & Gewohnheiten</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {WELLNESS_ITEMS.map(item => (
              <WellnessRow
                key={item.id}
                item={item}
                value={entry.wellness[item.id]}
                onChange={val => updateEntry({ wellness: { ...entry.wellness, [item.id]: val } })}
              />
            ))}
          </div>
        </div>
      )}

      {isFuture && (
        <div style={{ ...card, textAlign: "center", padding: "32px 20px", color: C.muted, fontFamily: FB, fontSize: 14 }}>
          Kein Journal für zukünftige Tage.
        </div>
      )}

      </>}

      {/* Recipe picker modal */}
      {pickerSlot && (
        <RecipePicker
          recipes={recipes}
          onSelect={handleRecipeSelect}
          onClose={() => setPickerSlot(null)}
        />
      )}

      {/* Food search modal */}
      {foodSlot && (
        <FoodSearch
          onAdd={(item) => updateMeal(foodSlot, [...(entry.meals[foodSlot] || []), item])}
          onClose={() => setFoodSlot(null)}
        />
      )}

    </div>
  );
}
