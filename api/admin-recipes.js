import { createClerkClient, verifyToken } from "@clerk/backend";
import { createClient } from "@supabase/supabase-js";
import sanitizeHtml from "sanitize-html";

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function requireAdmin(token) {
  const payload = await verifyToken(token, {
    secretKey: process.env.CLERK_SECRET_KEY,
    clockSkewInMs: 60000,
  });
  const user = await clerk.users.getUser(payload.sub);
  if (user.publicMetadata?.role !== "admin") throw new Error("Forbidden");
  return user;
}

function auditAdminAction(action, actor, details) {
  try {
    console.info("[admin-audit]", {
      action,
      actorId: actor?.id || null,
      actorEmail: actor?.emailAddresses?.[0]?.emailAddress || null,
      timestamp: new Date().toISOString(),
      details,
    });
  } catch {
    // Optional audit logging must never break admin actions.
  }
}

function normalizeSlug(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isValidBoolean(value) {
  return typeof value === "boolean";
}

function parseSortOrder(value) {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) return null;
  if (parsed < 0 || parsed > 9999) return null;
  return parsed;
}

function validateCategoryPayload(payload, { requireSlug = false } = {}) {
  const errors = [];
  const clean = {};

  const slugInput = payload?.slug;
  const labelInput = payload?.label;

  if (slugInput !== undefined || requireSlug) {
    const normalizedSlug = normalizeSlug(slugInput);
    if (!normalizedSlug) {
      errors.push("slug ist erforderlich");
    } else if (normalizedSlug.length < 2 || normalizedSlug.length > 64) {
      errors.push("slug muss 2-64 Zeichen haben");
    } else {
      clean.slug = normalizedSlug;
    }
  }

  if (labelInput !== undefined) {
    const label = String(labelInput || "").trim();
    if (!label) {
      errors.push("label ist erforderlich");
    } else if (label.length < 2 || label.length > 80) {
      errors.push("label muss 2-80 Zeichen haben");
    } else {
      clean.label = label;
    }
  }

  if (payload?.sort_order !== undefined) {
    const sortOrder = parseSortOrder(payload.sort_order);
    if (sortOrder === null) {
      errors.push("sort_order muss eine ganze Zahl zwischen 0 und 9999 sein");
    } else {
      clean.sort_order = sortOrder;
    }
  }

  if (payload?.is_active !== undefined) {
    if (!isValidBoolean(payload.is_active)) {
      errors.push("is_active muss true oder false sein");
    } else {
      clean.is_active = payload.is_active;
    }
  }

  return { errors, clean };
}

const RECIPE_HTML_SANITIZE_OPTIONS = {
  allowedTags: [
    "p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li",
    "h2", "h3", "h4", "blockquote", "a",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer nofollow", target: "_blank" }, true),
  },
};

function sanitizeRecipeHtml(value) {
  const dirty = String(value || "");
  const cleaned = sanitizeHtml(dirty, RECIPE_HTML_SANITIZE_OPTIONS).trim();
  return cleaned;
}

function normalizeRecipeStatus(value) {
  const status = String(value || "").trim().toLowerCase();
  if (status === "draft" || status === "published") return status;
  return null;
}

async function appendRecipeHistory(supabase, { recipeId, action, changedBy, changeSummary, content }) {
  const payload = {
    recipe_id: recipeId,
    action,
    changed_by: changedBy || "unknown",
    change_summary: changeSummary || null,
    content: content || {},
  };

  const { error } = await supabase.from("recipe_history").insert(payload);
  if (!error) return;

  // Keep text/category updates working even when Phase-2 migration is not yet applied.
  if (error.code === "42P01" || error.code === "42703") return;
  throw error;
}

