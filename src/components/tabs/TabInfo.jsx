import { C, FH, FB, card, sectionLabel, primaryBtn } from "../../styles/theme";

export default function TabInfo({ isPremium, onUpgrade, checkoutLoading }) {
  return (
    <div className="tab-content">

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

      <div style={{ ...card, background: C.premBg, borderColor: C.premBorder }}>
        <div style={{ fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 18, color: C.premText, marginBottom: 12 }}>
          🌟 Premium-Vorteile
        </div>
        <ul style={{ fontSize: 13, lineHeight: 2.1, color: C.text, paddingLeft: 0, marginBottom: 16, fontFamily: FB, listStyle: "none" }}>
          <li style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ color: C.coin, fontWeight: 700, flexShrink: 0 }}>✦</span>
            <span><b>Persönliches Tagebuch</b> – berechne dein individuelles Tages-Limit für Coins und WW-Punkte basierend auf deinem Körpergewicht, deiner Größe, deinem Alter und deiner Aktivität.</span>
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
          <button onClick={onUpgrade} className="btn-primary"
            disabled={checkoutLoading}
            style={{ ...primaryBtn(true), marginTop: 0, width: "auto", padding: "12px 28px", display: "inline-block", fontSize: 14, cursor: checkoutLoading ? "wait" : "pointer", opacity: checkoutLoading ? .75 : 1 }}>
            {checkoutLoading ? "Weiterleitung…" : "🌿 Jetzt Premium werden – 2,99 €/Monat"}
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
          Für jeden erfüllten Leitsatz +1 Coin auf das Tagebuch.
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
          Das individuelle Tagebuch basiert auf der Mifflin-St-Jeor-Formel.
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
  );
}
