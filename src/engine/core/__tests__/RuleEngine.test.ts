import { describe, it, expect, beforeEach, vi } from "vitest";
import { RuleEngine } from "../RuleEngine";
import type { IFormulaEngine, Condition, WeightedItem } from "../../types";

describe("RuleEngine", () => {
  let formulaEngine: IFormulaEngine;
  let engine: RuleEngine;

  beforeEach(() => {
    formulaEngine = {
      calculate: vi.fn((formula: string, variables: Record<string, number>) => {
        // Simple mock: evaluate "atk * 2" style expressions won't work,
        // so we return a fixed value controllable per test via mockReturnValue
        return 0;
      }),
    };
    engine = new RuleEngine(formulaEngine);
  });

  // -- gte condition ----------------------------------------------------------

  describe("gte condition", () => {
    it("should return true when field >= value", () => {
      const condition: Condition = { type: "gte", field: "level", value: 5 };
      expect(engine.evaluate(condition, { level: 5 })).toBe(true);
      expect(engine.evaluate(condition, { level: 10 })).toBe(true);
    });

    it("should return false when field < value", () => {
      const condition: Condition = { type: "gte", field: "level", value: 5 };
      expect(engine.evaluate(condition, { level: 4 })).toBe(false);
    });
  });

  // -- lte condition ----------------------------------------------------------

  describe("lte condition", () => {
    it("should return true when field <= value", () => {
      const condition: Condition = { type: "lte", field: "level", value: 10 };
      expect(engine.evaluate(condition, { level: 10 })).toBe(true);
      expect(engine.evaluate(condition, { level: 3 })).toBe(true);
    });

    it("should return false when field > value", () => {
      const condition: Condition = { type: "lte", field: "level", value: 10 };
      expect(engine.evaluate(condition, { level: 11 })).toBe(false);
    });
  });

  // -- eq condition -----------------------------------------------------------

  describe("eq condition", () => {
    it("should return true for equal numbers", () => {
      const condition: Condition = { type: "eq", field: "level", value: 5 };
      expect(engine.evaluate(condition, { level: 5 })).toBe(true);
    });

    it("should return false for unequal numbers", () => {
      const condition: Condition = { type: "eq", field: "level", value: 5 };
      expect(engine.evaluate(condition, { level: 6 })).toBe(false);
    });

    it("should return true for equal strings", () => {
      const condition: Condition = { type: "eq", field: "class", value: "warrior" };
      expect(engine.evaluate(condition, { class: "warrior" })).toBe(true);
    });

    it("should return false for unequal strings", () => {
      const condition: Condition = { type: "eq", field: "class", value: "warrior" };
      expect(engine.evaluate(condition, { class: "mage" })).toBe(false);
    });
  });

  // -- has condition ----------------------------------------------------------

  describe("has condition", () => {
    it("should return true when field exists", () => {
      const condition: Condition = { type: "has", field: "weapon" };
      expect(engine.evaluate(condition, { weapon: "sword" })).toBe(true);
    });

    it("should return false when field is missing", () => {
      const condition: Condition = { type: "has", field: "weapon" };
      expect(engine.evaluate(condition, {})).toBe(false);
    });

    it("should return false when field is null", () => {
      const condition: Condition = { type: "has", field: "weapon" };
      expect(engine.evaluate(condition, { weapon: null })).toBe(false);
    });

    it("should return false when field is undefined", () => {
      const condition: Condition = { type: "has", field: "weapon" };
      expect(engine.evaluate(condition, { weapon: undefined })).toBe(false);
    });
  });

  // -- and condition ----------------------------------------------------------

  describe("and condition", () => {
    it("should return true when all sub-conditions are true", () => {
      const condition: Condition = {
        type: "and",
        conditions: [
          { type: "gte", field: "level", value: 5 },
          { type: "has", field: "weapon" },
        ],
      };
      expect(engine.evaluate(condition, { level: 10, weapon: "sword" })).toBe(true);
    });

    it("should return false when one sub-condition is false", () => {
      const condition: Condition = {
        type: "and",
        conditions: [
          { type: "gte", field: "level", value: 5 },
          { type: "has", field: "weapon" },
        ],
      };
      expect(engine.evaluate(condition, { level: 10 })).toBe(false);
    });
  });

  // -- or condition -----------------------------------------------------------

  describe("or condition", () => {
    it("should return true when at least one sub-condition is true", () => {
      const condition: Condition = {
        type: "or",
        conditions: [
          { type: "gte", field: "level", value: 50 },
          { type: "has", field: "weapon" },
        ],
      };
      expect(engine.evaluate(condition, { level: 3, weapon: "sword" })).toBe(true);
    });

    it("should return false when all sub-conditions are false", () => {
      const condition: Condition = {
        type: "or",
        conditions: [
          { type: "gte", field: "level", value: 50 },
          { type: "has", field: "weapon" },
        ],
      };
      expect(engine.evaluate(condition, { level: 3 })).toBe(false);
    });
  });

  // -- not condition ----------------------------------------------------------

  describe("not condition", () => {
    it("should invert a true condition to false", () => {
      const condition: Condition = {
        type: "not",
        condition: { type: "gte", field: "level", value: 5 },
      };
      expect(engine.evaluate(condition, { level: 10 })).toBe(false);
    });

    it("should invert a false condition to true", () => {
      const condition: Condition = {
        type: "not",
        condition: { type: "gte", field: "level", value: 5 },
      };
      expect(engine.evaluate(condition, { level: 2 })).toBe(true);
    });
  });

  // -- formula condition ------------------------------------------------------

  describe("formula condition", () => {
    it("should use FormulaEngine and compare with operator", () => {
      const mockCalc = formulaEngine.calculate as ReturnType<typeof vi.fn>;
      mockCalc.mockReturnValue(100);

      const condition: Condition = {
        type: "formula",
        expression: "atk * 2",
        operator: "gte",
        value: 80,
      };
      expect(engine.evaluate(condition, { atk: 50 })).toBe(true);
      expect(formulaEngine.calculate).toHaveBeenCalledWith("atk * 2", { atk: 50 });
    });

    it("should return false when formula result does not satisfy operator", () => {
      const mockCalc = formulaEngine.calculate as ReturnType<typeof vi.fn>;
      mockCalc.mockReturnValue(10);

      const condition: Condition = {
        type: "formula",
        expression: "atk * 2",
        operator: "gte",
        value: 80,
      };
      expect(engine.evaluate(condition, { atk: 5 })).toBe(false);
    });

    it("should only pass numeric context values to FormulaEngine", () => {
      const mockCalc = formulaEngine.calculate as ReturnType<typeof vi.fn>;
      mockCalc.mockReturnValue(50);

      const condition: Condition = {
        type: "formula",
        expression: "atk",
        operator: "eq",
        value: 50,
      };
      engine.evaluate(condition, { atk: 50, name: "hero", active: true });
      expect(formulaEngine.calculate).toHaveBeenCalledWith("atk", { atk: 50 });
    });
  });

  // -- weighted_random condition ----------------------------------------------

  describe("weighted_random condition", () => {
    it("should always return true for evaluate", () => {
      const condition: Condition = {
        type: "weighted_random",
        weights: [{ value: "a", weight: 1 }],
      };
      expect(engine.evaluate(condition, {})).toBe(true);
    });
  });

  // -- Nested field access ----------------------------------------------------

  describe("nested field access", () => {
    it("should access nested fields with dot notation", () => {
      const condition: Condition = { type: "gte", field: "player.level", value: 5 };
      expect(engine.evaluate(condition, { player: { level: 10 } })).toBe(true);
    });

    it("should return false when nested path does not exist", () => {
      const condition: Condition = { type: "gte", field: "player.level", value: 5 };
      expect(engine.evaluate(condition, { player: {} })).toBe(false);
    });

    it("should handle deeply nested fields", () => {
      const condition: Condition = { type: "eq", field: "a.b.c", value: 42 };
      expect(engine.evaluate(condition, { a: { b: { c: 42 } } })).toBe(true);
    });

    it("should return false when intermediate path is missing", () => {
      const condition: Condition = { type: "has", field: "a.b.c" };
      expect(engine.evaluate(condition, {})).toBe(false);
    });
  });

  // -- weightedRandom ---------------------------------------------------------

  describe("weightedRandom", () => {
    it("should return a value from the weights array", () => {
      const weights: WeightedItem[] = [
        { value: "common", weight: 70 },
        { value: "rare", weight: 25 },
        { value: "legendary", weight: 5 },
      ];
      const result = engine.weightedRandom(weights);
      expect(["common", "rare", "legendary"]).toContain(result);
    });

    it("should always return the only item when there is one weight", () => {
      const weights: WeightedItem[] = [{ value: "only", weight: 1 }];
      expect(engine.weightedRandom(weights)).toBe("only");
    });

    it("should respect weight distributions", () => {
      // With Math.random mocked to return 0, should pick first item
      vi.spyOn(Math, "random").mockReturnValue(0);
      const weights: WeightedItem[] = [
        { value: "first", weight: 10 },
        { value: "second", weight: 10 },
      ];
      expect(engine.weightedRandom(weights)).toBe("first");

      // With Math.random returning 0.99, should pick last item
      vi.spyOn(Math, "random").mockReturnValue(0.99);
      expect(engine.weightedRandom(weights)).toBe("second");

      vi.restoreAllMocks();
    });

    it("should throw if weights array is empty", () => {
      expect(() => engine.weightedRandom([])).toThrow(
        "RuleEngine: weights array must not be empty",
      );
    });
  });
});
