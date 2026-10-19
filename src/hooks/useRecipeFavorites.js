import { useCallback, useEffect, useRef, useState } from "react";

export const FREE_RECIPE_FAV_LIMIT = 10;
const CACHE_KEY = "recipe:favorites:cache";
const NO_FAVORITES = [];

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
  const [storedFavorites, setFavorites] = useState(() => (isSignedIn ? readCache() : []));
  const [storedFavStatus, setFavStatus] = useState("loading"); // idle | loading | error
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // State nur in Promise-Callbacks setzen (react-hooks/set-state-in-effect)
  const fetchFavorites = useCallback(() => getToken()
    .then(token => fetch("/api/user-profile?action=recipe-favorites", {
      headers: { Authorization: `Bearer ${token}` },
    }))
    .then(async res => {
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    })
    .then(data => {
      if (!mountedRef.current) return;
      setFavorites(data);
      writeCache(data);
      setFavStatus("idle");
    })
    .catch(() => {
      if (mountedRef.current) setFavStatus("error");
    }), [getToken]);

  useEffect(() => {
    if (isSignedIn) fetchFavorites();
  }, [fetchFavorites, isSignedIn]);

  // Abgemeldet: keine Favoriten anzeigen (statt State im Effect zurückzusetzen)
  const favorites = isSignedIn ? storedFavorites : NO_FAVORITES;
  const favStatus = isSignedIn ? storedFavStatus : "idle";

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
