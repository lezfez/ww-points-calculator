import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { C } from "../../styles/theme";
import Card from "../ui/Card";
import Button from "../ui/Button";
import DonutChart from "../DonutChart";
import WeekStrip from "../WeekStrip";
import StatsView from "../StatsView";
import RecipePicker from "../RecipePicker";
import FoodSearch from "../FoodSearch";
import { useUserProfile } from "../../hooks/useUserProfile";
import { useDailyJournal } from "../../hooks/useDailyJournal";
import { useWeeklyJournal } from "../../hooks/useWeeklyJournal";
import { useStats } from "../../hooks/useStats";
import { useFavorites } from "../../hooks/useFavorites";
import { useRecipeFavorites } from "../../hooks/useRecipeFavorites";
import styles from "./TabBudget.module.css";

// ─── helpers ───────────────────────────────────────────────
const MEALS = [
  { id: "fruehstueck", label: "Frühstück",  icon: "🌅" },
  { id: "snack1",      label: "Snack 1",     icon: "🍎" },
  { id: "mittag",      label: "Mittag",       icon: "☀️" },
  { id: "abend",       label: "Abend",        icon: "🌙" },
  { id: "snack2",      label: "Snack 2",      icon: "🫐" },
];

const WELLNESS_ITEMS = [
  { id: "gemuese",         label: "Gemüse",           max: 5, icon: "🥕" },
  { id: "oel",             label: "Öl",               max: 3, icon: "🫙" },
  { id: "getraenke",       label: "Getränke (0,25l)", max: 8, icon: "💧" },
  { id: "bewusste_mahlzeit", label: "Bewusste Mahlzeit", max: 1, icon: "🍽️" },
];

function toISODate(d) { return d.toISOString().slice(0, 10); }
function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const today = toISODate(new Date());
  const yest = toISODate(new Date(Date.now() - 86400000));
  if (dateStr === today) return "Heute";
  if (dateStr === yest) return "Gestern";
  return d.toLocaleDateString("de-AT", { weekday: "short", day: "numeric", month: "short" });
}
function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toISODate(d);
}
function mealCoins(items) { return (items || []).reduce((s, i) => s + (parseInt(i.coins) || 0), 0); }

