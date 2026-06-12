import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";

export function useUserProfile() {
  const { getToken, isSignedIn } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const authFetch = useCallback(async (url, options = {}) => {
    const token = await getToken();
    return fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) },
    });
  }, [getToken]);

  const fetchProfile = useCallback(async () => {
    if (!isSignedIn) { setProfile(null); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await authFetch("/api/user-profile");
      const data = await res.json();
      setProfile(data);
    } catch {
      setProfile({ daily_budget: 35, weekly_bonus: 49 });
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, authFetch]);

  const updateProfile = useCallback(async (updates) => {
    const optimistic = { ...profile, ...updates };
    setProfile(optimistic);
    try {
      const res = await authFetch("/api/user-profile", { method: "PUT", body: JSON.stringify(updates) });
      const data = await res.json();
      setProfile(data);
      return data;
    } catch {
      setProfile(profile);
    }
  }, [profile, authFetch]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  return { profile, loading, updateProfile, reload: fetchProfile };
}
