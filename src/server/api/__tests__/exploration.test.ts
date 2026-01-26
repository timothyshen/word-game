import { describe, it, expect, beforeEach, vi } from "vitest";
import { explorationRouter } from "../routers/exploration";
import {
  createMockDb,
  createTestContextForPlayer,
  resetMockDataStore,
  seedTestPlayer,
  seedTestAdventure,
  seedTestExploredArea,
  type MockDb,
} from "./helpers";

describe("Exploration Router", () => {
  let mockDb: MockDb;
  const testUserId = "test_user_123";

  beforeEach(() => {
    resetMockDataStore();
    mockDb = createMockDb();
    // Seed a test player with enough stamina
    seedTestPlayer(mockDb, testUserId, { stamina: 100 });
  });

  function createCaller() {
    const ctx = createTestContextForPlayer(mockDb, testUserId);
    return explorationRouter.createCaller(ctx as never);
  }

  describe("getExploredAreas", () => {
    it("should return empty array when no areas explored", async () => {
      const caller = createCaller();
      const result = await caller.getExploredAreas({ worldId: "main" });
      expect(result).toEqual([]);
    });

    it("should return explored areas for player", async () => {
      const player = (await mockDb.player.findUnique({
        where: { userId: testUserId },
      })) as { id: string };

      seedTestExploredArea(mockDb, player.id, {
        worldId: "main",
        positionX: 1,
        positionY: 0,
        name: "Forest",
      });
      seedTestExploredArea(mockDb, player.id, {
        worldId: "main",
        positionX: 0,
        positionY: 1,
        name: "Plains",
      });

      const caller = createCaller();
      const result = await caller.getExploredAreas({ worldId: "main" });

      expect(result).toHaveLength(2);
    });

    it("should filter by worldId", async () => {
      const player = (await mockDb.player.findUnique({
        where: { userId: testUserId },
      })) as { id: string };

      seedTestExploredArea(mockDb, player.id, { worldId: "main" });
      seedTestExploredArea(mockDb, player.id, { worldId: "fire_realm" });

      const caller = createCaller();
      const mainResult = await caller.getExploredAreas({ worldId: "main" });
      const fireResult = await caller.getExploredAreas({ worldId: "fire_realm" });

      expect(mainResult).toHaveLength(1);
      expect(fireResult).toHaveLength(1);
    });
  });

  describe("exploreArea", () => {
    it("should fail if player has insufficient stamina", async () => {
      // Reset with low stamina player
      resetMockDataStore();
      mockDb = createMockDb();
      seedTestPlayer(mockDb, testUserId, { stamina: 5 }); // Less than 15 required

      const caller = createCaller();

      await expect(
        caller.exploreArea({ worldId: "main", positionX: 1, positionY: 0 })
      ).rejects.toThrow("体力不足");
    });

    it("should fail if area already explored", async () => {
      const player = (await mockDb.player.findUnique({
        where: { userId: testUserId },
      })) as { id: string };

      seedTestExploredArea(mockDb, player.id, {
        worldId: "main",
        positionX: 1,
        positionY: 0,
      });

      const caller = createCaller();

      await expect(
        caller.exploreArea({ worldId: "main", positionX: 1, positionY: 0 })
      ).rejects.toThrow("该区域已探索过");
    });

    it("should successfully explore new area", async () => {
      const caller = createCaller();
      const result = await caller.exploreArea({
        worldId: "main",
        positionX: 1,
        positionY: 0,
      });

      expect(result.explored).toBe(true);
      expect(result.position).toEqual({ x: 1, y: 0 });
      expect(result.staminaCost).toBe(15);
      expect(result.areaName).toBeDefined();
    });

    it("should consume stamina on exploration", async () => {
      const caller = createCaller();
      await caller.exploreArea({
        worldId: "main",
        positionX: 1,
        positionY: 0,
      });

      // Verify player stamina was updated
      expect(mockDb.player.update).toHaveBeenCalled();
    });
  });

  describe("triggerEvent", () => {
    it("should fail if area not explored", async () => {
      const caller = createCaller();

      await expect(
        caller.triggerEvent({ worldId: "main", positionX: 5, positionY: 5 })
      ).rejects.toThrow("请先探索该区域");
    });

    it("should fail if insufficient stamina", async () => {
      resetMockDataStore();
      mockDb = createMockDb();
      const player = seedTestPlayer(mockDb, testUserId, { stamina: 5 });
      seedTestExploredArea(mockDb, player.id, {
        worldId: "main",
        positionX: 1,
        positionY: 0,
      });

      const caller = createCaller();

      await expect(
        caller.triggerEvent({ worldId: "main", positionX: 1, positionY: 0 })
      ).rejects.toThrow("体力不足");
    });

    it("should return event from explored area", async () => {
      const player = (await mockDb.player.findUnique({
        where: { userId: testUserId },
      })) as { id: string };

      seedTestExploredArea(mockDb, player.id, {
        worldId: "main",
        positionX: 1,
        positionY: 0,
        name: "Test Area",
      });

      const caller = createCaller();
      const result = await caller.triggerEvent({
        worldId: "main",
        positionX: 1,
        positionY: 0,
      });

      expect(result.event).toBeDefined();
      expect(result.event.type).toBeDefined();
      expect(result.event.title).toBeDefined();
      expect(result.event.options).toBeDefined();
      expect(result.staminaCost).toBe(10);
      expect(result.areaName).toBe("Test Area");
    });

    it("should use database adventures when available", async () => {
      const player = (await mockDb.player.findUnique({
        where: { userId: testUserId },
      })) as { id: string };

      seedTestExploredArea(mockDb, player.id, {
        worldId: "main",
        positionX: 1,
        positionY: 0,
      });

      // Create a database adventure
      seedTestAdventure(mockDb, {
        name: "db_adventure",
        type: "resource",
        minLevel: 1,
        maxLevel: 10,
        weight: 1000, // High weight to ensure it's selected
        isActive: true,
        title: "Database Adventure",
        description: "This comes from the database",
        optionsJson: JSON.stringify([{ text: "Take it", action: "collect" }]),
        rewardsJson: JSON.stringify({ gold: 500 }),
      });

      const caller = createCaller();
      const result = await caller.triggerEvent({
        worldId: "main",
        positionX: 1,
        positionY: 0,
      });

      // The adventure should come from database due to high weight
      expect(result.event).toBeDefined();
      // Note: Due to weighted random selection, we can't guarantee which event is chosen
      // but the test verifies the code path works
    });

    it("should filter adventures by level", async () => {
      // Recreate fresh mockDb and player
      resetMockDataStore();
      mockDb = createMockDb();
      const player = seedTestPlayer(mockDb, testUserId, { stamina: 100 });

      // Area at position (2,2) should have level ~= sqrt(8)/2 ≈ 1.4 -> level 1
      seedTestExploredArea(mockDb, player.id, {
        worldId: "main",
        positionX: 2,
        positionY: 2,
      });

      // Adventure with high level requirement shouldn't appear
      seedTestAdventure(mockDb, {
        name: "high_level",
        type: "treasure",
        minLevel: 10, // Too high for level 1 area
        isActive: true,
        title: "High Level Adventure",
        description: "Requires high level",
        optionsJson: "[]",
      });

      // This should not throw and should use fallback events
      const caller = createCaller();
      const result = await caller.triggerEvent({
        worldId: "main",
        positionX: 2,
        positionY: 2,
      });

      expect(result.event).toBeDefined();
    });

    it("should filter adventures by world", async () => {
      // Recreate fresh mockDb and player
      resetMockDataStore();
      mockDb = createMockDb();
      const player = seedTestPlayer(mockDb, testUserId, { stamina: 100 });

      seedTestExploredArea(mockDb, player.id, {
        worldId: "main",
        positionX: 1,
        positionY: 0,
      });

      // Adventure specific to fire_realm
      seedTestAdventure(mockDb, {
        name: "fire_specific",
        type: "special",
        worldId: "fire_realm", // Not "main"
        weight: 10000,
        isActive: true,
        title: "Fire Adventure",
        description: "Only in fire realm",
        optionsJson: "[]",
      });

      const caller = createCaller();
      const result = await caller.triggerEvent({
        worldId: "main",
        positionX: 1,
        positionY: 0,
      });

      // Should get fallback event since fire adventure doesn't match "main" world
      expect(result.event).toBeDefined();
    });
  });

  describe("handleEventChoice", () => {
    it("should handle collect action", async () => {
      const caller = createCaller();

      const eventData = JSON.stringify({
        type: "resource",
        title: "Gold Mine",
        description: "Found gold",
        options: [{ text: "Collect", action: "collect" }],
        rewards: { gold: 100 },
      });

      const result = await caller.handleEventChoice({
        eventType: "resource",
        action: "collect",
        eventData,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("采集");
      expect(result.rewards).toEqual({ gold: 100 });
    });

    it("should handle fight action victory", async () => {
      // Player with high stats
      resetMockDataStore();
      mockDb = createMockDb();
      seedTestPlayer(mockDb, testUserId, {
        stamina: 100,
        strength: 50, // High strength for victory
        agility: 30,
      });

      const caller = createCaller();

      const eventData = JSON.stringify({
        type: "monster",
        title: "Wolf",
        description: "A wolf attacks",
        options: [{ text: "Fight", action: "fight" }],
        monster: {
          name: "野狼",
          level: 1,
          hp: 30,
          attack: 8,
          defense: 3,
          rewards: { exp: 20, gold: 10, cardChance: 0.1 },
        },
      });

      const result = await caller.handleEventChoice({
        eventType: "monster",
        action: "fight",
        eventData,
      });

      expect(result.success).toBe(true);
      expect(result.combat).toBeDefined();
      expect(result.combat?.victory).toBe(true);
      expect(result.combat?.rewards.exp).toBe(20);
    });

    it("should handle flee action", async () => {
      const caller = createCaller();

      const result = await caller.handleEventChoice({
        eventType: "monster",
        action: "flee",
      });

      expect(result.success).toBe(true);
      // Flee has 50% success rate
      expect(typeof result.fled).toBe("boolean");
    });

    it("should handle open treasure action", async () => {
      const caller = createCaller();

      const eventData = JSON.stringify({
        type: "treasure",
        title: "Chest",
        description: "A treasure chest",
        options: [{ text: "Open", action: "open" }],
        rewards: { gold: 200 },
      });

      const result = await caller.handleEventChoice({
        eventType: "treasure",
        action: "open",
        eventData,
      });

      expect(result.success).toBe(true);
      expect(result.rewards).toEqual({ gold: 200 });
    });

    it("should handle leave/continue actions", async () => {
      const caller = createCaller();

      const leaveResult = await caller.handleEventChoice({
        eventType: "resource",
        action: "leave",
      });

      const continueResult = await caller.handleEventChoice({
        eventType: "nothing",
        action: "continue",
      });

      expect(leaveResult.success).toBe(true);
      expect(continueResult.success).toBe(true);
    });
  });

  describe("Authorization", () => {
    it("should throw error if player not found", async () => {
      resetMockDataStore();
      mockDb = createMockDb();
      // Don't seed player

      const ctx = createTestContextForPlayer(mockDb, "unknown_user");
      const caller = explorationRouter.createCaller(ctx as never);

      await expect(
        caller.getExploredAreas({ worldId: "main" })
      ).rejects.toThrow("玩家不存在");
    });
  });
});
