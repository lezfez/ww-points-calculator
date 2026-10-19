# Codex Project Notes

## Project Overview

This is a German React single-page app for calculating Weight Watchers and weight friends point systems. The production target documented in the README is `w.wencom.net`.

Main capabilities:
- Calculate weight friends Coins, WW PersonalPoints, SmartPoints, ProPoints, and Classic Points.
- Premium daily budget calculator.
- Recipe browser backed by Supabase tables.
- Clerk authentication and role-based access (`guest < user < premium < admin`).
- Stripe checkout and webhook flow for Premium.
- Admin UI for feature flags and Clerk user roles.
- PWA setup through `vite-plugin-pwa`.

## Stack

- Frontend: React 19, Vite 8
- Serverless API: Vercel functions in `api/`
- Auth: Clerk
- Database: Supabase
- Payments: Stripe
- Styling: CSS Modules per Komponente (`ComponentName.module.css`), Design-Tokens als CSS Custom Properties in `src/index.css`
- PWA: configured in `vite.config.js`

## Repository Shape

- `src/App.jsx` is the active main app and contains most UI, hooks, role logic, and admin screens.
- `src/lib/points.js` contains pure point and daily-budget formulas. Keep calculation changes there and cover them with `test/points.test.js`.
- `src/lib/pointSystems.js`, `src/lib/roles.js`, and `src/lib/featureFlags.js` contain shared domain constants and helpers.
- `src/data/recipesFallback.json` contains static recipe data extracted from the old inline constant. It is not currently used by the active Supabase-powered recipe hook, but can be wired as a future fallback.
- `src/supabase.js` creates the browser Supabase client from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- `src/styles/theme.js` contains legacy JS design tokens (`C`, `FH`, `FB`). Prefer CSS custom properties (`var(--c-green)` etc.) in new module files.
- `src/components/ui/` contains shared UI primitives: `Button`, `Card`, `Input`, `Section`.
- `api/` contains Vercel serverless functions for Clerk admin checks, Stripe checkout/webhooks, and feature-flag updates.
- `public/` contains app icons and manifest assets.
- `vite.config.js` contains React and PWA config.
- `vite.config.js` also splits Clerk and Supabase into separate build chunks to keep the app entry chunk smaller.
- `ww-points-calculator/` is a nested legacy copy and is ignored by git. Do not edit it unless the task explicitly targets that folder.
- `.env.local` exists locally and may contain secrets. Do not print or commit secret values.

## Common Commands

```bash
npm install
npm run dev
npm run build
npm run preview
npm run lint
npm run test
```

Current verification state at init:
- `npm run build` succeeds.
- `npm run lint` succeeds.
- `npm run test` succeeds.

If asked to make a functional change, run at least `npm run lint`, `npm run test`, and `npm run build`.

## Environment Variables

Browser-exposed:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_CLERK_PUBLISHABLE_KEY`

Server-only:
- `CLERK_SECRET_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID`
- `ADMIN_EMAILS`
- `APP_URL` optional, used by checkout session redirects

Keep browser and server env usage separated. Do not move server secrets into `src/`.

## Architecture Notes

### Points and Budgets

The formulas are implemented as pure functions in `src/lib/points.js`.

Important functions:
- `calcClassic`
- `calcProPoints`
- `calcSmartPoints`
- `calcPersonalPoints`
- `calcCoins`
- `calcDailyBudget`

When changing formulas, update user-facing explanatory text in the Info tab and README if needed.

### Supabase

Frontend reads:
- `recipes`
- `recipe_ingredients`
- `recipe_steps`
- `feature_flags`

Admin flag updates are done through `api/admin-set-flag.js` after Clerk admin verification.

The `api/admin-set-flag.js` endpoint requires `SUPABASE_SERVICE_ROLE_KEY` for server-side feature-flag writes. Never expose that key to browser code.

### Clerk Roles

Role hierarchy is defined in `src/App.jsx`:

```js
guest < user < premium < admin
```

Roles are stored in Clerk `publicMetadata.role`.

`isPremium: true` is also set for premium/admin users for compatibility. Keep this behavior unless deliberately migrating the role model.

### Stripe

Checkout:
- `api/create-checkout-session.js`
- Uses `STRIPE_PRICE_ID`
- Stores Clerk user id in `client_reference_id`

Webhook:
- `api/stripe-webhook.js`
- On `checkout.session.completed`, sets Clerk `publicMetadata.isPremium = true`.
- On `customer.subscription.deleted`, attempts to find the Clerk user by Stripe customer id.

Be careful when changing webhook parsing: Stripe signature verification requires the raw request body.

## CSS Workflow

Every component has a co-located `.module.css` file. Rules:

1. **Neue Komponente**: `Foo.jsx` + `Foo.module.css` anlegen. Tokens als `var(--c-*)` / `var(--font-*)` nutzen.
2. **Inputs**: `className={`app-input ${styles.myInput}`}` — `app-input` in `src/index.css` liefert alle Basis-Styles (border, padding, radius, font, background). Das Modul-Class setzt nur Overrides (`flex: 1`, `font-size: 12px`, etc.). Nie Basis-Styles doppelt setzen.
3. **Selects**: analog mit `app-select`.
4. **Dynamische Farben** (data-driven): inline `style={{ color: ... }}` bleibt erlaubt. Kein CSS-in-JS.
5. `src/styles/theme.js` nur noch für diese seltenen Fälle — nicht in neuen Modul-Dateien importieren.

## Coding Guidance

- Prefer small, localized edits. Most active code is concentrated in `src/App.jsx`.
- Preserve German UI copy unless a task asks for another language.
- Match the existing organic/biophilic visual style documented in README: Waldgruen, Terrakotta, Creme-Weiss, Lora/Raleway.
- Avoid touching generated output in `dist/` unless the task is explicitly about build artifacts.
- Do not edit the nested `ww-points-calculator/` folder for normal app changes.
- Do not expose `.env.local` contents in logs or responses.
- For React changes, keep accessibility in mind: labels, buttons, keyboard behavior, loading and error states.
- Vermeide doppelten Code, baue bevorzugt zentrale Componenten und Module
- Rezepte: `useRecipes()` filtert auf `status = 'published'` (oder NULL). Admin braucht `useRecipes({ includeAll: true })`.

## Deployment Notes

The README documents Vercel hosting with serverless functions in `api/`.

Before deploy-related changes, verify:
- `npm run build`
- required Vercel env vars exist
- API functions still avoid browser-only APIs
- PWA config does not cache `/api/` routes

### Versionierung

Format: `v1.<deployVersion>.<commitCount>` — wird im Header neben "WampeWeg" angezeigt.

- `deployVersion` — in `package.json` als `"deployVersion"` Feld, manuell via Script erhöht.
- `commitCount` — automatisch aus `git rev-list --count HEAD`. Vercel-Fallback: `package.json` Patch-Version.

**Deploy-Workflow** (immer in dieser Reihenfolge):
```bash
npm run version:deploy   # deployVersion++ und patch auf commit_count+1 sync
git add package.json && git commit -m "..."
vercel --prod
vercel alias set <neue-url> ww-points-calculator-lezfez-wencom.vercel.app
```

Alle Env-Vars sind nur für `Production` konfiguriert — Preview-Deploys (`vercel` ohne `--prod`) zeigen daher eine grüne Seite (Clerk kann nicht initialisieren).
