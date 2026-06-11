import { useState, useEffect } from "react";

const DISMISS_KEY = "installPromptDismissedUntil";
const DISMISS_DAYS = 7;

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [ready, setReady] = useState(false);

  const isDismissed = () => {
    const until = localStorage.getItem(DISMISS_KEY);
    return until && Date.now() < Number(until);
  };

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    setIsIOS(ios);
    setIsStandalone(standalone);

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Kurze Verzögerung, damit der Banner nicht sofort aufpoppt
    const t = setTimeout(() => setReady(true), 2500);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(t);
    };
  }, []);

  const canShow =
    ready &&
    !isStandalone &&
    !isDismissed() &&
    (deferredPrompt !== null || isIOS);

  const promptInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") dismiss();
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(until));
    setReady(false); // schließt den Banner sofort
  };

  return { canShow, isIOS, promptInstall, dismiss };
}