// ─── MealSlot ──────────────────────────────────────────────
function MealSlot({ meal, items = [], onChange, onOpenPicker, onOpenFoodSearch, onOpenFavorites }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ name: "", coins: "" });
  const total = mealCoins(items);

  const addItem = () => {
    if (!draft.name.trim() && !draft.coins) return;
    const newItem = { id: Date.now(), name: draft.name.trim() || "–", coins: parseInt(draft.coins) || 0 };
    onChange([...items, newItem]);
    setDraft({ name: "", coins: "" });
  };

  const removeItem = (id) => onChange(items.filter(i => i.id !== id));

  return (
    <div className={`${styles.mealSlot}${open ? ` ${styles.open}` : ''}`}>
      <button onClick={() => setOpen(o => !o)} className={styles.mealHeader}>
        <span className={styles.mealIcon}>{meal.icon}</span>
        <span className={styles.mealLabel}>{meal.label}</span>
        {total > 0 && <span className={styles.mealCoinBadge}>🪙 {total}</span>}
        <span className={styles.mealArrow}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className={styles.mealBody}>
          {items.length > 0 && (
            <div className={styles.mealItems}>
              {items.map(item => (
                <span key={item.id} className={styles.mealItem}>
                  {item.name}
                  {item.coins > 0 && <b className={styles.mealItemCoin}> · {item.coins}🪙</b>}
                  <button onClick={() => removeItem(item.id)} className={styles.mealItemRemove}>×</button>
                </span>
              ))}
            </div>
          )}
          <div className={styles.mealAddForm}>
            <input
              className={styles.mealAddInput}
              placeholder="Speise…"
              value={draft.name}
              onChange={e => setDraft(p => ({ ...p, name: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && addItem()}
              aria-label={`Speise für ${meal.label}`}
            />
            <input
              className={styles.mealAddCoins}
              type="number" min="0"
              placeholder="🪙"
              value={draft.coins}
              onChange={e => setDraft(p => ({ ...p, coins: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && addItem()}
              aria-label="Coins"
            />
            <button onClick={addItem} className={styles.mealAddBtn}>+</button>
            <button onClick={onOpenFoodSearch} title="Lebensmittel suchen" className={styles.mealIconBtn}>🔍</button>
            {onOpenFavorites && <button onClick={onOpenFavorites} title="Aus Favoriten wählen" className={styles.mealIconBtn}>❤️</button>}
            {onOpenPicker && <button onClick={onOpenPicker} title="Aus Rezepten wählen" className={styles.mealIconBtn}>📖</button>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ActivityTracker ───────────────────────────────────────
const BLOCK_COLS = 8;

function BlockRow({ count, onChange, color }) {
  return (
    <div className={styles.blockRow}>
      {Array.from({ length: BLOCK_COLS }, (_, i) => (
        <button
          key={i}
          onClick={() => onChange(count === i + 1 ? i : i + 1)}
          className={styles.blockBtn}
          style={{
            background: i < count ? color : 'var(--c-surface2)',
            outline: `1.5px solid ${i < count ? color : 'var(--c-border)'}`,
          }}
        />
      ))}
      <button onClick={() => onChange(count + 1)} className={styles.blockBtnAdd}>+</button>
      {count > BLOCK_COLS && <span className={styles.blockExtra}>+{count - BLOCK_COLS} weitere</span>}
    </div>
  );
}

function ActivityTracker({ activityBlocks, recoveryBlocks, onChangeActivity, onChangeRecovery }) {
  const earned = activityBlocks + recoveryBlocks;
  return (
    <Card>
      <div className="section-label">🏃 Aktivität & verdiente Coins</div>
      <div className={styles.activityColumn}>
        <div>
          <div className={styles.activityRow}>
            <span className={styles.activityLabel}>Aktiv <span className={styles.activitySub}>(je 10 Min)</span></span>
            <span className={styles.activityCountGreen}>+{activityBlocks} 🪙</span>
          </div>
          <BlockRow count={activityBlocks} onChange={onChangeActivity} color={C.green} />
          <div className={styles.activityNote}>{activityBlocks} × 10 Min = {activityBlocks * 10} Minuten aktiv</div>
        </div>
        <div>
          <div className={styles.activityRow}>
            <span className={styles.activityLabel}>Erholung <span className={styles.activitySub}>(je 1 Std)</span></span>
            <span className={styles.activityCountRecovery}>+{recoveryBlocks} 🪙</span>
          </div>
          <BlockRow count={recoveryBlocks} onChange={onChangeRecovery} color="#5B8E5B" />
          <div className={styles.activityNote}>{recoveryBlocks} × 1 Std = {recoveryBlocks} Stunden Erholung</div>
        </div>
        {earned > 0 && (
          <div className={styles.earnedBadge}>
            <span className={styles.earnedLabel}>Heute verdient</span>
            <span className={styles.earnedValue}>+{earned} 🪙</span>
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── WellnessRow ───────────────────────────────────────────
function WellnessRow({ item, value, onChange }) {
  if (item.max === 1) {
    return (
      <div className={styles.wellnessRow}>
        <span className={styles.wellnessIcon}>{item.icon}</span>
        <span className={styles.wellnessLabel}>{item.label}</span>
        <button
          onClick={() => onChange(!value)}
          className={`${styles.wellnessToggle}${value ? ` ${styles.active}` : ''}`}
        >
          {value ? "✓" : ""}
        </button>
      </div>
    );
  }
  return (
    <div className={styles.wellnessRow}>
      <span className={styles.wellnessIcon}>{item.icon}</span>
      <span className={styles.wellnessLabel}>{item.label}</span>
      <div className={styles.wellnessDots}>
        {Array.from({ length: item.max }, (_, i) => (
          <button key={i}
            onClick={() => onChange(value === i + 1 ? 0 : i + 1)}
            className={`${styles.wellnessDot}${i < value ? ` ${styles.active}` : ''}`}
          />
        ))}
      </div>
      <span className={styles.wellnessCount}>{value}</span>
    </div>
  );
}

// ─── FavoritesPicker ──────────────────────────────────────
function FavoritesPicker({ favorites, onSelect, onClose }) {
  const [search, setSearch] = useState("");
  const filtered = favorites.filter(f => !search || f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div onClick={onClose} className={styles.favBackdrop} />
      <div className={styles.favSheet}>
        <div className={styles.favHandleRow}>
          <div className={styles.favHandle} />
        </div>
        <div className={styles.favHeader}>
          <span className={styles.favTitle}>❤️ Favorit hinzufügen</span>
          <button onClick={onClose} className={styles.favClose}>✕</button>
        </div>
        {favorites.length > 4 && (
          <div className={styles.favSearchWrap}>
            <input
              className={styles.favSearchInput}
              placeholder="Favoriten filtern…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        )}
        <div className={styles.favList}>
          {favorites.length === 0 ? (
            <div className={styles.favEmpty}>Noch keine Favoriten gespeichert.</div>
          ) : filtered.length === 0 ? (
            <div className={styles.favEmpty}>Kein Favorit gefunden.</div>
          ) : filtered.map(fav => (
            <button key={fav.id} onClick={() => { onSelect(fav); onClose(); }} className={styles.favItem}>
              <div className={styles.favItemName}>
                <div className={styles.favItemNameText}>{fav.name}</div>
              </div>
              <div className={styles.favCoinBadge}>🪙 {fav.coins}</div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Main TabBudget ────────────────────────────────────────
export default function TabBudget({ locked, onUpgrade, checkoutLoading, isSignedIn, recipes = [], premiumPriceLabel = "2,99 €/Monat", onOpenProfile, isPremium = false }) {
  const { getToken } = useAuth();
  const [date, setDate] = useState(toISODate(new Date()));
  const [activeView, setActiveView] = useState("journal"); // "journal" | "stats"
  const [pickerSlot, setPickerSlot] = useState(null);
  const [foodSlot, setFoodSlot] = useState(null);
  const [favSlot, setFavSlot] = useState(null);

  const { profile, loading: profileLoading } = useUserProfile();
  const { entry, weeklyUsed, loading: journalLoading, saveState, updateEntry, updateMeal } = useDailyJournal(date);
  const { week, streak, reload: reloadWeek } = useWeeklyJournal(date);
  const { data: statsData, loading: statsLoading, reload: reloadStats } = useStats();
  const { favorites } = useFavorites(getToken, isPremium);
  const { favIds: recipeFavIds } = useRecipeFavorites(getToken, isPremium, isSignedIn);

  useEffect(() => {
    if (saveState === "saved") { reloadWeek(); reloadStats(); }
  }, [saveState, reloadWeek, reloadStats]);

  const handleRecipeSelect = (recipe) => {
    if (!pickerSlot) return;
    const newItem = { id: Date.now(), name: recipe.name, coins: recipe.coins || 0 };
    updateMeal(pickerSlot, [...(entry.meals[pickerSlot] || []), newItem]);
  };

  const handleFavoriteSelect = (fav) => {
    if (!favSlot) return;
    updateMeal(favSlot, [...(entry.meals[favSlot] || []), { id: Date.now(), name: fav.name, coins: fav.coins }]);
  };

  if (locked) {
    return (
      <div className="tab-content">
        <Card className={styles.lockedCard}>
          <div className={styles.lockedEmoji}>🌿</div>
          <div className={styles.lockedTitle}>Premium-Funktion</div>
          <p className={styles.lockedDesc}>
            Das persönliche Tagesjournal ist exklusiv für Premium-Mitglieder verfügbar.
          </p>
          <Button onClick={onUpgrade} disabled={checkoutLoading} size="inline" className={styles.btnWide}>
            {checkoutLoading ? "Weiterleitung…" : `🌿 Premium – ${premiumPriceLabel}`}
          </Button>
        </Card>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="tab-content">
        <Card className={styles.guestCard}>
          <div className={styles.guestEmoji}>📒</div>
          <div className={styles.guestTitle}>Tagesjournal</div>
          <p className={styles.guestText}>Bitte melde dich an, um dein persönliches Journal zu nutzen.</p>
        </Card>
      </div>
    );
  }

  if (profileLoading) return (
    <div className={`tab-content ${styles.loadingState}`}>Lade…</div>
  );

  if (!profile?.daily_budget) {
    return (
      <div className="tab-content">
        <Card className={styles.setupCard}>
          <div className={styles.setupEmoji}>👤</div>
          <div className={styles.setupTitle}>Profil zuerst einrichten</div>
          <p className={styles.setupText}>
            Dein Tagebuch benötigt ein gespeichertes Tages-Budget. Bitte richte dein Profil einmalig im Profil-Tab ein.
          </p>
          <Button onClick={onOpenProfile} size="inline">
            Zum Profil
          </Button>
        </Card>
      </div>
    );
  }

  // Derived values
  const { daily_budget, weekly_bonus } = profile;
  const weeklyRemaining = Math.max(weekly_bonus - weeklyUsed, 0);
  const allMealItems = Object.values(entry.meals).flat();
  const totalUsed = allMealItems.reduce((s, i) => s + (parseInt(i.coins) || 0), 0);
  const earnedCoins = (entry.activity_blocks || 0) + (entry.recovery_blocks || 0);
  const totalAvailable = daily_budget + earnedCoins + (entry.used_bonus_coins || 0);
  const today = toISODate(new Date());
  const isFuture = date > today;

  return (
    <div className="tab-content">

      {/* Journal / Statistiken toggle */}
      <div className={styles.viewToggle}>
        {[["journal", "📒 Journal"], ["stats", "📊 Statistiken"]].map(([id, label]) => (
          <button key={id} onClick={() => setActiveView(id)}
            className={`${styles.viewBtn}${activeView === id ? ` ${styles.active}` : ''}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Stats view */}
      {activeView === "stats" && (
        <StatsView days={statsData?.days || []} stats={statsData?.stats || {}} loading={statsLoading} profile={profile} />
      )}

      {/* Journal view */}
      {activeView === "journal" && <>

      <WeekStrip
        week={week}
        streak={streak}
        selectedDate={date}
        onSelectDate={setDate}
        onPrevWeek={() => setDate(d => addDays(d, -7))}
        onNextWeek={() => setDate(d => addDays(d, 7))}
      />

      <div className={styles.dateHeading}>{formatDate(date)}</div>

      {/* Budget summary + Donut */}
      <Card className={styles.budgetCardCenter}>
        <div className={styles.budgetRow}>
          <div className={styles.budgetText}>
            Budget: <b className={styles.budgetAmount}>{daily_budget} Coins/Tag</b>
          </div>
          <button onClick={onOpenProfile} className={styles.settingsBtn}>Einstellungen ›</button>
        </div>

        {journalLoading
          ? <div className={styles.chartLoading}>Lade…</div>
          : <DonutChart used={totalUsed} budget={daily_budget} earnedToday={earnedCoins} bonusUsed={entry.used_bonus_coins || 0} />
        }

        {!journalLoading && (earnedCoins > 0 || entry.used_bonus_coins > 0) && (
          <div className={styles.breakdown}>
            <span>
              {daily_budget} Budget
              {earnedCoins > 0 && <> + <span className={styles.breakdownActive}>+{earnedCoins} Aktiv</span></>}
              {entry.used_bonus_coins > 0 && <> + <span className={styles.breakdownBonus}>+{entry.used_bonus_coins} Bonus</span></>}
              {" "}= <b>{totalAvailable} gesamt</b>
            </span>
          </div>
        )}

        {saveState !== "idle" && (
          <div className={`${styles.saveState}${saveState === "saved" ? ` ${styles.saved}` : saveState === "error" ? ` ${styles.error}` : ''}`}>
            {saveState === "saving" ? "Speichert…" : saveState === "saved" ? "✓ Gespeichert" : "✗ Fehler beim Speichern"}
          </div>
        )}
      </Card>

      {/* Aktivitäts-Tracker */}
      {!isFuture && (
        <ActivityTracker
          activityBlocks={entry.activity_blocks || 0}
          recoveryBlocks={entry.recovery_blocks || 0}
          onChangeActivity={v => updateEntry({ activity_blocks: v, recovery_blocks: entry.recovery_blocks || 0 })}
          onChangeRecovery={v => updateEntry({ activity_blocks: entry.activity_blocks || 0, recovery_blocks: v })}
        />
      )}

      {/* Meal slots */}
      {!isFuture && (
        <Card>
          <div className="section-label">Mahlzeiten</div>
          <div className={styles.mealsColumn}>
            {MEALS.map(meal => (
              <MealSlot
                key={meal.id}
                meal={meal}
                items={entry.meals[meal.id] || []}
                onChange={items => updateMeal(meal.id, items)}
                onOpenFavorites={isSignedIn ? () => setFavSlot(meal.id) : null}
                onOpenPicker={recipes.length > 0 ? () => setPickerSlot(meal.id) : null}
                onOpenFoodSearch={() => setFoodSlot(meal.id)}
              />
            ))}
          </div>
          <div className={styles.mealsSummary}>
            <span className={styles.mealsSummaryLabel}>Tagesverbrauch</span>
            <span className={`${styles.mealsSummaryTotal}${totalUsed > totalAvailable ? ` ${styles.over}` : ''}`}>
              🪙 {totalUsed} / {totalAvailable}
            </span>
          </div>
        </Card>
      )}

      {/* Wochenbonus */}
      {!isFuture && (
        <Card>
          <div className="section-label">Wochenbonus</div>
          <div className={styles.bonusColumn}>
            <div className={styles.bonusRow}>
              <div className={styles.bonusContent}>
                <div className={styles.bonusTitle}>Heute genutzt</div>
                <div className={styles.bonusSub}>Gesamt noch verfügbar: {weeklyRemaining + entry.used_bonus_coins} von {weekly_bonus}</div>
              </div>
              <div className={styles.stepperRow}>
                <button onClick={() => updateEntry({ used_bonus_coins: Math.max(0, entry.used_bonus_coins - 1) })
                } className={styles.stepperMinus}>−</button>
                <span className={styles.stepperValue}>{entry.used_bonus_coins}</span>
                <button onClick={() => updateEntry({ used_bonus_coins: Math.min(weeklyRemaining + entry.used_bonus_coins, entry.used_bonus_coins + 1) })}
                  className={styles.stepperPlus}>+</button>
              </div>
            </div>

            <div>
              <div className={styles.barRow}>
                <span>Woche verbraucht: {weeklyUsed}</span>
                <span>Noch: {weeklyRemaining}</span>
              </div>
              <div className={styles.barTrack}>
                <div
                  className={`${styles.barFill}${weeklyUsed > weekly_bonus * 0.8 ? ` ${styles.warning}` : ''}`}
                  style={{ width: `${Math.min((weeklyUsed / weekly_bonus) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Wellness Checkliste */}
      {!isFuture && (
        <Card>
          <div className="section-label">Wohlbefinden & Gewohnheiten</div>
          <div className={styles.wellnessColumn}>
            {WELLNESS_ITEMS.map(item => (
              <WellnessRow
                key={item.id}
                item={item}
                value={entry.wellness[item.id]}
                onChange={val => updateEntry({ wellness: { ...entry.wellness, [item.id]: val } })}
              />
            ))}
          </div>
        </Card>
      )}

      {isFuture && (
        <Card className={styles.futureCard}>
          Kein Journal für zukünftige Tage.
        </Card>
      )}

      </>}

      {/* Recipe picker modal */}
      {pickerSlot && (
        <RecipePicker
          recipes={recipes}
          favIds={recipeFavIds}
          onSelect={handleRecipeSelect}
          onClose={() => setPickerSlot(null)}
        />
      )}

      {/* Favorites picker modal */}
      {favSlot && (
        <FavoritesPicker
          favorites={favorites}
          onSelect={handleFavoriteSelect}
          onClose={() => setFavSlot(null)}
        />
      )}

      {/* Food search modal */}
      {foodSlot && (
        <FoodSearch
          onAdd={(item) => updateMeal(foodSlot, [...(entry.meals[foodSlot] || []), item])}
          onClose={() => setFoodSlot(null)}
          favorites={favorites}
        />
      )}

    </div>
  );
}
