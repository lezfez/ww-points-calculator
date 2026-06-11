import { useState, useMemo } from "react";
import {
  calcClassic,
  calcCoins,
  calcDailyBudget,
  calcPersonalPoints,
  calcProPoints,
  calcSmartPoints,
} from "./lib/points";

// ════════════════════════════════════════════════════════════
// REZEPTDATEN (von weightfriends.at)
// ════════════════════════════════════════════════════════════
const RECIPES = [
  {
    id: 1, name: "Deftige Krautpfanne mit Faschiertem",
    coins: 5, portionen: 4, zeit: "30 Min", kategorie: "Hauptspeise",
    zutaten: ["250 g mageres Faschiertes (7 % Fett)", "1 Zwiebel", "500 g Kraut", "500 g Kartoffeln", "2 Tomaten", "3 TL Paprikapulver mild", "½ TL Kümmel gemahlen", "1 EL Tomatenmark", "2,5 EL Suppengewürz", "1 Prise Chili", "Salz", "½ Bund Petersilie", "2 EL Skyr"],
    zubereitung: "Zwiebel schälen und fein würfeln. Kraut in 5 mm Streifen schneiden. Kartoffeln schälen und in ca. 1 cm Würfel schneiden. Tomaten fein würfeln. Faschiertes in einer beschichteten Pfanne scharf anbraten. Zwiebel zugeben und glasig braten. Gewürze und Gemüse hinzugeben, mit ½ Liter Wasser aufgießen. 10 Minuten zugedeckt, dann weitere 10 Minuten offen köcheln lassen. Mit Skyr und Petersilie servieren.",
    hinweis: "1 Gemüseportion enthalten", url: "https://www.weightfriends.at/aktuelles/rezepte/deftige-krautpfanne-mit-faschiertem"
  },
  {
    id: 2, name: "Spinat-Wrap mit Hühnerfilet",
    coins: 4, portionen: 2, zeit: "35 Min", kategorie: "Hauptspeise",
    zutaten: ["200 g Hühnerfilet", "200 ml Wasser", "2 Zweige Rosmarin", "100 g Spinat", "2 Eier", "100 g Skyr", "1 EL Essig", "1 Karotte", "6 Kirschtomaten", "1 Handvoll Rucola", "Salz, Pfeffer", "2 TL Öl", "flüssiger Süßstoff"],
    zubereitung: "Hühnerfilet in dünne Streifen schneiden, würzen. 1 TL Öl erhitzen, Fleisch scharf anbraten. Mit Wasser aufgießen, Rosmarin einlegen, köcheln bis Wasser verdampft. Spinat mit Eiern und Salz pürieren. 1 TL Öl in Palatschinkenpfanne, Spinatmasse eingießen, bei mittlerer Hitze stocken lassen. Als Wrap füllen.",
    hinweis: "", url: "https://www.weightfriends.at/aktuelles/rezepte/spinat-wrap-mit-huehnerfilet"
  },
  {
    id: 3, name: "Ritschert",
    coins: 5, portionen: 4, zeit: "40 Min", kategorie: "Hauptspeise",
    zutaten: ["1 Zwiebel", "3 Knoblauchzehen", "1 Bund Suppengemüse", "500 g mageres Geselchtes", "1 Fleischtomate", "1 Zucchini", "4 TL Öl", "100 g Rollgerste", "750 ml Gemüsebrühe", "1 Dose weiße Bohnen (240 g Abtropfgewicht)", "Salz, Pfeffer", "1 TL Majoran", "½ Bund Petersilie"],
    zubereitung: "Zwiebel und Knoblauch fein hacken. Suppengemüse klein würfeln. Geselchtes, Tomate und Zucchini würfeln. Zwiebel in Öl glasig dünsten. Suppengemüse, Geselchtes, Tomate und Rollgerste zugeben, mit Brühe aufgießen. Knoblauch und Majoran hinzugeben. 35 Minuten zugedeckt kochen. Bohnen, Zucchini und 100 ml Wasser zugeben, weitere 10 Minuten köcheln. Mit frischem Majoran bestreuen.",
    hinweis: "1 Öl- und 1 Gemüseportion enthalten", url: "https://www.weightfriends.at/aktuelles/rezepte/ritschert"
  },
  {
    id: 4, name: "Waldviertler Topfenkäse",
    coins: 2, portionen: 4, zeit: "20 Min", kategorie: "Beilage / Aufstrich",
    zutaten: ["200 g Erdäpfel", "400 g Magertopfen", "4 TL Pflanzenmargarine", "1 Knoblauchzehe gepresst", "Salz, Pfeffer, Paprikapulver"],
    zubereitung: "Erdäpfel schälen, kochen und reiben. Topfen, Margarine und Knoblauch verrühren. Erdäpfel untermengen. Mit Gewürzen abschmecken. Mit Eiweißbrot oder Vollkornbrot, buntem Gemüse und Kräutern genießen.",
    hinweis: "1 Ölportion enthalten", url: "https://www.weightfriends.at/aktuelles/rezepte/waldviertler-topfenkaese"
  },
  {
    id: 5, name: "Reisfleisch",
    coins: 7, portionen: 1, zeit: "40 Min", kategorie: "Hauptspeise",
    zutaten: ["1 kleine Zwiebel", "1 Knoblauchzehe gepresst", "1 TL Öl", "150 g Putenbrustfleisch", "1 TL Paprikapulver", "250 ml Gemüsebrühe", "½ Stange Lauch", "1 Paradeiser", "½ grüner Paprika", "½ roter Paprika", "50 g Vollkornreis", "Kerbel, Salz, Pfeffer"],
    zubereitung: "Zwiebel mit Knoblauch im Öl anrösten. Fleisch zugeben und mitrösten. Paprikapulver zugeben und mit Brühe aufgießen. Lauch, Paradeiser und Paprika klein schneiden, mit dem Reis zugeben. 30 Minuten garen. Mit Salz und Pfeffer abschmecken, mit Kerbel garniert servieren. Dazu passt grüner Salat.",
    hinweis: "", url: "https://www.weightfriends.at/aktuelles/rezepte/reisfleisch"
  },
  {
    id: 6, name: "Pikantes Reisfleisch",
    coins: 7, portionen: 4, zeit: "40 Min", kategorie: "Hauptspeise",
    zutaten: ["500 g Putenbrustfleisch", "4 TL Öl", "1 Zwiebel", "2 Paprika", "2 Fleischtomaten", "2 kleine Zucchini", "200 g Reis", "300 ml Wasser", "1 Suppenwürfel", "1 TL Paprikapulver", "1 TL Thymian", "1 EL Tomatenmark", "1 EL Grillgewürz", "1 Knoblauchzehe"],
    zubereitung: "Zwiebel und Knoblauch fein hacken, Gemüse würfeln. Fleisch würfeln und mit Grillgewürz einreiben. Öl erhitzen, Fleisch scharf anbraten und beiseitestellen. Zwiebel glasig dünsten. Gemüse, Reis, Knoblauch zugeben, 3 Min anbraten. Mit Wasser aufgießen, Suppenwürfel, Tomatenmark und Gewürze hinzugeben. Bei schwacher Hitze 20 Min köcheln.",
    hinweis: "1 Ölportion enthalten", url: "https://www.weightfriends.at/aktuelles/rezepte/pikantes-reisfleisch"
  },
  {
    id: 7, name: "Hühnerschnitzel Florentiner Art",
    coins: 3, portionen: 4, zeit: "60 Min", kategorie: "Hauptspeise",
    zutaten: ["400 g Spinat", "1 Zwiebel", "2 Knoblauchzehen", "2 Tomaten", "500 g Hühnerfilet", "2 EL Mehl", "4 TL Öl", "1 Dose stückige Tomaten", "1 kleiner Bund Petersilie", "100 g geriebener Käse (30 % F.i.Tr.)", "2 Zweige Basilikum", "Salz, Pfeffer, Muskat"],
    zubereitung: "Zwiebel und Knoblauch fein schneiden. Tomaten in Scheiben schneiden. Knoblauch leicht anrösten, Spinat zugeben, zusammenfallen lassen. Würzen und beiseitestellen. Fleisch waagrecht einschneiden, im Öl scharf anbraten. Spinat in Auflaufform, Fleisch darauflegen. Zwiebel andünsten, Mehl unterrühren, Dosentomaten einrühren. Sauce über Fleisch gießen, mit Käse bestreuen, bei 200 °C 20 Min backen.",
    hinweis: "1 Öl- und 1 Gemüseportion enthalten", url: "https://www.weightfriends.at/aktuelles/rezepte/huehnerschnitzel-florentiner-art"
  },
  {
    id: 8, name: "Malakofftorte",
    coins: 10, portionen: 8, zeit: "60 Min + 5h Kühlzeit", kategorie: "Dessert",
    zutaten: ["¼ l Milch bis 1 % Fett", "2 Dotter", "2 EL Erythrit", "3 Blatt Gelatine", "250 ml Cremefine zum Aufschlagen (19 % Fett)", "200 ml Kaffee", "1 TL Rumaroma", "40 Biskotten"],
    zubereitung: "Milch, Dotter und Erythrit über Wasserbad warm schlagen. Gelatine in kaltem Wasser einweichen, ausdrücken und in warmer Dottermasse auflösen. Auskühlen lassen. Cremefine aufschlagen und untermischen. Kaffee mit Rumaroma vermischen. Biskotten eintunken, abwechselnd mit Creme in Springform schichten. Mind. 5 Stunden kalt stellen. Mit frischen Beeren servieren.",
    hinweis: "", url: "https://www.weightfriends.at/aktuelles/rezepte/malakofftorte"
  },
  {
    id: 9, name: "Hummus Pasta mit Karamellzwiebeln",
    coins: 10, portionen: 2, zeit: "30 Min", kategorie: "Vegetarisch",
    zutaten: ["200 g Pasta aus Kichererbsen", "2 große Zwiebeln", "2 TL Öl", "2 Tomaten", "230 g Kichererbsen (Abtropfgewicht)", "½ Zitrone", "2 Knoblauchzehen", "1 EL Tahini", "150 ml Eiswasser", "1 TL Thymian", "Salz, Pfeffer"],
    zubereitung: "Nudeln laut Packungsanweisung kochen, abseihen und abschrecken. Zwiebeln halbieren und in dünne Scheiben schneiden, im Öl bei sehr niedriger Hitze 10 Min anschwitzen. Tomaten würfeln und zu den Zwiebeln geben, weiterköcheln. Kichererbsen, Zitronensaft, Knoblauch, Tahini und Eiswasser fein pürieren. Zu den Zwiebeln geben, Nudeln hinzufügen, erhitzen, würzen.",
    hinweis: "", url: "https://www.weightfriends.at/aktuelles/rezepte/hummus-pasta-mit-karamellzwiebeln"
  },
  {
    id: 10, name: "Low Carb Schüttelpizza Tonno",
    coins: 10, portionen: 2, zeit: "30 Min", kategorie: "Hauptspeise",
    zutaten: ["1 Frühlingszwiebel", "250 g Magertopfen", "100 g Bierkäse gerieben", "2 Eier", "1 Dose Thunfisch in Wasser", "100 g Tomatensauce", "1 kleine Dose Mais", "1 g Mozzarella light gerieben", "1 Knoblauchzehe", "Pizzagewürz, Salz, Pfeffer"],
    zubereitung: "Topfen, Käse, Eier, Frühlingszwiebel und Knoblauch zu einem Teig mischen. In einer gefetteten Auflaufform verteilen. Mit Tomatensauce bestreichen. Thunfisch und Mais darauf verteilen. Mit Mozzarella bestreuen und bei 180 °C ca. 20 Min backen.",
    hinweis: "", url: "https://www.weightfriends.at/aktuelles/rezepte/low-carb-schuettelpizza-tonno"
  },
  {
    id: 11, name: "Pizzaschnecken",
    coins: 5, portionen: 4, zeit: "60 Min", kategorie: "Snack",
    zutaten: ["1 Portion Pizzateig", "1 kleine Dose Mais", "100 g Tomatensauce", "100 g Mozzarella light gerieben", "1 Knoblauchzehe", "Pizzagewürz, Salz, Pfeffer"],
    zubereitung: "Pizzateig ausrollen. Mit Tomatensauce, Knoblauch und Gewürzen bestreichen. Mais und Mozzarella darauf verteilen. Teig einrollen und in Scheiben schneiden. Auf einem Backblech bei 200 °C ca. 20 Min backen.",
    hinweis: "", url: "https://www.weightfriends.at/aktuelles/rezepte/pizzaschnecken"
  },
  {
    id: 12, name: "Marillenkuchen",
    coins: 2, portionen: 36, zeit: "60 Min", kategorie: "Dessert",
    zutaten: ["500 g Marillen", "4 mittlere Eier", "100 g Streusüße", "4 EL Erythrit", "4 EL Pflanzenöl", "100 g Apfelmus (ohne Zucker)", "250 g glattes Mehl", "½ Pkg. Backpulver", "100 ml Wasser", "2 EL Marillenmarmelade (kalorienreduziert)"],
    zubereitung: "Marillen halbieren und entsteinen. Eier trennen. Eiklar mit Streusüße zu cremigem Schnee schlagen. Dotter und Erythrit ca. 5 Minuten cremig mixen. Öl und Apfelmus untermischen. Mehl und Backpulver sieben und abwechselnd mit dem Wasser unterrühren. Schnee vorsichtig unterheben. Teig in eine Backform füllen, halbierten Marillen darauf verteilen und bei 180°C ca. 35 Minuten backen. Noch heiß mit Marillenmarmelade bestreichen.",
    hinweis: "Sehr ergiebig – 36 kleine Stücke", url: "https://www.weightfriends.at/aktuelles/rezepte/marillenkuchen"
  },
  {
    id: 13, name: "Bunte Couscous Bowl mit Steakstreifen",
    coins: 7, portionen: 1, zeit: "30 Min", kategorie: "Hauptspeise",
    zutaten: ["50 g Couscous", "150 g Rindersteak", "1 TL Öl", "100 g Cocktailparadeiser", "1 Midi-Gurke", "3 EL Edamame (Sojabohnen)", "1 Jungzwiebel", "2 kleine Karotten (gelb, orange)", "Dressing: Saft von 1 Zitrone", "2 EL Orangensaft", "½ TL Kreuzkümmel gemahlen", "1 TL Olivenöl", "2 EL Wasser", "Salz, Pfeffer"],
    zubereitung: "Couscous nach Packungsanleitung zubereiten und auskühlen lassen. Steak beidseitig würzen und im Öl scharf anbraten. Locker in Alufolie wickeln und 10 Minuten ruhen lassen. Gemüse putzen und in Stücke schneiden. Karotten mit einem Schäler in Streifen hobeln. Zutaten nebeneinander in einer Schüssel anrichten. Steak in Streifen schneiden und zugeben. Für das Dressing alle Zutaten verrühren und abschmecken. Bowl damit beträufeln.",
    hinweis: "2 Öl- und 2 Gemüseportionen enthalten. Variierbar mit Tofu, Fisch, Quinoa oder Vollkornreis.", url: "https://www.weightfriends.at/aktuelles/rezepte/bunte-couscous-bowl-mit-steakstreifen"
  },
];

