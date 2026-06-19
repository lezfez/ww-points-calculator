import Card from "../ui/Card";
import Button from "../ui/Button";
import styles from "./TabInfo.module.css";

export default function TabInfo({ isPremium, onUpgrade, checkoutLoading, premiumPriceLabel = "2,99 €/Monat" }) {
  return (
    <div className="tab-content">

      <Card className={styles.heroCard}>
        <div className={styles.heroTitle}>Über diese App</div>
        <p className={styles.prose}>
          Der <strong>WW &amp; weight friends Punkte-Rechner</strong> hilft dir dabei, Lebensmittel schnell und einfach
          in allen gängigen Punktesystemen zu bewerten – egal ob du gerade bei weight friends oder WW bist,
          oder einfach mehrere Systeme vergleichen möchtest.
        </p>
        <p className={styles.proseLast}>
          Gib einfach die Nährwerte vom Etikett ein und erhalte sofort die Punkte für alle fünf Systeme gleichzeitig:
          weight friends Coins, WW PersonalPoints™, SmartPoints™, ProPoints™ und Classic Points.
        </p>
      </Card>

      <Card className={styles.premCard}>
        <div className={styles.premTitle}>🌟 Premium-Vorteile</div>
        <ul className={styles.benefitList}>
          <li className={styles.benefitItem}>
            <span className={styles.benefitBullet}>✦</span>
            <span><b>Persönliches Tagebuch</b> – berechne dein individuelles Tages-Limit für Coins und WW-Punkte basierend auf deinem Körpergewicht, deiner Größe, deinem Alter und deiner Aktivität.</span>
          </li>
          <li className={styles.benefitItem}>
            <span className={styles.benefitBullet}>✦</span>
            <span><b>Zugang zu weiteren Funktionen</b> – zukünftige Premium-Features wie Lebensmittel-Favoriten, Tagesprotokoll und Produktdatenbank stehen dir als Erster zur Verfügung.</span>
          </li>
          <li className={styles.benefitItem}>
            <span className={styles.benefitBullet}>✦</span>
            <span><b>Unterstützung der Weiterentwicklung</b> – mit deinem Abo hilfst du dabei, die App weiterzuentwickeln und neue Rezepte, Formeln und Funktionen hinzuzufügen.</span>
          </li>
        </ul>
        {!isPremium && (
          <Button onClick={onUpgrade} disabled={checkoutLoading} className={styles.upgradeBtn} style={{ cursor: checkoutLoading ? "wait" : "pointer", opacity: checkoutLoading ? .75 : 1 }}>
            {checkoutLoading ? "Weiterleitung…" : `🌿 Jetzt Premium werden – ${premiumPriceLabel}`}
          </Button>
        )}
        {isPremium && (
          <div className={styles.premBadge}>✓ Du bist Premium-Mitglied</div>
        )}
      </Card>

      <Card>
        <div className={styles.sectionTitle}>🌿 weight friends Coins – wie funktioniert's?</div>
        <p className={styles.prose}>
          <strong>weight friends</strong> ist ein österreichisches Abnehmprogramm mit Sitz in Wien.
          Jedes Lebensmittel erhält einen Wert in <strong>Coins</strong>, basierend auf:
        </p>
        <ul className={styles.plainList}>
          <li>⬆️ <b>Kalorien (kcal)</b> – erhöht den Coin-Wert</li>
          <li>⬆️ <b>Gesättigte Fettsäuren</b> – erhöht den Coin-Wert</li>
          <li>⬆️ <b>Zucker</b> – erhöht den Coin-Wert</li>
          <li>⬆️ <b>Salzgehalt</b> – erhöht den Coin-Wert</li>
          <li>⬇️ <b>Eiweiß (Protein)</b> – senkt den Coin-Wert</li>
          <li>⬇️ <b>Ballaststoffe</b> – senkt den Coin-Wert</li>
        </ul>
        <p className={styles.proseLast}>
          Zusätzlich gibt es <b>Bonus-Coins</b> für gesunde Verhaltensweisen (Leitsätze):
          Gemüse &amp; Obst essen, gesunde Fette, ausreichend trinken, bewusst genießen, Bewegung, Erholung.
          Für jeden erfüllten Leitsatz +1 Coin auf das Tagebuch.
        </p>
      </Card>

      <Card>
        <div className={styles.sectionTitleMid}>WW PersonalPoints – aktuelles System (2022+)</div>
        <p className={styles.proseLast}>
          WW (Weight Watchers) berechnet Punkte auf Basis von kcal, gesättigten Fetten, Zucker (negativ)
          und Protein, Ballaststoffen, ungesättigten Fetten (positiv / punktsenkend).
          Über 200 ZeroPoint-Lebensmittel müssen nicht getrackt werden.
          Das individuelle Tagebuch basiert auf der Mifflin-St-Jeor-Formel.
        </p>
      </Card>

      <Card className={styles.formulaCard}>
        <div className="section-label">Coins-Formel – Herleitung</div>
        <p className={styles.prose}>
          weight friends veröffentlicht keine offizielle Formel. Die hier verwendete Formel wurde durch
          Auswertung der bekannten Rezept-Coins (z. B. Reisfleisch 7C, Waldviertler Topfenkäse 2C,
          Krautpfanne 5C, Ritschert 5C, Malakofftorte 10C) in Kombination mit den 6 genannten
          Nährwertkategorien abgeleitet (least-squares-Näherung).
        </p>
        <code className={styles.formulaCode}>
          Coins = kcal×0.022 + gesF×0.20 + Zucker×0.10 + Salz×0.15{"\n"}
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;− Protein×0.10 − Ballaststoffe×0.15{"\n"}
          Minimum: 0, gerundet auf ganze Zahl
        </code>
        <p className={styles.formulaNote}>
          ⚠️ Nicht-offizielle Näherung. Ergebnisse können von der offiziellen weight friends App abweichen.
        </p>
      </Card>

    </div>
  );
}
