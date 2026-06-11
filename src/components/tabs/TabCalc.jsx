import { useState } from "react";
import Field from "../Field";
import ScoreBlock from "../ScoreBlock";
import { C, FB, card, sectionLabel, primaryBtn } from "../../styles/theme";
import { SYSTEMS, SYS_FIELDS, FIELD_DEFS } from "../../lib/pointSystems";
import { calcClassic, calcCoins, calcPersonalPoints, calcProPoints, calcSmartPoints } from "../../lib/points";

export default function TabCalc() {
  const [system, setSystem] = useState("coins");
  const [vals, setVals] = useState({ kcal: "", fett: "", gesF: "", ungesF: "", kh: "", zucker: "", protein: "", bst: "", salz: "" });
  const [result, setResult] = useState(null);

  const n = k => parseFloat(vals[k]) || 0;
  const handleVal = (k, v) => { setVals(p => ({ ...p, [k]: v })); setResult(null); };

  const calculate = () => {
    const d = { kcal: n("kcal"), fett: n("fett"), gesF: n("gesF"), ungesF: n("ungesF"), kh: n("kh"), zucker: n("zucker"), protein: n("protein"), bst: n("bst"), salz: n("salz") };
    setResult({ coins: calcCoins(d), personal: calcPersonalPoints(d), smart: calcSmartPoints(d), pro: calcProPoints(d), classic: calcClassic(d) });
  };

  return (
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

      <div style={card} onKeyDown={e => { if (e.key === "Enter") calculate(); }}>
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
  );
}