const KATEGORIEN = ["Alle", ...Array.from(new Set(RECIPES.map(r => r.kategorie)))];

// ════════════════════════════════════════════════════════════
// DESIGN
// ════════════════════════════════════════════════════════════
const C = {
  bg: "#F5F7FA", surface: "#FFFFFF", border: "#E2E8F0",
  accent: "#7C3AED",    // weightfriends Lila
  accent2: "#5B21B6",
  coin: "#D97706",      // Gold für Coins
  coinBg: "#FEF3C7",
  green: "#059669", greenBg: "#ECFDF5",
  text: "#1E1B4B", sub: "#6B7280", muted: "#9CA3AF",
  ww: "#00A551",        // WW-Grün für WW-Systems
  chipUp: "#FEE2E2", chipUpText: "#B91C1C",
  chipDn: "#D1FAE5", chipDnText: "#065F46",
};
const S = {
  wrap: { minHeight: "100vh", background: C.bg, fontFamily: "'Inter',system-ui,sans-serif", color: C.text },
  header: {
    background: "linear-gradient(135deg,#7C3AED 0%,#5B21B6 100%)",
    padding: "18px 24px 16px", display: "flex", alignItems: "center", gap: 14
  },
  logo: { width: 42, height: 42, borderRadius: 12, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 20 },
  headerText: { color: "#fff" },
  nav: { background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 20px", display: "flex", gap: 2, overflowX: "auto" },
  navBtn: (a) => ({
    padding: "14px 18px", border: "none", background: "none", cursor: "pointer",
    fontWeight: a ? 700 : 500, fontSize: 14, whiteSpace: "nowrap",
    color: a ? C.accent : C.sub, borderBottom: a ? `2px solid ${C.accent}` : "2px solid transparent",
    transition: "all .15s",
  }),
  main: { maxWidth: 820, margin: "0 auto", padding: "24px 16px 60px" },
  card: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "20px 22px", marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 14 },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: "12px 16px" },
  label: { fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 4, display: "block" },
  input: { padding: "9px 11px", border: `1.5px solid ${C.border}`, borderRadius: 9, fontSize: 14, color: C.text, background: C.bg, outline: "none", width: "100%", boxSizing: "border-box" },
  select: { padding: "9px 11px", border: `1.5px solid ${C.border}`, borderRadius: 9, fontSize: 14, color: C.text, background: C.bg, outline: "none", width: "100%", boxSizing: "border-box" },
  btn: (col) => ({ width: "100%", padding: "12px 0", background: col || C.accent, color: "#fff", border: "none", borderRadius: 11, fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 10, letterSpacing: ".02em" }),
  divider: { borderTop: `1px solid ${C.border}`, margin: "18px 0" },
  pill: (col, bg) => ({ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, color: col, background: bg }),
  resultRow: { display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center", padding: "20px 0 8px" },
  scoreBig: () => ({ textAlign: "center", flex: "1 1 120px" }),
  scoreNum: (col) => ({ fontSize: 44, fontWeight: 900, color: col, lineHeight: 1 }),
  scoreLbl: { fontSize: 12, color: C.muted, marginTop: 3 },
  // Rezept-Cards
  recipeGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 },
  recipeCard: (open) => ({
    background: C.surface, border: `1px solid ${open ? C.accent : C.border}`,
    borderRadius: 14, padding: "16px 18px", cursor: "pointer",
    transition: "border-color .15s, box-shadow .15s",
    boxShadow: open ? "0 0 0 3px rgba(124,58,237,.12)" : "none",
  }),
  coinBadge: { display: "inline-flex", alignItems: "center", gap: 4, background: C.coinBg, color: C.coin, fontWeight: 800, fontSize: 15, padding: "3px 10px", borderRadius: 20, marginBottom: 8 },
  disclaimer: { fontSize: 11, color: C.muted, textAlign: "center", marginTop: 14, fontStyle: "italic", lineHeight: 1.5 },
  searchBar: { padding: "10px 14px", border: `1.5px solid ${C.border}`, borderRadius: 11, fontSize: 14, width: "100%", boxSizing: "border-box", marginBottom: 16, background: C.bg, color: C.text, outline: "none" },
  filterRow: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 },
  filterBtn: (a) => ({ padding: "6px 13px", borderRadius: 20, border: `1.5px solid ${a ? C.accent : C.border}`, background: a ? "rgba(124,58,237,.08)" : C.surface, color: a ? C.accent2 : C.sub, fontWeight: a ? 700 : 500, fontSize: 12, cursor: "pointer" }),
};

