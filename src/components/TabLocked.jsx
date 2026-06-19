import Card from "./ui/Card";
import Button from "./ui/Button";
import styles from "./TabLocked.module.css";

export default function TabLocked({ tabId, flags, onSignIn, onUpgrade, checkoutLoading, premiumPriceLabel = "2,99 €/Monat" }) {
  const requiredRole = flags?.[`tab_${tabId}`]?.required_role;
  const needsLogin = requiredRole === "user";
  return (
    <div className="tab-content">
      <Card className={styles.root}>
        <div className={styles.icon}>🔒</div>
        <div className={styles.title}>
          {needsLogin ? "Anmeldung erforderlich" : "Premium-Funktion"}
        </div>
        <p className={styles.desc}>
          {needsLogin
            ? "Bitte melde dich an, um diesen Bereich zu nutzen."
            : "Dieser Bereich ist für Premium-Mitglieder exklusiv."}
        </p>
        {needsLogin
          ? <Button onClick={onSignIn} className={styles.btn}>Jetzt anmelden</Button>
          : <Button onClick={onUpgrade} disabled={checkoutLoading} className={styles.btn} style={{ cursor: checkoutLoading ? "wait" : "pointer", opacity: checkoutLoading ? .75 : 1 }}>
              {checkoutLoading ? "Weiterleitung…" : `🌿 Premium – ${premiumPriceLabel}`}
            </Button>
        }
      </Card>
    </div>
  );
}
