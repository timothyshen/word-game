// ============================================================
// Effect System — Zod Validation Schemas + Parse Helpers
// ============================================================

import { z } from "zod";
import { STAT_KEYS } from "./types";
import type {
  StatModifier, RewardEntry, Condition,
  SkillEffect, SkillLevelEntry, CardEffect,
  BuildingEffects, MonsterConfig, StoryChoice,
  AdventureOption, CharacterTrait,
} from "./types";

// --- Primitives ---

export const statKeySchema = z.enum(STAT_KEYS);

export const statModifierSchema = z.object({
  stat: statKeySchema,
  value: z.number(),
  type: z.enum(["flat", "percent"]),
});

// --- Rewards ---

const resourceRewardSchema = z.object({
  type: z.literal("resource"),
  stat: statKeySchema,
  amount: z.number(),
});

const cardRewardSchema = z.object({
  type: z.literal("card"),
  rarity: z.string(),
  count: z.number().int().positive(),
});

const itemRewardSchema = z.object({
  type: z.literal("item"),
  itemId: z.string(),
  count: z.number().int().positive(),
});

export const rewardEntrySchema = z.discriminatedUnion("type", [
  resourceRewardSchema,
  cardRewardSchema,
  itemRewardSchema,
]);

// --- Conditions ---

const levelConditionSchema = z.object({
  type: z.literal("level"),
  min: z.number(),
});

const tierConditionSchema = z.object({
  type: z.literal("tier"),
  min: z.number(),
});

const statConditionSchema = z.object({
  type: z.literal("stat"),
  stat: statKeySchema,
  min: z.number(),
});

const skillConditionSchema = z.object({
  type: z.literal("skill"),
  category: z.string(),
  minLevel: z.number(),
});

const skillCountConditionSchema = z.object({
  type: z.literal("skillCount"),
  skillType: z.string(),
  count: z.number(),
});

const itemConditionSchema = z.object({
  type: z.literal("item"),
  itemId: z.string(),
  count: z.number().optional(),
});

const flagConditionSchema = z.object({
  type: z.literal("flag"),
  flagName: z.string(),
});

export const conditionSchema = z.discriminatedUnion("type", [
  levelConditionSchema,
  tierConditionSchema,
  statConditionSchema,
  skillConditionSchema,
  skillCountConditionSchema,
  itemConditionSchema,
  flagConditionSchema,
]);

// --- Skill Effects ---

const damageEffectSchema = z.object({
  type: z.literal("damage"),
  damageType: z.enum(["physical", "magic"]),
  multiplier: z.number(),
  element: z.string().optional(),
});

const healEffectSchema = z.object({
  type: z.literal("heal"),
  healType: z.enum(["hp", "mp"]),
  target: z.enum(["self", "ally"]),
  amount: z.number(),
  isPercent: z.boolean().optional(),
});

const buffEffectSchema = z.object({
  type: z.literal("buff"),
  target: z.enum(["self", "enemy"]),
  modifiers: z.array(statModifierSchema),
  duration: z.number(),
});

const fleeEffectSchema = z.object({
  type: z.literal("flee"),
  successRate: z.number().min(0).max(1),
});

const specialEffectSchema = z.object({
  type: z.literal("special"),
  action: z.string(),
  params: z.record(z.number()),
});

export const skillEffectSchema = z.discriminatedUnion("type", [
  damageEffectSchema,
  healEffectSchema,
  buffEffectSchema,
  fleeEffectSchema,
  specialEffectSchema,
]);

export const skillLevelEntrySchema = z.object({
  level: z.number().int().positive(),
  effects: z.array(skillEffectSchema),
  mpCost: z.number().int().min(0),
  cooldown: z.number().int().min(0),
});

// --- Card Effects ---

const buildingCardSchema = z.object({ type: z.literal("building"), buildingId: z.string() });
const recruitCardSchema = z.object({ type: z.literal("recruit"), characterId: z.string() });
const skillCardSchema = z.object({ type: z.literal("skill"), skillId: z.string() });
const healCardSchema = z.object({ type: z.literal("heal"), healType: z.enum(["hp", "mp"]), amount: z.number() });
const buffCardSchema = z.object({ type: z.literal("buff"), modifiers: z.array(statModifierSchema), duration: z.number() });
const escapeCardSchema = z.object({ type: z.literal("escape"), successRate: z.number() });
const enhanceCardSchema = z.object({ type: z.literal("enhance"), targetType: z.enum(["equipment", "skill"]), amount: z.number() });
const expCardSchema = z.object({ type: z.literal("exp"), amount: z.number() });
const expansionCardSchema = z.object({ type: z.literal("expansion"), amount: z.number() });
const unlockCardSchema = z.object({ type: z.literal("unlock"), flagName: z.string() });

