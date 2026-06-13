# WW & weight friends Punkte-Rechner

Eine React-SPA zur Berechnung von weight friends Coins, WW PersonalPoints, SmartPoints, ProPoints und Classic Points – deployed auf [w.wencom.net](https://w.wencom.net).

## Features

### Punkte-Rechner
Berechnet alle fünf Systeme parallel aus Nährwertangaben:

| System | Basis |
|---|---|
| weight friends Coins | kcal, gesF, Zucker, Salz, Protein, Ballaststoffe |
| WW PersonalPoints™ (2022+) | kcal, gesF, ungesF, Zucker, Protein, Ballaststoffe |
| WW SmartPoints™ (2015–21) | kcal, gesF, Zucker, Protein |
| WW ProPoints™ (2010–15) | Protein, KH, Fett, Ballaststoffe |
| WW Classic Points (bis 2010) | kcal, Fett |

### Tagesbudget (Premium)
Persönliches Tages-Budget via Mifflin-St-Jeor-Formel (Grundumsatz × Aktivitätsfaktor) – gibt empfohlene Coins/Tag und WW Points/Tag aus.

**Tagesjournal** mit Mahlzeit-Slots (Frühstück, Mittagessen, Abendessen, Snacks):
- Aktivitäts-Coins: manuell eingetragene Bewegung wird gutgeschrieben
- Donut-Chart: verbrauchte vs. verbleibende Coins visualisiert
- Wochenbonus: zusätzliche Coins werden wöchentlich gesammelt

**Wochenstreifen (WeekStrip)**: 7-Tage-Übersicht mit farbkodierten Punkten (grün/gelb/rot je nach Budget-Nutzung), Wochennavigation ‹/› und Streak-Anzeige.

**Statistiken**: Umschaltbar zwischen Journal- und Statistik-Ansicht:
- 4 Metrikkarten: Ø Coins/Tag, Im Budget %, Aktueller Streak, Bester Streak
- 14-Tage SVG-Balkenchart mit Budget-Linie und Farbcodierung

**Rezept-Integration**: Rezepte direkt aus dem Mahlzeit-Slot auswählen (RecipePicker-Modal mit Suche und Coins-Badge).

**Lebensmittelsuche**: Pro Mahlzeit-Slot über 🔍 Lebensmittel aus der DB suchen (FoodSearch-Modal, debounced, mit Portionsrechner und Coin-Skalierung).

### WF Rezepte
Rezepte von weightfriends.at mit Coins-Werten, Kategoriefilter, Textsuche und Sortierung nach Coins. Lade-, Fehler- und Leerzustände werden getrennt angezeigt; bei Supabase-Fehlern gibt es einen erneuten Ladeversuch.
Optional können KI-generierte Rezeptbilder aus Supabase Storage angezeigt werden.

### Info
Hintergründe zu den Formeln und zur Herleitung der weight friends Coins-Formel.

### Admin-Bereich (nur Admin-Rolle)
- **Zugriffssteuerung**: Mindestrolle pro Tab konfigurieren (Gast / Registriert / Premium / Admin), Tabs deaktivieren
- **Benutzerverwaltung**: Clerk-User per E-Mail suchen, Rollen zuweisen
- **Lebensmitteldatenbank**: Lokale DB durchsuchen, Einträge inline bearbeiten oder löschen, manuell neue Lebensmittel anlegen, Lebensmittel von Open Food Facts (Global + Österreich) suchen und importieren

### Checkout UX
Stripe-Checkout-Rückgaben über `?premium=success` und `?premium=canceled` werden als Statusbanner angezeigt. Der Query-Parameter wird danach aus der URL entfernt.

---

## Tech Stack

| Schicht | Technologie |
|---|---|
| Frontend | React 19 + Vite 8 |
| Fonts | Lora (Serif, Headings) + Raleway (Body/UI) |
| Auth | Clerk (`@clerk/clerk-react`, `@clerk/backend`), UI auf Deutsch (`deDE`) |
| Datenbank | Supabase (Rezepte, Feature Flags, Tagesjournal, Lebensmittel, User-Profile) |
| Payments | Stripe (monatliches Premium-Abo) |
| Lebensmitteldaten | Open Food Facts API (world + AT, cache-first in Supabase) |
| Hosting | Vercel (Serverless Functions in `/api/`, Hobby-Plan: max. 12 Functions) |
| Tests | Node Test Runner (`node --test`) |

---

## Projektstruktur

| Pfad | Zweck |
|---|---|
| `src/App.jsx` | Haupt-App, Navigation, Rollenlogik, Header mit Clerk-Avatar |
| `src/lib/points.js` | Pure Berechnungsfunktionen für Punkte und Tagesbudget |
| `src/lib/pointSystems.js` | Feld- und Punktesystem-Definitionen |
| `src/lib/roles.js` | Rollenlabels, Rollenrangfolge und Zugriffshilfen |
| `src/lib/featureFlags.js` | Definitionen der administrierbaren Feature Flags |
| `src/data/recipesFallback.json` | Statische Rezeptdaten als möglicher späterer Supabase-Fallback |
| `src/supabase.js` | Browser-Supabase-Client mit Anon-Key |
| `src/styles/theme.js` | Design-Tokens für Farben, Fonts und Schatten |
| `src/components/` | UI-Komponenten (siehe unten) |
| `src/components/tabs/` | Tab-Module: TabCalc, TabBudget, TabRecipes, TabInfo, TabAdmin |
| `src/hooks/` (in `src/components/`) | Custom Hooks für Daten und UI-Logik |
| `api/` | Vercel Serverless Functions |
| `scripts/generate-recipe-images.mjs` | Lokaler Admin-Job: generiert Rezeptbilder, lädt sie in Supabase Storage |
| `sql/setup-recipe-images.sql` | SQL-Setup für Rezeptbild-Spalten und öffentlichen Supabase-Storage-Bucket |
| `test/points.test.js` | Charakterisierungstests für die Punkteformeln |
| `vite.config.js` | Vite, PWA und manuelles Chunk-Splitting |
| `ww-points-calculator/` | Legacy-Kopie, nicht aktiv für Build/Lint/Deployment |

### Komponenten

| Datei | Zweck |
|---|---|
| `AdminFoods.jsx` | Lebensmittel-Verwaltung im Admin-Bereich (Lokale DB + OFF-Import) |
| `DonutChart.jsx` | SVG-Donut für verbrauchte/verbleibende Coins im Budget-Tab |
| `FoodSearch.jsx` | Bottom-Sheet-Modal: Lebensmittelsuche mit Portionsrechner |
| `RecipePicker.jsx` | Bottom-Sheet-Modal: Rezept-Auswahl für Mahlzeit-Slots |
| `StatsView.jsx` | Statistik-Ansicht: Metrikkarten + 14-Tage-Balkenchart |
| `WeekStrip.jsx` | 7-Tage-Wochenstreifen mit Farbkodierung und Streak |
| `InstallBanner.jsx` | PWA-Installations-Banner für mobile Nutzer |
| `RecipeCard.jsx` | Rezeptkarte mit optionalem KI-Bild |

### Custom Hooks

| Datei | Zweck |
|---|---|
| `useDailyJournal.js` | Tagesjournal: Mahlzeiten, Aktivität, Budget-Daten aus Supabase |
| `useWeeklyJournal.js` | 7-Tage-Übersicht + Streak via `/api/weekly-journal` |
| `useStats.js` | 14-Tage-Statistiken via `/api/stats-journal` |
| `useFoodSearch.js` | Debounced Lebensmittelsuche (400 ms) via `/api/food-search` |
| `useUserProfile.js` | User-Profil (Gewicht, Größe, Alter, …) laden und speichern, auto-sync mit Clerk |
| `useFeatureFlags.js` | Feature-Flags aus Supabase laden |
| `useRecipes.js` | Rezepte aus Supabase laden |
| `useInstallPrompt.js` | PWA-Installations-Prompt-Logik |
| `useDebounce.js` | Generischer Debounce-Hook |

---

## Rollen-System

Hierarchie: `guest < user < premium < admin`

Rollen werden in Clerk `publicMetadata.role` gespeichert. `isPremium: true` wird automatisch gesetzt wenn `role === "premium"` oder `role === "admin"`.

| Rolle | Zugang |
|---|---|
| `guest` | Öffentliche Tabs (je nach Feature-Flag-Konfiguration) |
| `user` | Registrierter Clerk-User |
| `premium` | Zahlendes Mitglied (Stripe-Abo) |
| `admin` | Vollzugang + Admin-Tab |

---

## Serverless API Endpoints

> Vercel Hobby-Plan erlaubt maximal 12 Serverless Functions. Aktuell werden 10 genutzt.

| Endpoint | Methode | Beschreibung |
|---|---|---|
| `/api/create-checkout-session` | POST | Stripe Checkout für Premium-Abo |
| `/api/stripe-webhook` | POST | Stripe Webhook → setzt `isPremium: true` in Clerk |
| `/api/admin` | POST/GET | Admin-Aktionen via `?action=`: `bootstrap`, `users`, `set-role`, `set-flag` |
| `/api/admin-foods` | GET/POST/PUT/DELETE | Lebensmitteldatenbank verwalten (Admin-only) |
| `/api/food-search` | GET | Lebensmittelsuche (cache-first Supabase, OFF-Fallback) |
| `/api/daily-journal` | GET/POST/PUT | Tagesjournal-Einträge lesen und schreiben |
| `/api/weekly-journal` | GET | 7-Tage-Übersicht + Streak für WeekStrip |
| `/api/stats-journal` | GET | 60-Tage-Statistiken: Ø Coins, Budget-Rate, Streaks |
| `/api/user-profile` | GET/PUT | User-Profil (Gewicht, Größe, Alter, Geschlecht, Aktivität, Display-Name, Avatar) |
| `/api/generate-recipe-image` | POST | Rezeptbild via KI generieren (Admin-only) |

### `/api/admin?action=`-Routing

| action | Methode | Beschreibung |
|---|---|---|
| `bootstrap` | POST | Eigene Rolle auf `admin` setzen (E-Mail muss in `ADMIN_EMAILS` stehen) |
| `users` | GET | Clerk-User listen/suchen (max. 25, `?query=`) |
| `set-role` | POST | Rolle eines Users setzen (`user`/`premium`/`admin`) |
| `set-flag` | POST | Feature Flag in Supabase aktualisieren |

Alle Endpoints außer `bootstrap` verifizieren den Clerk JWT (`Authorization: Bearer <token>`) und prüfen `publicMetadata.role === "admin"`.

---

## Supabase Schema

### `recipes`
Rezepte von weightfriends.at mit `recipe_ingredients` und `recipe_steps` (separate Tabellen, via JOIN geladen).

Optionale Bildfelder:
```sql
image_url          TEXT,
image_path         TEXT,
image_prompt       TEXT,
image_status       TEXT CHECK (image_status IN ('pending', 'generating', 'ready', 'failed')),
image_generated_at TIMESTAMPTZ
```

### `feature_flags`
Steuert Zugriffsanforderungen pro Tab/Feature:

```sql
CREATE TABLE feature_flags (
  id             TEXT PRIMARY KEY,
  label          TEXT NOT NULL,
  description    TEXT,
  required_role  TEXT NOT NULL DEFAULT 'guest'
                 CHECK (required_role IN ('guest','user','premium','admin')),
  enabled        BOOLEAN NOT NULL DEFAULT true,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Standard-Einträge: `tab_calc`, `tab_budget`, `tab_recipes`, `tab_info`

### `daily_journal`
Tagesbudget-Einträge pro User und Datum:

```sql
CREATE TABLE daily_journal (
  id          BIGSERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL,
  date        DATE NOT NULL,
  data        JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, date)
);
```

`data` enthält: `meals` (Array von Mahlzeit-Slots mit Items), `activity` (Coins), `bonusCoins`, `budget` (Coins-Ziel).

### `user_profiles`
Gesundheitsdaten und Profil-Infos pro User:

```sql
CREATE TABLE user_profiles (
  user_id       TEXT PRIMARY KEY,
  gewicht       NUMERIC,
  groesse       NUMERIC,
  alter_j       INTEGER,
  geschlecht    TEXT CHECK (geschlecht IN ('m','w','d')),
  aktivitaet    TEXT,
  display_name  TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

`display_name` und `avatar_url` werden beim ersten Laden automatisch aus Clerk synchronisiert, falls noch nicht gesetzt.

### `foods`
Lebensmitteldatenbank mit Nährwertangaben und berechneten Coins:

```sql
CREATE TABLE foods (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  brand         TEXT,
  barcode       TEXT,
  kcal_100g     NUMERIC,
  protein_100g  NUMERIC,
  carbs_100g    NUMERIC,
  sugar_100g    NUMERIC,
  fat_100g      NUMERIC,
  sat_fat_100g  NUMERIC,
  fiber_100g    NUMERIC,
  salt_100g     NUMERIC,
  coins_100g    INTEGER,
  serving_g     NUMERIC,
  serving_label TEXT,
  source        TEXT DEFAULT 'openfoodfacts',
  off_id        TEXT UNIQUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX foods_name_trgm ON foods USING GIN (name gin_trgm_ops);
```

`coins_100g` wird serverseitig berechnet (gleiche Formel wie Punkte-Rechner). `off_id` ist der Unique Key für Open Food Facts Produkte (verhindert Duplikate beim Upsert).

**Befüllung**: Cache-First-Ansatz – bei Suche zuerst Supabase (`ilike`), bei weniger als 5 Treffern Fallback auf Open Food Facts (Global + Österreich parallel via `Promise.allSettled`). Ergebnisse werden in Supabase gecacht.

---

## Environment Variables

### Vercel (Production)

| Variable | Beschreibung |
|---|---|
| `VITE_SUPABASE_URL` | Supabase Projekt-URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anon Key |
| `SUPABASE_URL` | Optional: serverseitige Supabase URL; fällt auf `VITE_SUPABASE_URL` zurück |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key – **Pflicht** für alle serverseitigen Writes |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk Publishable Key |
| `CLERK_SECRET_KEY` | Clerk Secret Key (Server-only) |
| `STRIPE_SECRET_KEY` | Stripe Secret Key |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook Signing Secret |
| `STRIPE_PRICE_ID` | Stripe Price ID für das Premium-Abo |
| `ADMIN_EMAILS` | Komma-getrennte Liste erlaubter Admin-E-Mails (z.B. `lezfez@gmail.com`) |
| `OPENAI_API_KEY` | Server-/Admin-Key für die lokale Rezeptbild-Generierung |
| `OPENAI_IMAGE_MODEL` | Optional, Standard: `gpt-image-1.5` |
| `RECIPE_IMAGE_BUCKET` | Optional, Standard: `recipe-images` |
| `RECIPE_IMAGE_SIZE` | Optional, Standard: `1024x1024` |
| `RECIPE_IMAGE_QUALITY` | Optional, Standard: `medium` |
| `RECIPE_IMAGE_FORMAT` | Optional, Standard: `webp` |

> **Wichtig**: `SUPABASE_SERVICE_ROLE_KEY` muss explizit in Vercel gesetzt werden. `VITE_SUPABASE_ANON_KEY` allein reicht nicht – serverseitige Writes (Journaleinträge, User-Profile, Admin-Aktionen) schlagen sonst mit HTTP 500 fehl.

### Lokal (`.env.local`)

```env
VITE_SUPABASE_URL=https://...supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_URL=https://...supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
ADMIN_EMAILS=deine@email.com
OPENAI_API_KEY=sk-proj_...
```

> **Localhost-Hinweis**: Serverless Functions laufen lokal über `vercel dev`. Mit `npm run dev` (Vite only) sind `/api/`-Endpunkte nicht verfügbar.

---

## Lokale Entwicklung

```bash
npm install
npm run dev        # Vite Dev-Server (kein API-Zugriff)
vercel dev         # Vite + Serverless Functions lokal
```

## Supabase Migrationsworkflow (CLI)

Dieses Repo ist jetzt fuer versionierte Supabase-Migrationen vorbereitet.

- Konfiguration: `supabase/config.toml`
- Migrationen: `supabase/migrations/`
- Bereits ueberfuehrte SQLs:
  - `supabase/migrations/20260613090000_setup_recipe_images.sql`
  - `supabase/migrations/20260613091000_setup_recipe_categories_jsonb.sql`

### Einmalig einrichten

1. Supabase CLI installieren (z. B. per Homebrew):

```bash
brew install supabase/tap/supabase
```

2. Projekt-Ref setzen (aus dem Supabase-Projekt):

```bash
export SUPABASE_PROJECT_REF=dein-project-ref
```

3. Login + Link zum Remote-Projekt:

```bash
npx supabase login
npm run db:link
```

### Migrationen anwenden

```bash
npm run db:push
```

### Neue Migration anlegen

```bash
npm run db:migration:new -- add_new_feature
```

Danach SQL in der erzeugten Datei unter `supabase/migrations/` ergaenzen und mit `npm run db:push` deployen.

Die aktive App liegt im Repository-Root. Der verschachtelte Ordner `ww-points-calculator/` ist eine Legacy-Kopie und wird nicht für Build, Lint oder Deployment verwendet.

Für lokale Stripe Webhooks:
```bash
stripe listen --forward-to localhost:5173/api/stripe-webhook
```

## Rezeptbilder generieren

Die Bildgenerierung ist als lokaler Admin-Job umgesetzt. Sie nutzt den Supabase Service-Role-Key und den OpenAI API-Key, daher läuft sie nicht im Browser.

Einmalig das Datenbank-Setup ausführen:
```bash
# Inhalt von sql/setup-recipe-images.sql im Supabase SQL Editor ausführen
```

Prompts für die ersten fünf fehlenden/fehlgeschlagenen Bilder prüfen:
```bash
npm run generate:recipe-images -- --dry-run
```

Einzelnes Rezept generieren:
```bash
npm run generate:recipe-images -- --recipe-id 3
```

Alle fehlenden oder fehlgeschlagenen Rezeptbilder generieren:
```bash
npm run generate:recipe-images -- --all
```

Bereits vorhandene Bilder werden standardmäßig übersprungen. Mit `--force` werden sie neu generiert:
```bash
npm run generate:recipe-images -- --recipe-id 3 --force
```

---

## Qualitätssicherung

```bash
npm run lint
npm run test
npm run build
```

- `npm run lint` prüft `src/`, `api/` und `vite.config.js` mit getrennten Browser-/Node-Globals.
- `npm run test` führt Formeltests über den Node Test Runner aus.
- `npm run build` erstellt den Vite/PWA-Produktionsbuild.

Der Build splittet große Abhängigkeiten (`clerk`, `supabase`, übrige `vendor`) in separate Chunks, damit der App-Entry klein bleibt.

---

## Erste Admin-Einrichtung

1. `ADMIN_EMAILS=deine@email.com` als Vercel Env-Variable setzen und neu deployen
2. In der App einloggen
3. Auf den kleinen "Als Admin einrichten"-Link am Seitenende klicken (ruft `/api/admin?action=bootstrap` auf)
4. Die Seite lädt neu → Admin-Tab erscheint in der Navigation

Alternativ: In der Clerk Dashboard → Users → publicMetadata manuell `{"role": "admin"}` setzen.

---

## Clerk Benutzerprofil

Clerk wird mit deutscher Lokalisierung (`deDE`) betrieben. Im User-Profil (Clerk-Modal) können zusätzlich folgende Felder gepflegt werden, die in `user_profiles` (Supabase) gespeichert werden:

| Feld | Beschreibung |
|---|---|
| Gewicht (kg) | Für Mifflin-St-Jeor Grundumsatz-Berechnung |
| Größe (cm) | Für Grundumsatz-Berechnung |
| Alter (Jahre) | Für Grundumsatz-Berechnung |
| Geschlecht | m / w / d |
| Aktivitätslevel | Für Aktivitätsfaktor im Tagesbudget |

`display_name` und `avatar_url` werden beim ersten API-Aufruf automatisch aus Clerk synchronisiert.

---

## Open Food Facts Integration

Die Lebensmittelsuche nutzt [Open Food Facts](https://world.openfoodfacts.org) als Datenquelle:

- **Cache-First**: Supabase `foods`-Tabelle wird zuerst durchsucht. Wenn ≥ 5 Treffer → direkte Rückgabe.
- **Fallback**: Parallel-Request an `world.openfoodfacts.org` und `at.openfoodfacts.org` via `Promise.allSettled`.
- **Deduplication**: Gleiche Produkte (nach `off_id`) werden zusammengeführt; österreichische Einträge haben Vorrang.
- **Fehlerbehandlung**: HTTP-Fehler (z.B. 503 bei OFF-Ausfall) werden abgefangen (`!r.ok` Check), die App fällt auf den Cache zurück.
- **Caching**: OFF-Ergebnisse werden in Supabase gespeichert (Upsert mit `onConflict: off_id`).

### Admin-Import

Im Admin-Bereich (Tab "🌍 OFF importieren") können Lebensmittel von OFF gesucht, einzeln oder bulk ausgewählt und in die lokale DB importiert werden. Das `_sourceLabel`-Feld (UI-only, für die Quellanzeige) wird vor dem DB-Insert entfernt.

---

## Design

**Organic Biophilic** – Waldgrün, Terrakotta, warmes Creme-Weiß. Typografie: **Lora** (Serif, große Zahlen/Headlines) + **Raleway** (Body/UI).
