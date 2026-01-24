import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

// 剧情节点定义
interface StoryNode {
  id: string;
  title: string;
  content: string;
  speaker?: string;
  speakerIcon?: string;
  choices?: Array<{
    text: string;
    nextNode: string;
    requirements?: Record<string, number>;
    rewards?: Record<string, number>;
  }>;
  nextNode?: string; // 无选项时自动跳转
  rewards?: Record<string, number>; // 节点完成奖励
  unlockCondition?: {
    level?: number;
    tier?: number;
    quest?: string;
    day?: number;
  };
}

// 剧情章节
interface StoryChapter {
  id: string;
  title: string;
  description: string;
  nodes: StoryNode[];
  rewards: {
    gold?: number;
    crystals?: number;
    exp?: number;
    cards?: Array<{ rarity: string; count: number }>;
  };
}

// 示例剧情数据
const STORY_CHAPTERS: StoryChapter[] = [
  {
    id: "prologue",
    title: "序章：领主的觉醒",
    description: "你在一片废墟中醒来，发现自己成为了这片土地的领主...",
    nodes: [
      {
        id: "prologue_1",
        title: "觉醒",
        content: "你缓缓睁开眼睛，发现自己躺在一片废墟之中。阳光透过破碎的屋顶照射进来，空气中弥漫着尘土的气息。",
        nextNode: "prologue_2",
      },
      {
        id: "prologue_2",
        title: "神秘老人",
        content: "一位白发苍苍的老人站在你面前，他的眼中闪烁着智慧的光芒。",
        speaker: "神秘老人",
        speakerIcon: "👴",
        nextNode: "prologue_3",
      },
      {
        id: "prologue_3",
        title: "选择命运",
        content: "\"年轻人，你是这片土地选中的领主。但前方的道路充满未知，你准备好了吗？\"",
        speaker: "神秘老人",
        speakerIcon: "👴",
        choices: [
          {
            text: "我已准备好迎接挑战",
            nextNode: "prologue_4a",
            rewards: { gold: 100, exp: 50 },
          },
          {
            text: "请告诉我更多信息",
            nextNode: "prologue_4b",
          },
        ],
      },
      {
        id: "prologue_4a",
        title: "勇者之心",
        content: "老人露出欣慰的笑容。\"很好，勇气是成为伟大领主的第一步。这是我送给你的礼物，愿它能帮助你开始这段旅程。\"",
        speaker: "神秘老人",
        speakerIcon: "👴",
      },
      {
        id: "prologue_4b",
        title: "求知之心",
        content: "\"聪明的选择，知识同样是力量。这片土地曾经繁荣昌盛，但一场灾难让一切化为废墟。你的任务是重建它。\"",
        speaker: "神秘老人",
        speakerIcon: "👴",
        nextNode: "prologue_4a",
      },
    ],
    rewards: { gold: 200, crystals: 5, exp: 100 },
  },
  {
    id: "chapter_1",
    title: "第一章：重建家园",
    description: "开始建设你的领地，招募第一批追随者。",
    nodes: [
      {
        id: "ch1_1",
        title: "第一步",
        content: "神秘老人离开后，你开始审视周围的废墟。这里曾经是一座城堡的遗址，虽然破败，但根基还在。",
        unlockCondition: { day: 2 },
        nextNode: "ch1_2",
      },
      {
        id: "ch1_2",
        title: "建设开始",
        content: "使用建筑卡可以在领地中建造各种设施。农田可以提供粮食，矿场可以提供资源，兵营可以训练士兵。",
        choices: [
          {
            text: "先建造农田",
            nextNode: "ch1_farm",
          },
          {
            text: "先建造兵营",
            nextNode: "ch1_barracks",
          },
        ],
      },
      {
        id: "ch1_farm",
        title: "民以食为天",
        content: "\"粮食是发展的基础\"，你决定先确保领民的温饱。",
        rewards: { food: 50 },
      },
      {
        id: "ch1_barracks",
        title: "以战养战",
        content: "\"没有军队保护，再多的资源也守不住\"，你决定先组建军队。",
        rewards: { gold: 50 },
      },
    ],
    rewards: { gold: 300, exp: 150 },
  },
];

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

    return STORY_CHAPTERS.map(chapter => ({
      id: chapter.id,
      title: chapter.title,
      description: chapter.description,
      isCompleted: completedStories.has(chapter.id),
      nodeCount: chapter.nodes.length,
      rewards: chapter.rewards,
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

      const chapter = STORY_CHAPTERS.find(c => c.id === input.chapterId);
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
        : chapter.nodes[0]?.id;

      const node = chapter.nodes.find(n => n.id === currentNodeId);

      return {
        completed: false,
        node: node ?? chapter.nodes[0],
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

      const chapter = STORY_CHAPTERS.find(c => c.id === input.chapterId);
      if (!chapter) {
        throw new TRPCError({ code: "NOT_FOUND", message: "章节不存在" });
      }

      let progress = player.storyProgress.find(p => p.storyId === input.chapterId);
      const choices = progress?.choices ? JSON.parse(progress.choices) as string[] : [];

      // 获取当前节点
      const currentNodeId = choices.length > 0
        ? choices[choices.length - 1]
        : chapter.nodes[0]?.id;

      const currentNode = chapter.nodes.find(n => n.id === currentNodeId);
      if (!currentNode) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "节点不存在" });
      }

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
      const nextNode = chapter.nodes.find(n => n.id === nextNodeId);
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
      if (Object.keys(rewards).length > 0 || isCompleted) {
        const finalRewards = isCompleted
          ? { ...rewards, ...chapter.rewards }
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
        rewards: isCompleted ? chapter.rewards : rewards,
      };
    }),
});
