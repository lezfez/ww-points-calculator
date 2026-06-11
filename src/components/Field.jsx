import { C, FB } from "../styles/theme";

export default function Field({ id, def, value, onChange }) {
  return (
    <div>
      <label htmlFor={id} style={{ fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 5, display: "block", fontFamily: FB, letterSpacing: ".03em" }}>
        {def.label}
      </label>
      <input
        id={id} type="number" min={0} step={def.step}
        className="app-input"
        style={{ padding: "11px 13px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14, fontFamily: FB, color: C.text, background: C.surface, outline: "none", width: "100%", boxSizing: "border-box" }}
        value={value} placeholder="0"
        onChange={e => onChange(id, e.target.value)}
      />
    </div>
  );
}
