# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Vite only — /api/ endpoints are NOT available
vercel dev           # Vite + Serverless Functions locally (required to test API routes)
npm run build        # Vite + PWA production build
npm run lint         # ESLint across src/, api/, vite.config.js
npm run test         # Node built-in test runner (no framework needed)
npm run db:push      # Apply Supabase migrations to remote
npm run db:migration:new -- <name>   # Create a new migration file
```

For local Stripe webhooks:
```bash
stripe listen --forward-to localhost:5173/api/stripe-webhook
```

## Architecture

### Single-file frontend
`src/App.jsx` contains virtually all UI, state, navigation, role logic, and tab rendering. Tab modules in `src/components/tabs/` (TabCalc, TabBudget, TabRecipes, TabFood, TabProfile, TabInfo, TabAdmin) are imported there. All other components in `src/components/` are leaf-level UI pieces.

### Styling pattern
Almost all styling uses **inline styles** composed from design tokens in `src/styles/theme.js`. The tokens exported from that file (`C`, `FH`, `FB`, `sh`, `card`, `inputStyle`, etc.) are used across the entire codebase. Global CSS in `src/index.css` handles only resets, layout classes (`.sticky-shell`, `.bottom-nav`, `.main-content`), and mobile media queries. There is no CSS-in-JS library.

### Auth and data access split
The browser Supabase client (`src/supabase.js`) uses the **anon key** and is subject to RLS. All server-side writes — journal entries, admin actions, feature flags — go through Vercel API routes (`api/`) which use the **service role key** (`SUPABASE_SERVICE_ROLE_KEY`). Never put the service role key in `VITE_*` variables or `src/`.

API routes authenticate requests via Clerk JWT: `Authorization: Bearer <token>`. Admin routes call `requireAdmin(token)` which verifies the token and checks `publicMetadata.role === "admin"`.

### Feature flags
`src/lib/featureFlags.js` defines 6 flags (`tab_calc`, `tab_budget`, `tab_profile`, `tab_food`, `tab_recipes`, `tab_info`). These are the source of truth for IDs and labels — the DB rows mirror them. When writing flag rows, always **UPSERT** (not UPDATE) because a row may not exist yet. The `label` column is nullable; the UI always reads labels from `FLAG_DEFS`, not the DB.

### Role system
`src/lib/roles.js` defines the hierarchy: `guest(0) < user(1) < premium(2) < admin(3)`. Roles are stored in Clerk `publicMetadata.role`. `isPremium: true` is set alongside `role === "premium"` or `"admin"` for legacy compatibility. Tab access is gated by comparing `ROLE_RANK[userRole] >= ROLE_RANK[flag.required_role]`.

### Vercel Function limit
Vercel Hobby plan allows **max 12 serverless functions**. Currently 10 are used (`api/` directory). Do not add new function files without checking this limit first; prefer adding `?action=` routing to an existing handler.

### Supabase migrations
All schema changes go in `supabase/migrations/` with timestamp-prefixed filenames. Apply with `npm run db:push`. The migration history is the canonical record of schema state — do not run raw SQL in the Supabase dashboard without creating a corresponding migration file.

### Food search: cache-first with OFF fallback
`api/food-search.js` queries the local `foods` table first (trigram index on `name`). If fewer than 5 results, it fires parallel requests to `world.openfoodfacts.org` and `at.openfoodfacts.org` via `Promise.allSettled`, merges and deduplicates results by `off_id`, and upserts them into Supabase. Austrian entries take precedence when deduplicating.

### Stripe webhook
`api/stripe-webhook.js` requires the **raw request body** for Stripe signature verification. Do not add body-parsing middleware that would consume the raw stream before the webhook handler runs.

### PWA / iOS status bar
`theme_color` in `vite.config.js` and `<meta name="theme-color">` in `index.html` are both set to `#1A6B1A` (header gradient start). `html { background-color: #1A6B1A }` in `index.css` ensures the iOS safe-area fills with the correct green before React renders. `apple-mobile-web-app-status-bar-style: black-translucent` makes the status bar transparent so the header gradient extends behind it.

## What to ignore

`ww-points-calculator/` is a nested legacy copy of the project. Do not edit it for normal changes.
