import { useState, useEffect, useCallback, useMemo } from "react";
import { SignIn, SignedIn, SignedOut, UserButton, useUser, useAuth } from "@clerk/clerk-react";
import appLogo from "./assets/app-logo-icon.svg";
import { useRecipes } from "./hooks/useRecipes";
import { useFeatureFlags } from "./hooks/useFeatureFlags";
import { getUserRole, hasAccess, ROLE_LABELS } from "./lib/roles";
import { buildPathWithTab, readTabFromSearch, resolveTabSelection } from "./lib/tabRouting";
import TabIcon from "./components/TabIcon";
import TabLocked from "./components/TabLocked";
import TabCalc from "./components/tabs/TabCalc";
import TabBudget from "./components/tabs/TabBudget";
import TabProfile from "./components/tabs/TabProfile";
import TabFood from "./components/tabs/TabFood";
import TabRecipes from "./components/tabs/TabRecipes";
import TabInfo from "./components/tabs/TabInfo";
import TabAdmin from "./components/tabs/TabAdmin";
import InstallBanner from "./components/InstallBanner";
import styles from "./App.module.css";

const DEFAULT_HEADER_TAGLINE = "Coins · PersonalPoints · SmartPoints · ProPoints";
const DEFAULT_PREMIUM_PRICE_LABEL = "2,99 €/Monat";

const getTabFromUrl = () => {
  const tabId = readTabFromSearch(window.location.search);
  return tabId === "foof" ? "food" : tabId;
};

const getPathWithTab = (tabId) => buildPathWithTab(window.location.href, tabId);

