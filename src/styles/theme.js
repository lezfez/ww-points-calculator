export const FH = "'Lora', Georgia, serif";
export const FB = "'Raleway', system-ui, sans-serif";

export const C = {
  bg:         "#F5F0E8",
  surface:    "#FDFAF5",
  surface2:   "#EDE8DE",
  border:     "#DDD8CC",

  green:      "#228B22",
  green2:     "#1A6B1A",
  greenMid:   "#2E9D2E",
  greenLight: "#5BA85B",
  greenPale:  "#EBF4EB",

  coin:       "#C67B5C",
  coinBg:     "#FAF0EA",
  coinText:   "#7A3618",
  coinBorder: "rgba(198,123,92,.2)",

  text:       "#1C1B18",
  sub:        "#5C5C50",
  muted:      "#9E9E90",

  premBg:     "#FFFBF0",
  premBorder: "#EDD698",
  premText:   "#6B3A00",

  adminBg:    "#F0F4FF",
  adminBorder:"#C7D2FE",
  adminText:  "#3730A3",
};

export const sh = {
  xs: "0 1px 3px rgba(28,27,24,.07), 0 2px 6px rgba(28,27,24,.04)",
  sm: "0 2px 8px rgba(28,27,24,.09), 0 4px 16px rgba(28,27,24,.06)",
};

export const card = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: "20px 22px", marginBottom: 16, boxShadow: sh.xs };
export const sectionLabel = { fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 14, fontFamily: FB };
export const inputStyle = { padding: "11px 13px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14, fontFamily: FB, color: C.text, background: C.surface, outline: "none", width: "100%", boxSizing: "border-box" };
export const labelStyle = { fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 5, display: "block", fontFamily: FB, letterSpacing: ".03em" };

export const primaryBtn = (coinStyle) => ({
  width: "100%", padding: "14px 0",
  background: coinStyle
    ? `linear-gradient(135deg, ${C.coin} 0%, #A34D08 100%)`
    : `linear-gradient(135deg, ${C.green} 0%, ${C.greenLight} 100%)`,
  color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700,
  fontFamily: FB, cursor: "pointer", marginTop: 14, letterSpacing: ".04em",
  boxShadow: coinStyle ? "0 3px 12px rgba(198,123,92,.35)" : "0 3px 12px rgba(34,139,34,.3)",
});

export const filterChip = (active) => ({
  padding: "7px 14px", borderRadius: 999,
  border: `1.5px solid ${active ? C.green : C.border}`,
  background: active ? C.greenPale : C.surface,
  color: active ? C.green2 : C.sub,
  fontWeight: active ? 700 : 500,
  fontSize: 12, fontFamily: FB, cursor: "pointer", whiteSpace: "nowrap",
  minHeight: 36, transition: "all .15s",
});
