import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

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

interface ParsedChoice {
  text: string;
  nextNode: string;
  requirements?: Record<string, number>;
  rewards?: Record<string, number>;
}

// 解析节点的选项和奖励
function parseNode(node: StoryNodeData) {
  const choices = node.choicesJson ? JSON.parse(node.choicesJson) as ParsedChoice[] : undefined;
  const rewards = node.rewardsJson ? JSON.parse(node.rewardsJson) as Record<string, number> : undefined;
  return {
    id: node.nodeId,
    title: node.title,
    content: node.content,
    speaker: node.speaker ?? undefined,
    speakerIcon: node.speakerIcon ?? undefined,
    nextNode: node.nextNodeId ?? undefined,
    choices,
    rewards,
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
      rewards: JSON.parse(chapter.rewardsJson) as Record<string, number>,
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
      const chapterRewards = JSON.parse(chapter.rewardsJson) as Record<string, number>;
      if (Object.keys(rewards).length > 0 || isCompleted) {
        const finalRewards = isCompleted
          ? { ...rewards, ...chapterRewards }
          : rewards;

        await ctx.db.player.update({
          where: { id: player.id },
          data: {
            gold: player.gold + (finalRewards.gold ?? 0),
            crystals: player.crystals + (finalRewards.crystals ?? 0),
            exp: player.exp + (finalRewards.exp ?? 0),
          },
        });
      }

      return {
        advanced: true,
        nextNode,
        isCompleted,
        rewards: isCompleted ? chapterRewards : rewards,
      };
    }),
});
