import { C } from "../styles/theme";
import styles from './WeekStrip.module.css';

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
  if (pct <= 1.0) return C.amber;
  return C.danger;
}

export default function WeekStrip({ week, streak, selectedDate, onSelectDate, onPrevWeek, onNextWeek }) {
  const today = toISODate(new Date());
  const monday = week.length ? getMondayOf(week[0].date) : getMondayOf(selectedDate);
  const currentMonday = getMondayOf(today);
  const isCurrentWeek = monday === currentMonday;

  const weekStart = week[0] ? new Date(week[0].date + "T00:00:00") : null;
  const weekEnd   = week[6] ? new Date(week[6].date + "T00:00:00") : null;
  const weekLabel = weekStart && weekEnd
    ? `${weekStart.getDate()}.–${weekEnd.getDate()}. ${weekEnd.toLocaleDateString("de-AT", { month: "short" })}`
    : "";

  return (
    <div className={styles.strip}>
      <div className={styles.nav}>
        <button className={styles.navBtn} onClick={onPrevWeek}>‹</button>
        <div className={styles.navLabel}>{weekLabel}</div>
        <button className={styles.navBtn} onClick={onNextWeek} disabled={isCurrentWeek}>›</button>
      </div>

      <div className={styles.dayGrid}>
        {(week.length ? week : Array.from({ length: 7 }, (_, i) => ({ date: addDays(monday, i) }))).map(day => {
          const d = new Date(day.date + "T00:00:00");
          const isSelected = day.date === selectedDate;
          const isToday = day.date === today;
          const isFuture = day.date > today;
          const color = dayColor(day, today);

          const btnClass = [
            styles.dayBtn,
            isSelected ? styles.selected : '',
            isToday && !isSelected ? styles.today : '',
            isFuture ? styles.future : '',
          ].filter(Boolean).join(' ');

          return (
            <button
              key={day.date}
              onClick={() => !isFuture && onSelectDate(day.date)}
              disabled={isFuture}
              className={btnClass}
            >
              <span className={styles.dayName}>{DAY_NAMES[d.getDay()]}</span>
              <span className={styles.dayNum}>{d.getDate()}</span>
              {/* Dynamic dot color from data → inline */}
              <span
                className={styles.dot}
                style={color && !isSelected && !isFuture ? { background: color, borderColor: color } : undefined}
              />
            </button>
          );
        })}
      </div>

      {streak > 0 && (
        <div className={styles.streak}>
          <span className={styles.streakIcon}>🔥</span>
          <span className={styles.streakText}>
            <b>{streak} {streak === 1 ? "Tag" : "Tage"}</b> in Folge im Budget
          </span>
        </div>
      )}
    </div>
  );
}
