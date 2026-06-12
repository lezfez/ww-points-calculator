import { C, FH, FB } from "../styles/theme";

const DAY_NAMES = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

function toISODate(d) { return d.toISOString().slice(0, 10); }

function getMondayOf(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return toISODate(d);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

function dayColor(dayData, today) {
  if (!dayData || !dayData.has_data) return null;
  if (dayData.date > today) return null;
  const pct = dayData.totalCoins / (dayData.available || 1);
  if (pct <= 0.8) return C.green;
  if (pct <= 1.0) return "#B45309";
  return "#DC2626";
}

export default function WeekStrip({ week, streak, selectedDate, onSelectDate, onPrevWeek, onNextWeek }) {
  const today = toISODate(new Date());
  const monday = week.length ? getMondayOf(week[0].date) : getMondayOf(selectedDate);
  const currentMonday = getMondayOf(today);
  const isCurrentWeek = monday === currentMonday;

  // Week label e.g. "9.–15. Jun"
  const weekStart = week[0] ? new Date(week[0].date + "T00:00:00") : null;
  const weekEnd   = week[6] ? new Date(week[6].date + "T00:00:00") : null;
  const weekLabel = weekStart && weekEnd
    ? `${weekStart.getDate()}.–${weekEnd.getDate()}. ${weekEnd.toLocaleDateString("de-AT", { month: "short" })}`
    : "";

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: "14px 16px", marginBottom: 16 }}>

      {/* Week navigation */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        <button onClick={onPrevWeek}
          style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 15, color: C.sub, display: "flex", alignItems: "center", justifyContent: "center" }}>
          ‹
        </button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <span style={{ fontFamily: FB, fontSize: 12, color: C.sub }}>{weekLabel}</span>
        </div>
        <button onClick={onNextWeek} disabled={isCurrentWeek}
          style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, width: 30, height: 30, cursor: isCurrentWeek ? "default" : "pointer", fontSize: 15, color: isCurrentWeek ? C.border : C.sub, display: "flex", alignItems: "center", justifyContent: "center" }}>
          ›
        </button>
      </div>

      {/* 7 day cells */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5 }}>
        {(week.length ? week : Array.from({ length: 7 }, (_, i) => ({ date: addDays(monday, i) }))).map(day => {
          const d = new Date(day.date + "T00:00:00");
          const isSelected = day.date === selectedDate;
          const isToday = day.date === today;
          const isFuture = day.date > today;
          const color = dayColor(day, today);

          return (
            <button
              key={day.date}
              onClick={() => !isFuture && onSelectDate(day.date)}
              disabled={isFuture}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                padding: "8px 2px", borderRadius: 12, border: "none",
                background: isSelected ? C.green : isToday ? C.greenPale : "transparent",
                outline: isToday && !isSelected ? `1.5px solid ${C.greenMid}` : "none",
                cursor: isFuture ? "default" : "pointer",
                transition: "background .15s",
              }}>
              <span style={{ fontSize: 10, fontFamily: FB, fontWeight: 600, color: isSelected ? "rgba(255,255,255,.8)" : C.muted }}>
                {DAY_NAMES[d.getDay()]}
              </span>
              <span style={{ fontSize: 15, fontWeight: 700, fontFamily: FH, color: isSelected ? "#fff" : isFuture ? C.border : C.text, lineHeight: 1 }}>
                {d.getDate()}
              </span>
              {/* Status dot */}
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: isFuture ? "transparent" : color || (isSelected ? "rgba(255,255,255,.4)" : C.surface2),
                border: `1.5px solid ${isFuture ? C.border : color || (isSelected ? "rgba(255,255,255,.4)" : C.border)}`,
              }} />
            </button>
          );
        })}
      </div>

      {/* Streak */}
      {streak > 0 && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 16 }}>🔥</span>
          <span style={{ fontFamily: FB, fontSize: 12, color: C.sub }}>
            <b style={{ color: C.text }}>{streak} {streak === 1 ? "Tag" : "Tage"}</b> in Folge im Budget
          </span>
        </div>
      )}
    </div>
  );
}
