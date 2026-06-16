-- Move pg_trgm from public to extensions schema (Supabase best practice).
-- The existing foods_name_trgm_idx index remains valid because the extensions
-- schema is part of the default search_path in Supabase.
ALTER EXTENSION pg_trgm SET SCHEMA extensions;
