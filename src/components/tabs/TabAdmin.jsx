import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Editor } from "@tinymce/tinymce-react";
import RoleBadge from "../RoleBadge";
import AdminFoods from "../AdminFoods";
import Card from "../ui/Card";
import Button from "../ui/Button";
import { FLAG_DEFS } from "../../lib/featureFlags";
import { ROLE_LABELS, ROLE_OPTIONS } from "../../lib/roles";
import styles from "./TabAdmin.module.css";

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

function MsgBanner({ msg, className = "" }) {
  if (!msg) return null;
  return (
    <div className={`${styles.msgBanner} ${msg.type === "ok" ? styles.ok : styles.err}${className ? " " + className : ""}`}>
      {msg.type === "ok" ? "✓ " : "✗ "}{msg.text}
    </div>
  );
}

export default function TabAdmin({
  flags, flagsLoading, flagsError, onReloadFlags,
  flagDraft, onFlagDraftChange, flagSaving, flagMsg, onSaveFlag,
  userQuery, onUserQueryChange, users, userLoading, onSearchUsers,
  roleSaving, roleSelected, onRoleSelected, onApplyRole,
  bootstrapMsg, onBootstrap,
  bootstrapSettings, onBootstrapSettingsChange, bootstrapSettingsSaving, bootstrapSettingsMsg, onSaveBootstrapSettings,
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
  const [recipeStatusFilter, setRecipeStatusFilter] = useState("all");

  const formatDateTime = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const filteredRecipes = useMemo(() => {
    const needle = recipeCategoryQuery.trim().toLowerCase();
    return recipes.filter(r => {
      const status = recipeStatusById?.[r.id]?.status ?? "published";
      if (recipeStatusFilter === "published" && status !== "published") return false;
      if (recipeStatusFilter === "draft" && status !== "draft") return false;
      if (!needle) return true;
      return r.name?.toLowerCase().includes(needle) ||
        (r.kategorienLabels || []).some(cat => cat.toLowerCase().includes(needle));
    });
  }, [recipes, recipeCategoryQuery, recipeStatusFilter, recipeStatusById]);

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

  const hasUnsavedRecipeDrafts = useMemo(() => Object.keys(recipeCategoryDraft).length > 0, [recipeCategoryDraft]);
  const hasUnsavedRecipeTextDrafts = useMemo(() => Object.keys(recipeTextDraft).length > 0, [recipeTextDraft]);

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
    const handleKeyDown = (event) => { if (event.key === "Escape") setImageModal(null); };
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
      setRecipeCategoryDraft(prev => { const next = { ...prev }; delete next[recipe.id]; return next; });
    }
  };

  const setTextDraftField = (recipe, field, value) => {
    const base = getTextDraftForRecipe(recipe);
    setRecipeTextDraft(prev => ({ ...prev, [recipe.id]: { ...base, [field]: value } }));
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
      setRecipeTextDraft(prev => { const next = { ...prev }; delete next[recipe.id]; return next; });
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
    setCategoryDraft(prev => ({ ...prev, [slug]: { ...base, [field]: value } }));
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
      setCategoryDraft(prev => { const next = { ...prev }; delete next[category.slug]; return next; });
    }
  };

  const createCategory = async () => {
    const ok = await onCreateCategory({
      slug: newCategory.slug,
      label: newCategory.label,
      sort_order: Number.isFinite(Number(newCategory.sort_order)) ? Number(newCategory.sort_order) : 0,
      is_active: !!newCategory.is_active,
    });
    if (ok) setNewCategory({ slug: "", label: "", sort_order: 0, is_active: true });
  };

  const deleteCategory = async (category) => {
    const ok = window.confirm(`Kategorie ${category.label} wirklich loeschen?`);
    if (!ok) return;
    const deleted = await onDeleteCategory(category.slug);
    if (deleted) {
      setCategoryDraft(prev => { const next = { ...prev }; delete next[category.slug]; return next; });
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

      <Card className={styles.adminHeader}>
        <div className={styles.adminTitle}>Admin-Bereich</div>
        <div className={styles.adminSubtitle}>Zugriffssteuerung und Benutzerverwaltung</div>
      </Card>

      <Card className={styles.subtabNav}>
        <div role="tablist" aria-label="Admin Unterbereiche" className={styles.subtabList}>
          {ADMIN_SUBTABS.map(tab => {
            const active = activeSubtab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => changeSubtab(tab.id)}
                className={`${styles.subtabBtn}${active ? ` ${styles.active}` : ''}`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        {hasAdminDirtyChanges && (
          <div className={styles.dirtyWarning}>
            Ungespeicherte Änderungen in Rezept-Zuordnungen, Rezepttexten oder Kategorien. Beim Wechseln wird vorher gewarnt.
          </div>
        )}
      </Card>

      {/* Feature Flags */}
      {activeSubtab === "zugriff" && (
        <Card>
          <div className={styles.adminSectionLabel}>Zugriffssteuerung – Feature Flags</div>
          <p className={styles.prose}>
            Lege fest, welche Rolle für jeden Tab/jede Funktion mindestens erforderlich ist.
            Als Admin siehst du immer alles, unabhängig von diesen Einstellungen.
          </p>

          {flagsLoading ? (
            <div className={styles.flagLoading}>Lade Flags…</div>
          ) : flagsError ? (
            <div className={styles.flagError}>
              <div className={styles.flagErrorTitle}>Feature Flags konnten nicht geladen werden.</div>
              <button onClick={onReloadFlags} className={styles.flagReloadBtn}>Erneut laden</button>
            </div>
          ) : flags ? (
            <div className={styles.flagsList}>
              {FLAG_DEFS.map(def => {
                const current = flags[def.id] || {};
                const draft = flagDraft[def.id] || {};
                const reqRole = draft.required_role ?? current.required_role ?? "guest";
                const enabled  = draft.enabled      ?? current.enabled      ?? true;
                const isDirty = draft.required_role !== undefined || draft.enabled !== undefined;

                return (
                  <div key={def.id} className={`${styles.flagItem}${isDirty ? ` ${styles.dirty}` : ''}`}>
                    <div className={styles.flagItemInfo}>
                      <div className={styles.flagLabel}>{def.label}</div>
                      <div className={styles.flagDesc}>{def.desc}</div>
                    </div>

                    <div className={styles.flagMeta}>
                      <label className={styles.metaLabel}>Mindestrolle</label>
                      <select
                        className={`app-select app-input ${styles.metaSelect}`}
                        value={reqRole}
                        onChange={e => onFlagDraftChange(p => ({ ...p, [def.id]: { ...p[def.id], required_role: e.target.value } }))}
                      >
                        <option value="guest">Gast (alle)</option>
                        <option value="user">Registriert</option>
                        <option value="premium">Premium</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div className={styles.flagMeta}>
                      <label className={styles.metaLabel}>Status</label>
                      <button
                        onClick={() => onFlagDraftChange(p => ({ ...p, [def.id]: { ...p[def.id], enabled: !(draft.enabled ?? current.enabled ?? true) } }))}
                        className={`${styles.toggleBtn}${enabled ? ` ${styles.on}` : ''}`}
                      >
                        {enabled ? "● Aktiv" : "○ Deaktiviert"}
                      </button>
                    </div>

                    <button
                      onClick={() => onSaveFlag(def.id)}
                      disabled={!isDirty || flagSaving}
                      className={`${styles.saveBtn}${isDirty ? ` ${styles.dirty}` : ''}`}
                    >
                      {flagSaving ? "…" : "Speichern"}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}

          {flagMsg && <MsgBanner msg={flagMsg} className={styles.mt12} />}
        </Card>
      )}

      {/* Benutzerverwaltung */}
      {activeSubtab === "users" && (
        <Card>
          <div className={styles.adminSectionLabel}>Benutzerverwaltung</div>
          <p className={styles.proseSm}>
            Suche nach Benutzern und weise ihnen eine Rolle zu.
            Mögliche Rollen: <b>Registriert</b> · <b>Premium</b> · <b>Admin</b>
          </p>
          <div className={`${styles.searchRow} ${styles.searchRowMb12} ${styles.mb16}`}>
            <input
              className={`app-input ${styles.flexInput}`}
              placeholder="E-Mail oder Name suchen…"
              value={userQuery}
              onChange={e => onUserQueryChange(e.target.value)}
              onKeyDown={e => e.key === "Enter" && onSearchUsers()}
            />
            <button onClick={onSearchUsers} disabled={userLoading} className={styles.searchBtn}>
              {userLoading ? "…" : "Suchen"}
            </button>
          </div>

          {users.length > 0 && (
            <div className={styles.userList}>
              {users.map(u => (
                <div key={u.id} className={styles.userItem}>
                  <div className={styles.userInfo}>
                    <div className={styles.userEmail}>{u.email}</div>
                    <div className={styles.userMeta}>{u.firstName} {u.lastName} · ID: {u.id.slice(0, 12)}…</div>
                  </div>
                  <RoleBadge role={u.role} />
                  <select
                    className={`app-select app-input ${styles.metaSelect}`}
                    value={roleSelected[u.id] || u.role}
                    onChange={e => onRoleSelected(p => ({ ...p, [u.id]: e.target.value }))}
                  >
                    {ROLE_OPTIONS.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                  <button
                    onClick={() => onApplyRole(u.id)}
                    disabled={roleSaving[u.id]}
                    className={styles.actionBtn}
                  >
                    {roleSaving[u.id] ? "…" : "Speichern"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {users.length === 0 && userQuery && !userLoading && (
            <div className={styles.userEmpty}>Keine Benutzer gefunden.</div>
          )}
        </Card>
      )}

      {/* Rezeptbilder */}
      {activeSubtab === "bilder" && (
        <Card>
          <div className={styles.adminSectionLabel}>Rezeptbilder (KI-Generierung)</div>
          <div className={styles.searchRow}>
            <input
              className={`app-input ${styles.flexInput}`}
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
                <div className={styles.imageStats}>
                  <div className={`${styles.imageStat} ${styles.ready}`}>
                    <div className={styles.imageStatNum}>{ready}</div>
                    <div className={styles.imageStatLabel}>von {total} fertig</div>
                  </div>
                  {failed > 0 && (
                    <div className={`${styles.imageStat} ${styles.failed}`}>
                      <div className={styles.imageStatNum}>{failed}</div>
                      <div className={styles.imageStatLabel}>fehlgeschlagen</div>
                    </div>
                  )}
                  {(pending + failed) > 0 && (
                    <div className={`${styles.imageStat} ${styles.pending}`}>
                      <div className={styles.imageStatNum}>{pending + failed}</div>
                      <div className={styles.imageStatLabel}>ausstehend</div>
                    </div>
                  )}
                </div>

                {ready < total && (
                  <Button onClick={onGenerateAllImages} disabled={imageGenLoading} className={styles.mb16} style={{ opacity: imageGenLoading ? .7 : 1 }}>
                    {imageGenLoading ? "⏳ Generiere…" : `🌿 Alle fehlenden Bilder generieren (${total - ready})`}
                  </Button>
                )}

                {imageGenMsg && <MsgBanner msg={imageGenMsg} className={styles.mb12} />}

                <div className={styles.imageList}>
                  {filteredImageRecipes.map(r => {
                    const st = IMAGE_STATUS_LABEL[r.image_status] || IMAGE_STATUS_LABEL.pending;
                    const isLoading = imageGenPerRecipe?.[r.id];
                    return (
                      <div key={r.id} className={styles.imageItem}>
                        {r.image_url ? (
                          <button
                            type="button"
                            title={`Bild vergroessern: ${r.name}`}
                            onClick={() => setImageModal({ url: r.image_url, name: r.name })}
                            className={styles.imageThumbBtn}
                          >
                            <img src={r.image_url} alt={`Vorschaubild: ${r.name}`} className={styles.imageThumb} />
                          </button>
                        ) : (
                          <div className={styles.imagePlaceholder}>🍽️</div>
                        )}
                        <div className={styles.imageItemInfo}>
                          <div className={styles.imageItemName}>{r.name}</div>
                          {/* color is data-driven from IMAGE_STATUS_LABEL → stays inline */}
                          <div className={styles.imageStatusText} style={{ color: st.color }}>{st.icon} {st.label}</div>
                        </div>
                        <button
                          onClick={() => onGenerateImage(r.id)}
                          disabled={isLoading || imageGenLoading}
                          title="Bild (neu) generieren"
                          className={styles.imageRegenBtn}
                        >
                          {isLoading ? "⏳" : "↻"}
                        </button>
                      </div>
                    );
                  })}
                  {filteredImageRecipes.length === 0 && (
                    <div className={styles.imageEmpty}>Keine Rezepte passend zur Suche gefunden.</div>
                  )}
                </div>
              </>
            );
          })()}
        </Card>
      )}

      {/* Image modal */}
      {imageModal && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Bildvorschau: ${imageModal.name}`}
          onPointerDown={(e) => { if (e.target === e.currentTarget) setImageModal(null); }}
          className={styles.imageModalBackdrop}
        >
          <div onPointerDown={e => e.stopPropagation()} className={styles.imageModalBox}>
            <div className={styles.imageModalHeader}>
              <div className={styles.imageModalTitle}>{imageModal.name}</div>
              <button type="button" onClick={() => setImageModal(null)} className={styles.imageModalCloseBtn}>
                Schließen
              </button>
            </div>
            <div className={styles.imageModalBody}>
              <img src={imageModal.url} alt={`Grossansicht: ${imageModal.name}`} className={styles.imageModalImg} />
              <div className={styles.imageModalTip}>Tipp: Mit Esc oder Klick außerhalb schließen.</div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Rezept-Zuordnung */}
      {activeSubtab === "rezepte" && (
        <Card>
          <div className={styles.adminSectionLabel}>Rezept-Zuordnung</div>
          <p className={styles.proseSm}>
            Weise Rezepten eine oder mehrere aktive Kategorien zu oder korrigiere bestehende Zuordnungen.
          </p>

          <div className={styles.filterChips}>
            {[
              { id: "all",       label: "Alle" },
              { id: "published", label: "✅ Veröffentlicht" },
              { id: "draft",     label: "📝 Entwurf" },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setRecipeStatusFilter(f.id)}
                className={`${styles.chip}${recipeStatusFilter === f.id ? ` ${styles.chipActive}` : ""}`}
              >
                {f.label}
              </button>
            ))}
            <span className={styles.filterCount}>{filteredRecipes.length} Rezepte</span>
          </div>

          <div className={`${styles.searchRow} ${styles.searchRowMb12}`}>
            <input
              className={`app-input ${styles.flexInput}`}
              placeholder="Rezept oder Kategorie suchen..."
              value={recipeCategoryQuery}
              onChange={e => onRecipeCategoryQueryChange(e.target.value)}
            />
            <button
              onClick={onReloadRecipeCategories}
              disabled={recipeCategoriesLoading}
              className={styles.secondaryBtn}
            >
              {recipeCategoriesLoading ? "..." : "Katalog laden"}
            </button>
          </div>

          {recipeCategoriesError && (
            <div className={`${styles.msgBanner} ${styles.err} ${styles.mb10}`}>
              ✗ {recipeCategoriesError}
            </div>
          )}

          <MsgBanner msg={recipeCategoryMsg} className={styles.mb10} />
          <MsgBanner msg={recipeTextMsg} className={styles.mb10} />
          <MsgBanner msg={recipeWorkflowMsg} className={styles.mb10} />

          {activeRecipeCategoriesCatalog.length === 0 ? (
            <div className={styles.noCatMsg}>
              Keine aktiven Kategorien vorhanden. Pflege den Katalog im Tab Kategorien.
            </div>
          ) : (
            <div className={styles.recipeList}>
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
                  <div key={recipe.id} className={`${styles.recipeItem}${dirty ? ` ${styles.dirty}` : ''}`}>
                    <div className={styles.recipeItemHeader}>
                      <div className={styles.recipeName}>{recipe.name}</div>
                      <span className={`${styles.recipeStatusBadge} ${isPublished ? styles.published : styles.draft}`}>
                        {isPublished ? "Status: Veröffentlicht" : "Status: Entwurf"}
                      </span>
                      <button
                        onClick={() => setOpenRecipeTextEditorId(prev => prev === recipe.id ? null : recipe.id)}
                        className={`${styles.recipeToggleBtn}${textEditorOpen ? ` ${styles.active}` : ''}`}
                      >
                        {textEditorOpen ? "Texteditor schließen" : "Texte bearbeiten"}
                      </button>
                      <button
                        onClick={async () => {
                          const next = historyOpen ? null : recipe.id;
                          setOpenRecipeHistoryId(next);
                          if (next) await onLoadRecipeHistory(recipe.id);
                        }}
                        className={`${styles.recipeToggleBtn}${historyOpen ? ` ${styles.active}` : ''}`}
                      >
                        {historyOpen ? "Historie schließen" : "Historie"}
                      </button>
                      <button
                        onClick={() => onPublishRecipe(recipe.id, isPublished ? "draft" : "published")}
                        disabled={publishSaving}
                        className={`${styles.recipePublishBtn}${isPublished ? ` ${styles.published}` : ''}`}
                      >
                        {publishSaving ? "..." : (isPublished ? "Als Entwurf" : "Veröffentlichen")}
                      </button>
                      <button
                        onClick={() => saveRecipeCategories(recipe)}
                        disabled={!dirty || saving}
                        className={`${styles.saveBtn}${dirty ? ` ${styles.dirty}` : ''}`}
                      >
                        {saving ? "..." : "Speichern"}
                      </button>
                    </div>

                    <div className={styles.categoryChips}>
                      {activeRecipeCategoriesCatalog.map(cat => {
                        const selected = draft.includes(cat.slug);
                        return (
                          <button
                            key={`${recipe.id}-${cat.slug}`}
                            onClick={() => toggleDraftCategory(recipe, cat.slug)}
                            className={`${styles.categoryChip}${selected ? ` ${styles.selected}` : ''}`}
                          >
                            {selected ? "● " : "○ "}{cat.label}
                          </button>
                        );
                      })}
                    </div>

                    {textEditorOpen && (
                      <div className={styles.textEditorSection}>
                        <div className={styles.editorFieldLabel}>Titel</div>
                        <input
                          className={`app-input ${styles.textInputFull}`}
                          value={textDraft.titleText}
                          onChange={(e) => setTextDraftField(recipe, "titleText", e.target.value)}
                        />

                        <div className={styles.editorFieldLabel}>Kurzbeschreibung (HTML)</div>
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

                        <div className={`${styles.editorFieldLabel} ${styles.editorFieldLabelMt}`}>Zutaten (eine Zeile pro Zutat)</div>
                        <textarea
                          className={`app-input ${styles.textareaFull}`}
                          rows={8}
                          value={textDraft.ingredientsText}
                          onChange={(e) => setTextDraftField(recipe, "ingredientsText", e.target.value)}
                        />

                        <div className={`${styles.editorFieldLabel} ${styles.editorFieldLabelMt}`}>Zubereitung (HTML)</div>
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

                        <div className={styles.textSaveRow}>
                          <button
                            onClick={() => saveRecipeTexts(recipe)}
                            disabled={!textDirty || textSaving}
                            className={`${styles.textSaveBtn}${textDirty ? ` ${styles.dirty}` : ''}`}
                          >
                            {textSaving ? "..." : "Texte speichern"}
                          </button>
                        </div>
                      </div>
                    )}

                    {historyOpen && (
                      <div className={styles.historySection}>
                        <div className={styles.historyLabel}>Änderungshistorie</div>
                        <div className={styles.historyMeta}>
                          Zuletzt bearbeitet: {formatDateTime(statusMeta.editedAt)} · Zuletzt veröffentlicht: {formatDateTime(statusMeta.publishedAt)}
                        </div>
                        {historyLoading ? (
                          <div className={styles.historyLoading}>Lade Historie...</div>
                        ) : historyEntries.length === 0 ? (
                          <div className={styles.historyLoading}>Noch keine Historie vorhanden.</div>
                        ) : (
                          <div className={styles.historyList}>
                            {historyEntries.map(entry => (
                              <div key={entry.id} className={styles.historyEntry}>
                                <div className={styles.historyAction}>{entry.action} · {formatDateTime(entry.changed_at)}</div>
                                <div className={styles.historyBy}>von {entry.changed_by || "unbekannt"}</div>
                                {entry.change_summary && (
                                  <div className={styles.historySummary}>{entry.change_summary}</div>
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
        </Card>
      )}

      {/* Kategorien-Katalog */}
      {activeSubtab === "kategorien" && (
        <Card>
          <div className={styles.adminSectionLabel}>Kategorien-Katalog</div>
          <p className={styles.proseSm}>
            Verwalte Stammdaten der Rezept-Kategorien: Label, Sortierung und Aktivstatus.
          </p>

          <div className={`${styles.searchRow} ${styles.searchRowMb12}`}>
            <button
              onClick={onReloadRecipeCategories}
              disabled={recipeCategoriesLoading}
              className={styles.secondaryBtn}
            >
              {recipeCategoriesLoading ? "..." : "Katalog laden"}
            </button>
          </div>

          {recipeCategoriesError && (
            <div className={`${styles.msgBanner} ${styles.err} ${styles.mb10}`}>
              ✗ {recipeCategoriesError}
            </div>
          )}

          <MsgBanner msg={categoryMsg} className={styles.mb10} />

          <div className={styles.newCatPanel}>
            <div className={styles.newCatTitle}>Neue Kategorie</div>
            <div className={styles.newCatFields}>
              <div className={styles.newCatSlug}>
                <div className={styles.catFieldLabel}>Slug</div>
                <input
                  className={`app-input ${styles.inputSm}`}
                  placeholder="z.B. low-carb"
                  value={newCategory.slug}
                  onChange={e => setNewCategory(prev => ({ ...prev, slug: e.target.value }))}
                />
              </div>
              <div className={styles.newCatLabel}>
                <div className={styles.catFieldLabel}>Label</div>
                <input
                  className={`app-input ${styles.inputSm}`}
                  placeholder="z.B. Low Carb"
                  value={newCategory.label}
                  onChange={e => setNewCategory(prev => ({ ...prev, label: e.target.value }))}
                />
              </div>
              <div className={styles.newCatSort}>
                <div className={styles.catFieldLabel}>Sort.</div>
                <input
                  type="number"
                  className={`app-input ${styles.inputSm}`}
                  value={newCategory.sort_order}
                  onChange={e => setNewCategory(prev => ({ ...prev, sort_order: e.target.value }))}
                />
              </div>
              <button
                type="button"
                onClick={() => setNewCategory(prev => ({ ...prev, is_active: !prev.is_active }))}
                className={`${styles.toggleBtn}${newCategory.is_active ? ` ${styles.on}` : ''}`}
              >
                {newCategory.is_active ? "● Aktiv" : "○ Inaktiv"}
              </button>
              <button
                type="button"
                onClick={createCategory}
                disabled={categoryCreateSaving}
                className={styles.actionBtn}
              >
                {categoryCreateSaving ? "..." : "Anlegen"}
              </button>
            </div>
          </div>

          <div className={styles.catList}>
            {recipeCategoriesCatalog.map(category => {
              const draft = getDraftForCategory(category);
              const dirty = draft.label !== (category.label || "")
                || Number(draft.sort_order) !== Number(category.sort_order ?? 0)
                || !!draft.is_active !== (category.is_active !== false);
              const saving = !!categorySaving?.[category.slug];

              return (
                <div key={category.slug} className={`${styles.catItem}${dirty ? ` ${styles.dirty}` : ''}`}>
                  <div className={styles.catFields}>
                    <div className={styles.catSlugGroup}>
                      <div className={styles.catSlugLabel}>Slug</div>
                      <div className={styles.catSlugValue}>{category.slug}</div>
                    </div>
                    <div className={styles.catLabelGroup}>
                      <div className={styles.catFieldLabel}>Label</div>
                      <input
                        className={`app-input ${styles.inputSm}`}
                        value={draft.label}
                        onChange={e => setCategoryDraftField(category.slug, "label", e.target.value)}
                      />
                    </div>
                    <div className={styles.catSortGroup}>
                      <div className={styles.catFieldLabel}>Sort.</div>
                      <input
                        type="number"
                        className={`app-input ${styles.inputSm}`}
                        value={draft.sort_order}
                        onChange={e => setCategoryDraftField(category.slug, "sort_order", e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setCategoryDraftField(category.slug, "is_active", !draft.is_active)}
                      className={`${styles.toggleBtn}${draft.is_active ? ` ${styles.on}` : ''}`}
                    >
                      {draft.is_active ? "● Aktiv" : "○ Inaktiv"}
                    </button>
                    <button
                      type="button"
                      onClick={() => saveCategory(category)}
                      disabled={!dirty || saving}
                      className={`${styles.saveBtn}${dirty ? ` ${styles.dirty}` : ''}`}
                    >
                      {saving ? "..." : "Speichern"}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteCategory(category)}
                      disabled={saving}
                      className={styles.catDeleteBtn}
                    >
                      Loeschen
                    </button>
                  </div>
                </div>
              );
            })}

            {recipeCategoriesCatalog.length === 0 && !recipeCategoriesLoading && (
              <div className={styles.noCatMsg}>Keine Kategorien vorhanden.</div>
            )}
          </div>
        </Card>
      )}

      {/* Lebensmitteldatenbank */}
      {activeSubtab === "foods" && <AdminFoods />}

      {/* Admin Bootstrap */}
      {activeSubtab === "bootstrap" && (
        <Card className={styles.bootstrapCard}>
          <div className={styles.adminSectionLabel}>Admin einrichten</div>
          <p className={styles.proseSm}>
            Klicke hier um dich als Admin einzurichten (funktioniert nur wenn deine E-Mail in der ADMIN_EMAILS Umgebungsvariable steht).
          </p>
          <Button onClick={onBootstrap} className="btn-primary">
            Als Admin einrichten
          </Button>
          {bootstrapMsg && <div className={styles.bootstrapMsg}>{bootstrapMsg}</div>}

          <div className={styles.settingsDivider}>
            <div className={styles.settingsTitle}>Homepage-Texte</div>
            <p className={styles.settingsProse}>
              Bearbeite hier den Header-Text und den Premiumpreis für die gesamte App.
            </p>

            <div className={styles.settingsFields}>
              <div className={styles.settingField}>
                <div className={styles.settingLabel}>Header-Text</div>
                <input
                  className="app-input"
                  value={bootstrapSettings?.headerTagline || ""}
                  onChange={(e) => onBootstrapSettingsChange(prev => ({ ...prev, headerTagline: e.target.value }))}
                  placeholder="Coins · PersonalPoints · SmartPoints · ProPoints"
                />
              </div>

              <div className={styles.settingField}>
                <div className={styles.settingLabel}>Premiumpreis</div>
                <input
                  className="app-input"
                  value={bootstrapSettings?.premiumPriceLabel || ""}
                  onChange={(e) => onBootstrapSettingsChange(prev => ({ ...prev, premiumPriceLabel: e.target.value }))}
                  placeholder="2,99 €/Monat"
                />
              </div>

              <div>
                <Button onClick={onSaveBootstrapSettings} disabled={bootstrapSettingsSaving} style={{ opacity: bootstrapSettingsSaving ? .7 : 1 }}>
                  {bootstrapSettingsSaving ? "Speichert..." : "Texte speichern"}
                </Button>
              </div>

              {bootstrapSettingsMsg && <MsgBanner msg={bootstrapSettingsMsg} />}
            </div>
          </div>
        </Card>
      )}

    </div>
  );
}
