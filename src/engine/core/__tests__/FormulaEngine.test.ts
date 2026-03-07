import { describe, it, expect, beforeEach } from "vitest";
import { FormulaEngine } from "../FormulaEngine";

describe("FormulaEngine", () => {
  let engine: FormulaEngine;

  beforeEach(() => {
    engine = new FormulaEngine();
  });

  // -- Basic arithmetic -------------------------------------------------------

  it("should evaluate simple addition", () => {
    expect(engine.calculate("2 + 3", {})).toBe(5);
  });

  it("should evaluate subtraction", () => {
    expect(engine.calculate("10 - 4", {})).toBe(6);
  });

  it("should evaluate multiplication", () => {
    expect(engine.calculate("6 * 7", {})).toBe(42);
  });

  it("should evaluate division", () => {
    expect(engine.calculate("20 / 4", {})).toBe(5);
  });

  it("should handle operator precedence", () => {
    expect(engine.calculate("2 + 3 * 4", {})).toBe(14);
  });

  it("should handle parentheses", () => {
    expect(engine.calculate("(2 + 3) * 4", {})).toBe(20);
  });

  // -- Variable substitution --------------------------------------------------

  it("should substitute a single variable", () => {
    expect(engine.calculate("atk * 2", { atk: 50 })).toBe(100);
  });

  it("should substitute multiple variables", () => {
    expect(engine.calculate("atk * 2 - def", { atk: 50, def: 20 })).toBe(80);
  });

  it("should handle variables with value 0", () => {
    expect(engine.calculate("hp + bonus", { hp: 100, bonus: 0 })).toBe(100);
  });

  it("should handle negative variable values", () => {
    expect(engine.calculate("base + modifier", { base: 50, modifier: -10 })).toBe(40);
  });

  // -- Math functions ---------------------------------------------------------

  it("should evaluate floor()", () => {
    expect(engine.calculate("floor(3.7)", {})).toBe(3);
    expect(engine.calculate("floor(-2.3)", {})).toBe(-3);
  });

  it("should evaluate ceil()", () => {
    expect(engine.calculate("ceil(3.2)", {})).toBe(4);
    expect(engine.calculate("ceil(-2.7)", {})).toBe(-2);
  });

  it("should evaluate max()", () => {
    expect(engine.calculate("max(3, 7)", {})).toBe(7);
    expect(engine.calculate("max(10, 2, 8)", {})).toBe(10);
  });

  it("should evaluate min()", () => {
    expect(engine.calculate("min(3, 7)", {})).toBe(3);
    expect(engine.calculate("min(10, 2, 8)", {})).toBe(2);
  });

  it("should evaluate abs()", () => {
    expect(engine.calculate("abs(-5)", {})).toBe(5);
    expect(engine.calculate("abs(5)", {})).toBe(5);
  });

  it("should evaluate random() returning a number between 0 and 1", () => {
    const result = engine.calculate("random()", {});
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(1);
  });

  // -- Complex formulas -------------------------------------------------------

  it("should evaluate a complex resource-tick formula", () => {
    const now = 1700000000;
    const lastUpdate = 1700000000 - 900; // 900 seconds ago
    const rate = 5;

    const result = engine.calculate(
      "floor((now - lastUpdate) / 300) * rate",
      { now, lastUpdate, rate },
    );
    // floor(900 / 300) * 5 = 3 * 5 = 15
    expect(result).toBe(15);
  });

  it("should evaluate damage formula with min/max clamping", () => {
    const result = engine.calculate(
      "max(1, floor(atk * 1.5 - def * 0.8))",
      { atk: 30, def: 20 },
    );
    // floor(45 - 16) = floor(29) = 29; max(1, 29) = 29
    expect(result).toBe(29);
  });

  // -- Division by zero -------------------------------------------------------

  it("should return Infinity on division by zero", () => {
    expect(engine.calculate("10 / 0", {})).toBe(Infinity);
  });

  // -- Error handling ---------------------------------------------------------

  it("should throw on an invalid formula", () => {
    expect(() => engine.calculate("2 +* 3", {})).toThrow("FormulaEngine:");
  });

  it("should throw on empty formula", () => {
    expect(() => engine.calculate("", {})).toThrow("FormulaEngine:");
  });

  it("should throw when a referenced variable is missing", () => {
    expect(() => engine.calculate("atk * 2", {})).toThrow();
  });
});
