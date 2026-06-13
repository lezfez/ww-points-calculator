import { useState, useRef, useCallback, useEffect } from "react";
import { C, FH, FB } from "../styles/theme";
import { useFoodSearch } from "../hooks/useFoodSearch";

function NutriBadge({ label, value, unit = "g" }) {
  if (value == null) return null;
  return (
    <span style={{ fontSize: 10, color: C.muted, fontFamily: FB }}>
      <b style={{ color: C.sub }}>{label}</b> {value}{unit}
    </span>
  );
}

function PortionRow({ food, onAdd }) {
  const [grams, setGrams] = useState(food.serving_g || 100);
  const coins = Math.max(0, Math.round(food.coins_100g * grams / 100));

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, marginTop: 8,
      padding: "8px 10px", background: C.surface2, borderRadius: 9,
    }}>
      <input
        type="number" min="1" max="2000"
        value={grams}
        onChange={e => setGrams(Math.max(1, parseInt(e.target.value) || 1))}
        style={{
          width: 64, padding: "5px 8px", borderRadius: 7,
          border: `1.5px solid ${C.border}`, background: C.surface,
          fontFamily: FB, fontSize: 13, color: C.text, textAlign: "center",
        }}
      />
      <span style={{ fontFamily: FB, fontSize: 12, color: C.muted, flex: 1 }}>
        g
        {food.serving_label && (
          <button
            onClick={() => setGrams(food.serving_g || 100)}
            style={{ marginLeft: 6, fontSize: 10, color: C.green, background: "none", border: "none", cursor: "pointer", fontFamily: FB, padding: 0 }}>
            ({food.serving_label})
          </button>
        )}
      </span>
      <span style={{
        fontFamily: FH, fontStyle: "italic", fontWeight: 700,
        fontSize: 14, color: C.coinText, minWidth: 44, textAlign: "right",
      }}>
        🪙 {coins}
      </span>
      <button
        onClick={() => onAdd(food, grams, coins)}
        style={{
          padding: "6px 14px", borderRadius: 8, border: "none",
          background: C.green, color: "#fff", fontWeight: 700,
          fontSize: 13, cursor: "pointer", flexShrink: 0,
        }}>
        +
      </button>
    </div>
  );
}