export default function App() {
  const [tab, setTab]             = useState(() => getTabFromUrl());
  const [showSignIn, setShowSignIn] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutMsg, setCheckoutMsg] = useState(() => {
    const status = new URLSearchParams(window.location.search).get("premium");
    if (status === "success") return { type: "ok", text: "Premium freigeschaltet. Danke für dein Abo." };
    if (status === "canceled") return { type: "warn", text: "Checkout abgebrochen. Es wurde nichts berechnet." };
    return null;
  });

  // Admin state
  const [adminFlagDraft, setAdminFlagDraft]     = useState({});
  const [adminFlagSaving, setAdminFlagSaving]   = useState(false);
  const [adminFlagMsg, setAdminFlagMsg]         = useState(null);
  const [adminUserQuery, setAdminUserQuery]     = useState("");
  const [adminUsers, setAdminUsers]             = useState([]);
  const [adminUserLoading, setAdminUserLoading] = useState(false);
  const [adminRoleSaving, setAdminRoleSaving]   = useState({});
  const [adminRoleSelected, setAdminRoleSelected] = useState({});
  const [adminRecipeCategoryQuery, setAdminRecipeCategoryQuery] = useState("");
  const [adminRecipeCategoriesCatalog, setAdminRecipeCategoriesCatalog] = useState([]);
  const [adminRecipeCategoriesLoading, setAdminRecipeCategoriesLoading] = useState(false);
  const [adminRecipeCategoriesError, setAdminRecipeCategoriesError] = useState(null);
  const [adminRecipeCategorySaving, setAdminRecipeCategorySaving] = useState({});
  const [adminRecipeCategoryMsg, setAdminRecipeCategoryMsg] = useState(null);
  const [adminRecipeTextSaving, setAdminRecipeTextSaving] = useState({});
  const [adminRecipeTextMsg, setAdminRecipeTextMsg] = useState(null);
  const [adminRecipeWorkflowMsg, setAdminRecipeWorkflowMsg] = useState(null);
  const [adminRecipeStatusById, setAdminRecipeStatusById] = useState({});
  const [adminRecipePublishSaving, setAdminRecipePublishSaving] = useState({});
  const [adminRecipeHistoryById, setAdminRecipeHistoryById] = useState({});
  const [adminRecipeHistoryLoading, setAdminRecipeHistoryLoading] = useState({});
  const [adminCategorySaving, setAdminCategorySaving] = useState({});
  const [adminCategoryCreateSaving, setAdminCategoryCreateSaving] = useState(false);
  const [adminCategoryMsg, setAdminCategoryMsg] = useState(null);
  const [adminBootstrapSettingsDraft, setAdminBootstrapSettingsDraft] = useState({
    headerTagline: DEFAULT_HEADER_TAGLINE,
    premiumPriceLabel: DEFAULT_PREMIUM_PRICE_LABEL,
  });
  const [adminBootstrapSettingsSaving, setAdminBootstrapSettingsSaving] = useState(false);
  const [adminBootstrapSettingsMsg, setAdminBootstrapSettingsMsg] = useState(null);
  const [headerTagline, setHeaderTagline] = useState(DEFAULT_HEADER_TAGLINE);
  const [premiumPriceLabel, setPremiumPriceLabel] = useState(DEFAULT_PREMIUM_PRICE_LABEL);

  // Image generation state
  const [imageGenLoading, setImageGenLoading]       = useState(false);
  const [imageGenPerRecipe, setImageGenPerRecipe]   = useState({});
  const [imageGenMsg, setImageGenMsg]               = useState(null);
  const [bootstrapMsg, setBootstrapMsg]         = useState(null);

  const { recipes, loading: recipesLoading, error: recipesError, reload: reloadRecipes } = useRecipes();
  const { recipes: adminRecipes, reload: reloadAdminRecipes } = useRecipes({ includeAll: true });
  const { flags, loading: flagsLoading, error: flagsError, reload: reloadFlags } = useFeatureFlags();
  const { isSignedIn, user } = useUser();
  const { getToken }         = useAuth();
  const userRole             = getUserRole(user, isSignedIn);
  const isPremium            = userRole === "premium" || userRole === "admin";

  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("premium")) return;
    url.searchParams.delete("premium");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  useEffect(() => {
    if (isSignedIn) queueMicrotask(() => setShowSignIn(false));
  }, [isSignedIn]);

  useEffect(() => {
    let active = true;

    fetch("/api/admin?action=public-settings")
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) return null;
        return data?.settings || null;
      })
      .then((settings) => {
        if (!active || !settings) return;
        const nextHeaderTagline = String(settings.headerTagline || DEFAULT_HEADER_TAGLINE);
        const nextPremiumPriceLabel = String(settings.premiumPriceLabel || DEFAULT_PREMIUM_PRICE_LABEL);
        setHeaderTagline(nextHeaderTagline);
        setPremiumPriceLabel(nextPremiumPriceLabel);
        setAdminBootstrapSettingsDraft({ headerTagline: nextHeaderTagline, premiumPriceLabel: nextPremiumPriceLabel });
      })
      .catch(() => {});

    return () => { active = false; };
  }, []);

  const adminFetch = useCallback(async (url, options = {}) => {
    const token = await getToken();
    if (!token) throw new Error("Kein Session-Token – bitte neu einloggen.");
    return fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, ...(options.headers || {}) },
    });
  }, [getToken]);

  const isTabEnabled = (tabId) => {
    if (userRole === "admin") return true;
    const flag = flags?.[`tab_${tabId}`];
    return !flag || flag.enabled;
  };
  const isTabLocked = (tabId) => {
    if (userRole === "admin") return false;
    const flag = flags?.[`tab_${tabId}`];
    if (!flag) return false;
    return !hasAccess(flag.required_role, userRole);
  };

  const startCheckout = async () => {
    if (!isSignedIn) { setShowSignIn(true); return; }
    setCheckoutLoading(true);
    setCheckoutMsg(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Kein Session-Token – bitte neu einloggen.");
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || "Checkout konnte nicht gestartet werden.");
      window.location.href = data.url;
    } catch (e) {
      setCheckoutMsg({ type: "err", text: e?.message || "Checkout konnte nicht gestartet werden." });
      setCheckoutLoading(false);
    }
  };

  const saveFlag = async (id) => {
    const draft = adminFlagDraft[id] || {};
    const original = flags?.[id] || {};
    const payload = { id, required_role: draft.required_role ?? original.required_role, enabled: draft.enabled ?? original.enabled };
    setAdminFlagSaving(true);
    try {
      const res = await adminFetch("/api/admin?action=set-flag", { method: "POST", body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      await reloadFlags();
      setAdminFlagDraft(p => { const n = { ...p }; delete n[id]; return n; });
      setAdminFlagMsg({ type: "ok", text: "Gespeichert" });
    } catch {
      setAdminFlagMsg({ type: "err", text: "Fehler beim Speichern" });
    }
    setAdminFlagSaving(false);
    setTimeout(() => setAdminFlagMsg(null), 2500);
  };

  const searchUsers = async () => {
    setAdminUserLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin?action=users&query=${encodeURIComponent(adminUserQuery)}`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      const data = await res.json();
      const users = data.users || [];
      setAdminUsers(users);
      const init = {};
      users.forEach(u => { init[u.id] = u.role; });
      setAdminRoleSelected(init);
    } catch {
      setAdminUsers([]);
    }
    setAdminUserLoading(false);
  };

  const applyUserRole = async (userId) => {
    const role = adminRoleSelected[userId];
    if (!role) return;
    setAdminRoleSaving(p => ({ ...p, [userId]: true }));
    try {
      const res = await adminFetch("/api/admin?action=set-role", { method: "POST", body: JSON.stringify({ userId, role }) });
      if (!res.ok) throw new Error();
      setAdminUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    } catch {
      alert("Fehler beim Speichern der Rolle");
    }
    setAdminRoleSaving(p => ({ ...p, [userId]: false }));
  };

  const loadRecipeCategories = useCallback(async () => {
    setAdminRecipeCategoriesLoading(true);
    setAdminRecipeCategoriesError(null);
    try {
      const res = await adminFetch("/api/admin-recipes?action=categories&includeInactive=1");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Kategorien konnten nicht geladen werden.");
      setAdminRecipeCategoriesCatalog(data.categories || []);
    } catch (e) {
      setAdminRecipeCategoriesCatalog([]);
      setAdminRecipeCategoriesError(e?.message || "Kategorien konnten nicht geladen werden.");
    }
    setAdminRecipeCategoriesLoading(false);
  }, [adminFetch]);

  const createRecipeCategory = useCallback(async ({ slug, label, sort_order, is_active }) => {
    setAdminCategoryCreateSaving(true);
    try {
      const res = await adminFetch("/api/admin-recipes?action=category", {
        method: "POST",
        body: JSON.stringify({ slug, label, sort_order, is_active }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Kategorie konnte nicht angelegt werden.");
      await loadRecipeCategories();
      setAdminCategoryMsg({ type: "ok", text: "Kategorie angelegt" });
      setTimeout(() => setAdminCategoryMsg(null), 2500);
      return true;
    } catch (e) {
      setAdminCategoryMsg({ type: "err", text: e?.message || "Kategorie konnte nicht angelegt werden." });
      setTimeout(() => setAdminCategoryMsg(null), 3500);
      return false;
    } finally {
      setAdminCategoryCreateSaving(false);
    }
  }, [adminFetch, loadRecipeCategories]);

  const updateRecipeCategory = useCallback(async (slug, patch) => {
    setAdminCategorySaving(prev => ({ ...prev, [slug]: true }));
    try {
      const res = await adminFetch("/api/admin-recipes?action=category", {
        method: "PUT",
        body: JSON.stringify({ slug, ...patch }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Kategorie konnte nicht gespeichert werden.");
      await loadRecipeCategories();
      setAdminCategoryMsg({ type: "ok", text: "Kategorie gespeichert" });
      setTimeout(() => setAdminCategoryMsg(null), 2500);
      return true;
    } catch (e) {
      setAdminCategoryMsg({ type: "err", text: e?.message || "Kategorie konnte nicht gespeichert werden." });
      setTimeout(() => setAdminCategoryMsg(null), 3500);
      return false;
    } finally {
      setAdminCategorySaving(prev => ({ ...prev, [slug]: false }));
    }
  }, [adminFetch, loadRecipeCategories]);

  const deleteRecipeCategory = useCallback(async (slug) => {
    setAdminCategorySaving(prev => ({ ...prev, [slug]: true }));
    try {
      const res = await adminFetch(`/api/admin-recipes?action=category&slug=${encodeURIComponent(slug)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Kategorie konnte nicht geloescht werden.");
      await loadRecipeCategories();
      await reloadRecipes();
      setAdminCategoryMsg({ type: "ok", text: "Kategorie geloescht" });
      setTimeout(() => setAdminCategoryMsg(null), 2500);
      return true;
    } catch (e) {
      setAdminCategoryMsg({ type: "err", text: e?.message || "Kategorie konnte nicht geloescht werden." });
      setTimeout(() => setAdminCategoryMsg(null), 3500);
      return false;
    } finally {
      setAdminCategorySaving(prev => ({ ...prev, [slug]: false }));
    }
  }, [adminFetch, loadRecipeCategories, reloadRecipes]);

  const saveRecipeCategories = useCallback(async (recipeId, kategorien) => {
    setAdminRecipeCategorySaving(prev => ({ ...prev, [recipeId]: true }));
    try {
      const res = await adminFetch("/api/admin-recipes", {
        method: "PUT",
        body: JSON.stringify({ recipeId, kategorien }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Speichern fehlgeschlagen");
      await reloadRecipes();
      setAdminRecipeCategoryMsg({ type: "ok", text: "Kategorien gespeichert" });
      setTimeout(() => setAdminRecipeCategoryMsg(null), 2500);
      return true;
    } catch (e) {
      setAdminRecipeCategoryMsg({ type: "err", text: e?.message || "Speichern fehlgeschlagen" });
      setTimeout(() => setAdminRecipeCategoryMsg(null), 3500);
      return false;
    } finally {
      setAdminRecipeCategorySaving(prev => ({ ...prev, [recipeId]: false }));
    }
  }, [adminFetch, reloadRecipes]);

  const saveRecipeTexts = useCallback(async (recipeId, { titleText, shortDescriptionHtml, instructionsHtml, ingredientsText }) => {
    setAdminRecipeTextSaving(prev => ({ ...prev, [recipeId]: true }));
    try {
      const res = await adminFetch("/api/admin-recipes?action=recipe-text", {
        method: "PUT",
        body: JSON.stringify({ recipeId, titleText, shortDescriptionHtml, instructionsHtml, ingredientsText }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Speichern fehlgeschlagen");
      await reloadRecipes();
      setAdminRecipeTextMsg({ type: "ok", text: "Rezepttexte gespeichert" });
      setTimeout(() => setAdminRecipeTextMsg(null), 2500);
      return true;
    } catch (e) {
      setAdminRecipeTextMsg({ type: "err", text: e?.message || "Speichern fehlgeschlagen" });
      setTimeout(() => setAdminRecipeTextMsg(null), 3500);
      return false;
    } finally {
      setAdminRecipeTextSaving(prev => ({ ...prev, [recipeId]: false }));
    }
  }, [adminFetch, reloadRecipes]);

  const loadRecipeStatuses = useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin-recipes?action=recipe-statuses");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Status konnten nicht geladen werden.");
      const map = {};
      (data.statuses || []).forEach(row => {
        map[row.id] = { status: row.status || "published", editedAt: row.edited_at || null, publishedAt: row.published_at || null };
      });
      setAdminRecipeStatusById(map);
    } catch {
      setAdminRecipeStatusById({});
    }
  }, [adminFetch]);

  const loadRecipeHistory = useCallback(async (recipeId) => {
    if (!recipeId) return;
    setAdminRecipeHistoryLoading(prev => ({ ...prev, [recipeId]: true }));
    try {
      const res = await adminFetch(`/api/admin-recipes?action=recipe-history&recipeId=${encodeURIComponent(recipeId)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Historie konnte nicht geladen werden.");
      setAdminRecipeHistoryById(prev => ({ ...prev, [recipeId]: data.history || [] }));
    } catch (e) {
      setAdminRecipeWorkflowMsg({ type: "err", text: e?.message || "Historie konnte nicht geladen werden." });
      setTimeout(() => setAdminRecipeWorkflowMsg(null), 3500);
    } finally {
      setAdminRecipeHistoryLoading(prev => ({ ...prev, [recipeId]: false }));
    }
  }, [adminFetch]);

  const publishRecipe = useCallback(async (recipeId, status) => {
    if (!recipeId) return false;
    setAdminRecipePublishSaving(prev => ({ ...prev, [recipeId]: true }));
    try {
      const res = await adminFetch("/api/admin-recipes?action=recipe-publish", {
        method: "PUT",
        body: JSON.stringify({ recipeId, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Status konnte nicht gespeichert werden.");
      setAdminRecipeStatusById(prev => ({
        ...prev,
        [recipeId]: { status: data?.recipe?.status || status, editedAt: data?.recipe?.edited_at || null, publishedAt: data?.recipe?.published_at || null },
      }));
      await loadRecipeHistory(recipeId);
      setAdminRecipeWorkflowMsg({ type: "ok", text: status === "published" ? "Rezept veroeffentlicht" : "Rezept als Entwurf markiert" });
      setTimeout(() => setAdminRecipeWorkflowMsg(null), 2500);
      return true;
    } catch (e) {
      setAdminRecipeWorkflowMsg({ type: "err", text: e?.message || "Status konnte nicht gespeichert werden." });
      setTimeout(() => setAdminRecipeWorkflowMsg(null), 3500);
      return false;
    } finally {
      setAdminRecipePublishSaving(prev => ({ ...prev, [recipeId]: false }));
    }
  }, [adminFetch, loadRecipeHistory]);

  useEffect(() => {
    if (userRole === "admin") {
      loadRecipeCategories();
      loadRecipeStatuses();
    }
  }, [userRole, loadRecipeCategories, loadRecipeStatuses]);

  const doBootstrap = async () => {
    try {
      const res = await adminFetch("/api/admin?action=bootstrap", { method: "POST" });
      const data = await res.json();
      const msg = data.message || data.error || "Unbekannte Antwort";
      setBootstrapMsg(data.detail ? `${msg} (${data.detail})` : msg);
      if (data.success) setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      setBootstrapMsg(e?.message || "Netzwerkfehler");
    }
  };

  const saveBootstrapSettings = async () => {
    setAdminBootstrapSettingsSaving(true);
    try {
      const res = await adminFetch("/api/admin?action=set-setting", {
        method: "POST",
        body: JSON.stringify({ settings: adminBootstrapSettingsDraft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Einstellungen konnten nicht gespeichert werden.");
      const nextHeaderTagline = String(data?.settings?.headerTagline || adminBootstrapSettingsDraft.headerTagline || DEFAULT_HEADER_TAGLINE);
      const nextPremiumPriceLabel = String(data?.settings?.premiumPriceLabel || adminBootstrapSettingsDraft.premiumPriceLabel || DEFAULT_PREMIUM_PRICE_LABEL);
      setHeaderTagline(nextHeaderTagline);
      setPremiumPriceLabel(nextPremiumPriceLabel);
      setAdminBootstrapSettingsDraft({ headerTagline: nextHeaderTagline, premiumPriceLabel: nextPremiumPriceLabel });
      setAdminBootstrapSettingsMsg({ type: "ok", text: "Einstellungen gespeichert" });
      setTimeout(() => setAdminBootstrapSettingsMsg(null), 2500);
    } catch (e) {
      setAdminBootstrapSettingsMsg({ type: "err", text: e?.message || "Einstellungen konnten nicht gespeichert werden." });
      setTimeout(() => setAdminBootstrapSettingsMsg(null), 3500);
    } finally {
      setAdminBootstrapSettingsSaving(false);
    }
  };

  const generateRecipeImage = useCallback(async (id) => {
    setImageGenPerRecipe(p => ({ ...p, [id]: true }));
    try {
      const res = await adminFetch("/api/generate-recipe-image", { method: "POST", body: JSON.stringify({ id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generierung fehlgeschlagen");
      await reloadRecipes();
      setImageGenMsg(data.source === "stock"
        ? { type: "ok", text: `Kein KI-Guthaben – freies Foto übernommen (${String(data.stock?.license || "").toUpperCase()}, ${data.stock?.source}). ↻ für anderen Vorschlag.` }
        : { type: "ok", text: `Bild generiert ✓` });
    } catch (e) {
      setImageGenMsg({ type: "err", text: e?.message || "Fehler" });
    }
    setImageGenPerRecipe(p => ({ ...p, [id]: false }));
    setTimeout(() => setImageGenMsg(null), 4000);
  }, [adminFetch, reloadRecipes]);

  const generateAllImages = useCallback(async () => {
    const todo = adminRecipes.filter(r => r.image_status !== "ready");
    if (!todo.length) return;
    setImageGenLoading(true);
    for (const r of todo) {
      await generateRecipeImage(r.id);
      // AI Gateway erlaubt max. 5 Bilder/Minute
      if (todo.indexOf(r) < todo.length - 1) await new Promise(res => setTimeout(res, 13000));
    }
    setImageGenLoading(false);
  }, [adminRecipes, generateRecipeImage]);

  const TABS = useMemo(() => [
    { id: "calc",    label: "Rechner" },
    { id: "budget",  label: "Tagebuch" },
    { id: "recipes", label: "Rezepte" },
    { id: "food",    label: "Food" },
    { id: "info",    label: "Info" },
    { id: "profile", label: "Profil" },
    ...(userRole === "admin" ? [{ id: "admin", label: "Admin" }] : []),
  ].filter(t => t.id === "admin" || isTabEnabled(t.id)), [flags, userRole]); // eslint-disable-line react-hooks/exhaustive-deps

  const tabIds = useMemo(() => TABS.map((t) => t.id), [TABS]);
  const currentTab = useMemo(() => resolveTabSelection(tab, tabIds), [tab, tabIds]);

  const changeTab = useCallback((nextTab) => {
    setTab(nextTab);
    const nextPath = getPathWithTab(nextTab);
    const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextPath !== currentPath) window.history.pushState({ tab: nextTab }, "", nextPath);
  }, []);

  useEffect(() => {
    const onPopState = () => setTab(getTabFromUrl());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const urlTab = getTabFromUrl();
    if (urlTab === currentTab) return;
    window.history.replaceState(window.history.state, "", getPathWithTab(currentTab));
  }, [currentTab]);

  return (
    <div className={styles.root}>

      {/* Sign-In Modal */}
      {showSignIn && !isSignedIn && (
        <div onClick={() => setShowSignIn(false)} className={styles.signInBackdrop}>
          <div onClick={e => e.stopPropagation()}>
            <SignIn routing="hash" forceRedirectUrl={window.location.origin} signUpForceRedirectUrl={window.location.origin} />
          </div>
        </div>
      )}

      {/* Checkout status */}
      {checkoutMsg && (
        <div className={`${styles.checkoutBanner} ${styles[checkoutMsg.type]}`}>
          <span>{checkoutMsg.text}</span>
          <button onClick={() => setCheckoutMsg(null)} className={styles.checkoutClose}>Schließen</button>
        </div>
      )}

      {/* ── Sticky Shell: Header + Upgrade-Banner + Nav ── */}
      <div className="sticky-shell">

        {/* Upgrade banner */}
        {isSignedIn && !isPremium && (
          <div className={styles.upgradeBanner}>
            <span className={styles.upgradeText}>🌿 Tagebuch &amp; mehr freischalten</span>
            <button onClick={startCheckout} className={`btn-primary ${styles.upgradeBtn}`} disabled={checkoutLoading}>
              {checkoutLoading ? "Weiterleitung…" : `Premium – ${premiumPriceLabel}`}
            </button>
          </div>
        )}

        {/* Header */}
        <header className={`app-header ${styles.header}`}>
          <div className={styles.headerInner}>
            <img src={appLogo} alt="WampeWeg" className={styles.logo} />
            <div className={styles.headerText}>
              <div className={styles.appName}>
                WampeWeg
                <span className={styles.appVersion}>{__APP_VERSION__}</span>
              </div>
              <div className={styles.taglineRow}>
                <div className={styles.tagline}>{headerTagline}</div>
                {isSignedIn && (
                  <span className={styles.headerRoleBadge}>{ROLE_LABELS[userRole]}</span>
                )}
              </div>
            </div>
          </div>
          <SignedOut>
            <button onClick={() => setShowSignIn(true)} className={styles.signInBtn}>Anmelden</button>
          </SignedOut>
          <SignedIn>
            <div className={styles.userArea}>
              <div className={styles.userBtnWrap}>
                <UserButton appearance={{ elements: { avatarBox: { width: 38, height: 38 } } }} />
                {isPremium && <span className={styles.premiumEmoji}>🌿</span>}
              </div>
              {user?.firstName && (
                <span className={styles.userName}>{user.firstName}</span>
              )}
            </div>
          </SignedIn>
        </header>

        {/* Desktop Navigation */}
        <nav className={`nav-top nav-scroll ${styles.navTop}`}>
          {TABS.map(t => {
            const locked = isTabLocked(t.id);
            const isAdmin = t.id === "admin";
            return (
              <button key={t.id} onClick={() => changeTab(t.id)}
                className={[
                  styles.navBtn,
                  currentTab === t.id ? styles.active : '',
                  isAdmin ? styles.admin : '',
                ].filter(Boolean).join(' ')}>
                {t.label}{locked ? " 🔒" : ""}
              </button>
            );
          })}
        </nav>

      </div>

      {/* Mobile Bottom Nav */}
      <nav className="bottom-nav">
        {TABS.map(t => {
          const locked = isTabLocked(t.id);
          const active = currentTab === t.id;
          return (
            <button key={t.id} className={`bottom-nav-btn${active ? " active" : ""}`} onClick={() => changeTab(t.id)}>
              <TabIcon id={t.id} />
              <span>{t.label}{locked ? " 🔒" : ""}</span>
            </button>
          );
        })}
      </nav>

      {/* Main */}
      <main className={`main-content ${styles.mainContent}`}>

        {currentTab === "calc" && (
          isTabLocked("calc")
            ? <TabLocked tabId="calc" flags={flags} onSignIn={() => setShowSignIn(true)} onUpgrade={startCheckout} checkoutLoading={checkoutLoading} premiumPriceLabel={premiumPriceLabel} />
            : <TabCalc />
        )}

        {currentTab === "budget" && (
          <TabBudget locked={isTabLocked("budget")} onUpgrade={startCheckout} checkoutLoading={checkoutLoading} isSignedIn={isSignedIn} recipes={recipes} premiumPriceLabel={premiumPriceLabel} onOpenProfile={() => changeTab("profile")} isPremium={isPremium} />
        )}

        {currentTab === "profile" && (
          isTabLocked("profile")
            ? <TabLocked tabId="profile" flags={flags} onSignIn={() => setShowSignIn(true)} onUpgrade={startCheckout} checkoutLoading={checkoutLoading} premiumPriceLabel={premiumPriceLabel} />
            : <TabProfile isSignedIn={isSignedIn} onSignIn={() => setShowSignIn(true)} />
        )}

        {currentTab === "food" && (
          isTabLocked("food")
            ? <TabLocked tabId="food" flags={flags} onSignIn={() => setShowSignIn(true)} onUpgrade={startCheckout} checkoutLoading={checkoutLoading} premiumPriceLabel={premiumPriceLabel} />
            : <TabFood isSignedIn={isSignedIn} onSignIn={() => setShowSignIn(true)} isPremium={isPremium} />
        )}

        {currentTab === "recipes" && (
          isTabLocked("recipes")
            ? <TabLocked tabId="recipes" flags={flags} onSignIn={() => setShowSignIn(true)} onUpgrade={startCheckout} checkoutLoading={checkoutLoading} premiumPriceLabel={premiumPriceLabel} />
            : <TabRecipes recipes={recipes} loading={recipesLoading} error={recipesError} onReload={reloadRecipes} isSignedIn={isSignedIn} isPremium={isPremium} />
        )}

        {currentTab === "info" && (
          isTabLocked("info")
            ? <TabLocked tabId="info" flags={flags} onSignIn={() => setShowSignIn(true)} onUpgrade={startCheckout} checkoutLoading={checkoutLoading} premiumPriceLabel={premiumPriceLabel} />
            : <TabInfo isPremium={isPremium} onUpgrade={startCheckout} checkoutLoading={checkoutLoading} premiumPriceLabel={premiumPriceLabel} />
        )}

        {currentTab === "admin" && userRole === "admin" && (
          <TabAdmin
            flags={flags} flagsLoading={flagsLoading} flagsError={flagsError} onReloadFlags={reloadFlags}
            flagDraft={adminFlagDraft} onFlagDraftChange={setAdminFlagDraft}
            flagSaving={adminFlagSaving} flagMsg={adminFlagMsg} onSaveFlag={saveFlag}
            userQuery={adminUserQuery} onUserQueryChange={setAdminUserQuery}
            users={adminUsers} userLoading={adminUserLoading} onSearchUsers={searchUsers}
            roleSaving={adminRoleSaving} roleSelected={adminRoleSelected} onRoleSelected={setAdminRoleSelected} onApplyRole={applyUserRole}
            bootstrapMsg={bootstrapMsg} onBootstrap={doBootstrap}
            bootstrapSettings={adminBootstrapSettingsDraft}
            onBootstrapSettingsChange={setAdminBootstrapSettingsDraft}
            bootstrapSettingsSaving={adminBootstrapSettingsSaving}
            bootstrapSettingsMsg={adminBootstrapSettingsMsg}
            onSaveBootstrapSettings={saveBootstrapSettings}
            recipes={adminRecipes}
            imageGenLoading={imageGenLoading} imageGenPerRecipe={imageGenPerRecipe} imageGenMsg={imageGenMsg}
            onGenerateImage={generateRecipeImage} onGenerateAllImages={generateAllImages}
            recipeCategoryQuery={adminRecipeCategoryQuery}
            onRecipeCategoryQueryChange={setAdminRecipeCategoryQuery}
            recipeCategoriesCatalog={adminRecipeCategoriesCatalog}
            recipeCategoriesLoading={adminRecipeCategoriesLoading}
            recipeCategoriesError={adminRecipeCategoriesError}
            onReloadRecipeCategories={loadRecipeCategories}
            recipeCategorySaving={adminRecipeCategorySaving}
            recipeCategoryMsg={adminRecipeCategoryMsg}
            onSaveRecipeCategories={saveRecipeCategories}
            recipeTextSaving={adminRecipeTextSaving}
            recipeTextMsg={adminRecipeTextMsg}
            onSaveRecipeTexts={saveRecipeTexts}
            recipeWorkflowMsg={adminRecipeWorkflowMsg}
            recipeStatusById={adminRecipeStatusById}
            recipePublishSaving={adminRecipePublishSaving}
            recipeHistoryById={adminRecipeHistoryById}
            recipeHistoryLoading={adminRecipeHistoryLoading}
            onLoadRecipeHistory={loadRecipeHistory}
            onPublishRecipe={publishRecipe}
            categorySaving={adminCategorySaving}
            categoryCreateSaving={adminCategoryCreateSaving}
            categoryMsg={adminCategoryMsg}
            onCreateCategory={createRecipeCategory}
            onUpdateCategory={updateRecipeCategory}
            onDeleteCategory={deleteRecipeCategory}
          />
        )}

        {/* Bootstrap-Hinweis für eingeloggte Nicht-Admins */}
        {isSignedIn && userRole !== "admin" && currentTab !== "admin" && (
          <div className={styles.bootstrapHint}>
            <button onClick={doBootstrap} className={styles.bootstrapBtn}>Als Admin einrichten</button>
            {bootstrapMsg && <div className={styles.bootstrapMsg}>{bootstrapMsg}</div>}
          </div>
        )}

      </main>

      <InstallBanner />
    </div>
  );
}