// ════════════════════════════════════════════════════════════
// FIELD DEFINITIONS
// ════════════════════════════════════════════════════════════
const FIELD_DEFS = {
  kcal:   { label: "Kalorien (kcal)", step: 1 },
  fett:   { label: "Fett gesamt (g)", step: 0.1 },
  gesF:   { label: "Gesättigte Fettsäuren (g)", step: 0.1 },
  ungesF: { label: "Ungesättigte Fettsäuren (g)", step: 0.1 },
  kh:     { label: "Kohlenhydrate (g)", step: 0.1 },
  zucker: { label: "davon Zucker (g)", step: 0.1 },
  protein:{ label: "Protein / Eiweiß (g)", step: 0.1 },
  bst:    { label: "Ballaststoffe (g)", step: 0.1 },
  salz:   { label: "Salz (g)", step: 0.1 },
};
const SYS_FIELDS = {
  coins:    ["kcal", "gesF", "zucker", "protein", "bst", "salz"],
  personal: ["kcal", "gesF", "ungesF", "zucker", "protein", "bst"],
  smart:    ["kcal", "gesF", "zucker", "protein"],
  pro:      ["protein", "kh", "fett", "bst"],
  classic:  ["kcal", "fett"],
};
const SYSTEMS = [
  { id: "coins",    label: "💜 weight friends Coins", sub: "Österreich" },
  { id: "personal", label: "PersonalPoints™", sub: "WW 2022+" },
  { id: "smart",    label: "SmartPoints™",    sub: "WW 2015–21" },
  { id: "pro",      label: "ProPoints™",      sub: "WW 2010–15" },
  { id: "classic",  label: "Classic Points",  sub: "WW bis 2010" },
];

