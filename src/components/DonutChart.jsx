import styles from "./DonutChart.module.css";

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

  const usedPct   = total > 0 ? usedCapped / total : 0;
  const earnedPct = total > 0 ? earnedToday / total : 0;
  const bonusPct  = total > 0 ? bonusUsed / total : 0;
  const budgetPct = total > 0 ? budget / total : 1;

  const usedDash  = usedPct * CIRC;
  const ringColor = overBudget ? "#DC2626" : "var(--c-coin)";

  const pct = total > 0 ? remaining / total : 1;
  const centerColor = pct > 0.3 ? "var(--c-green2)" : pct > 0.1 ? "#B45309" : "#DC2626";

  return (
    <div className={styles.root}>
      <svg width={SIZE} height={SIZE} style={{ overflow: "visible" }}>
        {/* 1. Full background ring */}
        <circle cx={CX} cy={CX} r={R} fill="none" stroke="var(--c-surface2)" strokeWidth={SW} />

        {/* 2. Earned segment (green stripe in the ring, after budget portion) */}
        {earnedPct > 0 && (
          <circle cx={CX} cy={CX} r={R} fill="none"
            stroke="var(--c-green-light)"
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

        {/* 4. Used arc (coin/red, on top) */}
        {usedCapped > 0 && (
          <circle cx={CX} cy={CX} r={R} fill="none"
            stroke={ringColor}
            strokeWidth={SW}
            strokeDasharray={`${usedDash} ${CIRC - usedDash}`}
            strokeDashoffset={CIRC * 0.25}
            strokeLinecap="round"
            className={styles.usedArc}
          />
        )}

        {/* Center: remaining */}
        <text x={CX} y={CX - 10} textAnchor="middle"
          fontFamily="Playfair Display,Georgia,serif" fontWeight="700" fontSize="32"
          fill={centerColor}>
          {remaining}
        </text>
        <text x={CX} y={CX + 14} textAnchor="middle"
          fontFamily="Inter,system-ui,sans-serif" fontSize="11" fill="var(--c-sub)">
          übrig
        </text>
        {overBudget && (
          <text x={CX} y={CX + 28} textAnchor="middle"
            fontFamily="Inter,system-ui,sans-serif" fontSize="10" fill="#DC2626" fontWeight="600">
            Überzogen!
          </text>
        )}
      </svg>

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: ringColor }} />
          <span className={styles.legendText}>Verbraucht <b className={styles.legendVal}>{used}</b></span>
        </div>
        {earnedToday > 0 && (
          <div className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: "var(--c-green-light)" }} />
            <span className={styles.legendText}>Verdient <b className={styles.legendValGreen}>{earnedToday}</b></span>
          </div>
        )}
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.legendDotBudget}`} />
          <span className={styles.legendText}>Budget <b className={styles.legendVal}>{budget}</b></span>
        </div>
      </div>
    </div>
  );
}
