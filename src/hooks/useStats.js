import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";

export function useStats() {
  const { getToken, isSignedIn } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    if (!isSignedIn) { setLoading(false); return; }
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/stats-journal", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(await res.json());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, getToken]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { data, loading, reload: fetch_ };
}
