import { useMemo, useState } from "react";
import { C } from "../../styles/theme";
import { calcDailyBudget } from "../../lib/points";
import ScoreBlock from "../ScoreBlock";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Input from "../ui/Input";
import { useUserProfile } from "../../hooks/useUserProfile";
import styles from "./TabProfile.module.css";

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
    <Card>
      <div className={styles.title}>Mein Profil</div>
      <p className={styles.subtitle}>Verwalte hier deine persönlichen Daten und Budget-Einstellungen zentral.</p>

      <div className="section-label">Persönliche Angaben</div>
      <div className={`field-grid ${styles.fieldGrid}`}>
        <Input
          id="displayName"
          label="Anzeigename"
          value={displayName}
          placeholder="z.B. Alex"
          onChange={e => setDisplayName(e.target.value)}
        />
        <Input
          id="avatarUrl"
          label="Avatar URL"
          value={avatarUrl}
          placeholder="https://…"
          onChange={e => setAvatarUrl(e.target.value)}
        />
      </div>

      <div className="section-label">Budget berechnen</div>
      <div className={`field-grid ${styles.fieldGrid}`}>
        <Input id="gewicht" label="Gewicht (kg)" type="number" value={gewicht} placeholder="–" onChange={e => setGewicht(e.target.value)} />
        <Input id="groesse" label="Größe (cm)"   type="number" value={groesse} placeholder="–" onChange={e => setGroesse(e.target.value)} />
        <Input id="alter"   label="Alter (Jahre)" type="number" value={alter}   placeholder="–" onChange={e => setAlter(e.target.value)} />
        <div className={styles.selectWrap}>
          <label className={styles.label} htmlFor="geschlecht">Geschlecht</label>
          <select id="geschlecht" className={`app-select ${styles.select}`} value={geschlecht} onChange={e => setGeschlecht(e.target.value)}>
            <option value="w">Weiblich</option>
            <option value="m">Männlich</option>
          </select>
        </div>
        <div className={styles.selectWrap}>
          <label className={styles.label} htmlFor="aktivitaet">Aktivitätsniveau</label>
          <select id="aktivitaet" className={`app-select ${styles.select}`} value={aktivitaet} onChange={e => setAktivitaet(e.target.value)}>
            <option value="sitzend">Überwiegend sitzend</option>
            <option value="leicht">Leicht aktiv</option>
            <option value="maessig">Mäßig aktiv</option>
            <option value="aktiv">Sehr aktiv</option>
          </select>
        </div>
      </div>

      <Button
        style={{ marginBottom: 16 }}
        onClick={() => setCalcResult(calcDailyBudget({ ...parsedNumbers, geschlecht, aktivitaet }))}
      >
        Budget berechnen
      </Button>

      {calcResult && (
        <div className={styles.calcResult}>
          <ScoreBlock value={calcResult.coins} label="🌿 Coins/Tag (wf)" bg={C.coinBg} textColor={C.coinText} borderColor={C.coinBorder} />
          <ScoreBlock value={calcResult.ww} label="WW Points/Tag" bg={C.greenPale} textColor={C.green} borderColor="rgba(34,139,34,.14)" />
        </div>
      )}

      <div className={styles.divider}>
        <Input
          id="dailyBudget"
          label="Tages-Budget (Coins)"
          type="number"
          placeholder="z.B. 35"
          value={effectiveBudget}
          onChange={e => { setCalcResult(null); setDailyBudget(e.target.value); }}
        />
        <Input
          id="weeklyBonus"
          label="Wochenbonus (Coins)"
          type="number"
          placeholder="49"
          value={weeklyBonus}
          onChange={e => setWeeklyBonus(e.target.value)}
        />
      </div>

      <Button
        style={{ marginTop: 14 }}
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
      </Button>
    </Card>
  );
}

export default function TabProfile({ isSignedIn, onSignIn }) {
  const { profile, loading, updateProfile } = useUserProfile();
  const [saveState, setSaveState] = useState("idle");

  if (!isSignedIn) {
    return (
      <div className="tab-content">
        <Card className={styles.guestCard}>
          <div className={styles.guestEmoji}>👤</div>
          <div className={styles.guestTitle}>Profil</div>
          <p className={styles.guestText}>Bitte melde dich an, um dein Profil zu bearbeiten.</p>
          <Button onClick={onSignIn}>Anmelden</Button>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`tab-content ${styles.loadingState}`}>Lade Profil…</div>
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
        <div className={`${styles.saveIndicator}${saveState === "saved" ? ` ${styles.saved}` : saveState === "error" ? ` ${styles.error}` : ''}`}>
          {saveState === "saving" ? "Speichert…" : saveState === "saved" ? "✓ Profil gespeichert" : "✗ Speichern fehlgeschlagen"}
        </div>
      )}
    </div>
  );
}
