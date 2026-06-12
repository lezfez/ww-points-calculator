import { C, FH, FB } from "../styles/theme";

const SIZE = 160;
const CX = SIZE / 2;
const R = 58;
const SW = 15;
const CIRC = 2 * Math.PI * R;

function arc(pctStart, pctEnd) {
  const dash = (pctEnd - pctStart) * CIRC;
  const offset = CIRC * (1 - pctStart); // rotate so pctStart is at 12 o'clock
  return { strokeDasharray: `${dash} ${CIRC - dash}`, strokeDashoffset: CIRC * 0.25 - pctStart * CIRC };
}

export default function DonutChart({ used, budget, earnedToday = 0, bonusUsed = 0 }) {
  const total = budget + earnedToday + bonusUsed;
  const overBudget = used > total;
  const usedCapped = Math.min(used, total);
  const remaining = Math.max(total - used, 0);

  const usedPct   = total > 0 ? usedCapped / total : 0;
  const earnedPct = total > 0 ? earnedToday / total : 0;
  const bonusPct  = total > 0 ? bonusUsed / total : 0;
  const budgetPct = total > 0 ? budget / total : 1;

  // Segment positions (cumulative, starting at 12 o'clock)
  // Layout: [budget gray] [earned green] [bonus amber]
  // Overlay: [used orange] on top

  const usedDash = usedPct * CIRC;
  const ringColor = overBudget ? "#DC2626" : C.coin;

  const pct = total > 0 ? remaining / total : 1;
  const centerColor = pct > 0.3 ? C.green2 : pct > 0.1 ? "#B45309" : "#DC2626";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <svg width={SIZE} height={SIZE} style={{ overflow: "visible" }}>
        {/* 1. Full background ring */}
        <circle cx={CX} cy={CX} r={R} fill="none" stroke={C.surface2} strokeWidth={SW} />

        {/* 2. Earned segment (green stripe in the ring, after budget portion) */}
        {earnedPct > 0 && (
          <circle cx={CX} cy={CX} r={R} fill="none"
            stroke={C.greenLight}
            strokeWidth={SW}
            strokeDasharray={`${earnedPct * CIRC} ${CIRC - earnedPct * CIRC}`}
            strokeDashoffset={CIRC * 0.25 - budgetPct * CIRC}
          />
        )}

        {/* 3. Bonus segment (amber, after earned) */}
        {bonusPct > 0 && (
          <circle cx={CX} cy={CX} r={R} fill="none"
            stroke="#D4A017"
            strokeWidth={SW}
            strokeDasharray={`${bonusPct * CIRC} ${CIRC - bonusPct * CIRC}`}
            strokeDashoffset={CIRC * 0.25 - (budgetPct + earnedPct) * CIRC}
          />
        )}

        {/* 4. Used arc (orange/red, on top) */}
        {usedCapped > 0 && (
          <circle cx={CX} cy={CX} r={R} fill="none"
            stroke={ringColor}
            strokeWidth={SW}
            strokeDasharray={`${usedDash} ${CIRC - usedDash}`}
            strokeDashoffset={CIRC * 0.25}
            strokeLinecap="round"
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
      <div style={{ display: "flex", gap: 14, fontFamily: FB, fontSize: 11, flexWrap: "wrap", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: ringColor }} />
          <span style={{ color: C.sub }}>Verbraucht <b style={{ color: C.text }}>{used}</b></span>
        </div>
        {earnedToday > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: C.greenLight }} />
            <span style={{ color: C.sub }}>Verdient <b style={{ color: C.green }}>{earnedToday}</b></span>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: C.surface2, border: `1.5px solid ${C.border}` }} />
          <span style={{ color: C.sub }}>Budget <b style={{ color: C.text }}>{budget}</b></span>
        </div>
      </div>
    </div>
  );
}
