import test from "node:test";
import assert from "node:assert/strict";
import {
  calcClassic,
  calcCoins,
  calcDailyBudget,
  calcPersonalPoints,
  calcProPoints,
  calcSmartPoints,
} from "../src/lib/points.js";

test("calculates all point systems for a typical nutrition entry", () => {
  const entry = {
    kcal: 250,
    fett: 8,
    gesF: 3,
    ungesF: 5,
    kh: 30,
    zucker: 10,
    protein: 12,
    bst: 4,
    salz: 1.2,
  };

  assert.equal(calcCoins(entry), 5);
  assert.equal(calcPersonalPoints(entry), 8);
  assert.equal(calcSmartPoints(entry), 8);
  assert.equal(calcProPoints(entry), 10);
  assert.equal(calcClassic(entry), 5);
});

test("keeps negative point totals at zero", () => {
  const entry = {
    kcal: 10,
    fett: 0,
    gesF: 0,
    ungesF: 20,
    kh: 0,
    zucker: 0,
    protein: 80,
    bst: 30,
    salz: 0,
  };

  assert.equal(calcCoins(entry), 0);
  assert.equal(calcPersonalPoints(entry), 0);
  assert.equal(calcSmartPoints(entry), 0);
  assert.equal(calcClassic(entry), 0);
});

test("caps nutrient bonuses used by formulas", () => {
  const capped = { kcal: 300, gesF: 2, ungesF: 50, zucker: 5, protein: 50, bst: 50, salz: 1 };
  const atCaps = { ...capped, ungesF: 20, protein: 50, bst: 10 };

  assert.equal(calcCoins(capped), calcCoins(atCaps));
  assert.equal(calcPersonalPoints(capped), calcPersonalPoints(atCaps));
});

test("calculates daily budgets and applies lower and upper caps", () => {
  assert.deepEqual(
    calcDailyBudget({ gewicht: 80, groesse: 180, alter: 40, geschlecht: "m", aktivitaet: "maessig" }),
    { ww: 44, coins: 50 }
  );

  assert.deepEqual(
    calcDailyBudget({ gewicht: 20, groesse: 100, alter: 100, geschlecht: "w", aktivitaet: "sitzend" }),
    { ww: 18, coins: 18 }
  );
});
