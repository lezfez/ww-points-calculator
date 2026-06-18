import { useCallback, useEffect, useRef, useState } from "react";

export const FREE_FAV_LIMIT = 10;
const CACHE_KEY = "food:favorites:cache";

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCache(items) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(items));
  } catch {
    /* storage quota exceeded — ignore */
  }
}

export function useFavorites(getToken, isPremium = false) {
  const [favorites, setFavorites] = useState(readCache);
  const [favStatus, setFavStatus] = useState("loading"); // idle | loading | error
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchFavorites = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch("/api/user-profile?action=favorites", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (!mountedRef.current) return;
      setFavorites(data);
      writeCache(data);
      setFavStatus("idle");
    } catch {
      if (mountedRef.current) setFavStatus("error");
    }
  }, [getToken]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchFavorites();
  }, [fetchFavorites]);

  const atLimit = !isPremium && favorites.length >= FREE_FAV_LIMIT;

  const addFavorite = useCallback(async (item) => {
    const already = favorites.some(
      (f) => f.name === item.name && Number(f.coins) === Number(item.coins)
    );
    if (already) return "already";
    if (!isPremium && favorites.length >= FREE_FAV_LIMIT) return "limit";

    const optimistic = [{ id: `tmp-${Date.now()}`, name: item.name, coins: item.coins }, ...favorites];
    setFavorites(optimistic);
    writeCache(optimistic);

    try {
      const token = await getToken();
      const res = await fetch("/api/user-profile?action=favorites", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: item.name, coins: item.coins }),
      });
      if (res.status === 403) {
        if (mountedRef.current) { setFavorites(favorites); writeCache(favorites); }
        return "limit";
      }
      if (!res.ok) throw new Error(await res.text());
      const saved = await res.json();
      if (!mountedRef.current) return "ok";
      setFavorites((prev) => {
        const next = prev.map((f) => (f.id === optimistic[0].id ? saved : f));
        writeCache(next);
        return next;
      });
      return "ok";
    } catch {
      if (mountedRef.current) { setFavorites(favorites); writeCache(favorites); }
      return "error";
    }
  }, [favorites, getToken, isPremium]);

  const removeFavorite = useCallback(async (fav) => {
    const next = favorites.filter((f) => f.id !== fav.id);
    setFavorites(next);
    writeCache(next);

    try {
      const token = await getToken();
      await fetch("/api/user-profile?action=favorites", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: fav.id }),
      });
    } catch {
      if (mountedRef.current) { setFavorites(favorites); writeCache(favorites); }
    }
  }, [favorites, getToken]);

  return { favorites, favStatus, atLimit, addFavorite, removeFavorite };
}
