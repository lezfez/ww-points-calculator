import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";

export function useWeeklyJournal(date) {
  const { getToken, isSignedIn } = useAuth();
  const [week, setWeek] = useState([]);
  const [streak, setStreak] = useState(0);
  const [loadedDate, setLoadedDate] = useState(null);

  // State nur in Promise-Callbacks setzen (react-hooks/set-state-in-effect)
  const fetch_ = useCallback(() => {
    if (!isSignedIn || !date) return Promise.resolve();
    return getToken()
      .then(token => fetch(`/api/weekly-journal?date=${date}`, { headers: { Authorization: `Bearer ${token}` } }))
      .then(res => res.json())
      .then(data => {
        setWeek(data.week || []);
        setStreak(data.streak || 0);
      })
      .catch(() => {
        setWeek([]);
        setStreak(0);
      })
      .finally(() => setLoadedDate(date));
  }, [date, isSignedIn, getToken]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const loading = Boolean(isSignedIn && date) && loadedDate !== date;
  return { week, streak, loading, reload: fetch_ };
}
