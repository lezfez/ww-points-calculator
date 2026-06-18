const GREEN = "#1A6B1A";
const COIN = "#92400E";
const RED = "#DC2626";
const AMBER = "#B45309";
const MUTED = "#6B7280";

function barColor(d) {
  if (!d.totalCoins) return "#E5E7EB";
  if (!d.budget_met) return RED;
  const pct = d.totalCoins / (d.available || 1);
  return pct > 0.8 ? AMBER : GREEN;
}

function buildBarChartSVG(days, dailyBudget) {
  const recent = days.slice(-30);
  if (!recent.length) return "";
  const BAR_W = 16, GAP = 4, H = 100;
  const totalW = recent.length * (BAR_W + GAP) - GAP;
  const maxVal = Math.max(...recent.map(d => Math.max(d.totalCoins, d.available)), dailyBudget, 1);
  const budgetY = H - (dailyBudget / maxVal) * H;

  const bars = recent.map((d, i) => {
    const barH = Math.max((d.totalCoins / maxVal) * H, d.totalCoins ? 2 : 0);
    const x = i * (BAR_W + GAP);
    const date = new Date(d.date + "T00:00:00");
    return `
      <rect x="${x}" y="${H - barH}" width="${BAR_W}" height="${barH}" rx="3" fill="${barColor(d)}" opacity="0.88"/>
      <text x="${x + BAR_W / 2}" y="${H + 13}" text-anchor="middle" font-size="8" fill="${MUTED}" font-family="sans-serif">${date.getDate()}</text>
    `;
  }).join("");

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${H + 20}">
      <line x1="0" y1="${budgetY}" x2="${totalW}" y2="${budgetY}" stroke="${GREEN}" stroke-width="1" stroke-dasharray="4 3" opacity="0.5"/>
      ${bars}
    </svg>`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("de-AT", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
}

function statusBadge(d) {
  if (!d.totalCoins) return `<span style="color:${MUTED}">–</span>`;
  if (d.budget_met) {
    const pct = d.totalCoins / (d.available || 1);
    return pct > 0.8
      ? `<span style="color:${AMBER}">⚠ Knapp</span>`
      : `<span style="color:${GREEN}">✓ Im Budget</span>`;
  }
  return `<span style="color:${RED}">✗ Überzogen</span>`;
}

export function exportStatsPDF(days, stats, displayName) {
  const {
    dailyBudget = 35, avgCoins = 0, budgetMetRate = 0,
    currentStreak = 0, bestStreak = 0, totalDays = 0,
  } = stats;

  const now = new Date().toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric" });
  const chartSVG = buildBarChartSVG(days, dailyBudget);
  const pastDays = [...days].filter(d => d.date < new Date().toISOString().slice(0, 10)).reverse();

  const tableRows = pastDays.map(d => `
    <tr>
      <td>${formatDate(d.date)}</td>
      <td style="text-align:right">${d.totalCoins}</td>
      <td style="text-align:right">${d.available}</td>
      <td style="text-align:right">${d.earnedCoins || 0}</td>
      <td>${statusBadge(d)}</td>
    </tr>
  `).join("");

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8"/>
  <title>WW Punkte – Statistik</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, Arial, sans-serif; font-size: 12px; color: #111; background: #fff; padding: 32px; }
    h1 { font-size: 22px; color: ${GREEN}; font-style: italic; margin-bottom: 2px; }
    .meta { color: ${MUTED}; font-size: 11px; margin-bottom: 24px; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: ${MUTED}; margin: 24px 0 10px; }
    .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 8px; }
    .metric { border: 1px solid #E5E7EB; border-radius: 10px; padding: 12px; }
    .metric-val { font-size: 20px; font-weight: 700; font-style: italic; line-height: 1.1; }
    .metric-lbl { font-size: 10px; color: ${MUTED}; margin-top: 3px; }
    .chart-wrap { border: 1px solid #E5E7EB; border-radius: 10px; padding: 14px; overflow-x: auto; margin-bottom: 8px; }
    .legend { display: flex; gap: 14px; margin-top: 10px; flex-wrap: wrap; }
    .legend-item { display: flex; align-items: center; gap: 5px; font-size: 10px; color: ${MUTED}; }
    .legend-dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
    .legend-line { width: 14px; border-top: 2px dashed ${GREEN}; opacity: 0.6; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #F9FAFB; border-bottom: 2px solid #E5E7EB; padding: 7px 10px; text-align: left; font-size: 10px; color: ${MUTED}; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
    th:not(:first-child) { text-align: right; }
    td { padding: 6px 10px; border-bottom: 1px solid #F3F4F6; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    tr:nth-child(even) td { background: #F9FAFB; }
    .footer { margin-top: 28px; font-size: 10px; color: ${MUTED}; text-align: center; }
    @media print {
      body { padding: 16px; }
      @page { margin: 1.5cm; size: A4 portrait; }
    }
  </style>
</head>
<body>
  <h1>🥗 WW Punkte – Statistik</h1>
  <div class="meta">${displayName ? `${displayName} · ` : ""}Erstellt am ${now}</div>

  <div class="section-title">Kennzahlen (letzte 60 Tage)</div>
  <div class="metrics">
    <div class="metric">
      <div class="metric-val" style="color:${COIN}">🪙 ${avgCoins}</div>
      <div class="metric-lbl">Ø Coins/Tag</div>
    </div>
    <div class="metric">
      <div class="metric-val" style="color:${GREEN}">✓ ${budgetMetRate}%</div>
      <div class="metric-lbl">Im Budget</div>
    </div>
    <div class="metric">
      <div class="metric-val" style="color:#EA580C">🔥 ${currentStreak}d</div>
      <div class="metric-lbl">Aktuell Streak</div>
    </div>
    <div class="metric">
      <div class="metric-val" style="color:${AMBER}">⭐ ${bestStreak}d</div>
      <div class="metric-lbl">Bester Streak</div>
    </div>
  </div>

  ${chartSVG ? `
  <div class="section-title">Letzte 30 Tage – Coins/Tag</div>
  <div class="chart-wrap">
    ${chartSVG}
    <div class="legend">
      <div class="legend-item"><span class="legend-dot" style="background:${GREEN}"></span>Im Budget</div>
      <div class="legend-item"><span class="legend-dot" style="background:${AMBER}"></span>Knapp (&gt;80%)</div>
      <div class="legend-item"><span class="legend-dot" style="background:${RED}"></span>Überzogen</div>
      <div class="legend-item"><span class="legend-line"></span>Budget ${dailyBudget}</div>
    </div>
  </div>` : ""}

  ${pastDays.length > 0 ? `
  <div class="section-title">Tagesübersicht (${pastDays.length} ${pastDays.length === 1 ? "Tag" : "Tage"})</div>
  <table>
    <thead>
      <tr>
        <th>Datum</th>
        <th>Coins</th>
        <th>Verfügbar</th>
        <th>Verdient</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>` : ""}

  <div class="footer">WW Punkte-Rechner · Tagesbudget: ${dailyBudget} Coins · ${totalDays} erfasste Tage</div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.addEventListener("load", () => {
    win.focus();
    win.print();
  });
}
