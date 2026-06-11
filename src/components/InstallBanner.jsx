import { useInstallPrompt } from "../hooks/useInstallPrompt";
import { C, FH, FB, primaryBtn } from "../styles/theme";
import appLogoIcon from "../assets/app-logo-icon.svg";

export default function InstallBanner() {
  const { canShow, isIOS, promptInstall, dismiss } = useInstallPrompt();

  if (!canShow) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={dismiss}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 600, backdropFilter: "blur(2px)" }}
      />

      {/* Sheet */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 601,
        background: C.surface,
        borderRadius: "22px 22px 0 0",
        padding: "20px 20px 36px",
        boxShadow: "0 -6px 32px rgba(28,27,24,.18)",
        animation: "slideUp .25s ease-out",
      }}>

        {/* Drag handle */}
        <div style={{ width: 40, height: 4, background: C.border, borderRadius: 999, margin: "0 auto 18px" }} />

        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 54, height: 54, borderRadius: 14, flexShrink: 0,
            background: `linear-gradient(135deg, ${C.green2} 0%, ${C.green} 100%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <img src={appLogoIcon} alt="" style={{ width: 38, height: 38 }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 17, color: C.text, lineHeight: 1.2 }}>
              WampeWeg installieren
            </div>
            <div style={{ fontSize: 12, color: C.sub, fontFamily: FB, marginTop: 3 }}>
              WW &amp; weight friends Rechner
            </div>
          </div>
          <button
            onClick={dismiss}
            aria-label="Schließen"
            style={{ background: C.surface2, border: "none", borderRadius: 999, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, fontSize: 16, color: C.sub }}
          >
            ✕
          </button>
        </div>

        {/* Description */}
        <p style={{ fontSize: 13, color: C.sub, fontFamily: FB, lineHeight: 1.65, margin: "0 0 20px" }}>
          {isIOS
            ? <>Tippe unten auf <b style={{ color: C.text }}>Teilen</b> <span style={{ fontSize: 15 }}>⎙</span> und dann auf <b style={{ color: C.text }}>„Zum Home-Bildschirm"</b>, um die App zu installieren.</>
            : <>Füge die App zum Startbildschirm hinzu – kein App Store, kein Download. Funktioniert wie eine native App.</>
          }
        </p>

        {/* Action */}
        {!isIOS && (
          <button
            onClick={promptInstall}
            style={{ ...primaryBtn(false), marginTop: 0 }}
          >
            🌿 Zum Startbildschirm hinzufügen
          </button>
        )}

        {isIOS && (
          <button
            onClick={dismiss}
            style={{ ...primaryBtn(false), marginTop: 0, background: C.surface2, color: C.sub, boxShadow: "none" }}
          >
            Verstanden
          </button>
        )}

      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
