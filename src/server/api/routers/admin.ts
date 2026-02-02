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

// ===== Building 相关 =====

const buildingSchema = z.object({
  name: z.string().min(1),
  slot: z.enum(["core", "production", "military", "commerce", "special"]),
  icon: z.string(),
  description: z.string(),
  maxLevel: z.number().default(10),
  baseEffects: z.string().default("{}"),
});

// ===== Character 相关 =====

const characterSchema = z.object({
  name: z.string().min(1),
  baseClass: z.string(),
  rarity: z.enum(["普通", "精良", "精英", "稀有", "史诗", "传说"]),
  portrait: z.string(),
  description: z.string(),
  story: z.string().optional(),
  baseAttack: z.number(),
  baseDefense: z.number(),
  baseSpeed: z.number(),
  baseLuck: z.number(),
  baseHp: z.number(),
  baseMp: z.number(),
  traits: z.string().default("[]"),
});

// ===== Skill 相关 =====

const skillSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  icon: z.string(),
  type: z.enum(["combat", "production", "utility"]),
  category: z.string(),
  effects: z.string(),
  cooldown: z.number().default(0),
  levelData: z.string().default("[]"),
});

// ===== Equipment 相关 =====

const equipmentSchema = z.object({
  name: z.string().min(1),
  slot: z.enum(["mainHand", "offHand", "helmet", "chest", "belt", "gloves", "pants", "boots", "necklace", "ring1", "ring2"]),
  rarity: z.enum(["普通", "精良", "稀有", "史诗", "传说"]),
  description: z.string(),
  icon: z.string(),
  attackBonus: z.number().default(0),
  defenseBonus: z.number().default(0),
  speedBonus: z.number().default(0),
  luckBonus: z.number().default(0),
  hpBonus: z.number().default(0),
  mpBonus: z.number().default(0),
  specialEffects: z.string().optional(),
  requiredLevel: z.number().default(1),
});

// ===== Profession 相关 =====

const professionSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  bonuses: z.string().default("{}"),
  unlockConditions: z.string().default("{}"),
});

// ===== OuterCityPOI 相关 =====

