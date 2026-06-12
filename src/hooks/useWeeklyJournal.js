import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";

export function useWeeklyJournal(date) {
  const { getToken, isSignedIn } = useAuth();
  const [week, setWeek] = useState([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    if (!isSignedIn || !date) { setLoading(false); return; }
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/weekly-journal?date=${date}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setWeek(data.week || []);
      setStreak(data.streak || 0);
    } catch {
      setWeek([]);
      setStreak(0);
    } finally {
      setLoading(false);
    }
  }, [date, isSignedIn, getToken]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { week, streak, loading, reload: fetch_ };
}
