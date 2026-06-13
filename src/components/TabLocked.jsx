import { C, FH, FB, card, primaryBtn } from "../styles/theme";

export default function TabLocked({ tabId, flags, onSignIn, onUpgrade, checkoutLoading, premiumPriceLabel = "2,99 €/Monat" }) {
  const requiredRole = flags?.[`tab_${tabId}`]?.required_role;
  const needsLogin = requiredRole === "user";
  return (
    <div className="tab-content" style={{ ...card, textAlign: "center", padding: "52px 28px" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
      <div style={{ fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 22, color: C.green, marginBottom: 10 }}>
        {needsLogin ? "Anmeldung erforderlich" : "Premium-Funktion"}
      </div>
      <p style={{ fontSize: 14, color: C.sub, lineHeight: 1.75, maxWidth: 340, margin: "0 auto 28px", fontFamily: FB }}>
        {needsLogin
          ? "Bitte melde dich an, um diesen Bereich zu nutzen."
          : "Dieser Bereich ist für Premium-Mitglieder exklusiv."}
      </p>
      {needsLogin
        ? <button onClick={onSignIn} className="btn-primary" style={{ ...primaryBtn(false), width: "auto", padding: "14px 32px", display: "inline-block" }}>Jetzt anmelden</button>
        : <button onClick={onUpgrade} disabled={checkoutLoading} className="btn-primary" style={{ ...primaryBtn(true), width: "auto", padding: "14px 32px", display: "inline-block", cursor: checkoutLoading ? "wait" : "pointer", opacity: checkoutLoading ? .75 : 1 }}>
            {checkoutLoading ? "Weiterleitung…" : `🌿 Premium – ${premiumPriceLabel}`}
          </button>
      }
    </div>
  );
}
