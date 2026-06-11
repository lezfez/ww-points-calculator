import { FH, FB } from "../styles/theme";

export default function ScoreBlock({ value, label, bg, textColor, borderColor }) {
  return (
    <div style={{ flex: "1 1 90px", minWidth: 72, background: bg, border: `1px solid ${borderColor || "transparent"}`, borderRadius: 16, padding: "14px 12px", textAlign: "center" }}>
      <div style={{ fontSize: 46, fontWeight: 700, fontFamily: FH, fontStyle: "italic", color: textColor, lineHeight: 1, letterSpacing: "-.02em" }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: textColor, fontWeight: 600, marginTop: 8, opacity: 0.75, letterSpacing: ".04em", fontFamily: FB }}>
        {label}
      </div>
    </div>
  );
}
