import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  parseStoryChoices,
  parseRewards,
  resolveRewards,
  buildResourceUpdate,
} from "~/shared/effects";
import type { RewardEntry } from "~/shared/effects";

// 节点类型
interface StoryNodeData {
  id: string;
  nodeId: string;
  title: string;
  content: string;
  speaker: string | null;
  speakerIcon: string | null;
  nextNodeId: string | null;
  choicesJson: string | null;
  rewardsJson: string | null;
}

/** Legacy choice format from existing seed data */
interface LegacyChoice {
  text: string;
  nextNode: string;
  requirements?: Record<string, number>;
  rewards?: Record<string, number>;
}

/** Unified choice shape returned by parseNode */
interface ParsedChoice {
  text: string;
  nextNode: string;
  requirements?: Record<string, number>;
  rewards?: Record<string, number>;
  typedRewards?: RewardEntry[];
}

/**
 * Parse choices — try typed StoryChoice[] first, fallback to legacy format.
 * Returns a unified ParsedChoice[] for API compatibility.
 */
function parseChoices(json: string): ParsedChoice[] {
  const typed = parseStoryChoices(json);
  if (typed.length > 0) {
    return typed.map(c => ({
      text: c.text,
      nextNode: c.nextNodeId,
      typedRewards: c.rewards,
    }));
  }
  // Legacy format: [{ text, nextNode, requirements?, rewards? }]
  try {
    return JSON.parse(json) as LegacyChoice[];
  } catch {
    return [];
  }
}

/**
 * Parse rewards JSON — try typed RewardEntry[] first, fallback to legacy Record<string,number>.
 * Returns both shapes for API compat + internal typed processing.
 */
function parseRewardsCompat(json: string): { legacy: Record<string, number>; typed: RewardEntry[] } {
  const typed = parseRewards(json);
  if (typed.length > 0) {
    const grant = resolveRewards(typed);
    return { legacy: grant.resourcesGranted, typed };
  }
  // Legacy format: { gold: 100, exp: 50, ... }
  try {
    const legacy = JSON.parse(json) as Record<string, number>;
    return { legacy, typed: [] };
  } catch {
    return { legacy: {}, typed: [] };
  }
}

// 解析节点的选项和奖励
function parseNode(node: StoryNodeData) {
  const choices = node.choicesJson ? parseChoices(node.choicesJson) : undefined;
  const rewardsData = node.rewardsJson ? parseRewardsCompat(node.rewardsJson) : undefined;
  return {
    id: node.nodeId,
    title: node.title,
    content: node.content,
    speaker: node.speaker ?? undefined,
    speakerIcon: node.speakerIcon ?? undefined,
    nextNode: node.nextNodeId ?? undefined,
    choices,
    rewards: rewardsData?.legacy,
  };
}