// ════════════════════════════════════════════════════════════
// SMALL COMPONENTS
// ════════════════════════════════════════════════════════════
function Field({ id, def, value, onChange }) {
  return (
    <div>
      <label style={S.label} htmlFor={id}>{def.label}</label>
      <input id={id} type="number" min={0} step={def.step} style={S.input}
        value={value} placeholder="0"
        onChange={e => onChange(id, e.target.value)} />
    </div>
  );
}

function RecipeCard({ recipe, onSelect, selected }) {
  return (
    <div style={S.recipeCard(selected)} onClick={() => onSelect(selected ? null : recipe.id)}>
      <div style={S.coinBadge}>🪙 {recipe.coins} Coins</div>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{recipe.name}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: selected ? 12 : 0 }}>
        <span style={S.pill(C.sub, C.bg)}>{recipe.kategorie}</span>
        <span style={S.pill(C.sub, C.bg)}>⏱ {recipe.zeit}</span>
        <span style={S.pill(C.sub, C.bg)}>👥 {recipe.portionen} Port.</span>
      </div>
      {selected && (
        <div style={{ marginTop: 10, fontSize: 13, color: C.text }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: C.accent }}>Zutaten</div>
          <ul style={{ margin: "0 0 12px", padding: "0 0 0 18px", lineHeight: 1.8 }}>
            {recipe.zutaten.map((z, i) => <li key={i}>{z}</li>)}
          </ul>
          <div style={{ fontWeight: 700, marginBottom: 6, color: C.accent }}>Zubereitung</div>
          <p style={{ margin: "0 0 8px", lineHeight: 1.7 }}>{recipe.zubereitung}</p>
          {recipe.hinweis && (
            <div style={{ ...S.pill(C.green, C.greenBg), fontSize: 12 }}>ℹ️ {recipe.hinweis}</div>
          )}
          <a href={recipe.url} target="_blank" rel="noreferrer"
            style={{ display: "block", marginTop: 10, fontSize: 12, color: C.accent, textDecoration: "underline" }}>
            → Rezept auf weightfriends.at
          </a>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN APP
// ════════════════════════════════════════════════════════════
export default function App() {
  const [tab, setTab] = useState("calc");
  const [system, setSystem] = useState("coins");
  const [vals, setVals] = useState({ kcal:"", fett:"", gesF:"", ungesF:"", kh:"", zucker:"", protein:"", bst:"", salz:"" });
  const [result, setResult] = useState(null);
  const [budget, setBudget] = useState({ gewicht:"", groesse:"", alter:"", geschlecht:"w", aktivitaet:"sitzend" });
  const [budgetResult, setBudgetResult] = useState(null);
  const [openRecipe, setOpenRecipe] = useState(null);
  const [search, setSearch] = useState("");
  const [kat, setKat] = useState("Alle");

  const n = k => parseFloat(vals[k]) || 0;
  const b = k => parseFloat(budget[k]) || 0;

  const handleVal = (k, v) => { setVals(p => ({ ...p, [k]: v })); setResult(null); };
  const handleBudget = (k, v) => { setBudget(p => ({ ...p, [k]: v })); setBudgetResult(null); };

  const calculate = () => {
    let r = {};
    const d = { kcal: n("kcal"), fett: n("fett"), gesF: n("gesF"), ungesF: n("ungesF"), kh: n("kh"), zucker: n("zucker"), protein: n("protein"), bst: n("bst"), salz: n("salz") };
    r.coins    = calcCoins(d);
    r.personal = calcPersonalPoints(d);
    r.smart    = calcSmartPoints(d);
    r.pro      = calcProPoints(d);
    r.classic  = calcClassic(d);
    setResult(r);
  };

  const calcBudget = () => {
    const br = calcDailyBudget({ gewicht: b("gewicht"), groesse: b("groesse"), alter: b("alter"), geschlecht: budget.geschlecht, aktivitaet: budget.aktivitaet });
    setBudgetResult(br);
  };

  const filteredRecipes = useMemo(() =>
    RECIPES.filter(r =>
      (kat === "Alle" || r.kategorie === kat) &&
      (search === "" || r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.zutaten.some(z => z.toLowerCase().includes(search.toLowerCase())))
    ), [kat, search]);

  const tabs = [
    { id: "calc",    label: "🔢 Berechnen" },
    { id: "budget",  label: "📅 Tagesbudget" },
    { id: "recipes", label: "🍽️ WF Rezepte" },
    { id: "info",    label: "ℹ️ Info" },
  ];

  return (
    <div style={S.wrap}>
      {/* ─ Header ─ */}
      <header style={S.header}>
        <div style={S.logo}>WF</div>
        <div style={S.headerText}>
          <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-.02em" }}>weight friends & WW Rechner</div>
          <div style={{ fontSize: 12, opacity: .8 }}>Coins · PersonalPoints · SmartPoints · ProPoints · Classic</div>
        </div>
      </header>

      {/* ─ Nav ─ */}
      <nav style={S.nav}>
        {tabs.map(t => <button key={t.id} style={S.navBtn(tab === t.id)} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </nav>

      <main style={S.main}>

        {/* ══ TAB: BERECHNEN ══ */}
        {tab === "calc" && (
          <>
            {/* System-Wahl */}
            <div style={S.card}>
              <div style={S.sectionTitle}>Punktesystem wählen</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {SYSTEMS.map(s => (
                  <button key={s.id} onClick={() => { setSystem(s.id); setResult(null); }}
                    style={{ ...S.filterBtn(system === s.id), display: "flex", flexDirection: "column", alignItems: "flex-start", padding: "8px 14px" }}>
                    <span style={{ fontSize: 13 }}>{s.label}</span>
                    <span style={{ fontSize: 10, fontWeight: 400, opacity: .7 }}>{s.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Nährwerte */}
            <div style={S.card}>
              <div style={S.sectionTitle}>Nährwerte pro Portion eingeben</div>
              <div style={S.grid2}>
                {SYS_FIELDS[system].map(fid => (
                  <Field key={fid} id={fid} def={FIELD_DEFS[fid]} value={vals[fid]} onChange={handleVal} />
                ))}
              </div>
              <button style={S.btn(system === "coins" ? C.coin : C.accent)} onClick={calculate}>
                {system === "coins" ? "🪙 Coins berechnen" : "Punkte berechnen"}
              </button>
            </div>

            {/* Ergebnis */}
            {result && (
              <div style={S.card}>
                <div style={S.sectionTitle}>Ergebnis – alle Systeme im Vergleich</div>
                <div style={S.resultRow}>
                  <div style={S.scoreBig()}>
                    <div style={S.scoreNum(C.coin)}>{result.coins}</div>
                    <div style={S.scoreLbl}>💜 Coins (wf)</div>
                  </div>
                  <div style={S.scoreBig()}>
                    <div style={S.scoreNum(C.ww)}>{result.personal}</div>
                    <div style={S.scoreLbl}>PersonalPoints</div>
                  </div>
                  <div style={S.scoreBig()}>
                    <div style={S.scoreNum(C.ww)}>{result.smart}</div>
                    <div style={S.scoreLbl}>SmartPoints</div>
                  </div>
                  <div style={S.scoreBig()}>
                    <div style={S.scoreNum(C.sub)}>{result.pro}</div>
                    <div style={S.scoreLbl}>ProPoints</div>
                  </div>
                  <div style={S.scoreBig()}>
                    <div style={S.scoreNum(C.sub)}>{result.classic}</div>
                    <div style={S.scoreLbl}>Classic</div>
                  </div>
                </div>
              </div>
            )}

            {/* Formel-Box */}
            <div style={{ ...S.card, background: "#FAF5FF", borderColor: "#DDD6FE" }}>
              <div style={S.sectionTitle}>Verwendete Formeln</div>
              <div style={{ fontSize: 12, color: C.text, lineHeight: 2, fontFamily: "monospace" }}>
                <b style={{ color: C.coin }}>Coins (wf):</b> kcal×0.022 + gesF×0.20 + Zucker×0.10 + Salz×0.15 − Protein×0.10 − Bst×0.15<br />
                <b style={{ color: C.ww }}>PersonalPoints:</b> SmartPoints − Bst×0.14 − ungesF×0.07<br />
                <b style={{ color: C.ww }}>SmartPoints:</b> kcal×0.0305 + gesF×0.275 + Zucker×0.12 − Protein×0.098<br />
                <b style={{ color: C.sub }}>ProPoints:</b> Protein×0.36 + KH×0.16 + Fett×0.24 − Bst×0.18<br />
                <b style={{ color: C.sub }}>Classic:</b> kcal×0.0165 + Fett×0.11
              </div>
              <p style={S.disclaimer}>
                ⚠️ Alle Formeln sind Näherungen / reverse-engineered. Weder WW noch weight friends veröffentlichen offizielle Formeln.
                Die Coins-Formel wurde aus den bekannten Rezeptwerten und der Programminfo (kcal, gesätt. Fett, Zucker, Eiweiß, Ballaststoffe, Salz) abgeleitet.
              </p>
            </div>
          </>
        )}

        {/* ══ TAB: BUDGET ══ */}
        {tab === "budget" && (
          <div style={S.card}>
            <div style={S.sectionTitle}>Persönliches Tages-Budget schätzen</div>
            <p style={{ fontSize: 13, color: C.sub, marginTop: 0, marginBottom: 18, lineHeight: 1.6 }}>
              Berechnung via <strong>Mifflin-St-Jeor-Formel</strong> (Grundumsatz × Aktivitätsfaktor).<br />
              weight friends und WW verwenden beide individuelle Budgets basierend auf diesem Prinzip.
            </p>
            <div style={S.grid2}>
              {[
                { id: "gewicht", label: "Gewicht (kg)", type: "number" },
                { id: "groesse", label: "Größe (cm)", type: "number" },
                { id: "alter",   label: "Alter (Jahre)", type: "number" },
              ].map(f => (
                <div key={f.id}>
                  <label style={S.label}>{f.label}</label>
                  <input type="number" style={S.input} value={budget[f.id]} placeholder="–"
                    onChange={e => handleBudget(f.id, e.target.value)} />
                </div>
              ))}
              <div>
                <label style={S.label}>Geschlecht</label>
                <select style={S.select} value={budget.geschlecht} onChange={e => handleBudget("geschlecht", e.target.value)}>
                  <option value="w">Weiblich</option>
                  <option value="m">Männlich</option>
                </select>
              </div>
              <div>
                <label style={S.label}>Aktivitätsniveau</label>
                <select style={S.select} value={budget.aktivitaet} onChange={e => handleBudget("aktivitaet", e.target.value)}>
                  <option value="sitzend">Überwiegend sitzend</option>
                  <option value="leicht">Leicht aktiv</option>
                  <option value="maessig">Mäßig aktiv</option>
                  <option value="aktiv">Sehr aktiv</option>
                </select>
              </div>
            </div>
            <button style={S.btn()} onClick={calcBudget}>Budget berechnen</button>
            {budgetResult && (
              <>
                <div style={S.divider} />
                <div style={S.resultRow}>
                  <div style={S.scoreBig()}>
                    <div style={S.scoreNum(C.coin)}>{budgetResult.coins}</div>
                    <div style={S.scoreLbl}>💜 Coins/Tag (wf)</div>
                  </div>
                  <div style={S.scoreBig()}>
                    <div style={S.scoreNum(C.ww)}>{budgetResult.ww}</div>
                    <div style={S.scoreLbl}>WW Points/Tag</div>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: C.sub, textAlign: "center", marginTop: 10, lineHeight: 1.6 }}>
                  Typischer Bereich: <b>18–44 WW Punkte</b> · <b>18–50 Coins</b> pro Tag.<br />
                  Leitsatz-Bonus bei weight friends: +1 Coin pro erfülltem Leitsatz (max. 6 zusätzlich).
                </p>
              </>
            )}
          </div>
        )}

        {/* ══ TAB: REZEPTE ══ */}
        {tab === "recipes" && (
          <>
            <div style={S.card}>
              <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 4 }}>🍽️ Rezepte von weight friends</div>
              <div style={{ fontSize: 13, color: C.sub, marginBottom: 16 }}>
                {RECIPES.length} Rezepte mit Coins-Werten – direkt von weightfriends.at
              </div>
              <input style={S.searchBar} placeholder="Suche nach Rezept oder Zutat …"
                value={search} onChange={e => setSearch(e.target.value)} />
              <div style={S.filterRow}>
                {KATEGORIEN.map(k => (
                  <button key={k} style={S.filterBtn(kat === k)} onClick={() => setKat(k)}>{k}</button>
                ))}
              </div>
            </div>

            {filteredRecipes.length === 0 ? (
              <div style={{ ...S.card, textAlign: "center", color: C.muted }}>Keine Rezepte gefunden.</div>
            ) : (
              <div style={S.recipeGrid}>
                {filteredRecipes.map(r => (
                  <RecipeCard key={r.id} recipe={r} selected={openRecipe === r.id} onSelect={setOpenRecipe} />
                ))}
              </div>
            )}

            <p style={S.disclaimer}>
              Rezepte und Coins-Werte stammen von weightfriends.at. Alle Rechte beim Inhaber.
              Diese App ist kein offizielles Produkt von weight friends.
            </p>
          </>
        )}

        {/* ══ TAB: INFO ══ */}
        {tab === "info" && (
          <>
            <div style={S.card}>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12, color: C.accent }}>💜 weight friends Coins – wie funktioniert's?</div>
              <p style={{ fontSize: 13, lineHeight: 1.8, color: C.text }}>
                <strong>weight friends</strong> ist ein österreichisches Abnehmprogramm mit Sitz in Wien.
                Jedes Lebensmittel erhält einen Wert in <strong>Coins</strong>, basierend auf:
              </p>
              <ul style={{ fontSize: 13, lineHeight: 2, color: C.text, paddingLeft: 20 }}>
                <li>⬆️ <b>Kalorien (kcal)</b> – erhöht den Coin-Wert</li>
                <li>⬆️ <b>Gesättigte Fettsäuren</b> – erhöht den Coin-Wert</li>
                <li>⬆️ <b>Zucker</b> – erhöht den Coin-Wert</li>
                <li>⬆️ <b>Salzgehalt</b> – erhöht den Coin-Wert</li>
                <li>⬇️ <b>Eiweiß (Protein)</b> – senkt den Coin-Wert</li>
                <li>⬇️ <b>Ballaststoffe</b> – senkt den Coin-Wert</li>
              </ul>
              <p style={{ fontSize: 13, lineHeight: 1.8, color: C.text, marginTop: 0 }}>
                Zusätzlich gibt es <b>Bonus-Coins</b> für gesunde Verhaltensweisen (Leitsätze):
                Gemüse & Obst essen, gesunde Fette, ausreichend trinken, bewusst genießen, Bewegung, Erholung.
                Für jeden erfüllten Leitsatz +1 Coin auf das Tagesbudget.
              </p>
            </div>
            <div style={S.card}>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 10, color: C.ww }}>🟢 WW PersonalPoints – aktuelles System (2022+)</div>
              <p style={{ fontSize: 13, lineHeight: 1.8, color: C.text }}>
                WW (Weight Watchers) berechnet Punkte auf Basis von kcal, gesättigten Fetten, Zucker (negativ)
                und Protein, Ballaststoffen, ungesättigte Fette (positiv / punktsenkend).
                Über 200 ZeroPoint-Lebensmittel müssen nicht getrackt werden.
                Das individuelle Tagesbudget basiert auf der Mifflin-St-Jeor-Formel.
              </p>
            </div>
            <div style={{ ...S.card, background: "#FAF5FF", borderColor: "#DDD6FE" }}>
              <div style={S.sectionTitle}>Coins-Formel – Herleitung</div>
              <p style={{ fontSize: 12, lineHeight: 1.8, color: C.text }}>
                weight friends veröffentlicht keine offizielle Formel. Die hier verwendete Formel wurde durch
                Auswertung der bekannten Rezept-Coins (z. B. Reisfleisch 7C, Waldviertler Topfenkäse 2C,
                Krautpfanne 5C, Ritschert 5C, Malakofftorte 10C) in Kombination mit den 6 genannten
                Nährwertkategorien abgeleitet (least-squares-Näherung).
              </p>
              <code style={{ fontSize: 12, display: "block", background: "#EDE9FE", padding: "10px 14px", borderRadius: 8, color: C.accent2, lineHeight: 1.8 }}>
                Coins = kcal×0.022 + gesF×0.20 + Zucker×0.10 + Salz×0.15{"\n"}
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;− Protein×0.10 − Ballaststoffe×0.15{"\n"}
                Minimum: 0, gerundet auf ganze Zahl
              </code>
              <p style={S.disclaimer}>⚠️ Nicht-offizielle Näherung. Ergebnisse können von der offiziellen weight friends App abweichen.</p>
            </div>
          </>
        )}

      </main>
    </div>
  );
}
