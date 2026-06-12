import { C, FH, FB } from "../styles/theme";

const SIZE = 160;
const CX = SIZE / 2;
const R = 58;
const SW = 15;
const CIRC = 2 * Math.PI * R;

export default function DonutChart({ used, budget, earnedToday = 0, bonusUsed = 0 }) {
  const total = budget + earnedToday + bonusUsed;
  const overBudget = used > total;
  const usedCapped = Math.min(used, total);
  const remaining = Math.max(total - used, 0);

  const usedDash = total > 0 ? (usedCapped / total) * CIRC : 0;
  const ringColor = overBudget ? "#DC2626" : C.coin;

  // Traffic light color for center text
  const pct = total > 0 ? remaining / total : 1;
  const centerColor = pct > 0.3 ? C.green2 : pct > 0.1 ? "#B45309" : "#DC2626";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <svg width={SIZE} height={SIZE} style={{ overflow: "visible" }}>
        {/* Background ring */}
        <circle cx={CX} cy={CX} r={R} fill="none" stroke={C.surface2} strokeWidth={SW} />

        {/* Used ring */}
        {usedCapped > 0 && (
          <circle
            cx={CX} cy={CX} r={R} fill="none"
            stroke={ringColor}
            strokeWidth={SW}
            strokeDasharray={`${usedDash} ${CIRC - usedDash}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${CX} ${CX})`}
            style={{ transition: "stroke-dasharray .4s ease" }}
          />
        )}

        {/* Center: remaining */}
        <text x={CX} y={CX - 10} textAnchor="middle"
          fontFamily={FH.replace(/'/g, "")} fontWeight="700" fontSize="32"
          fill={centerColor}>
          {remaining}
        </text>
        <text x={CX} y={CX + 14} textAnchor="middle"
          fontFamily={FB.replace(/'/g, "")} fontSize="11" fill={C.sub}>
          übrig
        </text>
        {overBudget && (
          <text x={CX} y={CX + 28} textAnchor="middle"
            fontFamily={FB.replace(/'/g, "")} fontSize="10" fill="#DC2626" fontWeight="600">
            Überzogen!
          </text>
        )}
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, fontFamily: FB, fontSize: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: ringColor }} />
          <span style={{ color: C.sub }}>Verbraucht <b style={{ color: C.text }}>{used}</b></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: C.surface2, border: `1.5px solid ${C.border}` }} />
          <span style={{ color: C.sub }}>Budget <b style={{ color: C.text }}>{budget}</b></span>
        </div>
      </div>
    </div>
  );
}
