import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as cardService from "../../services/card.service";

export const cardRouter = createTRPCRouter({
  // 获取玩家所有卡牌
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return cardService.getAllCards(ctx.db, ctx.engine.entities, ctx.session.user.id);
  }),

  // 按类型获取卡牌
  getByType: protectedProcedure
    .input(z.object({ type: z.enum(["building", "recruit", "skill", "enhance", "item", "expansion"]) }))
    .query(async ({ ctx, input }) => {
      return cardService.getCardsByType(ctx.db, ctx.engine.entities, ctx.session.user.id, input.type);
    }),

  // 使用卡牌
  useCard: protectedProcedure
    .input(
      z.object({
        cardId: z.string(),
        quantity: z.number().min(1).default(1),
        targetId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await cardService.useCard(ctx.db, ctx.engine.entities, ctx.session.user.id, input);
      void ctx.engine.events.emit("card:used", {
        userId: ctx.session.user.id,
        cardId: input.cardId,
        action: "use",
      }, "card-router");
      return result;
    }),

  // 添加卡牌（内部使用，如奖励发放）
  addCard: protectedProcedure
    .input(
      z.object({
        cardId: z.string(),
        quantity: z.number().min(1).default(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return cardService.addCard(ctx.db, ctx.engine.entities, ctx.session.user.id, input);
    }),

  // 使用建筑卡建造建筑
  useBuildingCard: protectedProcedure
    .input(
      z.object({
        cardId: z.string(),
        positionX: z.number(),
        positionY: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await cardService.useBuildingCard(ctx.db, ctx.engine.entities, ctx.session.user.id, input);
      void ctx.engine.events.emit("card:used", {
        userId: ctx.session.user.id,
        cardId: input.cardId,
        action: "build",
      }, "card-router");
      return result;
    }),

  // 使用招募卡招募角色
  useRecruitCard: protectedProcedure
    .input(z.object({ cardId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await cardService.useRecruitCard(ctx.db, ctx.engine.entities, ctx.session.user.id, input.cardId);
      void ctx.engine.events.emit("card:used", {
        userId: ctx.session.user.id,
        cardId: input.cardId,
        action: "recruit",
      }, "card-router");
      return result;
    }),

  // 使用道具卡
  useItemCard: protectedProcedure
    .input(
      z.object({
        cardId: z.string(),
        targetType: z.enum(["player", "character"]),
        targetId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await cardService.useItemCard(ctx.db, ctx.engine.entities, ctx.session.user.id, input);
      void ctx.engine.events.emit("card:used", {
        userId: ctx.session.user.id,
        cardId: input.cardId,
        action: "item",
      }, "card-router");
      return result;
    }),

  // 开启宝箱
  openChest: protectedProcedure
    .input(z.object({ cardId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await cardService.useChestCard(ctx.db, ctx.engine.entities, ctx.session.user.id, input.cardId);
      void ctx.engine.events.emit("card:used", {
        userId: ctx.session.user.id,
        cardId: input.cardId,
        action: "chest",
      }, "card-router");
      return result;
    }),

  // 学习技能卡
  learnSkill: protectedProcedure
    .input(
      z.object({
        cardId: z.string(),
        targetType: z.enum(["player", "character"]),
        targetId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await cardService.learnSkill(ctx.db, ctx.engine.entities, ctx.session.user.id, input);
      void ctx.engine.events.emit("card:used", {
        userId: ctx.session.user.id,
        cardId: input.cardId,
        action: "skill",
      }, "card-router");
      return result;
    }),
});
