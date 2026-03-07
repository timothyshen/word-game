import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "~/server/api/trpc";
import * as adminService from "../../services/admin.service";

/** Validate that a string is parseable JSON */
function isValidJson(s: string): boolean {
  try { JSON.parse(s); return true; } catch { return false; }
}

const jsonString = (fallback = "{}") =>
  z.string().default(fallback).refine(isValidJson, { message: "必须是合法的JSON格式" });

const jsonStringOptional = () =>
  z.string().optional().refine((s) => !s || isValidJson(s), { message: "必须是合法的JSON格式" });

// ===== Card 相关 =====

const cardSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["building", "recruit", "skill", "enhance", "item", "expansion"]),
  rarity: z.enum(["普通", "精良", "稀有", "史诗", "传说"]),
  description: z.string(),
  icon: z.string().default("🃏"),
  effects: jsonString("{}"),
});

// ===== Story 相关 =====

const storyChapterSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  order: z.number().default(0),
  isActive: z.boolean().default(true),
  rewardsJson: jsonString("{}"),
  unlockJson: jsonString("{}"),
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
  choicesJson: jsonStringOptional(),
  rewardsJson: jsonStringOptional(),
});

// ===== Building 相关 =====

const buildingSchema = z.object({
  name: z.string().min(1),
  slot: z.enum(["core", "production", "military", "commerce", "special"]),
  icon: z.string(),
  description: z.string(),
  maxLevel: z.number().default(10),
  baseEffects: jsonString("{}"),
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
  traits: jsonString("[]"),
});

// ===== Skill 相关 =====

const skillSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  icon: z.string(),
  type: z.enum(["combat", "production", "utility"]),
  category: z.string(),
  effects: jsonString("{}"),
  cooldown: z.number().default(0),
  levelData: jsonString("[]"),
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
  specialEffects: jsonStringOptional(),
  requiredLevel: z.number().default(1),
});

// ===== Profession 相关 =====

const professionSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  bonuses: jsonString("{}"),
  unlockConditions: jsonString("{}"),
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
  optionsJson: jsonString("[]"),
  rewardsJson: jsonStringOptional(),
  monsterJson: jsonStringOptional(),
});

// ===== GameRule 相关 =====

const gameRuleSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  ruleType: z.enum(["formula", "condition", "weighted_random", "config"]),
  definition: jsonString("{}"),
  description: z.string().default(""),
});