const outerCityPoiSchema = z.object({
  positionX: z.number(),
  positionY: z.number(),
  name: z.string().min(1),
  icon: z.string(),
  type: z.enum(["resource", "garrison", "lair", "settlement", "shrine", "ruin", "caravan"]),
  difficulty: z.number().default(1),
  resourceType: z.string().optional(),
  resourceAmount: z.number().default(0),
  guardianLevel: z.number().default(0),
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

  // ===== Building CRUD =====

  getBuildings: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.building.findMany({ orderBy: { name: "asc" } });
  }),

  getBuilding: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.building.findUnique({ where: { id: input.id } });
    }),

  createBuilding: publicProcedure
    .input(buildingSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.building.create({ data: input });
    }),

  updateBuilding: publicProcedure
    .input(z.object({ id: z.string() }).merge(buildingSchema.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.building.update({ where: { id }, data });
    }),

  deleteBuilding: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.innerCityBuilding.deleteMany({ where: { templateId: input.id } });
      await ctx.db.playerBuilding.deleteMany({ where: { buildingId: input.id } });
      return ctx.db.building.delete({ where: { id: input.id } });
    }),

  // ===== Character CRUD =====

  getCharacters: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.character.findMany({ orderBy: { name: "asc" } });
  }),

  getCharacter: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.character.findUnique({ where: { id: input.id } });
    }),

  createCharacter: publicProcedure
    .input(characterSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.character.create({ data: input });
    }),

  updateCharacter: publicProcedure
    .input(z.object({ id: z.string() }).merge(characterSchema.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.character.update({ where: { id }, data });
    }),

  deleteCharacter: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const pcs = await ctx.db.playerCharacter.findMany({ where: { characterId: input.id }, select: { id: true } });
      const pcIds = pcs.map((pc) => pc.id);
      if (pcIds.length > 0) {
        await ctx.db.heroInstance.deleteMany({ where: { characterId: { in: pcIds } } });
        await ctx.db.characterSkill.deleteMany({ where: { playerCharacterId: { in: pcIds } } });
        await ctx.db.characterProfession.deleteMany({ where: { playerCharacterId: { in: pcIds } } });
        await ctx.db.equippedItem.deleteMany({ where: { playerCharacterId: { in: pcIds } } });
        await ctx.db.playerCharacter.deleteMany({ where: { characterId: input.id } });
      }
      return ctx.db.character.delete({ where: { id: input.id } });
    }),

  // ===== Skill CRUD =====

  getSkills: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.skill.findMany({ orderBy: { name: "asc" } });
  }),

  getSkill: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.skill.findUnique({ where: { id: input.id } });
    }),

  createSkill: publicProcedure
    .input(skillSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.skill.create({ data: input });
    }),

  updateSkill: publicProcedure
    .input(z.object({ id: z.string() }).merge(skillSchema.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.skill.update({ where: { id }, data });
    }),

  deleteSkill: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.playerSkill.deleteMany({ where: { skillId: input.id } });
      await ctx.db.characterSkill.deleteMany({ where: { skillId: input.id } });
      return ctx.db.skill.delete({ where: { id: input.id } });
    }),

  // ===== Equipment CRUD =====

  getEquipments: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.equipment.findMany({ orderBy: { name: "asc" } });
  }),

  getEquipment: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.equipment.findUnique({ where: { id: input.id } });
    }),

  createEquipment: publicProcedure
    .input(equipmentSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.equipment.create({ data: input });
    }),

  updateEquipment: publicProcedure
    .input(z.object({ id: z.string() }).merge(equipmentSchema.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.equipment.update({ where: { id }, data });
    }),

  deleteEquipment: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const pes = await ctx.db.playerEquipment.findMany({ where: { equipmentId: input.id }, select: { id: true } });
      const peIds = pes.map((pe) => pe.id);
      if (peIds.length > 0) {
        await ctx.db.equippedItem.deleteMany({ where: { playerEquipmentId: { in: peIds } } });
        await ctx.db.playerEquipment.deleteMany({ where: { equipmentId: input.id } });
      }
      return ctx.db.equipment.delete({ where: { id: input.id } });
    }),

  // ===== Profession CRUD =====

  getProfessions: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.profession.findMany({ orderBy: { name: "asc" } });
  }),

  getProfession: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.profession.findUnique({ where: { id: input.id } });
    }),

  createProfession: publicProcedure
    .input(professionSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.profession.create({ data: input });
    }),

  updateProfession: publicProcedure
    .input(z.object({ id: z.string() }).merge(professionSchema.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.profession.update({ where: { id }, data });
    }),

  deleteProfession: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.playerProfession.deleteMany({ where: { professionId: input.id } });
      await ctx.db.characterProfession.deleteMany({ where: { professionId: input.id } });
      return ctx.db.profession.delete({ where: { id: input.id } });
    }),

  // ===== OuterCityPOI CRUD =====

  getPois: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.outerCityPOI.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] });
  }),

  getPoi: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.outerCityPOI.findUnique({ where: { id: input.id } });
    }),

  createPoi: publicProcedure
    .input(outerCityPoiSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.outerCityPOI.create({ data: input });
    }),

  updatePoi: publicProcedure
    .input(z.object({ id: z.string() }).merge(outerCityPoiSchema.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.outerCityPOI.update({ where: { id }, data });
    }),

  deletePoi: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.outerCityPOI.delete({ where: { id: input.id } });
    }),

  // ===== 统计信息 =====

  getStats: publicProcedure.query(async ({ ctx }) => {
    const [cardCount, chapterCount, adventureCount, playerCount, buildingCount, characterCount, skillCount, equipmentCount, professionCount, poiCount] = await Promise.all([
      ctx.db.card.count(),
      ctx.db.storyChapter.count(),
      ctx.db.adventure.count(),
      ctx.db.player.count(),
      ctx.db.building.count(),
      ctx.db.character.count(),
      ctx.db.skill.count(),
      ctx.db.equipment.count(),
      ctx.db.profession.count(),
      ctx.db.outerCityPOI.count(),
    ]);

    return {
      cards: cardCount,
      chapters: chapterCount,
      adventures: adventureCount,
      players: playerCount,
      buildings: buildingCount,
      characters: characterCount,
      skills: skillCount,
      equipment: equipmentCount,
      professions: professionCount,
      pois: poiCount,
    };
  }),
});
