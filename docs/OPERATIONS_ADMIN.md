# Operational Handbuch: Administration

Dieses Dokument ist eine kurze Runbook-Anleitung fuer den Admin-Betrieb in Production und lokal in DEV.

## 1. Ziel und Scope

Abgedeckt sind:
- Admin-Bootstrap
- Rollenverwaltung
- Feature-Flags
- Rezept-Kategorien
- Lokale Verwaltung mit `vercel dev`
- Schnellhilfe bei typischen Fehlern

## 2. Voraussetzungen

Pflicht-Umgebungsvariablen:
- `VITE_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `ADMIN_EMAILS`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Wichtig:
- `VITE_CLERK_PUBLISHABLE_KEY` und `CLERK_SECRET_KEY` muessen aus derselben Clerk-Instanz stammen (beide test oder beide live).
- `ADMIN_EMAILS` ist kommagetrennt und wird in Kleinbuchstaben verglichen.

## 3. Erste Admin-Einrichtung (Bootstrap)

Production:
1. `ADMIN_EMAILS=<deine-mail>` in Vercel setzen.
2. Neu deployen.
3. In der App einloggen.
4. Im Bootstrap-Bereich auf "Als Admin einrichten" klicken.
5. Seite neu laden, Admin-Tab sichtbar.

DEV lokal:
1. `.env.local` mit obigen Variablen fuellen.
2. App mit `vercel dev` starten (nicht nur `npm run dev`).
3. Einloggen.
4. Bootstrap klicken.

## 4. Regelbetrieb (Admin)

### 4.1 Rollen verwalten
1. Admin-Tab -> Users.
2. User suchen.
3. Rolle setzen (`user`, `premium`, `admin`).
4. Aenderung speichern.

### 4.2 Feature-Flags verwalten
1. Admin-Tab -> Zugriff.
2. Mindestrolle oder Aktiv-Status je Flag anpassen.
3. Speichern.

### 4.3 Rezept-Kategorien verwalten
1. Admin-Tab -> Kategorien: anlegen, umbenennen, deaktivieren, loeschen.
2. Admin-Tab -> Rezepte: Kategorien pro Rezept zuordnen.
3. Beim Loeschen verhindert die API das Entfernen, wenn Kategorie noch in Rezepten referenziert ist.

## 5. Lokale Verwaltung (DEV)

Start:
```bash
vercel dev
```

Warum:
- Nur `vercel dev` stellt `api/*` lokal bereit.
- `npm run dev` startet nur Vite und reicht fuer Admin-API-Flows nicht.

Schnelltest lokal:
```bash
curl -i 'http://localhost:3000/api/admin-recipes?action=categories'
```

Erwartung:
- Ohne Token: `401 Nicht authentifiziert`.
- Mit gueltiger Session im Browser und Admin-Rolle: API-Calls im UI `200`.

## 6. Troubleshooting

### Fehler: "Ungueltiger Token (Failed to resolve JWK during verification.)"
Ursache:
- Clerk Keys mismatch oder fehlender `CLERK_SECRET_KEY` in der Laufumgebung.

Fix:
1. Pruefen, dass `CLERK_SECRET_KEY` gesetzt ist.
2. Pruefen, dass Publishable und Secret Key aus derselben Clerk-Instanz kommen.
3. Server neu starten.
4. Im Browser ausloggen/einloggen (neuer Token).

### Fehler: Kategorien laden nicht lokal
Ursache:
- App wurde mit `npm run dev` statt `vercel dev` gestartet.
- Oder nicht eingeloggt/keine Admin-Rolle.

Fix:
1. Mit `vercel dev` starten.
2. Login pruefen.
3. Rolle in Clerk `publicMetadata.role = "admin"`.
4. Network-Tab fuer `/api/admin-recipes` auf `401/403/500` pruefen.

### Fehler: Bootstrap liefert 403
Ursache:
- E-Mail nicht in `ADMIN_EMAILS`.

Fix:
1. `ADMIN_EMAILS` erweitern.
2. Neu deployen (Production) oder lokalen Server neu starten (DEV).

## 7. Sicherheits-Checkliste

- Service-Role-Keys nie im Frontend verwenden.
- Admin-Endpunkte nur mit Bearer-Token aufrufen.
- Role-Changes und Flag-Changes nur aus Admin-UI oder kontrollierten Server-Prozessen.
- Nach Key- oder Env-Aenderungen immer neue Session testen.

## 8. Betriebs-Hinweis

Empfohlener Smoke-Test nach Deploy:
1. Login als Admin.
2. Admin-Tab oeffnen.
3. Users laden.
4. Kategorien laden.
5. Eine kleine Kategorie-Aenderung speichern.
6. Aenderung im UI direkt verifizieren.
