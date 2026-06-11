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

### WF Rezepte
Rezepte von weightfriends.at mit Coins-Werten, Kategoriefilter, Textsuche und Sortierung nach Coins.

### Info
Hintergründe zu den Formeln und zur Herleitung der weight friends Coins-Formel.

### Admin-Bereich (nur Admin-Rolle)
- **Zugriffssteuerung**: Mindestrolle pro Tab konfigurieren (Gast / Registriert / Premium / Admin), Tabs deaktivieren
- **Benutzerverwaltung**: Clerk-User per E-Mail suchen, Rollen zuweisen

---

## Tech Stack

| Schicht | Technologie |
|---|---|
| Frontend | React 19 + Vite 8 |
| Fonts | Lora (Serif, Headings) + Raleway (Body/UI) |
| Auth | Clerk (`@clerk/clerk-react`, `@clerk/backend`) |
| Datenbank | Supabase (Rezepte + Feature Flags) |
| Payments | Stripe (monatliches Premium-Abo) |
| Hosting | Vercel (Serverless Functions in `/api/`) |

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

| Endpoint | Methode | Beschreibung |
|---|---|---|
| `/api/create-checkout-session` | POST | Stripe Checkout für Premium-Abo |
| `/api/stripe-webhook` | POST | Stripe Webhook → setzt `isPremium: true` in Clerk |
| `/api/admin-bootstrap` | POST | Setzt eigene Rolle auf `admin` (E-Mail muss in `ADMIN_EMAILS` stehen) |
| `/api/admin-get-users` | GET | Listet Clerk-User (Admin-only, max. 25, Suche per `?query=`) |
| `/api/admin-set-role` | POST | Setzt Rolle eines Users in Clerk (Admin-only) |
| `/api/admin-set-flag` | POST | Aktualisiert Feature Flag in Supabase (Admin-only) |

Alle Admin-Endpoints verifizieren den Clerk JWT (`Authorization: Bearer <token>`) und prüfen `publicMetadata.role === "admin"`.

---

## Supabase Schema

### `recipes`
Rezepte von weightfriends.at mit `recipe_ingredients` und `recipe_steps` (separate Tabellen, via JOIN geladen).

### `feature_flags`
Steuert Zugriffsanforderungen pro Tab/Feature:

```sql
CREATE TABLE feature_flags (
  id             TEXT PRIMARY KEY,          -- z.B. "tab_budget"
  label          TEXT NOT NULL,
  description    TEXT,
  required_role  TEXT NOT NULL DEFAULT 'guest'
                 CHECK (required_role IN ('guest','user','premium','admin')),
  enabled        BOOLEAN NOT NULL DEFAULT true,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Standard-Einträge: `tab_calc`, `tab_budget`, `tab_recipes`, `tab_info`

---

## Environment Variables

### Vercel (Production)

| Variable | Beschreibung |
|---|---|
| `VITE_SUPABASE_URL` | Supabase Projekt-URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key für serverseitige Admin-Writes |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk Publishable Key |
| `CLERK_SECRET_KEY` | Clerk Secret Key (Server-only) |
| `STRIPE_SECRET_KEY` | Stripe Secret Key |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook Signing Secret |
| `STRIPE_PRICE_ID` | Stripe Price ID für das Premium-Abo |
| `ADMIN_EMAILS` | Komma-getrennte Liste erlaubter Admin-E-Mails (z.B. `lezfez@gmail.com`) |

### Lokal (`.env.local`)

```env
VITE_SUPABASE_URL=https://...supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
ADMIN_EMAILS=deine@email.com
```

---

## Lokale Entwicklung

```bash
npm install
npm run dev
```

Die aktive App liegt im Repository-Root. Der verschachtelte Ordner `ww-points-calculator/` ist eine Legacy-Kopie und wird nicht für Build, Lint oder Deployment verwendet.

Für lokale Stripe Webhooks:
```bash
stripe listen --forward-to localhost:5173/api/stripe-webhook
```

---

## Erste Admin-Einrichtung

1. `ADMIN_EMAILS=deine@email.com` als Vercel Env-Variable setzen und neu deployen
2. In der App einloggen
3. Auf den kleinen "Als Admin einrichten"-Link am Seitenende klicken
4. Die Seite lädt neu → Admin-Tab erscheint in der Navigation

Alternativ: In der Clerk Dashboard → Users → publicMetadata manuell `{"role": "admin"}` setzen.

---

## Design

**Organic Biophilic** – Waldgrün, Terrakotta, warmes Creme-Weiß. Typografie: **Lora** (Serif, große Zahlen/Headlines) + **Raleway** (Body/UI).
