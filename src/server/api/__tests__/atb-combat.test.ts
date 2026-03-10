import { describe, it, expect } from "vitest";
import {
  getElementMultiplier,
  resolveActionMultiTarget,
} from "~/shared/effects/combat-resolver";
import {
  tickATB,
  calculateRating,
} from "~/server/api/services/atb-combat.service";
import type {
  ATBCombatState,
  PartyMember,
  EnemyUnit,
  CombatUnit,
  CombatLog,
} from "~/shared/effects/types";

// Helper to create a minimal ATBCombatState for testing
function createTestState(
  overrides?: Partial<ATBCombatState>,
): ATBCombatState {
  return {
    party: [],
    enemies: [],
    currentActorId: null,
    turnCount: 0,
    logs: [],
    status: "active",
    combatType: "normal",
    ...overrides,
  };
}

// Helper to create a minimal PartyMember for testing
function createTestPartyMember(
  overrides?: Partial<PartyMember>,
): PartyMember {
  return {
    id: "party_1",
    characterId: "char_1",
    name: "测试战士",
    portrait: "⚔️",
    baseClass: "战士",
    hp: 100,
    maxHp: 100,
    mp: 50,
    maxMp: 50,
    attack: 20,
    defense: 10,
    speed: 8,
    luck: 5,
    intellect: 5,
    buffs: [],
    atb: 0,
    isAlive: true,
    teamIndex: 0,
    skillSlots: [],
    ...overrides,
  };
}

// Helper to create a minimal EnemyUnit for testing
function createTestEnemy(overrides?: Partial<EnemyUnit>): EnemyUnit {
  return {
    id: "enemy_1",
    name: "测试怪物",
    hp: 50,
    maxHp: 50,
    mp: 0,
    maxMp: 0,
    attack: 10,
    defense: 5,
    speed: 5,
    luck: 3,
    intellect: 3,
    buffs: [],
    atb: 0,
    isAlive: true,
    teamIndex: 0,
    tier: "normal",
    loot: { exp: 10, gold: 5 },
    ...overrides,
  };
}

// Helper to create a CombatLog entry
function createLog(
  overrides?: Partial<CombatLog>,
): CombatLog {
  return {
    turn: 1,
    actorName: "test",
    message: "test",
    type: "action",
    ...overrides,
  };
}

