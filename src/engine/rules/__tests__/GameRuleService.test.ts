import { describe, it, expect, vi, beforeEach } from "vitest";

import { StateManager } from "../../core/StateManager";
import type { Condition, WeightedItem } from "../../types";
import { GameRuleService } from "../GameRuleService";
import type { GameRuleRecord } from "../GameRuleService";

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

function createMockDb() {
  return {
    gameRule: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GameRuleService", () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let state: StateManager;
  let service: GameRuleService;

  beforeEach(() => {
    mockDb = createMockDb();
    state = new StateManager();
    // Cast mockDb as PrismaClient since we only use gameRule methods
    service = new GameRuleService(mockDb as never, state);
  });

  // ---- getRule ------------------------------------------------------------

  it("should return and cache a rule", async () => {
    const rule = makeRule();
    mockDb.gameRule.findUnique.mockResolvedValue(rule);

    const result = await service.getRule("test_rule");

    expect(result).toEqual(rule);
    expect(mockDb.gameRule.findUnique).toHaveBeenCalledWith({
      where: { name: "test_rule" },
    });
    // Verify it was cached
    expect(state.get<GameRuleRecord>("rule:test_rule")).toEqual(rule);
  });

  it("should throw for a missing rule", async () => {
    mockDb.gameRule.findUnique.mockResolvedValue(null);

    await expect(service.getRule("nonexistent")).rejects.toThrow(
      "Game rule not found: nonexistent",
    );
  });

  it("should use cache on second call", async () => {
    const rule = makeRule();
    mockDb.gameRule.findUnique.mockResolvedValue(rule);

    await service.getRule("test_rule");
    await service.getRule("test_rule");

    // DB should only be hit once
    expect(mockDb.gameRule.findUnique).toHaveBeenCalledTimes(1);
  });

  // ---- getRulesByCategory -------------------------------------------------

  it("should return rules by category", async () => {
    const rules = [
      makeRule({ name: "rule_a" }),
      makeRule({ name: "rule_b" }),
    ];
    mockDb.gameRule.findMany.mockResolvedValue(rules);

    const result = await service.getRulesByCategory("player");

    expect(result).toHaveLength(2);
    expect(result[0]!.name).toBe("rule_a");
    expect(result[1]!.name).toBe("rule_b");
    expect(mockDb.gameRule.findMany).toHaveBeenCalledWith({
      where: { category: "player" },
    });
  });

  // ---- getFormula ---------------------------------------------------------

  it("should extract expression from JSON definition", async () => {
    const rule = makeRule({
      definition: '{"expression":"level * 10 + base"}',
    });
    mockDb.gameRule.findUnique.mockResolvedValue(rule);

    const formula = await service.getFormula("test_rule");
    expect(formula).toBe("level * 10 + base");
  });

  it("should return raw string when definition is not JSON", async () => {
    const rule = makeRule({ definition: "level * 5" });
    mockDb.gameRule.findUnique.mockResolvedValue(rule);

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
    mockDb.gameRule.findUnique.mockResolvedValue(rule);

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
    mockDb.gameRule.findUnique.mockResolvedValue(rule);

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
    mockDb.gameRule.findUnique.mockResolvedValue(rule);

    const result = await service.getCondition("test_rule");
    expect(result).toEqual(condition);
    expect(result.type).toBe("and");
  });

  // ---- invalidateCache ----------------------------------------------------

  it("should clear all cached rules", async () => {
    const rule = makeRule();
    mockDb.gameRule.findUnique.mockResolvedValue(rule);

    // Populate cache
    await service.getRule("test_rule");
    expect(state.get("rule:test_rule")).toBeDefined();

    // Invalidate
    service.invalidateCache();
    expect(state.get("rule:test_rule")).toBeUndefined();
  });
});