export const cardEffectSchema = z.discriminatedUnion("type", [
  buildingCardSchema,
  recruitCardSchema,
  skillCardSchema,
  healCardSchema,
  buffCardSchema,
  escapeCardSchema,
  enhanceCardSchema,
  expCardSchema,
  expansionCardSchema,
  unlockCardSchema,
]);

// --- Building Effects ---

const buildingProductionSchema = z.object({
  stat: statKeySchema,
  amountPerHour: z.number(),
});

const buildingCapacitySchema = z.object({
  type: z.string(),
  amount: z.number(),
});

export const buildingEffectsSchema = z.object({
  production: z.array(buildingProductionSchema).optional(),
  statBonuses: z.array(statModifierSchema).optional(),
  unlocks: z.array(z.string()).optional(),
  capacity: z.array(buildingCapacitySchema).optional(),
  workerMultiplier: z.number().optional(),
  upgradeCostMultiplier: z.number().optional(),
});

// --- Monster Config ---

const monsterSkillSchema = z.object({
  name: z.string(),
  effects: z.array(skillEffectSchema),
  cooldown: z.number().int().min(0),
});

export const monsterConfigSchema = z.object({
  name: z.string(),
  icon: z.string(),
  level: z.number().int().positive(),
  hp: z.number().int().positive(),
  attack: z.number(),
  defense: z.number(),
  speed: z.number(),
  skills: z.array(monsterSkillSchema),
  rewards: z.array(rewardEntrySchema),
});

// --- Story Choice ---

export const storyChoiceSchema = z.object({
  text: z.string(),
  nextNodeId: z.string(),
  conditions: z.array(conditionSchema).optional(),
  rewards: z.array(rewardEntrySchema).optional(),
});

// --- Adventure Option ---

const adventureCostSchema = z.object({
  stat: statKeySchema,
  amount: z.number(),
});

const adventureOutcomeSchema = z.object({
  weight: z.number().positive(),
  description: z.string(),
  rewards: z.array(rewardEntrySchema).optional(),
  combat: monsterConfigSchema.optional(),
  damage: z.number().optional(),
});

export const adventureOptionSchema = z.object({
  text: z.string(),
  action: z.string(),
  conditions: z.array(conditionSchema).optional(),
  cost: z.array(adventureCostSchema).optional(),
  outcomes: z.array(adventureOutcomeSchema),
});

// --- Character Trait ---

export const characterTraitSchema = z.object({
  name: z.string(),
  modifiers: z.array(statModifierSchema),
});

// ============================================================
// Parse Helpers — JSON string → typed object with validation
// ============================================================

function safeParse<T>(json: string, schema: z.ZodType<T>, fallback: T): T {
  try {
    const parsed: unknown = JSON.parse(json);
    const result = schema.safeParse(parsed);
    if (result.success) return result.data;
    console.warn("[effects] Parse validation failed:", result.error.format());
    return fallback;
  } catch {
    console.warn("[effects] JSON parse failed for:", json.slice(0, 100));
    return fallback;
  }
}

export function parseStatModifiers(json: string): StatModifier[] {
  return safeParse(json, z.array(statModifierSchema), []);
}

export function parseRewards(json: string): RewardEntry[] {
  return safeParse(json, z.array(rewardEntrySchema), []);
}

export function parseConditions(json: string): Condition[] {
  return safeParse(json, z.array(conditionSchema), []);
}

export function parseSkillEffects(json: string): SkillEffect[] {
  return safeParse(json, z.array(skillEffectSchema), []);
}

export function parseSkillLevelData(json: string): SkillLevelEntry[] {
  return safeParse(json, z.array(skillLevelEntrySchema), []);
}

export function parseCardEffect(json: string): CardEffect | null {
  return safeParse(json, cardEffectSchema, null as unknown as CardEffect) ?? null;
}

export function parseBuildingEffects(json: string): BuildingEffects {
  return safeParse(json, buildingEffectsSchema, {});
}

export function parseMonsterConfig(json: string): MonsterConfig | null {
  return safeParse(json, monsterConfigSchema, null as unknown as MonsterConfig) ?? null;
}

export function parseStoryChoices(json: string): StoryChoice[] {
  return safeParse(json, z.array(storyChoiceSchema), []);
}

export function parseAdventureOptions(json: string): AdventureOption[] {
  return safeParse(json, z.array(adventureOptionSchema), []);
}

export function parseCharacterTraits(json: string): CharacterTrait[] {
  return safeParse(json, z.array(characterTraitSchema), []);
}