export const storyRouter = createTRPCRouter({
  // 获取所有剧情章节
  getChapters: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const player = await ctx.db.player.findUnique({
      where: { userId },
      include: { storyProgress: true },
    });

    if (!player) {
      throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
    }

    const completedStories = new Set(
      player.storyProgress.filter(p => p.completed).map(p => p.storyId)
    );

    // 从数据库获取章节
    const chapters = await ctx.db.storyChapter.findMany({
      where: { isActive: true },
      include: { nodes: true },
      orderBy: { order: "asc" },
    });

    return chapters.map(chapter => ({
      id: chapter.id,
      title: chapter.title,
      description: chapter.description,
      isCompleted: completedStories.has(chapter.id),
      nodeCount: chapter.nodes.length,
      rewards: parseRewardsCompat(chapter.rewardsJson).legacy,
    }));
  }),

  // 获取当前剧情节点
  getCurrentNode: protectedProcedure
    .input(z.object({ chapterId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({
        where: { userId },
        include: { storyProgress: true },
      });

      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      // 从数据库获取章节和节点
      const chapter = await ctx.db.storyChapter.findUnique({
        where: { id: input.chapterId },
        include: { nodes: { orderBy: { order: "asc" } } },
      });

      if (!chapter) {
        throw new TRPCError({ code: "NOT_FOUND", message: "章节不存在" });
      }

      const progress = player.storyProgress.find(p => p.storyId === input.chapterId);

      if (progress?.completed) {
        return { completed: true, node: null };
      }

      // 获取当前节点
      const choices = progress?.choices ? JSON.parse(progress.choices) as string[] : [];
      const currentNodeId = choices.length > 0
        ? choices[choices.length - 1]
        : chapter.nodes[0]?.nodeId;

      const nodeData = chapter.nodes.find(n => n.nodeId === currentNodeId);
      const firstNode = chapter.nodes[0];

      return {
        completed: false,
        node: nodeData ? parseNode(nodeData) : (firstNode ? parseNode(firstNode) : null),
        progress: choices.length,
        totalNodes: chapter.nodes.length,
      };
    }),

  // 推进剧情（做出选择）
  advanceStory: protectedProcedure
    .input(z.object({
      chapterId: z.string(),
      choiceIndex: z.number().optional(), // 选择索引
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({
        where: { userId },
        include: { storyProgress: true },
      });

      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      // 从数据库获取章节和节点
      const chapter = await ctx.db.storyChapter.findUnique({
        where: { id: input.chapterId },
        include: { nodes: { orderBy: { order: "asc" } } },
      });

      if (!chapter) {
        throw new TRPCError({ code: "NOT_FOUND", message: "章节不存在" });
      }

      const progress = player.storyProgress.find(p => p.storyId === input.chapterId);
      const choices = progress?.choices ? JSON.parse(progress.choices) as string[] : [];

      // 获取当前节点
      const currentNodeId = choices.length > 0
        ? choices[choices.length - 1]
        : chapter.nodes[0]?.nodeId;

      const currentNodeData = chapter.nodes.find(n => n.nodeId === currentNodeId);
      if (!currentNodeData) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "节点不存在" });
      }

      const currentNode = parseNode(currentNodeData);

      // 确定下一个节点
      let nextNodeId: string | undefined;
      let rewards: Record<string, number> = {};

      if (currentNode.choices && input.choiceIndex !== undefined) {
        const choice = currentNode.choices[input.choiceIndex];
        if (!choice) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "无效的选择" });
        }
        nextNodeId = choice.nextNode;
        if (choice.rewards) {
          rewards = choice.rewards;
        }
      } else {
        nextNodeId = currentNode.nextNode;
      }

      // 更新进度
      if (nextNodeId) {
        choices.push(nextNodeId);
      }

      // 检查是否完成章节
      const nextNodeData = chapter.nodes.find(n => n.nodeId === nextNodeId);
      const nextNode = nextNodeData ? parseNode(nextNodeData) : undefined;
      const isCompleted = !nextNode || (!nextNode.nextNode && !nextNode.choices);

      if (progress) {
        await ctx.db.storyProgress.update({
          where: { id: progress.id },
          data: {
            choices: JSON.stringify(choices),
            completed: isCompleted,
            completedAt: isCompleted ? new Date() : null,
          },
        });
      } else {
        await ctx.db.storyProgress.create({
          data: {
            playerId: player.id,
            storyId: input.chapterId,
            choices: JSON.stringify(choices),
            completed: isCompleted,
            completedAt: isCompleted ? new Date() : null,
          },
        });
      }

      // 发放奖励
      const chapterRewardsData = parseRewardsCompat(chapter.rewardsJson);
      if (Object.keys(rewards).length > 0 || isCompleted) {
        const finalRewards = isCompleted
          ? { ...rewards, ...chapterRewardsData.legacy }
          : rewards;

        const resourceUpdate = buildResourceUpdate(finalRewards, player as unknown as Record<string, number>);
        if (Object.keys(resourceUpdate).length > 0) {
          await ctx.db.player.update({
            where: { id: player.id },
            data: resourceUpdate,
          });
        }
      }

      return {
        advanced: true,
        nextNode,
        isCompleted,
        rewards: isCompleted ? chapterRewardsData.legacy : rewards,
      };
    }),
});
