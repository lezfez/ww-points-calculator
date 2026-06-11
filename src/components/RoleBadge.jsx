import { C, FB } from "../styles/theme";
import { ROLE_LABELS } from "../lib/roles";

export default function RoleBadge({ role }) {
  const styles = {
    guest:   { bg: C.surface2, color: C.sub,       border: C.border },
    user:    { bg: "#EEF2FF",  color: "#3730A3",    border: "#C7D2FE" },
    premium: { bg: C.coinBg,   color: C.coinText,   border: C.coinBorder },
    admin:   { bg: "#FEF2F2",  color: "#991B1B",    border: "rgba(153,27,27,.2)" },
  };
  const s = styles[role] || styles.user;
  return (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, fontFamily: FB, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {ROLE_LABELS[role] || role}
    </span>
  );
}
