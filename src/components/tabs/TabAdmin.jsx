import { useEffect, useMemo, useState } from "react";
import { Editor } from "@tinymce/tinymce-react";
import RoleBadge from "../RoleBadge";
import AdminFoods from "../AdminFoods";
import { C, FB, FH, card, sectionLabel, inputStyle, primaryBtn } from "../../styles/theme";
import { FLAG_DEFS } from "../../lib/featureFlags";
import { ROLE_LABELS, ROLE_OPTIONS } from "../../lib/roles";

const IMAGE_STATUS_LABEL = {
  ready:      { icon: "✅", label: "Fertig",       color: "#228B22" },
  generating: { icon: "⏳", label: "Generiert…",   color: "#B45309" },
  failed:     { icon: "✗",  label: "Fehler",        color: "#991B1B" },
  pending:    { icon: "○",  label: "Ausstehend",    color: "#9E9E90" },
};

const ADMIN_SUBTABS = [
  { id: "zugriff", label: "Zugriff" },
  { id: "users", label: "Users" },
  { id: "kategorien", label: "Kategorien" },
  { id: "rezepte", label: "Rezepte" },
  { id: "bilder", label: "Bilder" },
  { id: "foods", label: "Foods" },
  { id: "bootstrap", label: "Bootstrap" },
];

const ADMIN_SUBTAB_IDS = new Set(ADMIN_SUBTABS.map(tab => tab.id));

function getInitialAdminSubtab() {
  const urlValue = new URLSearchParams(window.location.search).get("adminTab");
  return ADMIN_SUBTAB_IDS.has(urlValue) ? urlValue : "zugriff";
}

