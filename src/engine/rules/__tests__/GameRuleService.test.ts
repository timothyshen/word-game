import { describe, it, expect, vi, beforeEach } from "vitest";

import { StateManager } from "../../core/StateManager";
import type { Condition, WeightedItem } from "../../types";
import { GameRuleService } from "../GameRuleService";
import type { GameRuleRecord } from "../GameRuleService";
import type { IRuleStore } from "../IRuleStore";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRule(overrides: Partial<GameRuleRecord> = {}): GameRuleRecord {
  return {
    id: "rule-1",
    name: "test_rule",
    category: "player",
    ruleType: "formula",
    definition: '{"expression":"level * 10 + base"}',
    description: "A test rule",
    ...overrides,
  };
}

function createMockStore(): IRuleStore & {
  findRuleByName: ReturnType<typeof vi.fn>;
  findRulesByCategory: ReturnType<typeof vi.fn>;
} {
  return {
    findRuleByName: vi.fn(),
    findRulesByCategory: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GameRuleService", () => {
  let mockStore: ReturnType<typeof createMockStore>;
  let state: StateManager;
  let service: GameRuleService;

  beforeEach(() => {
    mockStore = createMockStore();
    state = new StateManager();
    service = new GameRuleService(mockStore, state);
  });

  // ---- getRule ------------------------------------------------------------

  it("should return and cache a rule", async () => {
    const rule = makeRule();
    mockStore.findRuleByName.mockResolvedValue(rule);

    const result = await service.getRule("test_rule");

    expect(result).toEqual(rule);
    expect(mockStore.findRuleByName).toHaveBeenCalledWith("test_rule");
    // Verify it was cached
    expect(state.get<GameRuleRecord>("rule:test_rule")).toEqual(rule);
  });

  it("should throw for a missing rule", async () => {
    mockStore.findRuleByName.mockResolvedValue(null);

    await expect(service.getRule("nonexistent")).rejects.toThrow(
      "Game rule not found: nonexistent",
    );
  });

  it("should use cache on second call", async () => {
    const rule = makeRule();
    mockStore.findRuleByName.mockResolvedValue(rule);

    await service.getRule("test_rule");
    await service.getRule("test_rule");

    // Store should only be hit once
    expect(mockStore.findRuleByName).toHaveBeenCalledTimes(1);
  });

  // ---- getRulesByCategory -------------------------------------------------

  it("should return rules by category", async () => {
    const rules = [
      makeRule({ name: "rule_a" }),
      makeRule({ name: "rule_b" }),
    ];
    mockStore.findRulesByCategory.mockResolvedValue(rules);

    const result = await service.getRulesByCategory("player");

    expect(result).toHaveLength(2);
    expect(result[0]!.name).toBe("rule_a");
    expect(result[1]!.name).toBe("rule_b");
    expect(mockStore.findRulesByCategory).toHaveBeenCalledWith("player");
  });

  // ---- getFormula ---------------------------------------------------------

  it("should extract expression from JSON definition", async () => {
    const rule = makeRule({
      definition: '{"expression":"level * 10 + base"}',
    });
    mockStore.findRuleByName.mockResolvedValue(rule);

    const formula = await service.getFormula("test_rule");
    expect(formula).toBe("level * 10 + base");
  });

  it("should return raw string when definition is not JSON", async () => {
    const rule = makeRule({ definition: "level * 5" });
    mockStore.findRuleByName.mockResolvedValue(rule);

    const formula = await service.getFormula("test_rule");
    expect(formula).toBe("level * 5");
  });

  // ---- getConfig ----------------------------------------------------------

  it("should return parsed JSON as generic type", async () => {
    interface MyConfig {
      maxLevel: number;
      baseHp: number;
    }
    const config: MyConfig = { maxLevel: 100, baseHp: 500 };
    const rule = makeRule({ definition: JSON.stringify(config) });
    mockStore.findRuleByName.mockResolvedValue(rule);

    const result = await service.getConfig<MyConfig>("test_rule");
    expect(result).toEqual(config);
  });

  // ---- getWeights ---------------------------------------------------------

  it("should return WeightedItem array", async () => {
    const weights: WeightedItem[] = [
      { value: "common", weight: 70 },
      { value: "rare", weight: 25 },
      { value: "legendary", weight: 5 },
    ];
    const rule = makeRule({ definition: JSON.stringify(weights) });
    mockStore.findRuleByName.mockResolvedValue(rule);

    const result = await service.getWeights("test_rule");
    expect(result).toEqual(weights);
    expect(result).toHaveLength(3);
    expect(result[0]!.value).toBe("common");
    expect(result[0]!.weight).toBe(70);
  });

  // ---- getCondition -------------------------------------------------------

  it("should return parsed Condition", async () => {
    const condition: Condition = {
      type: "and",
      conditions: [
        { type: "gte", field: "level", value: 10 },
        { type: "has", field: "fireResistance" },
      ],
    };
    const rule = makeRule({ definition: JSON.stringify(condition) });
    mockStore.findRuleByName.mockResolvedValue(rule);

    const result = await service.getCondition("test_rule");
    expect(result).toEqual(condition);
    expect(result.type).toBe("and");
  });

  // ---- invalidateCache ----------------------------------------------------

  it("should clear all cached rules", async () => {
    const rule = makeRule();
    mockStore.findRuleByName.mockResolvedValue(rule);

    // Populate cache
    await service.getRule("test_rule");
    expect(state.get("rule:test_rule")).toBeDefined();

    // Invalidate
    service.invalidateCache();
    expect(state.get("rule:test_rule")).toBeUndefined();
  });
});