export default async function handler(req, res) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Nicht authentifiziert" });

  let adminUser;
  try {
    adminUser = await requireAdmin(token);
  } catch {
    return res.status(403).json({ error: "Nur fuer Admins" });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  if (req.method === "GET") {
    const action = req.query.action;

    if (action === "recipe-statuses") {
      const { data, error } = await supabase
        .from("recipes")
        .select("id, status, edited_at, published_at")
        .order("id", { ascending: true });

      if (error) {
        if (error.code === "42703") {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("recipes")
            .select("id")
            .order("id", { ascending: true });

          if (fallbackError) return res.status(500).json({ error: fallbackError.message });

          return res.json({
            statuses: (fallbackData || []).map(row => ({
              id: row.id,
              status: "published",
              edited_at: null,
              published_at: null,
            })),
          });
        }
        return res.status(500).json({ error: error.message });
      }

      return res.json({ statuses: data || [] });
    }

    if (action === "recipe-history") {
      const recipeId = Number.parseInt(req.query.recipeId, 10);
      if (!recipeId) return res.status(400).json({ error: "recipeId fehlt" });

      const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));

      const { data, error } = await supabase
        .from("recipe_history")
        .select("id, recipe_id, action, changed_by, changed_at, change_summary")
        .eq("recipe_id", recipeId)
        .order("changed_at", { ascending: false })
        .limit(limit);

      if (error) {
        if (error.code === "42P01") {
          return res.status(500).json({ error: "Tabelle recipe_history fehlt. Bitte SQL-Migration ausfuehren." });
        }
        return res.status(500).json({ error: error.message });
      }

      return res.json({ history: data || [] });
    }

    if (action !== "categories") return res.status(400).json({ error: "Unbekannte action" });

    const includeInactive = req.query.includeInactive === "1" || req.query.includeInactive === "true";

    let query = supabase
      .from("recipe_categories")
      .select("slug, label, sort_order, is_active")
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true });

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === "42P01") {
        return res.status(500).json({ error: "Tabelle recipe_categories fehlt. Bitte SQL-Migration ausfuehren." });
      }
      return res.status(500).json({ error: error.message });
    }

    return res.json({ categories: data || [] });
  }

  if (req.method === "POST") {
    const action = req.query.action;
    if (action !== "category") return res.status(400).json({ error: "Unbekannte action" });

    const payload = req.body ?? {};
    const { errors, clean } = validateCategoryPayload(payload, { requireSlug: false });

    const derivedSlug = clean.slug || normalizeSlug(clean.label || "");
    if (!derivedSlug) errors.push("slug oder label ist erforderlich");

    if (!clean.label) errors.push("label ist erforderlich");

    if (errors.length) {
      return res.status(400).json({ error: errors.join("; ") });
    }

    const row = {
      slug: derivedSlug,
      label: clean.label,
      sort_order: clean.sort_order ?? 0,
      is_active: clean.is_active ?? true,
    };

    const { data, error } = await supabase
      .from("recipe_categories")
      .insert(row)
      .select("slug, label, sort_order, is_active")
      .single();

    if (error) {
      if (error.code === "42P01") {
        return res.status(500).json({ error: "Tabelle recipe_categories fehlt. Bitte SQL-Migration ausfuehren." });
      }
      if (error.code === "23505") {
        return res.status(409).json({ error: "Kategorie-Slug existiert bereits." });
      }
      return res.status(500).json({ error: error.message });
    }

    auditAdminAction("category-create", adminUser, {
      slug: data?.slug || row.slug,
      label: data?.label || row.label,
      sort_order: data?.sort_order ?? row.sort_order,
      is_active: data?.is_active ?? row.is_active,
    });

    return res.status(201).json({ success: true, category: data });
  }

  if (req.method === "PUT") {
    const action = req.query.action;

    if (action === "recipe-text") {
      const { recipeId, titleText, shortDescriptionHtml, instructionsHtml, ingredientsText } = req.body ?? {};
      const parsedId = Number.parseInt(recipeId, 10);

      if (!parsedId) {
        return res.status(400).json({ error: "recipeId fehlt" });
      }

      const shortDescriptionSanitized = sanitizeRecipeHtml(shortDescriptionHtml);
      const instructionsSanitized = sanitizeRecipeHtml(instructionsHtml);
      const normalizedTitle = String(titleText || "").trim();

      if (!normalizedTitle) {
        return res.status(400).json({ error: "Titel darf nicht leer sein." });
      }

      if (normalizedTitle.length > 180) {
        return res.status(400).json({ error: "Titel ist zu lang (max. 180 Zeichen)." });
      }

      if (shortDescriptionSanitized.length > 4000) {
        return res.status(400).json({ error: "Kurzbeschreibung ist zu lang (max. 4000 Zeichen HTML)." });
      }

      if (instructionsSanitized.length > 30000) {
        return res.status(400).json({ error: "Zubereitung ist zu lang (max. 30000 Zeichen HTML)." });
      }

      const ingredients = String(ingredientsText || "")
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .slice(0, 400);

      const { data, error } = await supabase
        .from("recipes")
        .update({
          name: normalizedTitle,
          short_description_html: shortDescriptionSanitized || null,
          instructions_html: instructionsSanitized || null,
        })
        .eq("id", parsedId)
        .select("id, name, short_description_html, instructions_html")
        .single();

      if (error) {
        if (error.code === "42703") {
          return res.status(500).json({ error: "Spalten fuer Rezepttexte fehlen. Bitte SQL-Migration ausfuehren." });
        }
        return res.status(500).json({ error: error.message });
      }

      const { error: deleteIngredientsError } = await supabase
        .from("recipe_ingredients")
        .delete()
        .eq("recipe_id", parsedId);

      if (deleteIngredientsError) {
        if (deleteIngredientsError.code === "42P01") {
          return res.status(500).json({ error: "Tabelle recipe_ingredients fehlt. Bitte SQL-Migration ausfuehren." });
        }
        return res.status(500).json({ error: deleteIngredientsError.message });
      }

      if (ingredients.length > 0) {
        const ingredientRows = ingredients.map((ingredient, index) => ({
          recipe_id: parsedId,
          ingredient,
          position: index + 1,
        }));

        const { error: insertIngredientsError } = await supabase
          .from("recipe_ingredients")
          .insert(ingredientRows);

        if (insertIngredientsError) {
          return res.status(500).json({ error: insertIngredientsError.message });
        }
      }

      const nowIso = new Date().toISOString();
      const { error: editorialMetaError } = await supabase
        .from("recipes")
        .update({
          status: "draft",
          edited_at: nowIso,
          edited_by: adminUser.id,
        })
        .eq("id", parsedId);

      if (editorialMetaError && editorialMetaError.code !== "42703") {
        return res.status(500).json({ error: editorialMetaError.message });
      }

      try {
        await appendRecipeHistory(supabase, {
          recipeId: parsedId,
          action: "edited",
          changedBy: adminUser.id,
          changeSummary: "Rezepttexte aktualisiert",
          content: {
            name: normalizedTitle,
            short_description_html: shortDescriptionSanitized || null,
            instructions_html: instructionsSanitized || null,
            ingredients_count: ingredients.length,
            status: editorialMetaError ? null : "draft",
          },
        });
      } catch (historyError) {
        return res.status(500).json({ error: historyError.message });
      }

      auditAdminAction("recipe-text-update", adminUser, {
        recipeId: parsedId,
        titleLength: normalizedTitle.length,
        shortDescriptionLength: shortDescriptionSanitized.length,
        instructionsLength: instructionsSanitized.length,
        ingredientsCount: ingredients.length,
      });

      return res.json({ success: true, recipe: data });
    }

    if (action === "recipe-publish") {
      const { recipeId, status, changeSummary } = req.body ?? {};
      const parsedId = Number.parseInt(recipeId, 10);
      const normalizedStatus = normalizeRecipeStatus(status);

      if (!parsedId) return res.status(400).json({ error: "recipeId fehlt" });
      if (!normalizedStatus) return res.status(400).json({ error: "status muss draft oder published sein" });

      const nowIso = new Date().toISOString();
      const update = {
        status: normalizedStatus,
        edited_at: nowIso,
        edited_by: adminUser.id,
      };
      if (normalizedStatus === "published") update.published_at = nowIso;

      const { data, error } = await supabase
        .from("recipes")
        .update(update)
        .eq("id", parsedId)
        .select("id, status, edited_at, published_at")
        .single();

      if (error) {
        if (error.code === "42703") {
          return res.status(500).json({ error: "Spalten fuer Rezept-Workflow fehlen. Bitte SQL-Migration ausfuehren." });
        }
        return res.status(500).json({ error: error.message });
      }

      try {
        await appendRecipeHistory(supabase, {
          recipeId: parsedId,
          action: normalizedStatus === "published" ? "published" : "drafted",
          changedBy: adminUser.id,
          changeSummary: String(changeSummary || "").trim() || (normalizedStatus === "published" ? "Rezept veroeffentlicht" : "Rezept als Entwurf markiert"),
          content: {
            status: normalizedStatus,
            edited_at: data?.edited_at || nowIso,
            published_at: data?.published_at || null,
          },
        });
      } catch (historyError) {
        return res.status(500).json({ error: historyError.message });
      }

      auditAdminAction("recipe-status-update", adminUser, {
        recipeId: parsedId,
        status: normalizedStatus,
      });

      return res.json({ success: true, recipe: data });
    }

    if (action === "category") {
      const payload = req.body ?? {};
      const targetSlug = normalizeSlug(payload.slug);
      if (!targetSlug) return res.status(400).json({ error: "slug fehlt" });

      const { errors, clean } = validateCategoryPayload(payload, { requireSlug: false });
      if (errors.length) return res.status(400).json({ error: errors.join("; ") });

      const update = {};
      if (clean.label !== undefined) update.label = clean.label;
      if (clean.sort_order !== undefined) update.sort_order = clean.sort_order;
      if (clean.is_active !== undefined) update.is_active = clean.is_active;

      if (!Object.keys(update).length) {
        return res.status(400).json({ error: "Keine gueltigen Felder zum Aktualisieren angegeben." });
      }

      const { data, error } = await supabase
        .from("recipe_categories")
        .update(update)
        .eq("slug", targetSlug)
        .select("slug, label, sort_order, is_active")
        .single();

      if (error) {
        if (error.code === "42P01") {
          return res.status(500).json({ error: "Tabelle recipe_categories fehlt. Bitte SQL-Migration ausfuehren." });
        }
        if (error.code === "PGRST116") {
          return res.status(404).json({ error: "Kategorie nicht gefunden." });
        }
        return res.status(500).json({ error: error.message });
      }

      if (!data) {
        return res.status(404).json({ error: "Kategorie nicht gefunden." });
      }

      auditAdminAction("category-update", adminUser, {
        slug: targetSlug,
        update,
      });

      return res.json({ success: true, category: data });
    }

    if (action && action !== "recipe-categories") {
      return res.status(400).json({ error: "Unbekannte action" });
    }

    const { recipeId, kategorien } = req.body ?? {};
    const parsedId = Number.parseInt(recipeId, 10);
    if (!parsedId) return res.status(400).json({ error: "recipeId fehlt" });
    if (!Array.isArray(kategorien)) return res.status(400).json({ error: "kategorien muss ein Array sein" });

    const normalized = [...new Set(kategorien.map(normalizeSlug).filter(Boolean))];

    const { data: validCats, error: validErr } = await supabase
      .from("recipe_categories")
      .select("slug, label")
      .eq("is_active", true)
      .in("slug", normalized.length ? normalized : ["__none__"]);

    if (validErr) {
      if (validErr.code === "42P01") {
        return res.status(500).json({ error: "Tabelle recipe_categories fehlt. Bitte SQL-Migration ausfuehren." });
      }
      return res.status(500).json({ error: validErr.message });
    }

    if (normalized.length !== (validCats || []).length) {
      const validSet = new Set((validCats || []).map(c => c.slug));
      const unknown = normalized.filter(s => !validSet.has(s));
      return res.status(400).json({ error: `Unbekannte oder inaktive Kategorien: ${unknown.join(", ")}` });
    }

    const labelsBySlug = new Map((validCats || []).map(c => [c.slug, c.label]));
    const legacyText = normalized.map(s => labelsBySlug.get(s) || s).join(", ");

    const { data, error } = await supabase
      .from("recipes")
      .update({
        kategorien: normalized,
        kategorie: legacyText || null,
      })
      .eq("id", parsedId)
      .select("id, kategorie, kategorien")
      .single();

    if (error) {
      if (error.code === "42703") {
        return res.status(500).json({ error: "Spalte recipes.kategorien fehlt. Bitte SQL-Migration ausfuehren." });
      }
      return res.status(500).json({ error: error.message });
    }

    auditAdminAction("recipe-category-assignment", adminUser, {
      recipeId: parsedId,
      kategorien: normalized,
    });

    return res.json({ success: true, recipe: data });
  }

  if (req.method === "DELETE") {
    const action = req.query.action;
    if (action !== "category") return res.status(400).json({ error: "Unbekannte action" });

    const targetSlug = normalizeSlug(req.query.slug || req.body?.slug);
    if (!targetSlug) return res.status(400).json({ error: "slug fehlt" });

    const { data: refs, error: refsErr, count: refsCount } = await supabase
      .from("recipes")
      .select("id, name", { count: "exact" })
      .contains("kategorien", [targetSlug])
      .limit(5);

    if (refsErr) {
      if (refsErr.code === "42703") {
        return res.status(500).json({ error: "Spalte recipes.kategorien fehlt. Bitte SQL-Migration ausfuehren." });
      }
      return res.status(500).json({ error: refsErr.message });
    }

    if ((refsCount || 0) > 0) {
      const names = (refs || []).map(r => r.name).filter(Boolean);
      const suffix = names.length ? ` (${names.join(", ")})` : "";
      return res.status(409).json({
        error: `Kategorie wird noch in ${refsCount} Rezept(en) verwendet${suffix}. Bitte zuerst Zuordnungen entfernen.`,
        usedBy: refs || [],
        usedCount: refsCount || 0,
      });
    }

    const { data: existing, error: existingErr } = await supabase
      .from("recipe_categories")
      .select("slug, label")
      .eq("slug", targetSlug)
      .single();

    if (existingErr) {
      if (existingErr.code === "42P01") {
        return res.status(500).json({ error: "Tabelle recipe_categories fehlt. Bitte SQL-Migration ausfuehren." });
      }
      if (existingErr.code === "PGRST116") {
        return res.status(404).json({ error: "Kategorie nicht gefunden." });
      }
      return res.status(500).json({ error: existingErr.message });
    }

    const { error: delErr } = await supabase
      .from("recipe_categories")
      .delete()
      .eq("slug", targetSlug);

    if (delErr) {
      if (delErr.code === "42P01") {
        return res.status(500).json({ error: "Tabelle recipe_categories fehlt. Bitte SQL-Migration ausfuehren." });
      }
      return res.status(500).json({ error: delErr.message });
    }

    auditAdminAction("category-delete", adminUser, {
      slug: targetSlug,
      label: existing?.label || null,
    });

    return res.json({ success: true, deleted: true, slug: targetSlug });
  }

  return res.status(405).end();
}
