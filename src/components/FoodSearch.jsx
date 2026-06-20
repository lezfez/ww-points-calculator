import { useState, useRef, useCallback, useEffect } from "react";
import { useFoodSearch } from "../hooks/useFoodSearch";
import styles from "./FoodSearch.module.css";

function NutriBadge({ label, value, unit = "g" }) {
  if (value == null) return null;
  return (
    <span className={styles.nutriBadge}>
      <b className={styles.nutriBadgeLabel}>{label}</b> {value}{unit}
    </span>
  );
}

function PortionRow({ food, onAdd }) {
  const [grams, setGrams] = useState(food.serving_g || 100);
  const coins = Math.max(0, Math.round(food.coins_100g * grams / 100));

  return (
    <div className={styles.portionRow}>
      <input
        type="number" min="1" max="2000"
        value={grams}
        onChange={e => setGrams(Math.max(1, parseInt(e.target.value) || 1))}
        className={styles.portionInput}
      />
      <span className={styles.portionUnit}>
        g
        {food.serving_label && (
          <button onClick={() => setGrams(food.serving_g || 100)} className={styles.servingBtn}>
            ({food.serving_label})
          </button>
        )}
      </span>
      <span className={styles.portionCoins}>🪙 {coins}</span>
      <button onClick={() => onAdd(food, grams, coins)} className={styles.portionAddBtn}>+</button>
    </div>
  );
}

