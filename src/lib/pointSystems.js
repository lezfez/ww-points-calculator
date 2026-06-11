export const FIELD_DEFS = {
  kcal:    { label: "Kalorien (kcal)", step: 1 },
  fett:    { label: "Fett gesamt (g)", step: 0.1 },
  gesF:    { label: "Gesättigte Fettsäuren (g)", step: 0.1 },
  ungesF:  { label: "Ungesättigte Fettsäuren (g)", step: 0.1 },
  kh:      { label: "Kohlenhydrate (g)", step: 0.1 },
  zucker:  { label: "davon Zucker (g)", step: 0.1 },
  protein: { label: "Protein / Eiweiß (g)", step: 0.1 },
  bst:     { label: "Ballaststoffe (g)", step: 0.1 },
  salz:    { label: "Salz (g)", step: 0.1 },
};

export const SYS_FIELDS = {
  coins:    ["kcal", "gesF", "zucker", "protein", "bst", "salz"],
  personal: ["kcal", "gesF", "ungesF", "zucker", "protein", "bst"],
  smart:    ["kcal", "gesF", "zucker", "protein"],
  pro:      ["protein", "kh", "fett", "bst"],
  classic:  ["kcal", "fett"],
};

export const SYSTEMS = [
  { id: "coins",    label: "weight friends Coins", sub: "Österreich · aktuell" },
  { id: "personal", label: "PersonalPoints™",      sub: "WW 2022+" },
  { id: "smart",    label: "SmartPoints™",          sub: "WW 2015–21" },
  { id: "pro",      label: "ProPoints™",            sub: "WW 2010–15" },
  { id: "classic",  label: "Classic Points",        sub: "WW bis 2010" },
];
