import { describe, it, expect, vi, afterEach } from "vitest";
import { pickRarityPool, rollFromPool } from "../utils/crafting-utils";

// ---------------------------------------------------------------------------
// Tests — pickRarityPool
// ---------------------------------------------------------------------------

describe("pickRarityPool", () => {
  const rarityByLevel: { maxLevel: number; pool: Record<string, number> }[] = [
    { maxLevel: 10, pool: { "普通": 80, "精良": 20 } },
    { maxLevel: 20, pool: { "普通": 50, "精良": 35, "稀有": 15 } },
    { maxLevel: 999, pool: { "精良": 30, "稀有": 40, "史诗": 25, "传说": 5 } },
  ];

  it("should return first pool for low level", () => {
    expect(pickRarityPool(rarityByLevel, 5)).toEqual({ "普通": 80, "精良": 20 });
  });

  it("should return matching pool at exact boundary", () => {
    expect(pickRarityPool(rarityByLevel, 10)).toEqual({ "普通": 80, "精良": 20 });
  });

  it("should return next pool when exceeding boundary", () => {
    expect(pickRarityPool(rarityByLevel, 11)).toEqual({ "普通": 50, "精良": 35, "稀有": 15 });
  });

  it("should return last pool for very high level", () => {
    expect(pickRarityPool(rarityByLevel, 100)).toEqual({ "精良": 30, "稀有": 40, "史诗": 25, "传说": 5 });
  });

  it("should return last pool when level exceeds all entries", () => {
    expect(pickRarityPool(rarityByLevel, 9999)).toEqual({ "精良": 30, "稀有": 40, "史诗": 25, "传说": 5 });
  });
});

// ---------------------------------------------------------------------------
// Tests — rollFromPool
// ---------------------------------------------------------------------------

describe("rollFromPool", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return first entry when roll is 0", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const result = rollFromPool({ "普通": 70, "稀有": 30 });

    expect(result).toBe("普通");
  });

  it("should return last entry when roll approaches 1", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.999);

    const result = rollFromPool({ "普通": 70, "稀有": 30 });

    expect(result).toBe("稀有");
  });

  it("should respect weights — roll just past first entry", () => {
    // total = 100, roll = 0.71 * 100 = 71 > 70 → 稀有
    vi.spyOn(Math, "random").mockReturnValue(0.71);

    const result = rollFromPool({ "普通": 70, "稀有": 30 });

    expect(result).toBe("稀有");
  });

  it("should handle single-entry pool", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const result = rollFromPool({ "传说": 100 });

    expect(result).toBe("传说");
  });

  it("should handle pool with three entries", () => {
    // total = 100, roll = 0.85 * 100 = 85
    // 85 - 60 = 25, 25 - 30 = -5 → "精良"
    vi.spyOn(Math, "random").mockReturnValue(0.85);

    const result = rollFromPool({ "普通": 60, "精良": 30, "稀有": 10 });

    expect(result).toBe("精良");
  });
});