export default function FoodSearch({ onAdd, onClose, inline = false }) {
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
    <div className={inline ? "food-search-inline" : "food-search-sheet"} style={{
      background: C.bg,
      display: "flex",
      flexDirection: "column",
    }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: inline ? "0 0 6px" : "12px 0 0" }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: C.border }} />
        </div>

        {/* Header */}
        <div style={{ padding: "10px 20px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 17, color: C.text }}>
            🔍 Lebensmittel suchen
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: C.muted, padding: 0 }}>✕</button>
        </div>

        {/* Search input */}
        <div style={{ padding: "0 16px 10px", display: "flex", gap: 8 }}>
          <input
            className="app-input"
            placeholder="z.B. Vollmilch, Haferflocken, Tofu…"
            value={query}
            onChange={handleChange}
            autoFocus
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 10,
              border: `1.5px solid ${C.border}`, background: C.surface,
              fontFamily: FB, fontSize: 14, color: C.text, boxSizing: "border-box",
            }}
          />
          <button
            onClick={() => setBarcodeManualOpen((v) => !v)}
            style={{
              borderRadius: 10,
              border: `1.5px solid ${barcodeManualOpen ? C.green : C.border}`,
              background: barcodeManualOpen ? C.greenPale : C.surface,
              color: barcodeManualOpen ? C.green : C.sub,
              fontFamily: FB,
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              minWidth: 86,
              padding: "0 10px",
              flexShrink: 0,
            }}
          >
            {barcodeManualOpen ? "Zu" : "Code"}
          </button>
          <button
            onClick={scannerOpen ? stopScanner : startScanner}
            style={{
              borderRadius: 10,
              border: `1.5px solid ${scannerOpen ? C.green : C.border}`,
              background: scannerOpen ? C.greenPale : C.surface,
              color: scannerOpen ? C.green : C.sub,
              fontFamily: FB,
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              minWidth: 86,
              padding: "0 10px",
              flexShrink: 0,
            }}
          >
            {scannerOpen ? "Stop" : "Scan"}
          </button>
        </div>

        {barcodeManualOpen && (
          <div style={{ padding: "0 16px 12px" }}>
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, background: C.surface, padding: 10 }}>
              <div style={{ fontFamily: FB, fontSize: 11, color: C.muted, marginBottom: 8 }}>
                Barcode manuell eingeben (EAN/GTIN):
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  className="app-input"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="z.B. 9002490203541"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && runBarcodeSearch()}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: `1.5px solid ${C.border}`,
                    background: C.surface2,
                    fontFamily: FB,
                    fontSize: 16,
                    color: C.text,
                    boxSizing: "border-box",
                    letterSpacing: ".03em",
                  }}
                />
                <button
                  onClick={runBarcodeSearch}
                  disabled={String(barcodeInput || "").replace(/\D/g, "").length < 8}
                  style={{
                    borderRadius: 10,
                    border: "none",
                    background: C.green,
                    color: "#fff",
                    fontFamily: FB,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                    minWidth: 78,
                    padding: "0 10px",
                    opacity: String(barcodeInput || "").replace(/\D/g, "").length < 8 ? 0.5 : 1,
                  }}
                >
                  Suchen
                </button>
              </div>
            </div>
          </div>
        )}

        {scannerOpen && (
          <div style={{ padding: "0 16px 12px" }}>
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, background: C.surface, padding: 10 }}>
              <div style={{ fontFamily: FB, fontSize: 11, color: C.muted, marginBottom: 8 }}>
                Barcode vor die Kamera halten (EAN/UPC).
              </div>
              {!scannerError && (
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  style={{ width: "100%", borderRadius: 8, background: "#111", aspectRatio: "4 / 3", objectFit: "cover" }}
                />
              )}
              {scannerError && (
                <div style={{ fontFamily: FB, fontSize: 12, color: "#B91C1C", lineHeight: 1.5 }}>
                  {scannerError}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Results */}
        <div style={{ overflowY: "auto", padding: "0 16px 28px", flex: 1 }}>
          {loading && (
            <div style={{ textAlign: "center", padding: "20px 0", color: C.muted, fontFamily: FB, fontSize: 13 }}>
              Suche…
            </div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div style={{ textAlign: "center", padding: "20px 0", color: C.muted, fontFamily: FB, fontSize: 13 }}>
              Keine Lebensmittel gefunden.
            </div>
          )}

          {!loading && results.map((food, i) => {
            const isOpen = expanded === i;
            return (
              <div key={food.off_id || food.id || i}
                style={{ marginBottom: 8, background: C.surface, border: `1px solid ${isOpen ? C.green : C.border}`, borderRadius: 12, overflow: "hidden", transition: "border-color .15s" }}>

                {/* Food row */}
                <button
                  onClick={() => setExpanded(isOpen ? null : i)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "11px 12px", background: "none", border: "none",
                    cursor: "pointer", textAlign: "left",
                  }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: FB, fontWeight: 700, fontSize: 13, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {food.name}
                    </div>
                    {food.brand && (
                      <div style={{ fontSize: 11, color: C.muted, fontFamily: FB }}>{food.brand}</div>
                    )}
                    <div style={{ display: "flex", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
                      <NutriBadge label="kcal" value={food.kcal_100g} unit="" />
                      <NutriBadge label="P" value={food.protein_100g} />
                      <NutriBadge label="KH" value={food.carbs_100g} />
                      <NutriBadge label="F" value={food.fat_100g} />
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: "right" }}>
                    <div style={{ fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 13, color: C.coinText }}>
                      🪙 {food.coins_100g}
                    </div>
                    <div style={{ fontSize: 10, color: C.muted, fontFamily: FB }}>/ 100g</div>
                  </div>
                  <span style={{ fontSize: 12, color: C.muted, flexShrink: 0 }}>{isOpen ? "▲" : "▼"}</span>
                </button>

                {/* Portion selector */}
                {isOpen && (
                  <div style={{ padding: "0 12px 12px", borderTop: `1px solid ${C.border}` }}>
                    <div style={{ fontFamily: FB, fontSize: 11, color: C.muted, marginBottom: 6, marginTop: 8 }}>
                      Menge eingeben:
                    </div>
                    <PortionRow food={food} onAdd={handleAdd} />
                  </div>
                )}
              </div>
            );
          })}

          {!query && (
            <div style={{ textAlign: "center", padding: "24px 0 8px", color: C.muted, fontFamily: FB, fontSize: 13 }}>
              Tippe mindestens 2 Zeichen um zu suchen.<br />
              <span style={{ fontSize: 11 }}>Daten von Open Food Facts</span>
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