export default function FoodSearch({ onAdd, onClose, inline = false, favorites = [], onToggleFavorite = null }) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const [barcodeManualOpen, setBarcodeManualOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const { results, loading, search, clear } = useFoodSearch();

  const stopScanner = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScannerOpen(false);
  }, []);

  useEffect(() => {
    return () => stopScanner();
  }, [stopScanner]);

  const startScanner = useCallback(async () => {
    setScannerError("");
    setScannerOpen(true);

    if (typeof window === "undefined" || !("BarcodeDetector" in window)) {
      setScannerError("Scanner wird auf diesem Geraet/Browser nicht unterstuetzt.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;

      if (!videoRef.current) {
        setScannerError("Kamera-Preview konnte nicht gestartet werden.");
        return;
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const detector = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] });
      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (!codes || codes.length === 0) return;
          const raw = String(codes[0].rawValue || "");
          const normalized = raw.replace(/\D/g, "");
          if (normalized.length < 8) return;

          setQuery(normalized);
          setExpanded(null);
          search(normalized);
          stopScanner();
        } catch {
          // ignore transient detector errors
        }
      }, 300);
    } catch {
      setScannerError("Kamera konnte nicht gestartet werden. Bitte Berechtigung pruefen.");
    }
  }, [search, stopScanner]);

  const handleChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    setExpanded(null);
    search(v);
    if (!v) clear();
  };

  const runBarcodeSearch = useCallback(() => {
    const normalized = String(barcodeInput || "").replace(/\D/g, "");
    if (normalized.length < 8) return;
    setQuery(normalized);
    setExpanded(null);
    search(normalized);
    setBarcodeManualOpen(false);
  }, [barcodeInput, search]);

  const handleAdd = (food, grams, coins) => {
    const label = grams === 100 ? "" : ` (${grams}g)`;
    const name = `${food.name}${food.brand ? ` · ${food.brand}` : ""}${label}`;
    onAdd({ id: Date.now(), name, coins });
    onClose();
  };

  const content = (
    <div className={`${inline ? "food-search-inline" : "food-search-sheet"} ${styles.wrap}`}>
      <div className={`${styles.handle} ${inline ? styles.handleInline : styles.handleSheet}`}>
        <div className={styles.handleBar} />
      </div>

      <div className={styles.header}>
        <span className={styles.headerTitle}>🔍 Lebensmittel suchen</span>
        <button onClick={onClose} className={styles.closeBtn}>✕</button>
      </div>

      <div className={styles.searchRow}>
        <input
          className={styles.searchInput}
          placeholder="z.B. Vollmilch, Haferflocken, Tofu…"
          value={query}
          onChange={handleChange}
          autoFocus
        />
        <button
          onClick={() => setBarcodeManualOpen((v) => !v)}
          className={`${styles.toggleBtn}${barcodeManualOpen ? ` ${styles.active}` : ''}`}
        >
          {barcodeManualOpen ? "Zu" : "Code"}
        </button>
        <button
          onClick={scannerOpen ? stopScanner : startScanner}
          className={`${styles.toggleBtn}${scannerOpen ? ` ${styles.active}` : ''}`}
        >
          {scannerOpen ? "Stop" : "Scan"}
        </button>
      </div>

      {barcodeManualOpen && (
        <div className={styles.barcodePanel}>
          <div className={styles.barcodePanelInner}>
            <div className={styles.barcodeHint}>Barcode manuell eingeben (EAN/GTIN):</div>
            <div className={styles.barcodeRow}>
              <input
                className={styles.barcodeInput}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="z.B. 9002490203541"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && runBarcodeSearch()}
              />
              <button
                onClick={runBarcodeSearch}
                disabled={String(barcodeInput || "").replace(/\D/g, "").length < 8}
                className={styles.barcodeSearchBtn}
              >
                Suchen
              </button>
            </div>
          </div>
        </div>
      )}

      {scannerOpen && (
        <div className={styles.scannerPanel}>
          <div className={styles.scannerPanelInner}>
            <div className={styles.scannerHint}>Barcode vor die Kamera halten (EAN/UPC).</div>
            {!scannerError && (
              <video ref={videoRef} muted playsInline className={styles.scannerVideo} />
            )}
            {scannerError && (
              <div className={styles.scannerError}>{scannerError}</div>
            )}
          </div>
        </div>
      )}

      <div className={styles.resultsList}>
        {loading && <div className={styles.loadingMsg}>Suche…</div>}

        {!loading && query.length >= 2 && results.length === 0 && (
          <div className={styles.emptyMsg}>Keine Lebensmittel gefunden.</div>
        )}

        {!loading && results.map((food, i) => {
          const isOpen = expanded === i;
          const favName = `${food.name}${food.brand ? ` · ${food.brand}` : ""}`;
          const favCoins = food.coins_100g;
          const existingFav = favorites.find(f => f.name === favName && Number(f.coins) === Number(favCoins));
          const isFav = Boolean(existingFav);
          return (
            <div key={food.off_id || food.id || i}
              className={`${styles.resultItem}${isOpen ? ` ${styles.open}` : ''}`}>
              <div className={styles.resultRow}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpanded(isOpen ? null : i)}
                  onKeyDown={e => e.key === "Enter" && setExpanded(isOpen ? null : i)}
                  className={styles.resultClickArea}
                >
                  <div className={styles.foodName}>{food.name}</div>
                  {food.brand && <div className={styles.brandName}>{food.brand}</div>}
                  <div className={styles.nutriRow}>
                    <NutriBadge label="kcal" value={food.kcal_100g} unit="" />
                    <NutriBadge label="P" value={food.protein_100g} />
                    <NutriBadge label="KH" value={food.carbs_100g} />
                    <NutriBadge label="F" value={food.fat_100g} />
                  </div>
                </div>
                {onToggleFavorite && (
                  <button
                    onClick={() => onToggleFavorite(food, favName, favCoins, existingFav)}
                    className={styles.favBtn}
                    style={{ opacity: isFav ? 1 : 0.35 }}
                    title={isFav ? "Aus Favoriten entfernen" : "Als Favorit speichern"}
                  >
                    ❤️
                  </button>
                )}
                <div onClick={() => setExpanded(isOpen ? null : i)} className={styles.coinCol}>
                  <div className={styles.coinValue}>🪙 {food.coins_100g}</div>
                  <div className={styles.coinPer100}>/ 100g</div>
                </div>
                <span onClick={() => setExpanded(isOpen ? null : i)} className={styles.expandChevron}>
                  {isOpen ? "▲" : "▼"}
                </span>
              </div>

              {isOpen && (
                <div className={styles.portionWrapper}>
                  <div className={styles.portionLabel}>Menge eingeben:</div>
                  <PortionRow food={food} onAdd={handleAdd} />
                </div>
              )}
            </div>
          );
        })}

        {!query && (
          <div className={styles.hintMsg}>
            Tippe mindestens 2 Zeichen um zu suchen.<br />
            <span className={styles.hintSub}>Daten von Open Food Facts</span>
          </div>
        )}
      </div>
    </div>
  );

  if (inline) return content;

  return (
    <>
      <div onClick={onClose} className="food-search-overlay" />
      {content}
    </>
  );
}
