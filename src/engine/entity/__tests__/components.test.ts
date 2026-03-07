import { describe, expect, it } from "vitest";

import {
  getComponent,
  hasComponent,
  serializeState,
  setComponent,
  type StatsComponent,
} from "../components";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const sampleStats: StatsComponent = {
  hp: 100,
  maxHp: 100,
  mp: 50,
  maxMp: 50,
  atk: 15,
  def: 10,
  spd: 8,
};

const sampleState: Record<string, unknown> = {
  stats: sampleStats,
  equipment: { slots: { mainHand: "sword-1", offHand: null } },
};

const sampleJson = JSON.stringify(sampleState);

// ---------------------------------------------------------------------------
// getComponent
// ---------------------------------------------------------------------------

describe("getComponent", () => {
  it("extracts existing component from JSON string", () => {
    const stats = getComponent(sampleJson, "stats");
    expect(stats).toEqual(sampleStats);
  });

  it("extracts existing component from object", () => {
    const stats = getComponent(sampleState, "stats");
    expect(stats).toEqual(sampleStats);
  });

  it("returns undefined for missing component", () => {
    const inv = getComponent(sampleState, "inventory");
    expect(inv).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// setComponent
// ---------------------------------------------------------------------------

describe("setComponent", () => {
  it("adds a new component", () => {
    const updated = setComponent(sampleState, "position", {
      x: 10,
      y: 20,
      worldId: "main",
    });

    expect(updated.position).toEqual({ x: 10, y: 20, worldId: "main" });
    // original should be unchanged (shallow copy)
    expect(sampleState.position).toBeUndefined();
  });

  it("updates an existing component", () => {
    const newStats: StatsComponent = { ...sampleStats, hp: 42 };
    const updated = setComponent(sampleState, "stats", newStats);

    expect((updated.stats as StatsComponent).hp).toBe(42);
  });

  it("works with JSON string input", () => {
    const updated = setComponent(sampleJson, "skills", {
      equipped: ["fireball"],
      maxSlots: 6,
    });

    expect(updated.skills).toEqual({ equipped: ["fireball"], maxSlots: 6 });
    // stats should still be present
    expect(updated.stats).toEqual(sampleStats);
  });
});

// ---------------------------------------------------------------------------
// hasComponent
// ---------------------------------------------------------------------------

describe("hasComponent", () => {
  it("returns true for existing component", () => {
    expect(hasComponent(sampleState, "stats")).toBe(true);
    expect(hasComponent(sampleJson, "equipment")).toBe(true);
  });

  it("returns false for missing component", () => {
    expect(hasComponent(sampleState, "inventory")).toBe(false);
    expect(hasComponent(sampleJson, "production")).toBe(false);
  });

  it("returns false when component value is null", () => {
    const state = { stats: null };
    expect(hasComponent(state as unknown as Record<string, unknown>, "stats")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// serializeState
// ---------------------------------------------------------------------------

describe("serializeState", () => {
  it("produces valid JSON that round-trips correctly", () => {
    const json = serializeState(sampleState);
    expect(typeof json).toBe("string");
    const parsed = JSON.parse(json) as Record<string, unknown>;
    expect(parsed).toEqual(sampleState);
  });
});

// ---------------------------------------------------------------------------
// Type safety (compile-time check — if this compiles, the types are correct)
// ---------------------------------------------------------------------------

describe("type safety", () => {
  it("getComponent<'stats'> returns StatsComponent type", () => {
    const stats = getComponent(sampleState, "stats");
    if (stats) {
      // These property accesses only compile if the type is StatsComponent
      const _hp: number = stats.hp;
      const _maxHp: number = stats.maxHp;
      const _atk: number = stats.atk;
      expect(_hp).toBe(sampleStats.hp);
      expect(_maxHp).toBe(sampleStats.maxHp);
      expect(_atk).toBe(sampleStats.atk);
    }
  });
});