export const adminRouter = createTRPCRouter({
  // ===== Card CRUD =====

  getCards: adminProcedure.query(({ ctx }) => adminService.getCards(ctx.db)),

  getCard: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => adminService.getCard(ctx.db, input.id)),

  createCard: adminProcedure
    .input(cardSchema)
    .mutation(({ ctx, input }) => adminService.createCard(ctx.db, input)),

  updateCard: adminProcedure
    .input(z.object({ id: z.string() }).merge(cardSchema.partial()))
    .mutation(({ ctx, input }) => adminService.updateCard(ctx.db, input)),

  deleteCard: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => adminService.deleteCard(ctx.db, input.id)),

  // ===== StoryChapter CRUD =====

  getStoryChapters: adminProcedure.query(({ ctx }) => adminService.getStoryChapters(ctx.db)),

  getStoryChapter: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => adminService.getStoryChapter(ctx.db, input.id)),

  createStoryChapter: adminProcedure
    .input(storyChapterSchema)
    .mutation(({ ctx, input }) => adminService.createStoryChapter(ctx.db, input)),

  updateStoryChapter: adminProcedure
    .input(z.object({ id: z.string() }).merge(storyChapterSchema.partial()))
    .mutation(({ ctx, input }) => adminService.updateStoryChapter(ctx.db, input)),

  deleteStoryChapter: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => adminService.deleteStoryChapter(ctx.db, input.id)),

  // ===== StoryNode CRUD =====

  createStoryNode: adminProcedure
    .input(storyNodeSchema)
    .mutation(({ ctx, input }) => adminService.createStoryNode(ctx.db, input)),

  updateStoryNode: adminProcedure
    .input(z.object({ id: z.string() }).merge(storyNodeSchema.partial()))
    .mutation(({ ctx, input }) => adminService.updateStoryNode(ctx.db, input)),

  deleteStoryNode: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => adminService.deleteStoryNode(ctx.db, input.id)),

  reorderStoryNodes: adminProcedure
    .input(z.object({ nodes: z.array(z.object({ id: z.string(), order: z.number() })) }))
    .mutation(({ ctx, input }) => adminService.reorderStoryNodes(ctx.db, input.nodes)),

  // ===== Adventure CRUD =====

  getAdventures: adminProcedure.query(({ ctx }) => adminService.getAdventures(ctx.db)),

  getAdventure: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => adminService.getAdventure(ctx.db, input.id)),

  createAdventure: adminProcedure
    .input(adventureSchema)
    .mutation(({ ctx, input }) => adminService.createAdventure(ctx.db, input)),

  updateAdventure: adminProcedure
    .input(z.object({ id: z.string() }).merge(adventureSchema.partial()))
    .mutation(({ ctx, input }) => adminService.updateAdventure(ctx.db, input)),

  deleteAdventure: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => adminService.deleteAdventure(ctx.db, input.id)),

  // ===== Building CRUD =====

  getBuildings: adminProcedure.query(({ ctx }) => adminService.getBuildings(ctx.db)),

  getBuilding: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => adminService.getBuilding(ctx.db, input.id)),

  createBuilding: adminProcedure
    .input(buildingSchema)
    .mutation(({ ctx, input }) => adminService.createBuilding(ctx.db, input)),

  updateBuilding: adminProcedure
    .input(z.object({ id: z.string() }).merge(buildingSchema.partial()))
    .mutation(({ ctx, input }) => adminService.updateBuilding(ctx.db, input)),

  deleteBuilding: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => adminService.deleteBuilding(ctx.db, input.id)),

  // ===== Character CRUD =====

  getCharacters: adminProcedure.query(({ ctx }) => adminService.getCharacters(ctx.db)),

  getCharacter: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => adminService.getCharacter(ctx.db, input.id)),

  createCharacter: adminProcedure
    .input(characterSchema)
    .mutation(({ ctx, input }) => adminService.createCharacter(ctx.db, input)),

  updateCharacter: adminProcedure
    .input(z.object({ id: z.string() }).merge(characterSchema.partial()))
    .mutation(({ ctx, input }) => adminService.updateCharacter(ctx.db, input)),

  deleteCharacter: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => adminService.deleteCharacter(ctx.db, input.id)),

  // ===== Skill CRUD =====

  getSkills: adminProcedure.query(({ ctx }) => adminService.getSkills(ctx.db)),

  getSkill: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => adminService.getSkill(ctx.db, input.id)),

  createSkill: adminProcedure
    .input(skillSchema)
    .mutation(({ ctx, input }) => adminService.createSkill(ctx.db, input)),

  updateSkill: adminProcedure
    .input(z.object({ id: z.string() }).merge(skillSchema.partial()))
    .mutation(({ ctx, input }) => adminService.updateSkill(ctx.db, input)),

  deleteSkill: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => adminService.deleteSkill(ctx.db, input.id)),

  // ===== Equipment CRUD =====

  getEquipments: adminProcedure.query(({ ctx }) => adminService.getEquipments(ctx.db)),

  getEquipment: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => adminService.getEquipment(ctx.db, input.id)),

  createEquipment: adminProcedure
    .input(equipmentSchema)
    .mutation(({ ctx, input }) => adminService.createEquipment(ctx.db, input)),

  updateEquipment: adminProcedure
    .input(z.object({ id: z.string() }).merge(equipmentSchema.partial()))
    .mutation(({ ctx, input }) => adminService.updateEquipment(ctx.db, input)),

  deleteEquipment: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => adminService.deleteEquipment(ctx.db, input.id)),

  // ===== Profession CRUD =====

  getProfessions: adminProcedure.query(({ ctx }) => adminService.getProfessions(ctx.db)),

  getProfession: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => adminService.getProfession(ctx.db, input.id)),

  createProfession: adminProcedure
    .input(professionSchema)
    .mutation(({ ctx, input }) => adminService.createProfession(ctx.db, input)),

  updateProfession: adminProcedure
    .input(z.object({ id: z.string() }).merge(professionSchema.partial()))
    .mutation(({ ctx, input }) => adminService.updateProfession(ctx.db, input)),

  deleteProfession: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => adminService.deleteProfession(ctx.db, input.id)),

  // ===== OuterCityPOI CRUD =====

  getPois: adminProcedure.query(({ ctx }) => adminService.getPois(ctx.db)),

  getPoi: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => adminService.getPoi(ctx.db, input.id)),

  createPoi: adminProcedure
    .input(outerCityPoiSchema)
    .mutation(({ ctx, input }) => adminService.createPoi(ctx.db, input)),

  updatePoi: adminProcedure
    .input(z.object({ id: z.string() }).merge(outerCityPoiSchema.partial()))
    .mutation(({ ctx, input }) => adminService.updatePoi(ctx.db, input)),

  deletePoi: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => adminService.deletePoi(ctx.db, input.id)),

  // ===== GameRule CRUD =====

  getRules: adminProcedure.query(({ ctx }) => adminService.getRules(ctx.db)),

  getRule: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => adminService.getRule(ctx.db, input.id)),

  createRule: adminProcedure
    .input(gameRuleSchema)
    .mutation(({ ctx, input }) => adminService.createRule(ctx.db, input)),

  updateRule: adminProcedure
    .input(z.object({ id: z.string() }).merge(gameRuleSchema.partial()))
    .mutation(async ({ ctx, input }) => {
      const result = await adminService.updateRule(ctx.db, input);
      ctx.ruleService.invalidateCache();
      return result;
    }),

  deleteRule: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await adminService.deleteRule(ctx.db, input.id);
      ctx.ruleService.invalidateCache();
      return { deleted: true };
    }),

  // ===== 统计信息 =====

  getStats: adminProcedure.query(({ ctx }) => adminService.getStats(ctx.db)),
});
