import { C, FH, FB } from "../styles/theme";
import { exportStatsPDF } from "../lib/exportStatsPDF";

const CHART_DAYS = 14;
const CHART_H = 90;
const BAR_W = 14;
const GAP = 5;

function barColor(d) {
  if (!d.totalCoins) return C.surface2;
  if (!d.budget_met) return "#DC2626";
  const pct = d.totalCoins / (d.available || 1);
  return pct > 0.8 ? "#B45309" : C.green;
}

function BarChart({ days, dailyBudget }) {
  const recent = days.slice(-CHART_DAYS);
  const maxVal = Math.max(...recent.map(d => Math.max(d.totalCoins, d.available)), dailyBudget, 1);
  const totalW = recent.length * (BAR_W + GAP) - GAP;
  const budgetY = CHART_H - (dailyBudget / maxVal) * CHART_H;

  return (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <svg width={totalW} height={CHART_H + 20} style={{ display: "block", margin: "0 auto" }}>
        <line x1={0} y1={budgetY} x2={totalW} y2={budgetY}
          stroke={C.green} strokeWidth={1} strokeDasharray="4 3" opacity={0.55} />

        {recent.map((d, i) => {
          const barH = Math.max((d.totalCoins / maxVal) * CHART_H, d.totalCoins ? 3 : 0);
          const x = i * (BAR_W + GAP);
          const date = new Date(d.date + "T00:00:00");
          return (
            <g key={d.date}>
              <rect x={x} y={CHART_H - barH} width={BAR_W} height={barH}
                rx={3} fill={barColor(d)} opacity={0.88} />
              <text x={x + BAR_W / 2} y={CHART_H + 13} textAnchor="middle"
                fontSize={9} fill={C.muted} fontFamily="sans-serif">
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
    return <div style={{ textAlign: "center", padding: "40px 0", color: C.muted, fontFamily: FB }}>Lade Statistiken…</div>;
  }

  const metrics = [
    { label: "Ø Coins/Tag",       value: avgCoins,          icon: "🪙", color: C.coinText },
    { label: "Im Budget",         value: `${budgetMetRate}%`, icon: "✓",  color: C.green },
    { label: "Aktuell Streak",    value: `${currentStreak}d`, icon: "🔥", color: currentStreak > 0 ? "#EA580C" : C.muted },
    { label: "Bester Streak",     value: `${bestStreak}d`,   icon: "⭐", color: "#B45309" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Metric grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {metrics.map(m => (
          <div key={m.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 14px 12px" }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{m.icon}</div>
            <div style={{ fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 22, color: m.color, lineHeight: 1 }}>{m.value}</div>
            <div style={{ fontFamily: FB, fontSize: 11, color: C.muted, marginTop: 4 }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* PDF export */}
      {days.length > 0 && (
        <button
          onClick={() => exportStatsPDF(days, stats, profile?.display_name)}
          style={{
            alignSelf: "flex-end", padding: "8px 14px", borderRadius: 10,
            border: `1.5px solid ${C.border}`, background: C.surface,
            fontFamily: FB, fontSize: 12, fontWeight: 700, color: C.sub,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          }}
        >
          📄 PDF erstellen
        </button>
      )}

      {/* Bar chart card */}
      {days.length > 0 ? (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 16px 14px" }}>
          <div style={{ fontFamily: FB, fontSize: 12, fontWeight: 700, color: C.sub, marginBottom: 14 }}>
            Letzte 14 Tage — Coins/Tag
          </div>
          <BarChart days={days} dailyBudget={dailyBudget} />
          <div style={{ display: "flex", gap: 12, marginTop: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {[
              { color: C.green,   label: "Im Budget" },
              { color: "#B45309", label: "Knapp (>80%)" },
              { color: "#DC2626", label: "Überzogen" },
            ].map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: l.color, display: "inline-block" }} />
                <span style={{ fontFamily: FB, fontSize: 11, color: C.muted }}>{l.label}</span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 14, borderTop: `1.5px dashed ${C.green}`, display: "inline-block", opacity: 0.6 }} />
              <span style={{ fontFamily: FB, fontSize: 11, color: C.muted }}>Budget {dailyBudget}</span>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "32px 20px", textAlign: "center", color: C.muted, fontFamily: FB, fontSize: 13 }}>
          Noch keine Daten vorhanden — trage heute deine erste Mahlzeit ein!
        </div>
      )}

      {totalDays > 0 && (
        <div style={{ fontFamily: FB, fontSize: 11, color: C.muted, textAlign: "center" }}>
          Basierend auf {totalDays} erfassten {totalDays === 1 ? "Tag" : "Tagen"}
        </div>
      )}
    </div>
  );
}