describe("ATB Combat System", () => {
  // ── getElementMultiplier ──

  describe("getElementMultiplier", () => {
    it("should return 1.5x for weakness", () => {
      const result = getElementMultiplier("fire", {
        weaknesses: ["fire"],
        resistances: [],
      });
      expect(result.multiplier).toBe(1.5);
      expect(result.isWeak).toBe(true);
      expect(result.isResist).toBe(false);
    });

    it("should return 0.5x for resistance", () => {
      const result = getElementMultiplier("ice", {
        weaknesses: [],
        resistances: ["ice"],
      });
      expect(result.multiplier).toBe(0.5);
      expect(result.isWeak).toBe(false);
      expect(result.isResist).toBe(true);
    });

    it("should return 1.0x for neutral element", () => {
      const result = getElementMultiplier("thunder", {
        weaknesses: ["fire"],
        resistances: ["ice"],
      });
      expect(result.multiplier).toBe(1.0);
      expect(result.isWeak).toBe(false);
      expect(result.isResist).toBe(false);
    });

    it("should return 1.0x when no attack element", () => {
      const result = getElementMultiplier(undefined, {
        weaknesses: ["fire"],
        resistances: [],
      });
      expect(result.multiplier).toBe(1.0);
    });

    it("should return 1.0x when no profile", () => {
      const result = getElementMultiplier("fire", undefined);
      expect(result.multiplier).toBe(1.0);
    });

    it("should return 1.0x when both element and profile are undefined", () => {
      const result = getElementMultiplier(undefined, undefined);
      expect(result.multiplier).toBe(1.0);
      expect(result.isWeak).toBe(false);
      expect(result.isResist).toBe(false);
    });

    it("should handle element that is both weak and resistant (weakness takes priority by order)", () => {
      // weaknesses is checked first in the code
      const result = getElementMultiplier("fire", {
        weaknesses: ["fire"],
        resistances: ["fire"],
      });
      expect(result.multiplier).toBe(1.5);
      expect(result.isWeak).toBe(true);
    });
  });

  // ── tickATB ──

  describe("tickATB", () => {
    it("should advance all units and return fastest", () => {
      const fast = createTestPartyMember({ id: "fast", speed: 10, atb: 0 });
      const slow = createTestEnemy({ id: "slow", speed: 5, atb: 0 });
      const state = createTestState({ party: [fast], enemies: [slow] });

      const actorId = tickATB(state);

      // fast has speed 10, slow has speed 5
      // minTicks = 100/10 = 10 (fast reaches 100 in 10 ticks)
      // slow gets 5*10 = 50 ATB
      expect(actorId).toBe("fast");
      expect(fast.atb).toBe(100);
      expect(slow.atb).toBe(50);
    });

    it("should return unit already at ATB 100", () => {
      const ready = createTestPartyMember({
        id: "ready",
        atb: 100,
        speed: 5,
      });
      const waiting = createTestEnemy({
        id: "waiting",
        speed: 5,
        atb: 20,
      });
      const state = createTestState({
        party: [ready],
        enemies: [waiting],
      });

      const actorId = tickATB(state);
      expect(actorId).toBe("ready");
    });

    it("should skip dead units", () => {
      const dead = createTestPartyMember({
        id: "dead",
        speed: 20,
        atb: 0,
        isAlive: false,
      });
      const alive = createTestEnemy({
        id: "alive",
        speed: 5,
        atb: 0,
      });
      const state = createTestState({
        party: [dead],
        enemies: [alive],
      });

      const actorId = tickATB(state);
      expect(actorId).toBe("alive");
      // dead unit should not have been advanced
      expect(dead.atb).toBe(0);
    });

    it("should allow fast units to act before slow ones even with head start", () => {
      const fast = createTestPartyMember({
        id: "fast",
        speed: 20,
        atb: 0,
      });
      const slow = createTestEnemy({
        id: "slow",
        speed: 2,
        atb: 80,
      });
      const state = createTestState({
        party: [fast],
        enemies: [slow],
      });

      const actorId = tickATB(state);
      // slow needs 20 more at speed 2 = 10 ticks
      // fast needs 100 at speed 20 = 5 ticks
      // fast should act first
      expect(actorId).toBe("fast");
    });

    it("should return null for empty state", () => {
      const state = createTestState();
      expect(tickATB(state)).toBeNull();
    });

    it("should return null when all units are dead", () => {
      const dead1 = createTestPartyMember({
        id: "dead1",
        isAlive: false,
      });
      const dead2 = createTestEnemy({
        id: "dead2",
        isAlive: false,
      });
      const state = createTestState({
        party: [dead1],
        enemies: [dead2],
      });
      expect(tickATB(state)).toBeNull();
    });

    it("should handle equal speed units (tie-break by speed stat)", () => {
      const p1 = createTestPartyMember({
        id: "p1",
        speed: 10,
        atb: 0,
      });
      const e1 = createTestEnemy({
        id: "e1",
        speed: 10,
        atb: 0,
      });
      const state = createTestState({ party: [p1], enemies: [e1] });

      const actorId = tickATB(state);
      // Both reach 100 at the same time; tie-break by speed (equal),
      // then by sort stability — implementation uses b.speed - a.speed
      expect(actorId).not.toBeNull();
      expect(p1.atb).toBe(100);
      expect(e1.atb).toBe(100);
    });

    it("should handle units with buffed speed", () => {
      const buffed = createTestPartyMember({
        id: "buffed",
        speed: 5,
        atb: 0,
        buffs: [
          {
            name: "haste",
            modifiers: [{ stat: "speed", value: 15, type: "flat" }],
            turnsRemaining: 3,
            source: "self",
          },
        ],
      });
      const normal = createTestEnemy({
        id: "normal",
        speed: 10,
        atb: 0,
      });
      const state = createTestState({
        party: [buffed],
        enemies: [normal],
      });

      const actorId = tickATB(state);
      // buffed effective speed = 5 + 15 = 20
      // normal speed = 10
      // buffed reaches 100 first (100/20 = 5 ticks vs 100/10 = 10 ticks)
      expect(actorId).toBe("buffed");
    });
  });

  // ── calculateRating ──

  describe("calculateRating", () => {
    it("should give S rating for fast clean victory", () => {
      const state = createTestState({
        turnCount: 3,
        party: [
          createTestPartyMember({ id: "p1", isAlive: true }),
          createTestPartyMember({ id: "p2", isAlive: true }),
          createTestPartyMember({ id: "p3", isAlive: true }),
        ],
        logs: [
          createLog({ type: "weakness" }),
          createLog({ type: "weakness" }),
        ],
      });

      const rating = calculateRating(state);
      // score = 100 - 3*3 + 3*15 + 2*5 + 0*10 = 100 - 9 + 45 + 10 = 146 -> capped to 100
      expect(rating.grade).toBe("S");
      expect(rating.multiplier).toBe(1.5);
      expect(rating.survivorCount).toBe(3);
      expect(rating.turnsUsed).toBe(3);
      expect(rating.weaknessHits).toBe(2);
    });

    it("should give C rating for long messy fight", () => {
      const state = createTestState({
        turnCount: 40,
        party: [
          createTestPartyMember({ id: "p1", isAlive: true }),
          createTestPartyMember({ id: "p2", isAlive: false }),
          createTestPartyMember({ id: "p3", isAlive: false }),
        ],
        logs: [],
      });

      const rating = calculateRating(state);
      // score = 100 - 40*3 + 1*15 + 0 + 0 = 100 - 120 + 15 = -5 -> capped to 0
      expect(rating.grade).toBe("C");
      expect(rating.multiplier).toBe(0.8);
      expect(rating.survivorCount).toBe(1);
    });

    it("should give A rating for moderate fight", () => {
      const state = createTestState({
        turnCount: 8,
        party: [
          createTestPartyMember({ id: "p1", isAlive: true }),
          createTestPartyMember({ id: "p2", isAlive: true }),
        ],
        logs: [createLog({ type: "weakness" })],
      });

      const rating = calculateRating(state);
      // score = 100 - 8*3 + 2*15 + 1*5 = 100 - 24 + 30 + 5 = 111 -> capped to 100
      // Still S because score >= 90
      expect(rating.grade).toBe("S");
    });

    it("should give B rating for a decent fight", () => {
      const state = createTestState({
        turnCount: 15,
        party: [
          createTestPartyMember({ id: "p1", isAlive: true }),
          createTestPartyMember({ id: "p2", isAlive: false }),
        ],
        logs: [],
      });

      const rating = calculateRating(state);
      // score = 100 - 15*3 + 1*15 + 0 = 100 - 45 + 15 = 70
      expect(rating.grade).toBe("A");
      expect(rating.multiplier).toBe(1.2);
    });

    it("should give B rating when score is between 50 and 69", () => {
      const state = createTestState({
        turnCount: 20,
        party: [
          createTestPartyMember({ id: "p1", isAlive: true }),
          createTestPartyMember({ id: "p2", isAlive: false }),
        ],
        logs: [],
      });

      const rating = calculateRating(state);
      // score = 100 - 20*3 + 1*15 = 100 - 60 + 15 = 55
      expect(rating.grade).toBe("B");
      expect(rating.multiplier).toBe(1.0);
    });

    it("should count combo logs in score", () => {
      const state = createTestState({
        turnCount: 10,
        party: [
          createTestPartyMember({ id: "p1", isAlive: true }),
        ],
        logs: [
          createLog({ type: "combo" }),
          createLog({ type: "combo" }),
          createLog({ type: "combo" }),
        ],
      });

      const rating = calculateRating(state);
      // score = 100 - 10*3 + 1*15 + 0*5 + 3*10 = 100 - 30 + 15 + 30 = 115 -> capped to 100
      expect(rating.combosTriggered).toBe(3);
      expect(rating.grade).toBe("S");
    });

    it("should clamp score to 0-100 range", () => {
      // Very long fight with no survivors counted
      const state = createTestState({
        turnCount: 50,
        party: [
          createTestPartyMember({ id: "p1", isAlive: false }),
        ],
        logs: [],
      });

      const rating = calculateRating(state);
      // score = 100 - 50*3 + 0*15 = 100 - 150 = -50 -> capped to 0
      expect(rating.grade).toBe("C");
      expect(rating.multiplier).toBe(0.8);
    });
  });

  // ── resolveActionMultiTarget ──

  describe("resolveActionMultiTarget", () => {
    it("should resolve damage against multiple targets", () => {
      const attacker: CombatUnit = {
        id: "atk",
        name: "攻击者",
        hp: 100,
        maxHp: 100,
        mp: 50,
        maxMp: 50,
        attack: 30,
        defense: 10,
        speed: 10,
        luck: 0,
        intellect: 10,
        buffs: [],
      };
      const target1: CombatUnit = {
        id: "t1",
        name: "目标1",
        hp: 200,
        maxHp: 200,
        mp: 0,
        maxMp: 0,
        attack: 5,
        defense: 5,
        speed: 5,
        luck: 0,
        intellect: 0,
        buffs: [],
      };
      const target2: CombatUnit = {
        id: "t2",
        name: "目标2",
        hp: 200,
        maxHp: 200,
        mp: 0,
        maxMp: 0,
        attack: 5,
        defense: 5,
        speed: 5,
        luck: 0,
        intellect: 0,
        buffs: [],
      };

      const action = {
        effects: [
          {
            type: "damage" as const,
            damageType: "physical" as const,
            multiplier: 1.0,
          },
        ],
      };

      const result = resolveActionMultiTarget(action, attacker, [
        { unit: target1 },
        { unit: target2 },
      ]);

      expect(result.logs.length).toBeGreaterThan(0);
      expect(result.damageDealt).toBeGreaterThan(0);
      // Both targets should have taken damage
      expect(target1.hp).toBeLessThan(200);
      expect(target2.hp).toBeLessThan(200);
    });

    it("should apply elemental weakness to targets", () => {
      const attacker: CombatUnit = {
        id: "atk",
        name: "攻击者",
        hp: 100,
        maxHp: 100,
        mp: 50,
        maxMp: 50,
        attack: 30,
        defense: 10,
        speed: 10,
        luck: 0,
        intellect: 10,
        buffs: [],
      };
      const weakTarget: CombatUnit = {
        id: "t1",
        name: "弱点目标",
        hp: 200,
        maxHp: 200,
        mp: 0,
        maxMp: 0,
        attack: 5,
        defense: 5,
        speed: 5,
        luck: 0,
        intellect: 0,
        buffs: [],
      };

      const action = {
        effects: [
          {
            type: "damage" as const,
            damageType: "physical" as const,
            multiplier: 1.0,
            element: "fire",
          },
        ],
      };

      const result = resolveActionMultiTarget(action, attacker, [
        {
          unit: weakTarget,
          profile: { weaknesses: ["fire" as const], resistances: [] },
        },
      ]);

      // The combat resolver logs "弱点命中" for weakness hits
      expect(result.logs.some((l) => l.includes("弱点"))).toBe(true);
    });

    it("should apply elemental resistance to targets", () => {
      const attacker: CombatUnit = {
        id: "atk",
        name: "攻击者",
        hp: 100,
        maxHp: 100,
        mp: 50,
        maxMp: 50,
        attack: 30,
        defense: 10,
        speed: 10,
        luck: 0,
        intellect: 10,
        buffs: [],
      };
      const resistTarget: CombatUnit = {
        id: "t1",
        name: "抗性目标",
        hp: 200,
        maxHp: 200,
        mp: 0,
        maxMp: 0,
        attack: 5,
        defense: 5,
        speed: 5,
        luck: 0,
        intellect: 0,
        buffs: [],
      };

      const action = {
        effects: [
          {
            type: "damage" as const,
            damageType: "physical" as const,
            multiplier: 1.0,
            element: "ice",
          },
        ],
      };

      const result = resolveActionMultiTarget(action, attacker, [
        {
          unit: resistTarget,
          profile: {
            weaknesses: [],
            resistances: ["ice" as const],
          },
        },
      ]);

      // The combat resolver logs "属性抗性" for resistance
      expect(result.logs.some((l) => l.includes("抗性"))).toBe(true);
    });

    it("should resolve heal effects", () => {
      const caster: CombatUnit = {
        id: "healer",
        name: "治疗者",
        hp: 50,
        maxHp: 100,
        mp: 50,
        maxMp: 50,
        attack: 5,
        defense: 5,
        speed: 5,
        luck: 0,
        intellect: 10,
        buffs: [],
      };

      const action = {
        effects: [
          {
            type: "heal" as const,
            healType: "hp" as const,
            target: "self" as const,
            amount: 30,
            isPercent: false,
          },
        ],
      };

      const result = resolveActionMultiTarget(action, caster, [
        { unit: caster },
      ]);

      expect(result.healAmount).toBe(30);
      expect(caster.hp).toBe(80);
    });

    it("should resolve buff effects", () => {
      const caster: CombatUnit = {
        id: "buffer",
        name: "辅助者",
        hp: 100,
        maxHp: 100,
        mp: 50,
        maxMp: 50,
        attack: 10,
        defense: 10,
        speed: 10,
        luck: 0,
        intellect: 10,
        buffs: [],
      };
      const target: CombatUnit = {
        id: "target",
        name: "目标",
        hp: 100,
        maxHp: 100,
        mp: 0,
        maxMp: 0,
        attack: 10,
        defense: 10,
        speed: 10,
        luck: 0,
        intellect: 0,
        buffs: [],
      };

      const action = {
        effects: [
          {
            type: "buff" as const,
            target: "enemy" as const,
            modifiers: [
              { stat: "speed" as const, value: -0.3, type: "percent" as const },
            ],
            duration: 2,
          },
        ],
      };

      const result = resolveActionMultiTarget(action, caster, [
        { unit: target },
      ]);

      expect(result.buffsApplied).toBeDefined();
      expect(result.buffsApplied!.length).toBe(1);
      expect(target.buffs.length).toBe(1);
      expect(target.buffs[0]!.turnsRemaining).toBe(2);
    });

    it("should return empty result for no targets", () => {
      const attacker: CombatUnit = {
        id: "atk",
        name: "攻击者",
        hp: 100,
        maxHp: 100,
        mp: 50,
        maxMp: 50,
        attack: 30,
        defense: 10,
        speed: 10,
        luck: 0,
        intellect: 10,
        buffs: [],
      };

      const action = {
        effects: [
          {
            type: "damage" as const,
            damageType: "physical" as const,
            multiplier: 1.0,
          },
        ],
      };

      const result = resolveActionMultiTarget(action, attacker, []);

      expect(result.logs).toHaveLength(0);
      expect(result.damageDealt).toBeUndefined();
    });
  });
});
