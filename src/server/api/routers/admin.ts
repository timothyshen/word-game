import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

// ===== Card 相关 =====

const cardSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["building", "recruit", "skill", "enhance", "item", "expansion"]),
  rarity: z.enum(["普通", "精良", "稀有", "史诗", "传说"]),
  description: z.string(),
  icon: z.string().default("🃏"),
  effects: z.string(), // JSON string
});

// ===== Story 相关 =====

const storyChapterSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  order: z.number().default(0),
  isActive: z.boolean().default(true),
  rewardsJson: z.string().default("{}"),
  unlockJson: z.string().default("{}"),
});

const storyNodeSchema = z.object({
  chapterId: z.string(),
  nodeId: z.string().min(1),
  title: z.string().min(1),
  content: z.string(),
  speaker: z.string().optional(),
  speakerIcon: z.string().optional(),
  order: z.number().default(0),
  nextNodeId: z.string().optional(),
  choicesJson: z.string().optional(),
  rewardsJson: z.string().optional(),
});

// ===== Adventure 相关 =====

const adventureSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["resource", "monster", "treasure", "merchant", "trap", "special"]),
  minLevel: z.number().default(1),
  maxLevel: z.number().optional(),
  worldId: z.string().optional(),
  weight: z.number().default(100),
  isActive: z.boolean().default(true),
  title: z.string().min(1),
  description: z.string(),
  icon: z.string().default("❓"),
  optionsJson: z.string(),
  rewardsJson: z.string().optional(),
  monsterJson: z.string().optional(),
});

export const adminRouter = createTRPCRouter({
  // ===== Card CRUD =====

  // 获取所有卡牌
  getCards: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.card.findMany({
      orderBy: { name: "asc" },
    });
  }),

  // 获取单个卡牌
  getCard: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.card.findUnique({ where: { id: input.id } });
    }),

  // 创建卡牌
  createCard: publicProcedure
    .input(cardSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.card.create({ data: input });
    }),

  // 更新卡牌
  updateCard: publicProcedure
    .input(z.object({ id: z.string() }).merge(cardSchema.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.card.update({ where: { id }, data });
    }),

  // 删除卡牌
  deleteCard: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // 先删除关联的PlayerCard
      await ctx.db.playerCard.deleteMany({ where: { cardId: input.id } });
      return ctx.db.card.delete({ where: { id: input.id } });
    }),

  // ===== StoryChapter CRUD =====

  // 获取所有章节
  getStoryChapters: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.storyChapter.findMany({
      orderBy: { order: "asc" },
      include: { nodes: { orderBy: { order: "asc" } } },
    });
  }),

  // 获取单个章节
  getStoryChapter: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.storyChapter.findUnique({
        where: { id: input.id },
        include: { nodes: { orderBy: { order: "asc" } } },
      });
    }),

  // 创建章节
  createStoryChapter: publicProcedure
    .input(storyChapterSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.storyChapter.create({ data: input });
    }),

  // 更新章节
  updateStoryChapter: publicProcedure
    .input(z.object({ id: z.string() }).merge(storyChapterSchema.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.storyChapter.update({ where: { id }, data });
    }),

  // 删除章节
  deleteStoryChapter: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.storyChapter.delete({ where: { id: input.id } });
    }),

  // ===== StoryNode CRUD =====

  // 创建节点
  createStoryNode: publicProcedure
    .input(storyNodeSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.storyNode.create({ data: input });
    }),

  // 更新节点
  updateStoryNode: publicProcedure
    .input(z.object({ id: z.string() }).merge(storyNodeSchema.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.storyNode.update({ where: { id }, data });
    }),

  // 删除节点
  deleteStoryNode: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.storyNode.delete({ where: { id: input.id } });
    }),

  // 批量更新节点顺序
  reorderStoryNodes: publicProcedure
    .input(z.object({
      nodes: z.array(z.object({ id: z.string(), order: z.number() })),
    }))
    .mutation(async ({ ctx, input }) => {
      await Promise.all(
        input.nodes.map((node) =>
          ctx.db.storyNode.update({
            where: { id: node.id },
            data: { order: node.order },
          })
        )
      );
      return { success: true };
    }),

  // ===== Adventure CRUD =====

  // 获取所有奇遇
  getAdventures: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.adventure.findMany({
      orderBy: [{ type: "asc" }, { minLevel: "asc" }],
    });
  }),

  // 获取单个奇遇
  getAdventure: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.adventure.findUnique({ where: { id: input.id } });
    }),

  // 创建奇遇
  createAdventure: publicProcedure
    .input(adventureSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.adventure.create({ data: input });
    }),

  // 更新奇遇
  updateAdventure: publicProcedure
    .input(z.object({ id: z.string() }).merge(adventureSchema.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.adventure.update({ where: { id }, data });
    }),

  // 删除奇遇
  deleteAdventure: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.adventure.delete({ where: { id: input.id } });
    }),

  // ===== 统计信息 =====

  getStats: publicProcedure.query(async ({ ctx }) => {
    const [cardCount, chapterCount, adventureCount, playerCount] = await Promise.all([
      ctx.db.card.count(),
      ctx.db.storyChapter.count(),
      ctx.db.adventure.count(),
      ctx.db.player.count(),
    ]);

    return {
      cards: cardCount,
      chapters: chapterCount,
      adventures: adventureCount,
      players: playerCount,
    };
  }),
});
