import { useState, useCallback, useEffect } from "react";
import { supabase } from "../supabase";

export function useFeatureFlags() {
  const [flags, setFlags] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFlags = useCallback(async () => {
    const { data, error } = await supabase.from("feature_flags").select("*");
    if (error) throw error;

    const map = {};
    (data || []).forEach(f => { map[f.id] = f; });
    return map;
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const map = await fetchFlags();
      setFlags(map);
    } catch (e) {
      setError(e?.message || "Feature Flags konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [fetchFlags]);

  useEffect(() => {
    let active = true;

    fetchFlags()
      .then(map => {
        if (!active) return;
        setFlags(map);
        setError(null);
      })
      .catch(e => {
        if (active) setError(e?.message || "Feature Flags konnten nicht geladen werden.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [fetchFlags]);

  return { flags, loading, error, reload };
}
