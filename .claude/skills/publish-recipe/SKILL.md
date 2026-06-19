# Publish Recipe Workflow

Vollständiger Workflow zum Veröffentlichen eines neuen Rezepts: Suche → Coins-Berechnung → Datenbank → Bild → Storage.

## Schritte

### 1. Rezept beschaffen
- Bei Screenshots: Text direkt aus dem Bild lesen (Name, Zutaten, Zubereitung, Portionen, Zeit, Kategorie, Coins)
- Bei Websuche: `WebSearch` + `WebFetch` für vollständige Zutaten und Nährwerte
- Texte: Korrigiere automatisch gelesene Texte bzgl. Rechtschreibung, Formatierung, fehlende Angaben (z.B. Portionen, Zeit) und Einheiten (z.B. g, ml). Schreibe menschlich und appetitlich, damit sie direkt in der App verwendet werden können.

### 2. Kategorie bestimmen
Anhand von Name, Zutaten und Zubereitung die passende Kategorie wählen:

| Kategorie | Wann vergeben |
|-----------|---------------|
| `Hauptspeise` | Vollständige Mahlzeit mit Protein + Beilage/Gemüse |
| `Beilage` | Ergänzung zu einem Hauptgericht (z.B. Ofen-Tofu, Salat als Beilage) |
| `Suppe` | Flüssige Gerichte, Eintöpfe, Miso |
| `Salat` | Überwiegend Rohkost/Blattsalat als Hauptkomponente |
| `Frühstück` | Scramble, Porridge, Pancakes, Overnight Oats |
| `Dessert` | Süße Nachspeisen, Mousse, Pudding |
| `Kuchen` | Gebackene Kuchen, Torten, Muffins, Kekse |
| `Brot` | Brot, Brötchen, Wraps selbstgebacken |
| `Snack` | Kleine Happen, Dips, Aufstriche |
| `Low Carb` | Gerichte mit max. 20 g Kohlenhydraten pro Portion als Hauptmerkmal |

### 3. Coins berechnen
Formel (pro Portion):
```
coins = kcal×0.022 + gesF×0.20 + zucker×0.10 + salz×0.15 − protein×0.10 − bst×0.15
```
- `gesF` = gesättigte Fettsäuren (nicht Gesamtfett)
- Erythrit zählt nicht als Zucker
- Ergebnis kaufmännisch runden

### 3. In Datenbank speichern
Drei Tabellen befüllen mit dem Supabase Service Role Key (`SUPABASE_SERVICE_ROLE_KEY` aus `.env.local`).

**WICHTIG — Script-Ort:** Node.js (ESM) löst `import`-Pakete relativ zum Dateiort auf. Scripts dürfen NIEMALS nach `/tmp/` geschrieben werden — dort gibt es kein `node_modules`. Stattdessen:
```bash
# Script ins Projektverzeichnis schreiben, dann ausführen, dann löschen
cat > /Volumes/SSD_1TB_SD1/react/ww-points-calculator/.tmp_recipe.mjs << 'EOF'
import { createClient } from '@supabase/supabase-js';
// ...
EOF
node /Volumes/SSD_1TB_SD1/react/ww-points-calculator/.tmp_recipe.mjs
rm /Volumes/SSD_1TB_SD1/react/ww-points-calculator/.tmp_recipe.mjs
```

Tabellen:
```js
// recipes
{ name, coins, portionen, zeit, kategorie, hinweis, url }

// recipe_ingredients
{ recipe_id, ingredient, position }  // position ab 1

// recipe_steps
{ recipe_id, step_text, position }   // position ab 1
```

### 4. Bild via Hugging Face generieren
Modell: `black-forest-labs/FLUX.1-schnell`  
Token: `HF_TOKEN` aus `.env.local`

```js
const prompt = `Appetizing photorealistic food photo of "${name}", editorial food photography, 3/4 overhead view, natural daylight on warm kitchen table, realistic colors, no text, no watermark, no people`;

fetch(`https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${HF_TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ inputs: prompt, parameters: { width: 512, height: 384 } }),
  signal: AbortSignal.timeout(90000),
})
```

### 5. Bild in Supabase Storage hochladen & Rezept aktualisieren
```js
// Upload
supabase.storage.from('recipe-images').upload(`${id}.jpg`, imgBuffer, {
  contentType: 'image/jpeg', upsert: true
})

// Rezept aktualisieren
supabase.from('recipes').update({
  image_status: 'ready',
  image_path: `${id}.jpg`,
  image_url: publicUrl,
  image_generated_at: new Date().toISOString(),
}).eq('id', id)
```

## Status-Werte für `image_status`
- `generating` — wird gerade generiert
- `ready` — fertig
- `failed` — Fehler aufgetreten

## Zusammenfassung nach Abschluss
```
✓ Rezept gespeichert   ID: {id}
✓ Coins berechnet      {coins} Coins/Portion
✓ Bild generiert       {image_url}
```
