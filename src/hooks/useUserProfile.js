import { useState, useEffect, useCallback } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";

export function useUserProfile() {
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();
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
      // Sync Clerk display name + avatar if not yet stored
      if (user && (!data.display_name || !data.avatar_url)) {
        const syncUpdates = {};
        if (!data.display_name && (user.fullName || user.firstName))
          syncUpdates.display_name = user.fullName || user.firstName;
        if (!data.avatar_url && user.imageUrl)
          syncUpdates.avatar_url = user.imageUrl;
        if (Object.keys(syncUpdates).length > 0) {
          authFetch("/api/user-profile", { method: "PUT", body: JSON.stringify(syncUpdates) });
          Object.assign(data, syncUpdates);
        }
      }
      setProfile(data);
    } catch {
      setProfile({ daily_budget: 35, weekly_bonus: 49 });
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, authFetch, user]);

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
