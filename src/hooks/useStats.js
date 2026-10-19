import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";

export function useStats() {
  const { getToken, isSignedIn } = useAuth();
  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);

  // State nur in Promise-Callbacks setzen (react-hooks/set-state-in-effect)
  const fetch_ = useCallback(() => {
    if (!isSignedIn) return Promise.resolve();
    return getToken()
      .then(token => fetch("/api/stats-journal", { headers: { Authorization: `Bearer ${token}` } }))
      .then(res => res.json())
      .then(json => setData(json))
      .catch(() => setData(null))
      .finally(() => setLoaded(true));
  }, [isSignedIn, getToken]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { data, loading: Boolean(isSignedIn) && !loaded, reload: fetch_ };
}
