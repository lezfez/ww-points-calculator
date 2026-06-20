import { useInstallPrompt } from "../hooks/useInstallPrompt";
import appLogoIcon from "../assets/app-logo-icon.svg";
import Button from "./ui/Button";
import styles from './InstallBanner.module.css';

export default function InstallBanner() {
  const { canShow, isIOS, promptInstall, dismiss } = useInstallPrompt();

  if (!canShow) return null;

  return (
    <>
      <div className={styles.backdrop} onClick={dismiss} />

      <div className={styles.sheet}>
        <div className={styles.handle} />

        <div className={styles.header}>
          <div className={styles.icon}>
            <img src={appLogoIcon} alt="" />
          </div>
          <div className={styles.headerText}>
            <div className={styles.title}>WampeWeg installieren</div>
            <div className={styles.subtitle}>WW &amp; weight friends Rechner</div>
          </div>
          <button className={styles.closeBtn} onClick={dismiss} aria-label="Schließen">✕</button>
        </div>

        <p className={styles.description}>
          {isIOS
            ? <>Tippe unten auf <b>Teilen</b> <span className={styles.shareIcon}>⎙</span> und dann auf <b>„Zum Home-Bildschirm"</b>, um die App zu installieren.</>
            : <>Füge die App zum Startbildschirm hinzu – kein App Store, kein Download. Funktioniert wie eine native App.</>
          }
        </p>

        {!isIOS && (
          <Button onClick={promptInstall} className={styles.btnNoTop}>
            🌿 Zum Startbildschirm hinzufügen
          </Button>
        )}

        {isIOS && (
          <Button onClick={dismiss} className={`${styles.dismissBtn} ${styles.btnNoTop}`}>
            Verstanden
          </Button>
        )}
      </div>
    </>
  );
}
