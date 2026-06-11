function clamp(v, lo, hi) {
  return Math.min(Math.max(v, lo), hi);
}

export function calcClassic({ kcal, fett }) {
  return Math.max(0, Math.round(kcal * 0.0165 + fett * 0.11));
}

export function calcProPoints({ protein, kh, fett, bst }) {
  return Math.max(0, Math.round(protein * 0.36 + kh * 0.16 + fett * 0.24 - clamp(bst, 0, 10) * 0.18 + 0.14));
}

export function calcSmartPoints({ kcal, gesF, zucker, protein }) {
  return Math.max(0, Math.round(kcal * 0.0305 + gesF * 0.275 + zucker * 0.12 - protein * 0.098));
}

export function calcPersonalPoints({ kcal, gesF, ungesF, zucker, protein, bst }) {
  const sp = kcal * 0.0305 + gesF * 0.275 + zucker * 0.12 - protein * 0.098;
  return Math.max(0, Math.round(sp - clamp(bst, 0, 10) * 0.14 - clamp(ungesF, 0, 20) * 0.07));
}

export function calcCoins({ kcal, gesF, zucker, protein, bst, salz }) {
  const raw = kcal * 0.022 + gesF * 0.20 + zucker * 0.10 + salz * 0.15
    - clamp(protein, 0, 50) * 0.10 - clamp(bst, 0, 10) * 0.15;
  return Math.max(0, Math.round(raw));
}

export function calcDailyBudget({ gewicht, groesse, alter, geschlecht, aktivitaet }) {
  const bmr = geschlecht === "m"
    ? 10 * gewicht + 6.25 * groesse - 5 * alter + 5
    : 10 * gewicht + 6.25 * groesse - 5 * alter - 161;
  const f = { sitzend: 1.2, leicht: 1.375, maessig: 1.55, aktiv: 1.725 }[aktivitaet] || 1.2;
  return { ww: clamp(Math.round(bmr * f / 30), 18, 44), coins: clamp(Math.round(bmr * f / 28), 18, 50) };
}
