import { useState, useEffect, useCallback } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";

export function useUserProfile() {
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();
  const [profile, setProfile] = useState(null);
  // Für welchen User das Profil geladen ist – daraus wird `loading` abgeleitet
  const [loadedFor, setLoadedFor] = useState(undefined);
  const userKey = user?.id ?? null;

  const authFetch = useCallback(async (url, options = {}) => {
    const token = await getToken();
    return fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) },
    });
  }, [getToken]);

  // State nur in Promise-Callbacks setzen (react-hooks/set-state-in-effect)
  const fetchProfile = useCallback(() => {
    if (!isSignedIn) return Promise.resolve();
    return authFetch("/api/user-profile")
      .then(res => res.json())
      .then(data => {
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
      })
      .catch(() => setProfile({ daily_budget: 35, weekly_bonus: 49 }))
      .finally(() => setLoadedFor(userKey));
  }, [isSignedIn, authFetch, user, userKey]);

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

  const loading = Boolean(isSignedIn) && loadedFor !== userKey;
  return { profile: isSignedIn ? profile : null, loading, updateProfile, reload: fetchProfile };
}
