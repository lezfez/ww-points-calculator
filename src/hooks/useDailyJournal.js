import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";

const EMPTY_ENTRY = {
  meals: { fruehstueck: [], snack1: [], mittag: [], abend: [], snack2: [] },
  earned_coins: 0,
  used_bonus_coins: 0,
  activity_blocks: 0,
  recovery_blocks: 0,
  wellness: { gemuese: 0, oel: 0, getraenke: 0, bewusste_mahlzeit: false },
};

export function useDailyJournal(date) {
  const { getToken, isSignedIn } = useAuth();
  const [entry, setEntry] = useState(EMPTY_ENTRY);
  const [weeklyUsed, setWeeklyUsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
  const saveTimer = useRef(null);
  const pendingRef = useRef(null);

  const authFetch = useCallback(async (url, options = {}) => {
    const token = await getToken();
    return fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) },
    });
  }, [getToken]);

  // Load journal for the given date
  useEffect(() => {
    if (!isSignedIn || !date) { setLoading(false); return; }
    setLoading(true);
    authFetch(`/api/daily-journal?date=${date}`)
      .then(r => r.json())
      .then(({ entry: e, weeklyUsed: w }) => {
        setEntry({ ...EMPTY_ENTRY, ...e });
        setWeeklyUsed(w || 0);
      })
      .catch(() => setEntry(EMPTY_ENTRY))
      .finally(() => setLoading(false));
  }, [date, isSignedIn, authFetch]);

  // Debounced autosave
  const scheduleSave = useCallback((nextEntry) => {
    pendingRef.current = nextEntry;
    clearTimeout(saveTimer.current);
    setSaveState("saving");
    saveTimer.current = setTimeout(async () => {
      const toSave = pendingRef.current;
      try {
        const res = await authFetch("/api/daily-journal", {
          method: "PUT",
          body: JSON.stringify({ date, ...toSave }),
        });
        if (!res.ok) throw new Error();
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 2000);
      } catch {
        setSaveState("error");
      }
    }, 800);
  }, [date, authFetch]);

  const updateEntry = useCallback((patch) => {
    setEntry(prev => {
      const next = { ...prev, ...patch };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const updateMeal = useCallback((slot, items) => {
    updateEntry({ meals: { ...entry.meals, [slot]: items } });
  }, [entry.meals, updateEntry]);

  return { entry, weeklyUsed, loading, saveState, updateEntry, updateMeal };
}
