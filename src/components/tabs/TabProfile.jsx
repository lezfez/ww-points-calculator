import { useMemo, useState } from "react";
import { C, FH, FB, card, sectionLabel, inputStyle, labelStyle, primaryBtn } from "../../styles/theme";
import { calcDailyBudget } from "../../lib/points";
import ScoreBlock from "../ScoreBlock";
import { useUserProfile } from "../../hooks/useUserProfile";

function ProfileForm({ profile, onSave, saving }) {
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [gewicht, setGewicht] = useState(profile?.gewicht ?? "");
  const [groesse, setGroesse] = useState(profile?.groesse ?? "");
  const [alter, setAlter] = useState(profile?.alter_j ?? "");
  const [geschlecht, setGeschlecht] = useState(profile?.geschlecht || "w");
  const [aktivitaet, setAktivitaet] = useState(profile?.aktivitaet || "sitzend");
  const [dailyBudget, setDailyBudget] = useState(profile?.daily_budget ? String(profile.daily_budget) : "");
  const [weeklyBonus, setWeeklyBonus] = useState(profile?.weekly_bonus ? String(profile.weekly_bonus) : "49");
  const [calcResult, setCalcResult] = useState(null);

  const parsedNumbers = useMemo(() => ({
    gewicht: parseFloat(gewicht) || 0,
    groesse: parseFloat(groesse) || 0,
    alter: parseFloat(alter) || 0,
  }), [gewicht, groesse, alter]);

  const effectiveBudget = calcResult ? String(calcResult.coins) : dailyBudget;

  return (
    <div style={card}>
      <div style={{ fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 22, color: C.text, marginBottom: 6 }}>
        Mein Profil
      </div>
      <p style={{ fontSize: 13, color: C.sub, marginBottom: 18, lineHeight: 1.7, fontFamily: FB }}>
        Verwalte hier deine persönlichen Daten und Budget-Einstellungen zentral.
      </p>

      <div style={sectionLabel}>Persönliche Angaben</div>
      <div className="field-grid" style={{ marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Anzeigename</label>
          <input className="app-input" style={inputStyle} value={displayName} placeholder="z.B. Alex" onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Avatar URL</label>
          <input className="app-input" style={inputStyle} value={avatarUrl} placeholder="https://..." onChange={(e) => setAvatarUrl(e.target.value)} />
        </div>
      </div>

      <div style={sectionLabel}>Budget berechnen</div>
      <div className="field-grid" style={{ marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>Gewicht (kg)</label>
          <input type="number" className="app-input" style={inputStyle} value={gewicht} placeholder="–" onChange={(e) => setGewicht(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Größe (cm)</label>
          <input type="number" className="app-input" style={inputStyle} value={groesse} placeholder="–" onChange={(e) => setGroesse(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Alter (Jahre)</label>
          <input type="number" className="app-input" style={inputStyle} value={alter} placeholder="–" onChange={(e) => setAlter(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Geschlecht</label>
          <select className="app-select" style={inputStyle} value={geschlecht} onChange={(e) => setGeschlecht(e.target.value)}>
            <option value="w">Weiblich</option>
            <option value="m">Männlich</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Aktivitätsniveau</label>
          <select className="app-select" style={inputStyle} value={aktivitaet} onChange={(e) => setAktivitaet(e.target.value)}>
            <option value="sitzend">Überwiegend sitzend</option>
            <option value="leicht">Leicht aktiv</option>
            <option value="maessig">Mäßig aktiv</option>
            <option value="aktiv">Sehr aktiv</option>
          </select>
        </div>
      </div>

      <button
        className="btn-primary"
        style={{ ...primaryBtn(false), marginBottom: 16 }}
        onClick={() => setCalcResult(calcDailyBudget({ ...parsedNumbers, geschlecht, aktivitaet }))}
      >
        Budget berechnen
      </button>

      {calcResult && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginBottom: 18 }}>
          <ScoreBlock value={calcResult.coins} label="🌿 Coins/Tag (wf)" bg={C.coinBg} textColor={C.coinText} borderColor={C.coinBorder} />
          <ScoreBlock value={calcResult.ww} label="WW Points/Tag" bg={C.greenPale} textColor={C.green} borderColor="rgba(34,139,34,.14)" />
        </div>
      )}

      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <label style={labelStyle}>Tages-Budget (Coins)</label>
          <input type="number" className="app-input" style={inputStyle} placeholder="z.B. 35" value={effectiveBudget} onChange={(e) => { setCalcResult(null); setDailyBudget(e.target.value); }} />
        </div>
        <div>
          <label style={labelStyle}>Wochenbonus (Coins)</label>
          <input type="number" className="app-input" style={inputStyle} placeholder="49" value={weeklyBonus} onChange={(e) => setWeeklyBonus(e.target.value)} />
        </div>
      </div>

      <button
        className="btn-primary"
        style={{ ...primaryBtn(true), marginTop: 14 }}
        disabled={saving || !(parseInt(effectiveBudget) > 0)}
        onClick={() => onSave({
          display_name: displayName.trim() || null,
          avatar_url: avatarUrl.trim() || null,
          gewicht: gewicht ? parseFloat(gewicht) : null,
          groesse: groesse ? parseFloat(groesse) : null,
          alter_j: alter ? parseInt(alter) : null,
          geschlecht,
          aktivitaet,
          daily_budget: parseInt(effectiveBudget) || 0,
          weekly_bonus: parseInt(weeklyBonus) || 49,
        })}
      >
        {saving ? "Speichert…" : "Profil speichern"}
      </button>
    </div>
  );
}

export default function TabProfile({ isSignedIn, onSignIn }) {
  const { profile, loading, updateProfile } = useUserProfile();
  const [saveState, setSaveState] = useState("idle");

  if (!isSignedIn) {
    return (
      <div className="tab-content" style={{ ...card, textAlign: "center", padding: "40px 24px" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
        <div style={{ fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 20, color: C.text, marginBottom: 8 }}>Profil</div>
        <p style={{ fontSize: 13, color: C.sub, fontFamily: FB, marginBottom: 14 }}>Bitte melde dich an, um dein Profil zu bearbeiten.</p>
        <button className="btn-primary" style={primaryBtn(true)} onClick={onSignIn}>Anmelden</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="tab-content" style={{ textAlign: "center", padding: "40px 0", color: C.muted, fontFamily: FB }}>
        Lade Profil…
      </div>
    );
  }

  const formKey = profile?.updated_at || profile?.user_id || "profile-new";

  return (
    <div className="tab-content">
      <ProfileForm
        key={formKey}
        profile={profile || {}}
        saving={saveState === "saving"}
        onSave={async (payload) => {
          setSaveState("saving");
          const result = await updateProfile(payload);
          setSaveState(result ? "saved" : "error");
          setTimeout(() => setSaveState("idle"), 2500);
        }}
      />

      {saveState !== "idle" && (
        <div style={{ marginTop: 10, fontSize: 12, fontFamily: FB, color: saveState === "saved" ? C.green : saveState === "error" ? "#DC2626" : C.muted }}>
          {saveState === "saving" ? "Speichert…" : saveState === "saved" ? "✓ Profil gespeichert" : "✗ Speichern fehlgeschlagen"}
        </div>
      )}
    </div>
  );
}
