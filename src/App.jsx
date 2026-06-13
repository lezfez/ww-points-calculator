import { useState, useEffect, useCallback, useMemo } from "react";
import { SignIn, SignedIn, SignedOut, UserButton, useUser, useAuth } from "@clerk/clerk-react";
import appLogo from "./assets/app-logo-icon.svg";
import { useRecipes } from "./hooks/useRecipes";
import { useFeatureFlags } from "./hooks/useFeatureFlags";
import { getUserRole, hasAccess, ROLE_LABELS } from "./lib/roles";
import { C, FB, FH } from "./styles/theme";
import TabIcon from "./components/TabIcon";
import TabLocked from "./components/TabLocked";
import TabCalc from "./components/tabs/TabCalc";
import TabBudget from "./components/tabs/TabBudget";
import TabRecipes from "./components/tabs/TabRecipes";
import TabInfo from "./components/tabs/TabInfo";
import TabAdmin from "./components/tabs/TabAdmin";
import InstallBanner from "./components/InstallBanner";

export default function App() {
  const [tab, setTab]             = useState("calc");
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
  const [adminCategorySaving, setAdminCategorySaving] = useState({});
  const [adminCategoryCreateSaving, setAdminCategoryCreateSaving] = useState(false);
  const [adminCategoryMsg, setAdminCategoryMsg] = useState(null);

  // Image generation state
  const [imageGenLoading, setImageGenLoading]       = useState(false);
  const [imageGenPerRecipe, setImageGenPerRecipe]   = useState({});
  const [imageGenMsg, setImageGenMsg]               = useState(null);
  const [bootstrapMsg, setBootstrapMsg]         = useState(null);

  const { recipes, loading: recipesLoading, error: recipesError, reload: reloadRecipes } = useRecipes();
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
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
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
      const res = await adminFetch(`/api/admin-recipes?action=category&slug=${encodeURIComponent(slug)}`, {
        method: "DELETE",
      });
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

  useEffect(() => {
    if (userRole === "admin") loadRecipeCategories();
  }, [userRole, loadRecipeCategories]);

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

  const generateRecipeImage = useCallback(async (id) => {
    setImageGenPerRecipe(p => ({ ...p, [id]: true }));
    try {
      const res = await adminFetch("/api/generate-recipe-image", { method: "POST", body: JSON.stringify({ id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generierung fehlgeschlagen");
      await reloadRecipes();
      setImageGenMsg({ type: "ok", text: `Bild generiert ✓` });
    } catch (e) {
      setImageGenMsg({ type: "err", text: e?.message || "Fehler" });
    }
    setImageGenPerRecipe(p => ({ ...p, [id]: false }));
    setTimeout(() => setImageGenMsg(null), 4000);
  }, [adminFetch, reloadRecipes]);

  const generateAllImages = useCallback(async () => {
    const todo = recipes.filter(r => r.image_status !== "ready");
    if (!todo.length) return;
    setImageGenLoading(true);
    for (const r of todo) {
      await generateRecipeImage(r.id);
      if (todo.indexOf(r) < todo.length - 1) await new Promise(res => setTimeout(res, 1500));
    }
    setImageGenLoading(false);
  }, [recipes, generateRecipeImage]);

  const TABS = useMemo(() => [
    { id: "calc",    label: "Berechnen" },
    { id: "budget",  label: "Tagebuch" },
    { id: "recipes", label: "Rezepte" },
    { id: "info",    label: "Info" },
    ...(userRole === "admin" ? [{ id: "admin", label: "Admin" }] : []),
  ].filter(t => t.id === "admin" || isTabEnabled(t.id)), [flags, userRole]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: FB, color: C.text }}>

      {/* Sign-In Modal */}
      {showSignIn && !isSignedIn && (
        <div onClick={() => setShowSignIn(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div onClick={e => e.stopPropagation()}>
            <SignIn routing="hash" forceRedirectUrl={window.location.origin} signUpForceRedirectUrl={window.location.origin} />
          </div>
        </div>
      )}

      {/* Checkout status */}
      {checkoutMsg && (
        <div style={{
          background: checkoutMsg.type === "ok" ? C.green : checkoutMsg.type === "warn" ? C.premBg : "#FEE2E2",
          color: checkoutMsg.type === "ok" ? "#fff" : checkoutMsg.type === "warn" ? C.premText : "#991B1B",
          borderBottom: checkoutMsg.type === "ok" ? "none" : `1px solid ${checkoutMsg.type === "warn" ? C.premBorder : "#FCA5A5"}`,
          textAlign: "center", padding: "12px 16px", fontSize: 14, fontWeight: 600, fontFamily: FB,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap",
        }}>
          <span>{checkoutMsg.text}</span>
          <button onClick={() => setCheckoutMsg(null)} style={{ border: "none", background: "rgba(255,255,255,.24)", color: "inherit", borderRadius: 999, padding: "4px 10px", fontFamily: FB, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            Schließen
          </button>
        </div>
      )}

      {/* ── Sticky Shell: Header + Upgrade-Banner + Nav ── */}
      <div className="sticky-shell">

        {/* Upgrade banner */}
        {isSignedIn && !isPremium && (
          <div style={{ background: C.premBg, borderBottom: `1px solid ${C.premBorder}`, padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: C.premText, fontWeight: 600, fontFamily: FB }}>
              🌿 Tagebuch &amp; mehr freischalten
            </span>
            <button onClick={startCheckout} className="btn-primary" disabled={checkoutLoading}
              style={{ background: `linear-gradient(135deg, ${C.coin} 0%, #A34D08 100%)`, color: "#fff", border: "none", borderRadius: 9, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: checkoutLoading ? "wait" : "pointer", fontFamily: FB, whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(198,123,92,.3)", opacity: checkoutLoading ? .75 : 1 }}>
              {checkoutLoading ? "Weiterleitung…" : "Premium – 2,99 €/Monat"}
            </button>
          </div>
        )}

        {/* Header */}
        <header className="app-header" style={{ background: `linear-gradient(135deg, ${C.green2} 0%, ${C.green} 60%, ${C.greenMid} 100%)`, padding: "14px 20px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 12 }}>
            <img src={appLogo} alt="WampeWeg" style={{ display: "block", height: 52, width: 52, flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 20, color: "#fff", letterSpacing: "-.01em", lineHeight: 1.1 }}>
                WampeWeg
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,.65)", letterSpacing: ".08em", textTransform: "uppercase", fontFamily: FB }}>
                  Coins · PersonalPoints · SmartPoints · ProPoints
                </div>
                {isSignedIn && (
                  <span style={{ fontSize: 10, background: "rgba(255,255,255,.15)", color: "#fff", borderRadius: 999, padding: "2px 8px", fontFamily: FB, letterSpacing: ".04em", fontWeight: 600 }}>
                    {ROLE_LABELS[userRole]}
                  </span>
                )}
              </div>
            </div>
          </div>
          <SignedOut>
            <button onClick={() => setShowSignIn(true)}
              style={{ background: "rgba(255,255,255,.14)", border: "1.5px solid rgba(255,255,255,.3)", color: "#fff", borderRadius: 10, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FB, whiteSpace: "nowrap", flexShrink: 0, minHeight: 44 }}>
              Anmelden
            </button>
          </SignedOut>
          <SignedIn>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div style={{ position: "relative", display: "inline-flex" }}>
                <UserButton appearance={{ elements: { avatarBox: { width: 38, height: 38 } } }} />
                {isPremium && (
                  <span style={{ position: "absolute", top: -8, right: -6, fontSize: 14, lineHeight: 1, pointerEvents: "none", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.4))" }}>
                    🌿
                  </span>
                )}
              </div>
              {user?.firstName && (
                <span style={{ fontSize: 10, color: "rgba(255,255,255,.8)", fontFamily: FB, fontWeight: 600, maxWidth: 52, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.firstName}
                </span>
              )}
            </div>
          </SignedIn>
        </header>

        {/* Desktop Navigation */}
        <nav className="nav-top nav-scroll" style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "10px 16px", display: "flex", gap: 6, overflowX: "auto" }}>
          {TABS.map(t => {
            const locked = isTabLocked(t.id);
            const isAdmin = t.id === "admin";
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ padding: "9px 18px", border: "none", borderRadius: 999, background: tab === t.id ? (isAdmin ? C.adminText : C.green) : "transparent", color: tab === t.id ? "#fff" : (isAdmin ? C.adminText : C.sub), fontWeight: tab === t.id ? 700 : 500, fontSize: 13, fontFamily: FB, cursor: "pointer", whiteSpace: "nowrap", transition: "background .18s, color .18s", letterSpacing: ".03em", minHeight: 44 }}>
                {t.label}{locked ? " 🔒" : ""}
              </button>
            );
          })}
        </nav>

      </div>

      {/* Mobile Bottom Nav */}
      <nav className="bottom-nav">
        {TABS.map(t => {
          const locked  = isTabLocked(t.id);
          const active  = tab === t.id;
          const isAdmin = t.id === "admin";
          const color   = active ? (isAdmin ? C.adminText : C.green) : C.muted;
          return (
            <button key={t.id} className="bottom-nav-btn" onClick={() => setTab(t.id)} style={{ color, fontFamily: FB }}>
              <TabIcon id={t.id} />
              <span>{t.label}{locked ? " 🔒" : ""}</span>
            </button>
          );
        })}
      </nav>

      {/* Main */}
      <main className="main-content" style={{ maxWidth: 860, margin: "0 auto", padding: "22px 16px 80px" }}>

        {tab === "calc" && (
          isTabLocked("calc")
            ? <TabLocked tabId="calc" flags={flags} onSignIn={() => setShowSignIn(true)} onUpgrade={startCheckout} checkoutLoading={checkoutLoading} />
            : <TabCalc />
        )}

        {tab === "budget" && (
          <TabBudget locked={isTabLocked("budget")} onUpgrade={startCheckout} checkoutLoading={checkoutLoading} isSignedIn={isSignedIn} recipes={recipes} />
        )}

        {tab === "recipes" && (
          isTabLocked("recipes")
            ? <TabLocked tabId="recipes" flags={flags} onSignIn={() => setShowSignIn(true)} onUpgrade={startCheckout} checkoutLoading={checkoutLoading} />
            : <TabRecipes recipes={recipes} loading={recipesLoading} error={recipesError} onReload={reloadRecipes} />
        )}

        {tab === "info" && (
          isTabLocked("info")
            ? <TabLocked tabId="info" flags={flags} onSignIn={() => setShowSignIn(true)} onUpgrade={startCheckout} checkoutLoading={checkoutLoading} />
            : <TabInfo isPremium={isPremium} onUpgrade={startCheckout} checkoutLoading={checkoutLoading} />
        )}

        {tab === "admin" && userRole === "admin" && (
          <TabAdmin
            flags={flags} flagsLoading={flagsLoading} flagsError={flagsError} onReloadFlags={reloadFlags}
            flagDraft={adminFlagDraft} onFlagDraftChange={setAdminFlagDraft}
            flagSaving={adminFlagSaving} flagMsg={adminFlagMsg} onSaveFlag={saveFlag}
            userQuery={adminUserQuery} onUserQueryChange={setAdminUserQuery}
            users={adminUsers} userLoading={adminUserLoading} onSearchUsers={searchUsers}
            roleSaving={adminRoleSaving} roleSelected={adminRoleSelected} onRoleSelected={setAdminRoleSelected} onApplyRole={applyUserRole}
            bootstrapMsg={bootstrapMsg} onBootstrap={doBootstrap}
            recipes={recipes}
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
            categorySaving={adminCategorySaving}
            categoryCreateSaving={adminCategoryCreateSaving}
            categoryMsg={adminCategoryMsg}
            onCreateCategory={createRecipeCategory}
            onUpdateCategory={updateRecipeCategory}
            onDeleteCategory={deleteRecipeCategory}
          />
        )}

        {/* Bootstrap-Hinweis für eingeloggte Nicht-Admins */}
        {isSignedIn && userRole !== "admin" && tab !== "admin" && (
          <div style={{ textAlign: "center", marginTop: 8 }}>
            <button onClick={doBootstrap} style={{ fontSize: 11, color: C.muted, background: "none", border: "none", cursor: "pointer", fontFamily: FB, textDecoration: "underline" }}>
              Als Admin einrichten
            </button>
            {bootstrapMsg && <div style={{ fontSize: 11, color: C.sub, fontFamily: FB, marginTop: 4 }}>{bootstrapMsg}</div>}
          </div>
        )}

      </main>

      <InstallBanner />
    </div>
  );
}
