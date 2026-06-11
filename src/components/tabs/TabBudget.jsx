import { useState } from "react";
import ScoreBlock from "../ScoreBlock";
import { C, FH, FB, card, sectionLabel, inputStyle, labelStyle, primaryBtn } from "../../styles/theme";
import { calcDailyBudget } from "../../lib/points";

export default function TabBudget({ locked, onUpgrade, checkoutLoading }) {
  const [budget, setBudget] = useState({ gewicht: "", groesse: "", alter: "", geschlecht: "w", aktivitaet: "sitzend" });
  const [budgetResult, setBudgetResult] = useState(null);

  const b = k => parseFloat(budget[k]) || 0;
  const handleBudget = (k, v) => { setBudget(p => ({ ...p, [k]: v })); setBudgetResult(null); };

  const calcBudget = () => {
    setBudgetResult(calcDailyBudget({ gewicht: b("gewicht"), groesse: b("groesse"), alter: b("alter"), geschlecht: budget.geschlecht, aktivitaet: budget.aktivitaet }));
  };

  if (locked) {
    return (
      <div className="tab-content" style={{ ...card, textAlign: "center", padding: "52px 28px" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🌿</div>
        <div style={{ fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 24, color: C.green, marginBottom: 10 }}>Premium-Funktion</div>
        <p style={{ fontSize: 14, color: C.sub, lineHeight: 1.75, maxWidth: 340, margin: "0 auto 28px", fontFamily: FB }}>
          Das persönliche Tagesbudget ist exklusiv für Premium-Mitglieder verfügbar.
        </p>
        <button className="btn-primary" onClick={onUpgrade} disabled={checkoutLoading}
          style={{ ...primaryBtn(true), width: "auto", padding: "14px 32px", display: "inline-block", cursor: checkoutLoading ? "wait" : "pointer", opacity: checkoutLoading ? .75 : 1 }}>
          {checkoutLoading ? "Weiterleitung…" : "🌿 Premium – 2,99 €/Monat"}
        </button>
      </div>
    );
  }

  return (
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
  );
}
