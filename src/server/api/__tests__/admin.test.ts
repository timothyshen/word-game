import { describe, it, expect, beforeEach, vi } from "vitest";
import { adminRouter } from "../routers/admin";
import {
  createMockDb,
  createTestContextForAdmin,
  resetMockDataStore,
  seedTestCard,
  seedTestChapter,
  seedTestNode,
  seedTestAdventure,
  seedTestPlayer,
  type MockDb,
} from "./helpers";

describe("Admin Router", () => {
  let mockDb: MockDb;
  let ctx: ReturnType<typeof createTestContextForAdmin>;
  let caller: ReturnType<typeof adminRouter.createCaller>;

  beforeEach(() => {
    resetMockDataStore();
    mockDb = createMockDb();
    // Add playerCard mock for deleteCard
    (mockDb as unknown as Record<string, unknown>).playerCard = {
      deleteMany: vi.fn(async () => ({ count: 0 })),
    };
    ctx = createTestContextForAdmin(mockDb);
    caller = adminRouter.createCaller(ctx as never);
  });

  // ===== Card Tests =====

  describe("Card CRUD", () => {
    describe("getCards", () => {
      it("should return empty array when no cards exist", async () => {
        const result = await caller.getCards();
        expect(result).toEqual([]);
      });

      it("should return all cards", async () => {
        seedTestCard(mockDb, { name: "Card A" });
        seedTestCard(mockDb, { name: "Card B" });

        const result = await caller.getCards();
        expect(result).toHaveLength(2);
      });
    });

    describe("getCard", () => {
      it("should return null for non-existent card", async () => {
        const result = await caller.getCard({ id: "non-existent" });
        expect(result).toBeNull();
      });

      it("should return card by id", async () => {
        const card = seedTestCard(mockDb, { name: "Test Card" });

        const result = await caller.getCard({ id: card.id });
        expect(result).toBeDefined();
        expect(result?.name).toBe("Test Card");
      });
    });

    describe("createCard", () => {
      it("should create a new card", async () => {
        const result = await caller.createCard({
          name: "New Card",
          type: "building",
          rarity: "普通",
          description: "A new card",
          icon: "🏠",
          effects: '{"buildingId": "farm"}',
        });

        expect(result).toBeDefined();
        expect(result.name).toBe("New Card");
        expect(result.type).toBe("building");
        expect(result.rarity).toBe("普通");
      });

      it("should create card with all types", async () => {
        const types = ["building", "recruit", "skill", "enhance", "item"] as const;

        for (const type of types) {
          const result = await caller.createCard({
            name: `${type} Card`,
            type,
            rarity: "普通",
            description: `A ${type} card`,
            effects: "{}",
          });
          expect(result.type).toBe(type);
        }
      });

      it("should create card with all rarities", async () => {
        const rarities = ["普通", "精良", "稀有", "史诗", "传说"] as const;

        for (const rarity of rarities) {
          const result = await caller.createCard({
            name: `${rarity} Card`,
            type: "building",
            rarity,
            description: `A ${rarity} card`,
            effects: "{}",
          });
          expect(result.rarity).toBe(rarity);
        }
      });
    });

    describe("updateCard", () => {
      it("should update card name", async () => {
        const card = seedTestCard(mockDb, { name: "Old Name" });

        const result = await caller.updateCard({
          id: card.id,
          name: "New Name",
        });

        expect(result.name).toBe("New Name");
      });

      it("should update multiple fields", async () => {
        const card = seedTestCard(mockDb);

        const result = await caller.updateCard({
          id: card.id,
          name: "Updated",
          description: "Updated description",
          icon: "🎯",
        });

        expect(result.name).toBe("Updated");
        expect(result.description).toBe("Updated description");
        expect(result.icon).toBe("🎯");
      });
    });

    describe("deleteCard", () => {
      it("should delete card", async () => {
        const card = seedTestCard(mockDb);

        await caller.deleteCard({ id: card.id });

        const result = await caller.getCard({ id: card.id });
        expect(result).toBeNull();
      });
    });
  });

  // ===== Story Chapter Tests =====

  describe("StoryChapter CRUD", () => {
    describe("getStoryChapters", () => {
      it("should return empty array when no chapters exist", async () => {
        const result = await caller.getStoryChapters();
        expect(result).toEqual([]);
      });

      it("should return chapters with nodes", async () => {
        const chapter = seedTestChapter(mockDb, { title: "Chapter 1" });
        seedTestNode(mockDb, chapter.id, { nodeId: "node_1", title: "Node 1" });
        seedTestNode(mockDb, chapter.id, { nodeId: "node_2", title: "Node 2" });

        const result = await caller.getStoryChapters();
        expect(result).toHaveLength(1);
        expect(result[0]?.nodes).toHaveLength(2);
      });
    });

    describe("getStoryChapter", () => {
      it("should return chapter with nodes", async () => {
        const chapter = seedTestChapter(mockDb, { title: "Test Chapter" });
        seedTestNode(mockDb, chapter.id, { nodeId: "node_1" });

        const result = await caller.getStoryChapter({ id: chapter.id });
        expect(result).toBeDefined();
        expect(result?.title).toBe("Test Chapter");
        expect(result?.nodes).toHaveLength(1);
      });
    });

    describe("createStoryChapter", () => {
      it("should create a new chapter", async () => {
        const result = await caller.createStoryChapter({
          title: "New Chapter",
          description: "A new chapter",
          order: 1,
          isActive: true,
          rewardsJson: '{"gold": 100}',
          unlockJson: '{"level": 5}',
        });

        expect(result.title).toBe("New Chapter");
        expect(result.order).toBe(1);
        expect(result.isActive).toBe(true);
      });

      it("should use default values", async () => {
        const result = await caller.createStoryChapter({
          title: "Minimal Chapter",
          description: "Minimal description",
        });

        expect(result.order).toBe(0);
        expect(result.isActive).toBe(true);
        expect(result.rewardsJson).toBe("{}");
      });
    });

    describe("updateStoryChapter", () => {
      it("should update chapter", async () => {
        const chapter = seedTestChapter(mockDb, { title: "Old Title" });

        const result = await caller.updateStoryChapter({
          id: chapter.id,
          title: "New Title",
          isActive: false,
        });

        expect(result.title).toBe("New Title");
        expect(result.isActive).toBe(false);
      });
    });

    describe("deleteStoryChapter", () => {
      it("should delete chapter", async () => {
        const chapter = seedTestChapter(mockDb);

        await caller.deleteStoryChapter({ id: chapter.id });

        const result = await caller.getStoryChapter({ id: chapter.id });
        expect(result).toBeNull();
      });
    });
  });

  // ===== Story Node Tests =====

  describe("StoryNode CRUD", () => {
    describe("createStoryNode", () => {
      it("should create a new node", async () => {
        const chapter = seedTestChapter(mockDb);

        const result = await caller.createStoryNode({
          chapterId: chapter.id,
          nodeId: "intro_1",
          title: "Introduction",
          content: "Welcome to the story!",
          speaker: "Narrator",
          speakerIcon: "📖",
          order: 0,
        });

        expect(result.nodeId).toBe("intro_1");
        expect(result.title).toBe("Introduction");
        expect(result.speaker).toBe("Narrator");
      });

      it("should create node with choices", async () => {
        const chapter = seedTestChapter(mockDb);

        const result = await caller.createStoryNode({
          chapterId: chapter.id,
          nodeId: "choice_node",
          title: "Choice",
          content: "What do you do?",
          choicesJson: JSON.stringify([
            { text: "Go left", nextNode: "left_path" },
            { text: "Go right", nextNode: "right_path" },
          ]),
        });

        expect(result.choicesJson).toBeDefined();
        const choices = JSON.parse(result.choicesJson!);
        expect(choices).toHaveLength(2);
      });
    });

    describe("updateStoryNode", () => {
      it("should update node content", async () => {
        const chapter = seedTestChapter(mockDb);
        const node = seedTestNode(mockDb, chapter.id, { content: "Old content" });

        const result = await caller.updateStoryNode({
          id: node.id,
          content: "New content",
        });

        expect(result.content).toBe("New content");
      });
    });

    describe("deleteStoryNode", () => {
      it("should delete node", async () => {
        const chapter = seedTestChapter(mockDb);
        const node = seedTestNode(mockDb, chapter.id);

        await caller.deleteStoryNode({ id: node.id });

        const chapters = await caller.getStoryChapters();
        const foundChapter = chapters.find((c) => c.id === chapter.id);
        expect(foundChapter?.nodes).toHaveLength(0);
      });
    });

    describe("reorderStoryNodes", () => {
      it("should reorder nodes", async () => {
        const chapter = seedTestChapter(mockDb);
        const node1 = seedTestNode(mockDb, chapter.id, { order: 0 });
        const node2 = seedTestNode(mockDb, chapter.id, { order: 1 });

        const result = await caller.reorderStoryNodes({
          nodes: [
            { id: node1.id, order: 1 },
            { id: node2.id, order: 0 },
          ],
        });

        expect(result.success).toBe(true);
      });
    });
  });

  // ===== Adventure Tests =====

  describe("Adventure CRUD", () => {
    describe("getAdventures", () => {
      it("should return empty array when no adventures exist", async () => {
        const result = await caller.getAdventures();
        expect(result).toEqual([]);
      });

      it("should return all adventures", async () => {
        seedTestAdventure(mockDb, { name: "adventure_1", type: "resource" });
        seedTestAdventure(mockDb, { name: "adventure_2", type: "monster" });

        const result = await caller.getAdventures();
        expect(result).toHaveLength(2);
      });
    });

    describe("getAdventure", () => {
      it("should return adventure by id", async () => {
        const adventure = seedTestAdventure(mockDb, { title: "Test Adventure" });

        const result = await caller.getAdventure({ id: adventure.id });
        expect(result?.title).toBe("Test Adventure");
      });
    });

    describe("createAdventure", () => {
      it("should create a new adventure", async () => {
        const result = await caller.createAdventure({
          name: "gold_mine",
          type: "resource",
          minLevel: 1,
          maxLevel: 5,
          weight: 100,
          isActive: true,
          title: "发现金矿",
          description: "你发现了一处金矿",
          icon: "💎",
          optionsJson: JSON.stringify([
            { text: "开采", action: "collect" },
            { text: "离开", action: "leave" },
          ]),
          rewardsJson: JSON.stringify({ gold: 100 }),
        });

        expect(result.name).toBe("gold_mine");
        expect(result.type).toBe("resource");
        expect(result.minLevel).toBe(1);
        expect(result.maxLevel).toBe(5);
      });

      it("should create monster adventure", async () => {
        const result = await caller.createAdventure({
          name: "wolf_encounter",
          type: "monster",
          title: "遭遇野狼",
          description: "一只野狼挡住了你的去路",
          optionsJson: JSON.stringify([
            { text: "战斗", action: "fight" },
            { text: "逃跑", action: "flee" },
          ]),
          monsterJson: JSON.stringify({
            name: "野狼",
            baseHp: 30,
            baseAtk: 8,
            baseDef: 3,
          }),
        });

        expect(result.type).toBe("monster");
        expect(result.monsterJson).toBeDefined();
      });

      it("should create world-specific adventure", async () => {
        const result = await caller.createAdventure({
          name: "fire_treasure",
          type: "treasure",
          worldId: "fire_realm",
          title: "火焰宝箱",
          description: "一个散发热量的宝箱",
          optionsJson: "[]",
        });

        expect(result.worldId).toBe("fire_realm");
      });
    });

    describe("updateAdventure", () => {
      it("should update adventure", async () => {
        const adventure = seedTestAdventure(mockDb, { weight: 100 });

        const result = await caller.updateAdventure({
          id: adventure.id,
          weight: 200,
          isActive: false,
        });

        expect(result.weight).toBe(200);
        expect(result.isActive).toBe(false);
      });
    });

    describe("deleteAdventure", () => {
      it("should delete adventure", async () => {
        const adventure = seedTestAdventure(mockDb);

        await caller.deleteAdventure({ id: adventure.id });

        const result = await caller.getAdventure({ id: adventure.id });
        expect(result).toBeNull();
      });
    });
  });

  // ===== Stats Tests =====

  describe("getStats", () => {
    it("should return zero counts when empty", async () => {
      const result = await caller.getStats();

      expect(result.cards).toBe(0);
      expect(result.chapters).toBe(0);
      expect(result.adventures).toBe(0);
      expect(result.players).toBe(0);
    });

    it("should return correct counts", async () => {
      seedTestCard(mockDb);
      seedTestCard(mockDb);
      seedTestChapter(mockDb);
      seedTestAdventure(mockDb);
      seedTestPlayer(mockDb, "user_1");

      const result = await caller.getStats();

      expect(result.cards).toBe(2);
      expect(result.chapters).toBe(1);
      expect(result.adventures).toBe(1);
      expect(result.players).toBe(1);
    });
  });
});
