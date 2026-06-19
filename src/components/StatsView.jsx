import { exportStatsPDF } from "../lib/exportStatsPDF";
import styles from "./StatsView.module.css";

const CHART_DAYS = 14;
const CHART_H = 90;
const BAR_W = 14;
const GAP = 5;

function barColor(d) {
  if (!d.totalCoins) return "var(--c-surface2)";
  if (!d.budget_met) return "#DC2626";
  const pct = d.totalCoins / (d.available || 1);
  return pct > 0.8 ? "#B45309" : "var(--c-green)";
}

function BarChart({ days, dailyBudget }) {
  const recent = days.slice(-CHART_DAYS);
  const maxVal = Math.max(...recent.map(d => Math.max(d.totalCoins, d.available)), dailyBudget, 1);
  const totalW = recent.length * (BAR_W + GAP) - GAP;
  const budgetY = CHART_H - (dailyBudget / maxVal) * CHART_H;

  return (
    <div className={styles.chartScroll}>
      <svg width={totalW} height={CHART_H + 20} style={{ display: "block", margin: "0 auto" }}>
        <line x1={0} y1={budgetY} x2={totalW} y2={budgetY}
          stroke="var(--c-green)" strokeWidth={1} strokeDasharray="4 3" opacity={0.55} />
        {recent.map((d, i) => {
          const barH = Math.max((d.totalCoins / maxVal) * CHART_H, d.totalCoins ? 3 : 0);
          const x = i * (BAR_W + GAP);
          const date = new Date(d.date + "T00:00:00");
          return (
            <g key={d.date}>
              <rect x={x} y={CHART_H - barH} width={BAR_W} height={barH} rx={3} fill={barColor(d)} opacity={0.88} />
              <text x={x + BAR_W / 2} y={CHART_H + 13} textAnchor="middle" fontSize={9} fill="var(--c-muted)" fontFamily="sans-serif">
                {date.getDate()}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function StatsView({ days = [], stats = {}, loading, profile }) {
  const { dailyBudget = 35, avgCoins = 0, budgetMetRate = 0, currentStreak = 0, bestStreak = 0, totalDays = 0 } = stats;

  if (loading) {
    return <div className={styles.loading}>Lade Statistiken…</div>;
  }

  const metrics = [
    { label: "Ø Coins/Tag",    value: avgCoins,            icon: "🪙", color: "var(--c-coin-text)" },
    { label: "Im Budget",      value: `${budgetMetRate}%`,  icon: "✓",  color: "var(--c-green)" },
    { label: "Aktuell Streak", value: `${currentStreak}d`, icon: "🔥", color: currentStreak > 0 ? "#EA580C" : "var(--c-muted)" },
    { label: "Bester Streak",  value: `${bestStreak}d`,    icon: "⭐", color: "#B45309" },
  ];

  return (
    <div className={styles.column}>
      <div className={styles.metricsGrid}>
        {metrics.map(m => (
          <div key={m.label} className={styles.metricCard}>
            <div className={styles.metricIcon}>{m.icon}</div>
            {/* color is data-driven → stays inline */}
            <div className={styles.metricValue} style={{ color: m.color }}>{m.value}</div>
            <div className={styles.metricLabel}>{m.label}</div>
          </div>
        ))}
      </div>

      {days.length > 0 && (
        <button onClick={() => exportStatsPDF(days, stats, profile?.display_name)} className={styles.pdfBtn}>
          📄 PDF erstellen
        </button>
      )}

      {days.length > 0 ? (
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Letzte 14 Tage — Coins/Tag</div>
          <BarChart days={days} dailyBudget={dailyBudget} />
          <div className={styles.chartLegend}>
            {[
              { color: "var(--c-green)", label: "Im Budget" },
              { color: "#B45309",        label: "Knapp (>80%)" },
              { color: "#DC2626",        label: "Überzogen" },
            ].map(l => (
              <div key={l.label} className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: l.color }} />
                <span className={styles.legendLabel}>{l.label}</span>
              </div>
            ))}
            <div className={styles.legendItem}>
              <span className={styles.legendLine} />
              <span className={styles.legendLabel}>Budget {dailyBudget}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.emptyCard}>
          Noch keine Daten vorhanden — trage heute deine erste Mahlzeit ein!
        </div>
      )}

      {totalDays > 0 && (
        <div className={styles.totalNote}>
          Basierend auf {totalDays} erfassten {totalDays === 1 ? "Tag" : "Tagen"}
        </div>
      )}
    </div>
  );
}
