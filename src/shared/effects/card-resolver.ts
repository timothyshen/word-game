import type { CardEffect } from "./types";

/**
 * Card resolution context — provides DB access and player state.
 * This interface is implemented by the actual tRPC router context.
 */
export interface CardContext {
  playerId: string;
  targetId?: string;
  targetType?: "player" | "character";
  db: CardDbAdapter;
}

/**
 * DB adapter interface — decouples card resolution from Prisma specifics.
 */
export interface CardDbAdapter {
  getPlayer(id: string): Promise<PlayerSnapshot | null>;
  updatePlayer(id: string, data: Record<string, unknown>): Promise<void>;
  getCharacter(id: string): Promise<CharacterSnapshot | null>;
  updateCharacter(id: string, data: Record<string, unknown>): Promise<void>;
  getBuilding(id: string): Promise<BuildingSnapshot | null>;
  getCharacterTemplate(id: string): Promise<CharacterTemplateSnapshot | null>;
  getSkillTemplate(id: string): Promise<SkillTemplateSnapshot | null>;
  createPlayerCharacter(data: Record<string, unknown>): Promise<string>;
  createPlayerSkill(data: Record<string, unknown>): Promise<string>;
  upsertFlag(playerId: string, flagName: string): Promise<void>;
}

export interface PlayerSnapshot {
  id: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  exp: number;
  gold: number;
  [key: string]: unknown;
}

export interface CharacterSnapshot {
  id: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  [key: string]: unknown;
}

export interface BuildingSnapshot {
  id: string;
  name: string;
  slot: string;
  [key: string]: unknown;
}

export interface CharacterTemplateSnapshot {
  id: string;
  name: string;
  rarity: string;
  baseAttack: number;
  baseDefense: number;
  baseSpeed: number;
  baseLuck: number;
  baseHp: number;
  baseMp: number;
  [key: string]: unknown;
}

export interface SkillTemplateSnapshot {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface CardResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

/**
 * Resolve a typed card effect. Returns a result describing what happened.
 * The actual DB mutations are handled inside CardDbAdapter methods,
 * which the caller provides from the tRPC context.
 */
export async function resolveCardEffect(
  effect: CardEffect,
  ctx: CardContext,
): Promise<CardResult> {
  switch (effect.type) {
    case "heal":
      return resolveHealCard(effect, ctx);
    case "buff":
      return { success: true, message: "增益效果已应用", data: { modifiers: effect.modifiers, duration: effect.duration } };
    case "escape":
      return { success: true, message: "逃脱道具已激活", data: { successRate: effect.successRate } };
    case "exp":
      return resolveExpCard(effect, ctx);
    case "expansion":
      return { success: true, message: `领地扩展 +${effect.amount}`, data: { amount: effect.amount } };
    case "enhance":
      return { success: true, message: `${effect.targetType === "equipment" ? "装备" : "技能"}强化 +${effect.amount}`, data: { targetType: effect.targetType, amount: effect.amount } };
    case "unlock":
      return resolveUnlockCard(effect, ctx);
    case "building":
      return resolveBuildingCard(effect, ctx);
    case "recruit":
      return resolveRecruitCard(effect, ctx);
    case "skill":
      return resolveSkillCard(effect, ctx);
  }
}

async function resolveHealCard(
  effect: Extract<CardEffect, { type: "heal" }>,
  ctx: CardContext,
): Promise<CardResult> {
  if (ctx.targetType === "character" && ctx.targetId) {
    const char = await ctx.db.getCharacter(ctx.targetId);
    if (!char) return { success: false, message: "目标角色不存在" };

    if (effect.healType === "hp") {
      const newHp = Math.min(char.hp + effect.amount, char.maxHp);
      await ctx.db.updateCharacter(ctx.targetId, { hp: newHp });
      return { success: true, message: `恢复了 ${newHp - char.hp} 点HP`, data: { healed: newHp - char.hp } };
    } else {
      const newMp = Math.min(char.mp + effect.amount, char.maxMp);
      await ctx.db.updateCharacter(ctx.targetId, { mp: newMp });
      return { success: true, message: `恢复了 ${newMp - char.mp} 点MP`, data: { restored: newMp - char.mp } };
    }
  }

  return { success: false, message: "需要指定目标角色" };
}

async function resolveExpCard(
  effect: Extract<CardEffect, { type: "exp" }>,
  ctx: CardContext,
): Promise<CardResult> {
  const player = await ctx.db.getPlayer(ctx.playerId);
  if (!player) return { success: false, message: "玩家不存在" };

  await ctx.db.updatePlayer(ctx.playerId, { exp: player.exp + effect.amount });
  return { success: true, message: `获得了 ${effect.amount} 经验值` };
}

async function resolveUnlockCard(
  effect: Extract<CardEffect, { type: "unlock" }>,
  ctx: CardContext,
): Promise<CardResult> {
  await ctx.db.upsertFlag(ctx.playerId, effect.flagName);
  return { success: true, message: `解锁了 ${effect.flagName}` };
}

async function resolveBuildingCard(
  effect: Extract<CardEffect, { type: "building" }>,
  ctx: CardContext,
): Promise<CardResult> {
  const building = await ctx.db.getBuilding(effect.buildingId);
  if (!building) return { success: false, message: "建筑模板不存在" };
  // Building cards unlock flags — the actual building creation is handled by the building system
  await ctx.db.upsertFlag(ctx.playerId, `building_unlocked_${effect.buildingId}`);
  return { success: true, message: `解锁了建筑：${building.name}`, data: { buildingId: effect.buildingId, buildingName: building.name } };
}

async function resolveRecruitCard(
  effect: Extract<CardEffect, { type: "recruit" }>,
  ctx: CardContext,
): Promise<CardResult> {
  const template = await ctx.db.getCharacterTemplate(effect.characterId);
  if (!template) return { success: false, message: "角色模板不存在" };

  const charId = await ctx.db.createPlayerCharacter({
    playerId: ctx.playerId,
    characterId: template.id,
    name: template.name,
    rarity: template.rarity,
    level: 1,
    hp: template.baseHp,
    maxHp: template.baseHp,
    mp: template.baseMp,
    maxMp: template.baseMp,
    attack: template.baseAttack,
    defense: template.baseDefense,
    speed: template.baseSpeed,
    luck: template.baseLuck,
  });

  return { success: true, message: `招募了${template.name}`, data: { characterId: charId, characterName: template.name } };
}

async function resolveSkillCard(
  effect: Extract<CardEffect, { type: "skill" }>,
  ctx: CardContext,
): Promise<CardResult> {
  const template = await ctx.db.getSkillTemplate(effect.skillId);
  if (!template) return { success: false, message: "技能模板不存在" };

  const skillId = await ctx.db.createPlayerSkill({
    playerId: ctx.playerId,
    skillId: template.id,
    level: 1,
  });

  return { success: true, message: `学会了${template.name}`, data: { skillId, skillName: template.name } };
}
