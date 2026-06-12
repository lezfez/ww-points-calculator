import { useState, useEffect } from "react";

const DISMISS_KEY = "installPromptDismissedUntil";
const DISMISS_DAYS = 7;

function getIsIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

function getIsStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
}

function getIsDismissed() {
  const until = localStorage.getItem(DISMISS_KEY);
  return Boolean(until && Date.now() < Number(until));
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS] = useState(getIsIOS);
  const [isStandalone] = useState(getIsStandalone);
  const [dismissed, setDismissed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Kurze Verzögerung, damit der Banner nicht sofort aufpoppt
    const t = setTimeout(() => {
      setDismissed(getIsDismissed());
      setReady(true);
    }, 2500);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(t);
    };
  }, []);

  const canShow =
    ready &&
    !isStandalone &&
    !dismissed &&
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
    setDismissed(true);
    setReady(false); // schließt den Banner sofort
  };

  return { canShow, isIOS, promptInstall, dismiss };
}
