import { createClerkClient, verifyToken } from "@clerk/backend";
import { createClient } from "@supabase/supabase-js";

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