export default function TabAdmin({
  flags, flagsLoading, flagsError, onReloadFlags,
  flagDraft, onFlagDraftChange, flagSaving, flagMsg, onSaveFlag,
  userQuery, onUserQueryChange, users, userLoading, onSearchUsers,
  roleSaving, roleSelected, onRoleSelected, onApplyRole,
  bootstrapMsg, onBootstrap,
  recipes, imageGenLoading, imageGenPerRecipe, imageGenMsg, onGenerateImage, onGenerateAllImages,
  recipeCategoryQuery, onRecipeCategoryQueryChange,
  recipeCategoriesCatalog, recipeCategoriesLoading, recipeCategoriesError, onReloadRecipeCategories,
  recipeCategorySaving, recipeCategoryMsg, onSaveRecipeCategories,
  recipeTextSaving, recipeTextMsg, onSaveRecipeTexts,
  recipeWorkflowMsg, recipeStatusById, recipePublishSaving,
  recipeHistoryById, recipeHistoryLoading, onLoadRecipeHistory, onPublishRecipe,
  categorySaving, categoryCreateSaving, categoryMsg, onCreateCategory, onUpdateCategory, onDeleteCategory,
}) {
  const [recipeCategoryDraft, setRecipeCategoryDraft] = useState({});
  const [recipeTextDraft, setRecipeTextDraft] = useState({});
  const [categoryDraft, setCategoryDraft] = useState({});
  const [newCategory, setNewCategory] = useState({ slug: "", label: "", sort_order: 0, is_active: true });
  const [openRecipeTextEditorId, setOpenRecipeTextEditorId] = useState(null);
  const [openRecipeHistoryId, setOpenRecipeHistoryId] = useState(null);
  const [imageSearchQuery, setImageSearchQuery] = useState("");
  const [imageModal, setImageModal] = useState(null);
  const [activeSubtab, setActiveSubtab] = useState(getInitialAdminSubtab);

  const formatDateTime = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredRecipes = useMemo(() => {
    const needle = recipeCategoryQuery.trim().toLowerCase();
    if (!needle) return recipes;
    return recipes.filter(r =>
      r.name?.toLowerCase().includes(needle) ||
      (r.kategorienLabels || []).some(cat => cat.toLowerCase().includes(needle))
    );
  }, [recipes, recipeCategoryQuery]);

  const activeRecipeCategoriesCatalog = useMemo(
    () => recipeCategoriesCatalog.filter(cat => cat.is_active !== false),
    [recipeCategoriesCatalog]
  );

  const filteredImageRecipes = useMemo(() => {
    const needle = imageSearchQuery.trim().toLowerCase();
    if (!needle) return recipes;
    return recipes.filter(r =>
      String(r.name || "").toLowerCase().includes(needle)
      || String(r.kategorie || "").toLowerCase().includes(needle)
    );
  }, [recipes, imageSearchQuery]);

  const hasUnsavedRecipeDrafts = useMemo(
    () => Object.keys(recipeCategoryDraft).length > 0,
    [recipeCategoryDraft]
  );

  const hasUnsavedRecipeTextDrafts = useMemo(
    () => Object.keys(recipeTextDraft).length > 0,
    [recipeTextDraft]
  );

  const hasUnsavedCategoryDrafts = useMemo(() => {
    return Object.entries(categoryDraft).some(([slug, draft]) => {
      const category = recipeCategoriesCatalog.find(cat => cat.slug === slug);
      if (!category) return false;
      return draft.label !== (category.label || "")
        || Number(draft.sort_order) !== Number(category.sort_order ?? 0)
        || !!draft.is_active !== (category.is_active !== false);
    });
  }, [categoryDraft, recipeCategoriesCatalog]);

  const isNewCategoryDirty = useMemo(() => {
    return String(newCategory.slug || "").trim() !== ""
      || String(newCategory.label || "").trim() !== ""
      || Number(newCategory.sort_order || 0) !== 0
      || newCategory.is_active !== true;
  }, [newCategory]);

  const hasAdminDirtyChanges = hasUnsavedRecipeDrafts || hasUnsavedRecipeTextDrafts || hasUnsavedCategoryDrafts || isNewCategoryDirty;

  useEffect(() => {
    const url = new URL(window.location.href);
    const current = url.searchParams.get("adminTab");
    if (current === activeSubtab) return;
    url.searchParams.set("adminTab", activeSubtab);
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [activeSubtab]);

  useEffect(() => {
    if (!hasAdminDirtyChanges) return;
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasAdminDirtyChanges]);

  useEffect(() => {
    if (!imageModal) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setImageModal(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [imageModal]);

  const getDraftForRecipe = (recipe) => recipeCategoryDraft[recipe.id] ?? recipe.kategorien ?? [];

  const getTextDraftForRecipe = (recipe) => recipeTextDraft[recipe.id] ?? {
    titleText: recipe.name || "",
    shortDescriptionHtml: recipe.shortDescriptionHtml || "",
    instructionsHtml: recipe.instructionsHtml || "",
    ingredientsText: Array.isArray(recipe.zutaten) ? recipe.zutaten.join("\n") : "",
  };

  const toggleDraftCategory = (recipe, slug) => {
    const current = getDraftForRecipe(recipe);
    const next = current.includes(slug)
      ? current.filter(s => s !== slug)
      : [...current, slug];
    setRecipeCategoryDraft(prev => ({ ...prev, [recipe.id]: next }));
  };

  const saveRecipeCategories = async (recipe) => {
    const toSave = getDraftForRecipe(recipe);
    const ok = await onSaveRecipeCategories(recipe.id, toSave);
    if (ok) {
      setRecipeCategoryDraft(prev => {
        const next = { ...prev };
        delete next[recipe.id];
        return next;
      });
    }
  };

  const setTextDraftField = (recipe, field, value) => {
    const base = getTextDraftForRecipe(recipe);
    setRecipeTextDraft(prev => ({
      ...prev,
      [recipe.id]: {
        ...base,
        [field]: value,
      },
    }));
  };

  const saveRecipeTexts = async (recipe) => {
    const draft = getTextDraftForRecipe(recipe);
    const ok = await onSaveRecipeTexts(recipe.id, {
      titleText: draft.titleText,
      shortDescriptionHtml: draft.shortDescriptionHtml,
      instructionsHtml: draft.instructionsHtml,
      ingredientsText: draft.ingredientsText,
    });
    if (ok) {
      setRecipeTextDraft(prev => {
        const next = { ...prev };
        delete next[recipe.id];
        return next;
      });
    }
  };

  const getDraftForCategory = (category) => categoryDraft[category.slug] ?? {
    label: category.label || "",
    sort_order: category.sort_order ?? 0,
    is_active: category.is_active !== false,
  };

  const setCategoryDraftField = (slug, field, value) => {
    const original = recipeCategoriesCatalog.find(cat => cat.slug === slug);
    if (!original) return;
    const base = getDraftForCategory(original);
    setCategoryDraft(prev => ({
      ...prev,
      [slug]: { ...base, [field]: value },
    }));
  };

  const saveCategory = async (category) => {
    const draft = getDraftForCategory(category);
    const patch = {
      label: String(draft.label || "").trim(),
      sort_order: Number.isFinite(Number(draft.sort_order)) ? Number(draft.sort_order) : 0,
      is_active: !!draft.is_active,
    };
    const ok = await onUpdateCategory(category.slug, patch);
    if (ok) {
      setCategoryDraft(prev => {
        const next = { ...prev };
        delete next[category.slug];
        return next;
      });
    }
  };

  const createCategory = async () => {
    const ok = await onCreateCategory({
      slug: newCategory.slug,
      label: newCategory.label,
      sort_order: Number.isFinite(Number(newCategory.sort_order)) ? Number(newCategory.sort_order) : 0,
      is_active: !!newCategory.is_active,
    });
    if (ok) {
      setNewCategory({ slug: "", label: "", sort_order: 0, is_active: true });
    }
  };

  const deleteCategory = async (category) => {
    const ok = window.confirm(`Kategorie ${category.label} wirklich loeschen?`);
    if (!ok) return;
    const deleted = await onDeleteCategory(category.slug);
    if (deleted) {
      setCategoryDraft(prev => {
        const next = { ...prev };
        delete next[category.slug];
        return next;
      });
    }
  };

  const changeSubtab = (nextSubtab) => {
    if (nextSubtab === activeSubtab) return;
    if (hasAdminDirtyChanges) {
      const ok = window.confirm("Es gibt ungespeicherte Admin-Änderungen. Trotzdem den Unterbereich wechseln?");
      if (!ok) return;
    }
    setActiveSubtab(nextSubtab);
  };

  return (
    <div className="tab-content">

      <div style={{ ...card, background: C.adminBg, borderColor: C.adminBorder }}>
        <div style={{ fontFamily: FH, fontStyle: "italic", fontWeight: 700, fontSize: 22, color: C.adminText, marginBottom: 4 }}>
          Admin-Bereich
        </div>
        <div style={{ fontSize: 13, color: C.adminText, opacity: .7, fontFamily: FB }}>
          Zugriffssteuerung und Benutzerverwaltung
        </div>
      </div>

      <div style={{ ...card, padding: "12px 14px", background: C.surface2 }}>
        <div
          role="tablist"
          aria-label="Admin Unterbereiche"
          style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
        >
          {ADMIN_SUBTABS.map(tab => {
            const active = activeSubtab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => changeSubtab(tab.id)}
                style={{
                  padding: "7px 12px",
                  borderRadius: 999,
                  border: `1px solid ${active ? C.green : C.border}`,
                  background: active ? C.greenPale : C.surface,
                  color: active ? C.green2 : C.sub,
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: FB,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {hasAdminDirtyChanges && (
          <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.premBorder}`, background: "#FFFBF0", color: C.sub, fontSize: 12, fontWeight: 600, fontFamily: FB }}>
            Ungespeicherte Änderungen in Rezept-Zuordnungen, Rezepttexten oder Kategorien. Beim Wechseln wird vorher gewarnt.
          </div>
        )}
      </div>

      {/* Feature Flags */}
      {activeSubtab === "zugriff" && (
      <div style={card}>
        <div style={{ ...sectionLabel, color: C.adminText }}>Zugriffssteuerung – Feature Flags</div>
        <p style={{ fontSize: 12, color: C.sub, marginBottom: 16, lineHeight: 1.6, fontFamily: FB }}>
          Lege fest, welche Rolle für jeden Tab/jede Funktion mindestens erforderlich ist.
          Als Admin siehst du immer alles, unabhängig von diesen Einstellungen.
        </p>

        {flagsLoading ? (
          <div style={{ color: C.muted, fontFamily: FB, fontSize: 13 }}>Lade Flags…</div>
        ) : flagsError ? (
          <div style={{ background: "#FEE2E2", border: "1px solid #FCA5A5", color: "#991B1B", borderRadius: 10, padding: "12px 14px", fontFamily: FB, fontSize: 13, lineHeight: 1.6 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Feature Flags konnten nicht geladen werden.</div>
            <button onClick={onReloadFlags} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#991B1B", color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: FB, cursor: "pointer" }}>
              Erneut laden
            </button>
          </div>
        ) : flags ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {FLAG_DEFS.map(def => {
              const current = flags[def.id] || {};
              const draft = flagDraft[def.id] || {};
              const reqRole = draft.required_role ?? current.required_role ?? "guest";
              const enabled  = draft.enabled      ?? current.enabled      ?? true;
              const isDirty = draft.required_role !== undefined || draft.enabled !== undefined;

              return (
                <div key={def.id} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "12px 14px", background: isDirty ? "#FFFBF0" : C.surface2, borderRadius: 12, border: `1px solid ${isDirty ? C.premBorder : C.border}` }}>
                  <div style={{ flex: "1 1 140px", minWidth: 120 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: C.text, fontFamily: FB }}>{def.label}</div>
                    <div style={{ fontSize: 11, color: C.muted, fontFamily: FB }}>{def.desc}</div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: ".08em", textTransform: "uppercase", fontFamily: FB }}>Mindestrolle</label>
                    <select
                      className="app-select"
                      style={{ ...inputStyle, width: "auto", padding: "7px 11px", fontSize: 13, minHeight: 36 }}
                      value={reqRole}
                      onChange={e => onFlagDraftChange(p => ({ ...p, [def.id]: { ...p[def.id], required_role: e.target.value } }))}
                    >
                      <option value="guest">Gast (alle)</option>
                      <option value="user">Registriert</option>
                      <option value="premium">Premium</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: ".08em", textTransform: "uppercase", fontFamily: FB }}>Status</label>
                    <button
                      onClick={() => onFlagDraftChange(p => ({ ...p, [def.id]: { ...p[def.id], enabled: !(draft.enabled ?? current.enabled ?? true) } }))}
                      style={{ padding: "7px 14px", borderRadius: 9, border: `1.5px solid ${enabled ? C.green : C.border}`, background: enabled ? C.greenPale : C.surface2, color: enabled ? C.green2 : C.sub, fontSize: 12, fontWeight: 700, fontFamily: FB, cursor: "pointer", minHeight: 36 }}>
                      {enabled ? "● Aktiv" : "○ Deaktiviert"}
                    </button>
                  </div>

                  <button
                    onClick={() => onSaveFlag(def.id)}
                    disabled={!isDirty || flagSaving}
                    style={{ padding: "8px 16px", borderRadius: 9, border: "none", background: isDirty ? C.green : C.surface2, color: isDirty ? "#fff" : C.muted, fontSize: 12, fontWeight: 700, fontFamily: FB, cursor: isDirty ? "pointer" : "default", minHeight: 36, opacity: flagSaving ? .6 : 1 }}>
                    {flagSaving ? "…" : "Speichern"}
                  </button>
                </div>
              );
            })}
          </div>
        ) : null}

        {flagMsg && (
          <div style={{ marginTop: 12, padding: "8px 14px", borderRadius: 9, background: flagMsg.type === "ok" ? C.greenPale : "#FEE2E2", color: flagMsg.type === "ok" ? C.green2 : "#991B1B", fontSize: 13, fontWeight: 600, fontFamily: FB }}>
            {flagMsg.type === "ok" ? "✓ " : "✗ "}{flagMsg.text}
          </div>
        )}
      </div>
      )}

      {/* Benutzerverwaltung */}
      {activeSubtab === "users" && (
      <div style={card}>
        <div style={{ ...sectionLabel, color: C.adminText }}>Benutzerverwaltung</div>
        <p style={{ fontSize: 12, color: C.sub, marginBottom: 14, lineHeight: 1.6, fontFamily: FB }}>
          Suche nach Benutzern und weise ihnen eine Rolle zu.
          Mögliche Rollen: <b>Registriert</b> · <b>Premium</b> · <b>Admin</b>
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input
            className="app-input"
            style={{ ...inputStyle, flex: 1 }}
            placeholder="E-Mail oder Name suchen…"
            value={userQuery}
            onChange={e => onUserQueryChange(e.target.value)}
            onKeyDown={e => e.key === "Enter" && onSearchUsers()}
          />
          <button
            onClick={onSearchUsers}
            disabled={userLoading}
            style={{ padding: "11px 18px", borderRadius: 10, border: "none", background: C.green, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: FB, cursor: "pointer", whiteSpace: "nowrap", opacity: userLoading ? .7 : 1, minHeight: 44 }}>
            {userLoading ? "…" : "Suchen"}
          </button>
        </div>

        {users.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {users.map(u => (
              <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "12px 14px", background: C.surface2, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <div style={{ flex: "1 1 160px" }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.text, fontFamily: FB }}>{u.email}</div>
                  <div style={{ fontSize: 11, color: C.muted, fontFamily: FB }}>
                    {u.firstName} {u.lastName} · ID: {u.id.slice(0, 12)}…
                  </div>
                </div>
                <RoleBadge role={u.role} />
                <select
                  className="app-select"
                  style={{ ...inputStyle, width: "auto", padding: "7px 11px", fontSize: 13, minHeight: 36 }}
                  value={roleSelected[u.id] || u.role}
                  onChange={e => onRoleSelected(p => ({ ...p, [u.id]: e.target.value }))}>
                  {ROLE_OPTIONS.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
                <button
                  onClick={() => onApplyRole(u.id)}
                  disabled={roleSaving[u.id]}
                  style={{ padding: "8px 16px", borderRadius: 9, border: "none", background: C.green, color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: FB, cursor: "pointer", opacity: roleSaving[u.id] ? .6 : 1, minHeight: 36 }}>
                  {roleSaving[u.id] ? "…" : "Speichern"}
                </button>
              </div>
            ))}
          </div>
        )}

        {users.length === 0 && userQuery && !userLoading && (
          <div style={{ color: C.muted, fontFamily: FB, fontSize: 13, textAlign: "center", padding: "16px 0" }}>Keine Benutzer gefunden.</div>
        )}
      </div>
      )}

      {/* Rezeptbilder */}
      {activeSubtab === "bilder" && (
      <div style={card}>
        <div style={{ ...sectionLabel, color: C.adminText }}>Rezeptbilder (KI-Generierung)</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <input
            className="app-input"
            style={{ ...inputStyle, flex: 1 }}
            placeholder="Rezepte/Bilder suchen..."
            value={imageSearchQuery}
            onChange={e => setImageSearchQuery(e.target.value)}
          />
        </div>
        {recipes && (() => {
          const total = recipes.length;
          const ready = recipes.filter(r => r.image_status === "ready").length;
          const failed = recipes.filter(r => r.image_status === "failed").length;
          const pending = total - ready - failed - recipes.filter(r => r.image_status === "generating").length;
          return (
            <>
              <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 100, background: C.greenPale, borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
                  <div style={{ fontWeight: 700, fontSize: 20, color: C.green2, fontFamily: FH }}>{ready}</div>
                  <div style={{ fontSize: 11, color: C.green2, fontFamily: FB }}>von {total} fertig</div>
                </div>
                {failed > 0 && (
                  <div style={{ flex: 1, minWidth: 100, background: "#FEE2E2", borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
                    <div style={{ fontWeight: 700, fontSize: 20, color: "#991B1B", fontFamily: FH }}>{failed}</div>
                    <div style={{ fontSize: 11, color: "#991B1B", fontFamily: FB }}>fehlgeschlagen</div>
                  </div>
                )}
                {(pending + failed) > 0 && (
                  <div style={{ flex: 1, minWidth: 100, background: C.surface2, borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
                    <div style={{ fontWeight: 700, fontSize: 20, color: C.sub, fontFamily: FH }}>{pending + failed}</div>
                    <div style={{ fontSize: 11, color: C.sub, fontFamily: FB }}>ausstehend</div>
                  </div>
                )}
              </div>

              {ready < total && (
                <button
                  onClick={onGenerateAllImages}
                  disabled={imageGenLoading}
                  style={{ ...primaryBtn(false), marginTop: 0, marginBottom: 16, opacity: imageGenLoading ? .7 : 1 }}>
                  {imageGenLoading ? "⏳ Generiere…" : `🌿 Alle fehlenden Bilder generieren (${total - ready})`}
                </button>
              )}

              {imageGenMsg && (
                <div style={{ marginBottom: 12, padding: "8px 14px", borderRadius: 9, background: imageGenMsg.type === "ok" ? C.greenPale : "#FEE2E2", color: imageGenMsg.type === "ok" ? C.green2 : "#991B1B", fontSize: 13, fontWeight: 600, fontFamily: FB }}>
                  {imageGenMsg.type === "ok" ? "✓ " : "✗ "}{imageGenMsg.text}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filteredImageRecipes.map(r => {
                  const st = IMAGE_STATUS_LABEL[r.image_status] || IMAGE_STATUS_LABEL.pending;
                  const isLoading = imageGenPerRecipe?.[r.id];
                  return (
                    <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: C.surface2, borderRadius: 10, border: `1px solid ${C.border}` }}>
                      {r.image_url ? (
                        <button
                          type="button"
                          title={`Bild vergroessern: ${r.name}`}
                          onClick={() => setImageModal({ url: r.image_url, name: r.name })}
                          style={{
                            width: 48,
                            height: 36,
                            padding: 0,
                            borderRadius: 6,
                            border: `1px solid ${C.border}`,
                            background: C.surface,
                            cursor: "zoom-in",
                            flexShrink: 0,
                            overflow: "hidden",
                          }}>
                          <img src={r.image_url} alt={`Vorschaubild: ${r.name}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        </button>
                      ) : (
                        <div style={{ width: 48, height: 36, background: C.border, borderRadius: 6, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🍽️</div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 12, color: C.text, fontFamily: FB, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                        <div style={{ fontSize: 11, color: st.color, fontFamily: FB }}>{st.icon} {st.label}</div>
                      </div>
                      <button
                        onClick={() => onGenerateImage(r.id)}
                        disabled={isLoading || imageGenLoading}
                        title="Bild (neu) generieren"
                        style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, color: C.sub, fontSize: 12, fontWeight: 600, fontFamily: FB, cursor: "pointer", whiteSpace: "nowrap", opacity: (isLoading || imageGenLoading) ? .5 : 1 }}>
                        {isLoading ? "⏳" : "↻"}
                      </button>
                    </div>
                  );
                })}
                {filteredImageRecipes.length === 0 && (
                  <div style={{ textAlign: "center", padding: "18px 0", color: C.muted, fontFamily: FB, fontSize: 13 }}>
                    Keine Rezepte passend zur Suche gefunden.
                  </div>
                )}
              </div>
            </>
          );
        })()}
      </div>
      )}

      {/* Rezept-Zuordnung */}

      {imageModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Bildvorschau: ${imageModal.name}`}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setImageModal(null);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100000,
            background: "rgba(0,0,0,.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}>
          <div
            onMouseDown={e => e.stopPropagation()}
            style={{
              width: "min(960px, 96vw)",
              maxHeight: "94vh",
              background: C.surface,
              borderRadius: 14,
              border: `1px solid ${C.border}`,
              boxShadow: "0 18px 50px rgba(0,0,0,.35)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: C.text, fontFamily: FB, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {imageModal.name}
              </div>
              <button
                type="button"
                onClick={() => setImageModal(null)}
                style={{
                  border: `1px solid ${C.border}`,
                  background: C.surface2,
                  color: C.sub,
                  borderRadius: 8,
                  padding: "6px 10px",
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: FB,
                  cursor: "pointer",
                }}>
                Schließen
              </button>
            </div>
            <div style={{ padding: 12, overflow: "auto" }}>
              <img
                src={imageModal.url}
                alt={`Grossansicht: ${imageModal.name}`}
                style={{
                  width: "100%",
                  maxHeight: "calc(92vh - 120px)",
                  objectFit: "contain",
                  borderRadius: 10,
                  border: `1px solid ${C.border}`,
                  background: C.surface2,
                }}
              />
              <div style={{ marginTop: 8, fontSize: 11, color: C.muted, fontFamily: FB }}>
                Tipp: Mit Esc oder Klick außerhalb schließen.
              </div>
            </div>
          </div>
        </div>
      )}
      {activeSubtab === "rezepte" && (
      <div style={card}>
        <div style={{ ...sectionLabel, color: C.adminText }}>Rezept-Zuordnung</div>
        <p style={{ fontSize: 12, color: C.sub, marginBottom: 14, lineHeight: 1.6, fontFamily: FB }}>
          Weise Rezepten eine oder mehrere aktive Kategorien zu oder korrigiere bestehende Zuordnungen.
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            className="app-input"
            style={{ ...inputStyle, flex: 1 }}
            placeholder="Rezept oder Kategorie suchen..."
            value={recipeCategoryQuery}
            onChange={e => onRecipeCategoryQueryChange(e.target.value)}
          />
          <button
            onClick={onReloadRecipeCategories}
            disabled={recipeCategoriesLoading}
            style={{ padding: "10px 14px", borderRadius: 9, border: `1px solid ${C.border}`, background: C.surface2, color: C.sub, fontSize: 12, fontWeight: 700, fontFamily: FB, cursor: "pointer", minHeight: 44, opacity: recipeCategoriesLoading ? .6 : 1 }}>
            {recipeCategoriesLoading ? "..." : "Katalog laden"}
          </button>
        </div>

        {recipeCategoriesError && (
          <div style={{ marginBottom: 10, padding: "8px 14px", borderRadius: 9, background: "#FEE2E2", color: "#991B1B", fontSize: 13, fontWeight: 600, fontFamily: FB }}>
            ✗ {recipeCategoriesError}
          </div>
        )}

        {recipeCategoryMsg && (
          <div style={{ marginBottom: 10, padding: "8px 14px", borderRadius: 9, background: recipeCategoryMsg.type === "ok" ? C.greenPale : "#FEE2E2", color: recipeCategoryMsg.type === "ok" ? C.green2 : "#991B1B", fontSize: 13, fontWeight: 600, fontFamily: FB }}>
            {recipeCategoryMsg.type === "ok" ? "✓ " : "✗ "}{recipeCategoryMsg.text}
          </div>
        )}

        {recipeTextMsg && (
          <div style={{ marginBottom: 10, padding: "8px 14px", borderRadius: 9, background: recipeTextMsg.type === "ok" ? C.greenPale : "#FEE2E2", color: recipeTextMsg.type === "ok" ? C.green2 : "#991B1B", fontSize: 13, fontWeight: 600, fontFamily: FB }}>
            {recipeTextMsg.type === "ok" ? "✓ " : "✗ "}{recipeTextMsg.text}
          </div>
        )}

        {recipeWorkflowMsg && (
          <div style={{ marginBottom: 10, padding: "8px 14px", borderRadius: 9, background: recipeWorkflowMsg.type === "ok" ? C.greenPale : "#FEE2E2", color: recipeWorkflowMsg.type === "ok" ? C.green2 : "#991B1B", fontSize: 13, fontWeight: 600, fontFamily: FB }}>
            {recipeWorkflowMsg.type === "ok" ? "✓ " : "✗ "}{recipeWorkflowMsg.text}
          </div>
        )}

        {activeRecipeCategoriesCatalog.length === 0 ? (
          <div style={{ color: C.muted, fontFamily: FB, fontSize: 13, padding: "8px 2px" }}>
            Keine aktiven Kategorien vorhanden. Pflege den Katalog im Tab Kategorien.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filteredRecipes.map(recipe => {
              const draft = getDraftForRecipe(recipe);
              const dirty = JSON.stringify([...draft].sort()) !== JSON.stringify([...(recipe.kategorien || [])].sort());
              const saving = !!recipeCategorySaving?.[recipe.id];
              const textDraft = getTextDraftForRecipe(recipe);
              const textDirty = String(textDraft.titleText || "") !== String(recipe.name || "")
                || (textDraft.shortDescriptionHtml || "") !== (recipe.shortDescriptionHtml || "")
                || (textDraft.instructionsHtml || "") !== (recipe.instructionsHtml || "")
                || (textDraft.ingredientsText || "") !== ((Array.isArray(recipe.zutaten) ? recipe.zutaten.join("\n") : ""));
              const textSaving = !!recipeTextSaving?.[recipe.id];
              const textEditorOpen = openRecipeTextEditorId === recipe.id;
              const historyOpen = openRecipeHistoryId === recipe.id;
              const statusMeta = recipeStatusById?.[recipe.id] || {};
              const recipeStatus = statusMeta.status || "published";
              const isPublished = recipeStatus === "published";
              const publishSaving = !!recipePublishSaving?.[recipe.id];
              const historyLoading = !!recipeHistoryLoading?.[recipe.id];
              const historyEntries = recipeHistoryById?.[recipe.id] || [];

              return (
                <div key={recipe.id} style={{ padding: "10px 12px", background: C.surface2, borderRadius: 10, border: `1px solid ${dirty ? C.premBorder : C.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 220px", minWidth: 180, fontSize: 13, fontWeight: 700, color: C.text, fontFamily: FB }}>
                      {recipe.name}
                    </div>
                    <span style={{ padding: "4px 10px", borderRadius: 999, border: `1px solid ${isPublished ? C.green : C.premBorder}`, background: isPublished ? C.greenPale : "#FFFBF0", color: isPublished ? C.green2 : "#92400E", fontSize: 11, fontWeight: 700, fontFamily: FB }}>
                      {isPublished ? "Status: Veröffentlicht" : "Status: Entwurf"}
                    </span>
                    <button
                      onClick={() => setOpenRecipeTextEditorId(prev => prev === recipe.id ? null : recipe.id)}
                      style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${textEditorOpen ? C.green : C.border}`, background: textEditorOpen ? C.greenPale : C.surface, color: textEditorOpen ? C.green2 : C.sub, fontSize: 12, fontWeight: 700, fontFamily: FB, cursor: "pointer" }}>
                      {textEditorOpen ? "Texteditor schließen" : "Texte bearbeiten"}
                    </button>
                    <button
                      onClick={async () => {
                        const next = historyOpen ? null : recipe.id;
                        setOpenRecipeHistoryId(next);
                        if (next) await onLoadRecipeHistory(recipe.id);
                      }}
                      style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${historyOpen ? C.green : C.border}`, background: historyOpen ? C.greenPale : C.surface, color: historyOpen ? C.green2 : C.sub, fontSize: 12, fontWeight: 700, fontFamily: FB, cursor: "pointer" }}>
                      {historyOpen ? "Historie schließen" : "Historie"}
                    </button>
                    <button
                      onClick={() => onPublishRecipe(recipe.id, isPublished ? "draft" : "published")}
                      disabled={publishSaving}
                      style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: isPublished ? "#F59E0B" : C.green, color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: FB, cursor: "pointer", opacity: publishSaving ? .6 : 1 }}>
                      {publishSaving ? "..." : (isPublished ? "Als Entwurf" : "Veröffentlichen")}
                    </button>
                    <button
                      onClick={() => saveRecipeCategories(recipe)}
                      disabled={!dirty || saving}
                      style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: dirty ? C.green : C.surface, color: dirty ? "#fff" : C.muted, fontSize: 12, fontWeight: 700, fontFamily: FB, cursor: dirty ? "pointer" : "default", opacity: saving ? .6 : 1 }}>
                      {saving ? "..." : "Speichern"}
                    </button>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {activeRecipeCategoriesCatalog.map(cat => {
                      const selected = draft.includes(cat.slug);
                      return (
                        <button
                          key={`${recipe.id}-${cat.slug}`}
                          onClick={() => toggleDraftCategory(recipe, cat.slug)}
                          style={{ padding: "5px 10px", borderRadius: 999, border: `1px solid ${selected ? C.green : C.border}`, background: selected ? C.greenPale : C.surface, color: selected ? C.green2 : C.sub, fontSize: 11, fontWeight: 700, fontFamily: FB, cursor: "pointer" }}>
                          {selected ? "● " : "○ "}{cat.label}
                        </button>
                      );
                    })}
                  </div>

                  {textEditorOpen && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, marginBottom: 6, fontFamily: FB }}>
                        Titel
                      </div>
                      <input
                        className="app-input"
                        value={textDraft.titleText}
                        onChange={(e) => setTextDraftField(recipe, "titleText", e.target.value)}
                        style={{ ...inputStyle, width: "100%", marginBottom: 12 }}
                      />

                      <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, marginBottom: 6, fontFamily: FB }}>
                        Kurzbeschreibung (HTML)
                      </div>
                      <Editor
                        tinymceScriptSrc="https://cdn.jsdelivr.net/npm/tinymce@8/tinymce.min.js"
                        value={textDraft.shortDescriptionHtml}
                        onEditorChange={(value) => setTextDraftField(recipe, "shortDescriptionHtml", value)}
                        init={{
                          license_key: "gpl",
                          menubar: false,
                          statusbar: false,
                          height: 180,
                          plugins: ["advlist", "autolink", "lists", "link", "charmap", "searchreplace", "visualblocks", "code", "fullscreen", "wordcount"],
                          toolbar: "undo redo | bold italic underline | bullist numlist | link | removeformat | code",
                          block_formats: "Absatz=p; Zwischenueberschrift=h3",
                          content_style: "body { font-family: Raleway, sans-serif; font-size: 14px; line-height: 1.6; }",
                        }}
                      />

                      <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, marginTop: 12, marginBottom: 6, fontFamily: FB }}>
                        Zutaten (eine Zeile pro Zutat)
                      </div>
                      <textarea
                        className="app-input"
                        rows={8}
                        value={textDraft.ingredientsText}
                        onChange={(e) => setTextDraftField(recipe, "ingredientsText", e.target.value)}
                        style={{ ...inputStyle, width: "100%", minHeight: 150, resize: "vertical", fontSize: 13, lineHeight: 1.5 }}
                      />

                      <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, marginTop: 12, marginBottom: 6, fontFamily: FB }}>
                        Zubereitung (HTML)
                      </div>
                      <Editor
                        tinymceScriptSrc="https://cdn.jsdelivr.net/npm/tinymce@8/tinymce.min.js"
                        value={textDraft.instructionsHtml}
                        onEditorChange={(value) => setTextDraftField(recipe, "instructionsHtml", value)}
                        init={{
                          license_key: "gpl",
                          menubar: false,
                          statusbar: false,
                          height: 260,
                          plugins: ["advlist", "autolink", "lists", "link", "charmap", "searchreplace", "visualblocks", "code", "fullscreen", "wordcount"],
                          toolbar: "undo redo | blocks | bold italic underline | bullist numlist | link | removeformat | code",
                          block_formats: "Absatz=p; Schritt=h3; Hinweis=blockquote",
                          content_style: "body { font-family: Raleway, sans-serif; font-size: 14px; line-height: 1.7; }",
                        }}
                      />

                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                        <button
                          onClick={() => saveRecipeTexts(recipe)}
                          disabled={!textDirty || textSaving}
                          style={{ padding: "8px 14px", borderRadius: 9, border: "none", background: textDirty ? C.green : C.surface, color: textDirty ? "#fff" : C.muted, fontSize: 12, fontWeight: 700, fontFamily: FB, cursor: textDirty ? "pointer" : "default", opacity: textSaving ? .6 : 1 }}>
                          {textSaving ? "..." : "Texte speichern"}
                        </button>
                      </div>
                    </div>
                  )}

                  {historyOpen && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px dashed ${C.border}` }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, marginBottom: 8, fontFamily: FB }}>
                        Änderungshistorie
                      </div>

                      <div style={{ fontSize: 11, color: C.muted, fontFamily: FB, marginBottom: 8 }}>
                        Zuletzt bearbeitet: {formatDateTime(statusMeta.editedAt)} · Zuletzt veröffentlicht: {formatDateTime(statusMeta.publishedAt)}
                      </div>

                      {historyLoading ? (
                        <div style={{ fontSize: 12, color: C.muted, fontFamily: FB }}>Lade Historie...</div>
                      ) : historyEntries.length === 0 ? (
                        <div style={{ fontSize: 12, color: C.muted, fontFamily: FB }}>Noch keine Historie vorhanden.</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {historyEntries.map(entry => (
                            <div key={entry.id} style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: C.text, fontFamily: FB }}>
                                {entry.action} · {formatDateTime(entry.changed_at)}
                              </div>
                              <div style={{ fontSize: 11, color: C.muted, fontFamily: FB }}>
                                von {entry.changed_by || "unbekannt"}
                              </div>
                              {entry.change_summary && (
                                <div style={{ fontSize: 11, color: C.sub, fontFamily: FB, marginTop: 4 }}>
                                  {entry.change_summary}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* Kategorien-Katalog */}
      {activeSubtab === "kategorien" && (
      <div style={card}>
        <div style={{ ...sectionLabel, color: C.adminText }}>Kategorien-Katalog</div>
        <p style={{ fontSize: 12, color: C.sub, marginBottom: 14, lineHeight: 1.6, fontFamily: FB }}>
          Verwalte Stammdaten der Rezept-Kategorien: Label, Sortierung und Aktivstatus.
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button
            onClick={onReloadRecipeCategories}
            disabled={recipeCategoriesLoading}
            style={{ padding: "10px 14px", borderRadius: 9, border: `1px solid ${C.border}`, background: C.surface2, color: C.sub, fontSize: 12, fontWeight: 700, fontFamily: FB, cursor: "pointer", minHeight: 44, opacity: recipeCategoriesLoading ? .6 : 1 }}>
            {recipeCategoriesLoading ? "..." : "Katalog laden"}
          </button>
        </div>

        {recipeCategoriesError && (
          <div style={{ marginBottom: 10, padding: "8px 14px", borderRadius: 9, background: "#FEE2E2", color: "#991B1B", fontSize: 13, fontWeight: 600, fontFamily: FB }}>
            ✗ {recipeCategoriesError}
          </div>
        )}

        {categoryMsg && (
          <div style={{ marginBottom: 10, padding: "8px 14px", borderRadius: 9, background: categoryMsg.type === "ok" ? C.greenPale : "#FEE2E2", color: categoryMsg.type === "ok" ? C.green2 : "#991B1B", fontSize: 13, fontWeight: 600, fontFamily: FB }}>
            {categoryMsg.type === "ok" ? "✓ " : "✗ "}{categoryMsg.text}
          </div>
        )}

        <div style={{ padding: "10px 12px", background: C.surface2, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, fontFamily: FB, marginBottom: 8 }}>Neue Kategorie</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
            <div style={{ flex: "1 1 120px", minWidth: 100 }}>
              <div style={{ fontSize: 10, color: C.muted, fontFamily: FB, marginBottom: 3 }}>Slug</div>
              <input
                className="app-input"
                style={{ ...inputStyle, padding: "7px 10px", fontSize: 12 }}
                placeholder="z.B. low-carb"
                value={newCategory.slug}
                onChange={e => setNewCategory(prev => ({ ...prev, slug: e.target.value }))}
              />
            </div>
            <div style={{ flex: "2 1 200px", minWidth: 180 }}>
              <div style={{ fontSize: 10, color: C.muted, fontFamily: FB, marginBottom: 3 }}>Label</div>
              <input
                className="app-input"
                style={{ ...inputStyle, padding: "7px 10px", fontSize: 12 }}
                placeholder="z.B. Low Carb"
                value={newCategory.label}
                onChange={e => setNewCategory(prev => ({ ...prev, label: e.target.value }))}
              />
            </div>
            <div style={{ width: 92 }}>
              <div style={{ fontSize: 10, color: C.muted, fontFamily: FB, marginBottom: 3 }}>Sort.</div>
              <input
                type="number"
                className="app-input"
                style={{ ...inputStyle, padding: "7px 10px", fontSize: 12 }}
                value={newCategory.sort_order}
                onChange={e => setNewCategory(prev => ({ ...prev, sort_order: e.target.value }))}
              />
            </div>
            <button
              type="button"
              onClick={() => setNewCategory(prev => ({ ...prev, is_active: !prev.is_active }))}
              style={{ padding: "7px 10px", borderRadius: 9, border: `1px solid ${newCategory.is_active ? C.green : C.border}`, background: newCategory.is_active ? C.greenPale : C.surface, color: newCategory.is_active ? C.green2 : C.sub, fontSize: 12, fontWeight: 700, fontFamily: FB, cursor: "pointer", minHeight: 36 }}>
              {newCategory.is_active ? "● Aktiv" : "○ Inaktiv"}
            </button>
            <button
              type="button"
              onClick={createCategory}
              disabled={categoryCreateSaving}
              style={{ padding: "8px 14px", borderRadius: 9, border: "none", background: C.green, color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: FB, cursor: "pointer", minHeight: 36, opacity: categoryCreateSaving ? .6 : 1 }}>
              {categoryCreateSaving ? "..." : "Anlegen"}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {recipeCategoriesCatalog.map(category => {
            const draft = getDraftForCategory(category);
            const dirty = draft.label !== (category.label || "")
              || Number(draft.sort_order) !== Number(category.sort_order ?? 0)
              || !!draft.is_active !== (category.is_active !== false);
            const saving = !!categorySaving?.[category.slug];

            return (
              <div key={category.slug} style={{ padding: "10px 12px", background: C.surface2, borderRadius: 10, border: `1px solid ${dirty ? C.premBorder : C.border}` }}>
                <div style={{ display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap" }}>
                  <div style={{ width: 150 }}>
                    <div style={{ fontSize: 10, color: C.muted, fontFamily: FB, marginBottom: 3 }}>Slug</div>
                    <div style={{ fontSize: 12, color: C.sub, fontFamily: FB, fontWeight: 700 }}>{category.slug}</div>
                  </div>
                  <div style={{ flex: "2 1 200px", minWidth: 180 }}>
                    <div style={{ fontSize: 10, color: C.muted, fontFamily: FB, marginBottom: 3 }}>Label</div>
                    <input
                      className="app-input"
                      style={{ ...inputStyle, padding: "7px 10px", fontSize: 12 }}
                      value={draft.label}
                      onChange={e => setCategoryDraftField(category.slug, "label", e.target.value)}
                    />
                  </div>
                  <div style={{ width: 92 }}>
                    <div style={{ fontSize: 10, color: C.muted, fontFamily: FB, marginBottom: 3 }}>Sort.</div>
                    <input
                      type="number"
                      className="app-input"
                      style={{ ...inputStyle, padding: "7px 10px", fontSize: 12 }}
                      value={draft.sort_order}
                      onChange={e => setCategoryDraftField(category.slug, "sort_order", e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setCategoryDraftField(category.slug, "is_active", !draft.is_active)}
                    style={{ padding: "7px 10px", borderRadius: 9, border: `1px solid ${draft.is_active ? C.green : C.border}`, background: draft.is_active ? C.greenPale : C.surface, color: draft.is_active ? C.green2 : C.sub, fontSize: 12, fontWeight: 700, fontFamily: FB, cursor: "pointer", minHeight: 36 }}>
                    {draft.is_active ? "● Aktiv" : "○ Inaktiv"}
                  </button>
                  <button
                    type="button"
                    onClick={() => saveCategory(category)}
                    disabled={!dirty || saving}
                    style={{ padding: "8px 14px", borderRadius: 9, border: "none", background: dirty ? C.green : C.surface, color: dirty ? "#fff" : C.muted, fontSize: 12, fontWeight: 700, fontFamily: FB, cursor: dirty ? "pointer" : "default", minHeight: 36, opacity: saving ? .6 : 1 }}>
                    {saving ? "..." : "Speichern"}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteCategory(category)}
                    disabled={saving}
                    style={{ padding: "8px 14px", borderRadius: 9, border: `1px solid ${C.border}`, background: C.surface, color: "#991B1B", fontSize: 12, fontWeight: 700, fontFamily: FB, cursor: "pointer", minHeight: 36, opacity: saving ? .6 : 1 }}>
                    Loeschen
                  </button>
                </div>
              </div>
            );
          })}

          {recipeCategoriesCatalog.length === 0 && !recipeCategoriesLoading && (
            <div style={{ color: C.muted, fontFamily: FB, fontSize: 13, padding: "8px 2px" }}>
              Keine Kategorien vorhanden.
            </div>
          )}
        </div>
      </div>
      )}

      {/* Lebensmitteldatenbank */}
      {activeSubtab === "foods" && (
      <AdminFoods />
      )}

      {/* Admin Bootstrap */}
      {activeSubtab === "bootstrap" && (
      <div style={{ ...card, borderColor: C.adminBorder, background: C.adminBg }}>
        <div style={{ ...sectionLabel, color: C.adminText }}>Admin einrichten</div>
        <p style={{ fontSize: 13, color: C.sub, marginBottom: 14, fontFamily: FB, lineHeight: 1.6 }}>
          Klicke hier um dich als Admin einzurichten (funktioniert nur wenn deine E-Mail in der ADMIN_EMAILS Umgebungsvariable steht).
        </p>
        <button onClick={onBootstrap} className="btn-primary"
          style={{ ...primaryBtn(false), marginTop: 0, background: C.adminText }}>
          Als Admin einrichten
        </button>
        {bootstrapMsg && (
          <div style={{ marginTop: 10, fontSize: 13, color: C.sub, fontFamily: FB }}>{bootstrapMsg}</div>
        )}
      </div>
      )}

    </div>
  );
}
