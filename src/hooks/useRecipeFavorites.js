import { useCallback, useEffect, useRef, useState } from "react";

export const FREE_RECIPE_FAV_LIMIT = 10;
const CACHE_KEY = "recipe:favorites:cache";

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

export function useRecipeFavorites(getToken, isPremium = false, isSignedIn = false) {
  const [favorites, setFavorites] = useState(() => (isSignedIn ? readCache() : []));
  const [favStatus, setFavStatus] = useState(isSignedIn ? "loading" : "idle");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchFavorites = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch("/api/user-profile?action=recipe-favorites", {
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
    if (!isSignedIn) {
      setFavorites([]);
      setFavStatus("idle");
      return;
    }
    setFavStatus("loading");
    fetchFavorites();
  }, [fetchFavorites, isSignedIn]);

  const favIds = new Set(favorites.map(f => String(f.recipe_id)));
  const atLimit = !isPremium && favorites.length >= FREE_RECIPE_FAV_LIMIT;

  const addFavorite = useCallback(async (recipeId) => {
    const id = String(recipeId);
    if (favorites.some(f => String(f.recipe_id) === id)) return "already";
    if (!isPremium && favorites.length >= FREE_RECIPE_FAV_LIMIT) return "limit";

    const optimistic = [{ id: `tmp-${Date.now()}`, recipe_id: id }, ...favorites];
    setFavorites(optimistic);
    writeCache(optimistic);

    try {
      const token = await getToken();
      const res = await fetch("/api/user-profile?action=recipe-favorites", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ recipe_id: id }),
      });
      if (res.status === 403) {
        if (mountedRef.current) { setFavorites(favorites); writeCache(favorites); }
        return "limit";
      }
      if (!res.ok) throw new Error(await res.text());
      const saved = await res.json();
      if (!mountedRef.current) return "ok";
      setFavorites(prev => {
        const next = prev.map(f => f.id === optimistic[0].id ? saved : f);
        writeCache(next);
        return next;
      });
      return "ok";
    } catch {
      if (mountedRef.current) { setFavorites(favorites); writeCache(favorites); }
      return "error";
    }
  }, [favorites, getToken, isPremium]);

  const removeFavorite = useCallback(async (recipeId) => {
    const id = String(recipeId);
    const fav = favorites.find(f => String(f.recipe_id) === id);
    if (!fav) return;
    const next = favorites.filter(f => String(f.recipe_id) !== id);
    setFavorites(next);
    writeCache(next);
    try {
      const token = await getToken();
      await fetch("/api/user-profile?action=recipe-favorites", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: fav.id }),
      });
    } catch {
      if (mountedRef.current) { setFavorites(favorites); writeCache(favorites); }
    }
  }, [favorites, getToken]);

  return { favorites, favIds, favStatus, atLimit, addFavorite, removeFavorite };
}
