import { describe, it, expect, beforeEach, vi } from "vitest";
import { storyRouter } from "../routers/story";
import {
  createMockDb,
  createTestContextForPlayer,
  resetMockDataStore,
  seedTestChapter,
  seedTestNode,
  seedTestPlayer,
  seedTestStoryProgress,
  type MockDb,
} from "./helpers";

describe("Story Router", () => {
  let mockDb: MockDb;
  const testUserId = "test_user_123";

  beforeEach(() => {
    resetMockDataStore();
    mockDb = createMockDb();
    // Seed a test player
    seedTestPlayer(mockDb, testUserId);
  });

  function createCaller() {
    const ctx = createTestContextForPlayer(mockDb, testUserId);
    return storyRouter.createCaller(ctx as never);
  }

  describe("getChapters", () => {
    it("should return empty array when no chapters exist", async () => {
      const caller = createCaller();
      const result = await caller.getChapters();
      expect(result).toEqual([]);
    });

    it("should return chapters with completion status", async () => {
      const chapter1 = seedTestChapter(mockDb, {
        title: "Chapter 1",
        order: 0,
        isActive: true,
        rewardsJson: '{"gold": 100}',
      });
      const chapter2 = seedTestChapter(mockDb, {
        title: "Chapter 2",
        order: 1,
        isActive: true,
      });

      // Add some nodes
      seedTestNode(mockDb, chapter1.id, { nodeId: "ch1_1" });
      seedTestNode(mockDb, chapter1.id, { nodeId: "ch1_2" });
      seedTestNode(mockDb, chapter2.id, { nodeId: "ch2_1" });

      const caller = createCaller();
      const result = await caller.getChapters();

      expect(result).toHaveLength(2);
      expect(result[0]?.title).toBe("Chapter 1");
      expect(result[0]?.nodeCount).toBe(2);
      expect(result[0]?.isCompleted).toBe(false);
      expect(result[1]?.nodeCount).toBe(1);
    });

    it("should only return active chapters", async () => {
      seedTestChapter(mockDb, { title: "Active", isActive: true });
      seedTestChapter(mockDb, { title: "Inactive", isActive: false });

      const caller = createCaller();
      const result = await caller.getChapters();

      expect(result).toHaveLength(1);
      expect(result[0]?.title).toBe("Active");
    });

    it("should mark completed chapters correctly", async () => {
      // Get the player that was seeded in beforeEach
      const player = (await mockDb.player.findUnique({
        where: { userId: testUserId },
      })) as { id: string };

      const chapter = seedTestChapter(mockDb, { title: "Test Chapter" });

      // Seed completed story progress
      seedTestStoryProgress(mockDb, player.id, chapter.id, {
        completed: true,
        completedAt: new Date(),
      });

      const caller = createCaller();
      const result = await caller.getChapters();

      expect(result[0]?.isCompleted).toBe(true);
    });
  });

  describe("getCurrentNode", () => {
    it("should throw error if chapter not found", async () => {
      const caller = createCaller();

      await expect(
        caller.getCurrentNode({ chapterId: "non_existent" })
      ).rejects.toThrow("章节不存在");
    });

    it("should return first node for new chapter", async () => {
      const chapter = seedTestChapter(mockDb);
      const node1 = seedTestNode(mockDb, chapter.id, {
        nodeId: "intro",
        title: "Introduction",
        content: "Welcome!",
        order: 0,
      });
      seedTestNode(mockDb, chapter.id, {
        nodeId: "second",
        title: "Second",
        order: 1,
      });

      const caller = createCaller();
      const result = await caller.getCurrentNode({ chapterId: chapter.id });

      expect(result.completed).toBe(false);
      expect(result.node?.id).toBe("intro");
      expect(result.node?.title).toBe("Introduction");
      expect(result.progress).toBe(0);
    });

    it("should return completed status for finished chapter", async () => {
      // Get the player
      const player = (await mockDb.player.findUnique({
        where: { userId: testUserId },
      })) as { id: string };

      const chapter = seedTestChapter(mockDb);

      // Seed completed story progress
      seedTestStoryProgress(mockDb, player.id, chapter.id, {
        completed: true,
        completedAt: new Date(),
      });

      const caller = createCaller();
      const result = await caller.getCurrentNode({ chapterId: chapter.id });

      expect(result.completed).toBe(true);
      expect(result.node).toBeNull();
    });

    it("should return node with choices", async () => {
      const chapter = seedTestChapter(mockDb);
      seedTestNode(mockDb, chapter.id, {
        nodeId: "choice_node",
        title: "Choose",
        content: "What do you do?",
        choicesJson: JSON.stringify([
          { text: "Go left", nextNode: "left" },
          { text: "Go right", nextNode: "right" },
        ]),
        order: 0,
      });

      const caller = createCaller();
      const result = await caller.getCurrentNode({ chapterId: chapter.id });

      expect(result.node?.choices).toBeDefined();
      expect(result.node?.choices).toHaveLength(2);
    });
  });

  describe("advanceStory", () => {
    it("should throw error if chapter not found", async () => {
      const caller = createCaller();

      await expect(
        caller.advanceStory({ chapterId: "non_existent" })
      ).rejects.toThrow("章节不存在");
    });

    it("should advance to next node without choices", async () => {
      const chapter = seedTestChapter(mockDb);
      seedTestNode(mockDb, chapter.id, {
        nodeId: "node_1",
        title: "First",
        nextNodeId: "node_2",
        order: 0,
      });
      seedTestNode(mockDb, chapter.id, {
        nodeId: "node_2",
        title: "Second",
        order: 1,
      });

      const caller = createCaller();
      const result = await caller.advanceStory({ chapterId: chapter.id });

      expect(result.advanced).toBe(true);
      expect(result.nextNode?.id).toBe("node_2");
    });

    it("should handle choice selection", async () => {
      const chapter = seedTestChapter(mockDb);
      seedTestNode(mockDb, chapter.id, {
        nodeId: "choice",
        title: "Choice",
        choicesJson: JSON.stringify([
          { text: "Option A", nextNode: "path_a", rewards: { gold: 50 } },
          { text: "Option B", nextNode: "path_b" },
        ]),
        order: 0,
      });
      seedTestNode(mockDb, chapter.id, {
        nodeId: "path_a",
        title: "Path A",
        nextNodeId: "path_continue", // Not final node
        order: 1,
      });
      seedTestNode(mockDb, chapter.id, {
        nodeId: "path_b",
        title: "Path B",
        order: 2,
      });
      seedTestNode(mockDb, chapter.id, {
        nodeId: "path_continue",
        title: "Continue",
        order: 3,
      });

      const caller = createCaller();
      const result = await caller.advanceStory({
        chapterId: chapter.id,
        choiceIndex: 0,
      });

      expect(result.advanced).toBe(true);
      expect(result.nextNode?.id).toBe("path_a");
      expect(result.isCompleted).toBe(false);
      expect(result.rewards).toEqual({ gold: 50 });
    });

    it("should mark chapter as completed at end", async () => {
      const chapter = seedTestChapter(mockDb, {
        rewardsJson: '{"gold": 100, "exp": 50}',
      });
      seedTestNode(mockDb, chapter.id, {
        nodeId: "final",
        title: "The End",
        // No nextNodeId and no choices = end of chapter
        order: 0,
      });

      const caller = createCaller();
      const result = await caller.advanceStory({ chapterId: chapter.id });

      expect(result.isCompleted).toBe(true);
      expect(result.rewards).toEqual({ gold: 100, exp: 50 });
    });

    it("should reject invalid choice index", async () => {
      const chapter = seedTestChapter(mockDb);
      seedTestNode(mockDb, chapter.id, {
        nodeId: "choice",
        choicesJson: JSON.stringify([
          { text: "Only option", nextNode: "next" },
        ]),
        order: 0,
      });

      const caller = createCaller();

      await expect(
        caller.advanceStory({ chapterId: chapter.id, choiceIndex: 5 })
      ).rejects.toThrow("无效的选择");
    });
  });

  describe("Authorization", () => {
    it("should throw error if player not found", async () => {
      resetMockDataStore();
      mockDb = createMockDb();
      // Don't seed player

      const ctx = createTestContextForPlayer(mockDb, "unknown_user");
      const caller = storyRouter.createCaller(ctx as never);

      await expect(caller.getChapters()).rejects.toThrow("玩家不存在");
    });
  });
});
