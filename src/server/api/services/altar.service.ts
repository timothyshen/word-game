/**
 * Altar Service — altar discovery, challenge, and daily card collection
 */
import { TRPCError } from "@trpc/server";
import type { FullDbClient } from "../repositories/types";
import type { IEntityManager } from "~/engine/types";
import { findPlayerByUserId, updatePlayer } from "../repositories/player.repo";
import { grantRandomCard } from "../utils/card-utils";
import { engine, ruleService } from "~/server/api/engine";

interface AltarType {
  id: string;
  name: string;
  icon: string;
  description: string;
  cardRarityWeights: Record<string, number>;
  guardianBoss: { name: string; icon: string; level: number; hp: number; attack: number; defense: number };
}

const ALTAR_TYPES: AltarType[] = [
  {
    id: "basic_altar", name: "普通祭坛", icon: "🗿", description: "散发微弱光芒的古老祭坛",
    cardRarityWeights: { "普通": 60, "精良": 30, "稀有": 10 },
    guardianBoss: { name: "祭坛守卫", icon: "👻", level: 5, hp: 100, attack: 15, defense: 8 },
  },
  {
    id: "sacred_altar", name: "神圣祭坛", icon: "⛩️", description: "蕴含神圣力量的祭坛",
    cardRarityWeights: { "普通": 30, "精良": 40, "稀有": 25, "史诗": 5 },
    guardianBoss: { name: "神殿守护者", icon: "🗡️", level: 15, hp: 300, attack: 40, defense: 25 },
  },
  {
    id: "ancient_altar", name: "远古祭坛", icon: "🏛️", description: "远古文明遗留的神秘祭坛",
    cardRarityWeights: { "精良": 30, "稀有": 40, "史诗": 25, "传说": 5 },
    guardianBoss: { name: "远古守护者", icon: "🐲", level: 30, hp: 800, attack: 100, defense: 60 },
  },
];

const PITY_THRESHOLD = 10;
const PITY_GUARANTEED_RARITY = "稀有";
const RARE_OR_ABOVE = ["稀有", "史诗", "传说"];

function rollRarity(weights: Record<string, number>, pityCount = 0): string {
  // Pity system: after 10 consecutive non-rare rolls, guarantee at least 稀有
  if (pityCount >= PITY_THRESHOLD) {
    // Roll only among 稀有+ rarities
    const rareWeights: Record<string, number> = {};
    for (const [rarity, weight] of Object.entries(weights)) {
      if (RARE_OR_ABOVE.includes(rarity)) {
        rareWeights[rarity] = weight;
      }
    }
    // If no rare+ weights defined, force 稀有
    if (Object.keys(rareWeights).length === 0) {
      return PITY_GUARANTEED_RARITY;
    }
    const total = Object.values(rareWeights).reduce((sum, w) => sum + w, 0);
    let roll = Math.random() * total;
    for (const [rarity, weight] of Object.entries(rareWeights)) {
      if (roll < weight) return rarity;
      roll -= weight;
    }
    return PITY_GUARANTEED_RARITY;
  }

  const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [rarity, weight] of Object.entries(weights)) {
    if (roll < weight) return rarity;
    roll -= weight;
  }
  return "普通";
}

async function getAltarWeights(altarTypeId: string): Promise<Record<string, number>> {
  const ruleMap: Record<string, string> = {
    basic_altar: "altar_basic_weights",
    sacred_altar: "altar_sacred_weights",
    ancient_altar: "altar_ancient_weights",
  };
  const ruleName = ruleMap[altarTypeId];
  if (!ruleName) return { "普通": 100 };

  const weights = await ruleService.getWeights(ruleName);
  const result: Record<string, number> = {};
  for (const w of weights) {
    result[w.value as string] = w.weight;
  }
  return result;
}

function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

async function getPlayerOrThrow(db: FullDbClient, userId: string) {
  const player = await findPlayerByUserId(db, userId);
  if (!player) throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  return player;
}

export async function getDiscoveredAltars(db: FullDbClient, userId: string) {
  const player = await getPlayerOrThrow(db, userId);

  const altars = await db.wildernessFacility.findMany({
    where: { playerId: player.id, type: "altar", isDiscovered: true },
  });

  const today = getTodayString();

  return altars.map((altar) => {
    const data = JSON.parse(altar.data) as { altarType: string; lastCollectedDate?: string; isDefeated?: boolean };
    const altarType = ALTAR_TYPES.find((t) => t.id === data.altarType) ?? ALTAR_TYPES[0]!;
    const canCollect = data.isDefeated && data.lastCollectedDate !== today;
    return {
      id: altar.id, name: altar.name, icon: altar.icon, description: altar.description,
      position: { x: altar.positionX, y: altar.positionY }, worldId: altar.worldId,
      altarType: altarType.id, altarTypeName: altarType.name,
      isDefeated: data.isDefeated ?? false, canCollect, lastCollectedDate: data.lastCollectedDate,
      guardianBoss: !data.isDefeated ? altarType.guardianBoss : null,
    };
  });
}

export async function challengeGuardian(db: FullDbClient, entities: IEntityManager, userId: string, altarId: string) {
  const player = await db.player.findUnique({ where: { userId } });
  if (!player) throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });

  const altar = await db.wildernessFacility.findFirst({
    where: { id: altarId, playerId: player.id, type: "altar" },
  });
  if (!altar) throw new TRPCError({ code: "NOT_FOUND", message: "祭坛不存在" });

  const data = JSON.parse(altar.data) as { altarType: string; isDefeated?: boolean };
  if (data.isDefeated) throw new TRPCError({ code: "BAD_REQUEST", message: "守卫已被击败" });

  const altarType = ALTAR_TYPES.find((t) => t.id === data.altarType);
  if (!altarType) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "祭坛类型无效" });

  const staminaConfig = await ruleService.getConfig<{ value: number }>("altar_stamina_cost");
  const staminaCost = staminaConfig.value;
  if (player.stamina < staminaCost) throw new TRPCError({ code: "BAD_REQUEST", message: "体力不足" });

  await updatePlayer(db, player.id, { stamina: { decrement: staminaCost }, lastStaminaUpdate: new Date() });

  const boss = altarType.guardianBoss;
  const playerPower = player.strength * 3 + player.agility * 2 + player.intellect * 2;
  const charEntities = await entities.getEntitiesByOwner(player.id, "character") as Array<{ id: string; state: string }>;
  const charactersPower = charEntities.reduce((sum, e) => {
    const state = JSON.parse(e.state) as { attack: number; defense: number; speed: number };
    return sum + state.attack + state.defense + state.speed;
  }, 0);
  const bossPower = boss.attack + boss.defense * 0.5 + boss.hp * 0.01;
  const powerRatio = (playerPower + charactersPower) / bossPower;
  const baseWinChance = await (async () => {
    const formula = await ruleService.getFormula("altar_victory_formula");
    return engine.formulas.calculate(formula, { powerRatio });
  })();
  const victory = Math.random() < baseWinChance;

  if (victory) {
    data.isDefeated = true;
    await db.wildernessFacility.update({ where: { id: altar.id }, data: { data: JSON.stringify(data) } });

    const rewards = { gold: boss.level * 50, exp: boss.level * 30, crystals: Math.floor(boss.level / 5) + 1 };
    await updatePlayer(db, player.id, {
      gold: { increment: rewards.gold }, exp: { increment: rewards.exp }, crystals: { increment: rewards.crystals },
    });

    return { victory: true, bossName: boss.name, message: `击败了${boss.name}！祭坛已被净化，现在可以每日收集卡牌了。`, rewards };
  }
  return { victory: false, bossName: boss.name, message: `败给了${boss.name}...提升实力后再来挑战吧！` };
}

export async function collectDailyCard(db: FullDbClient, entities: IEntityManager, userId: string, altarId: string) {
  const player = await getPlayerOrThrow(db, userId);

  const altar = await db.wildernessFacility.findFirst({
    where: { id: altarId, playerId: player.id, type: "altar" },
  });
  if (!altar) throw new TRPCError({ code: "NOT_FOUND", message: "祭坛不存在" });

  const data = JSON.parse(altar.data) as { altarType: string; lastCollectedDate?: string; isDefeated?: boolean; pityCount?: number };
  if (!data.isDefeated) throw new TRPCError({ code: "BAD_REQUEST", message: "请先击败祭坛守卫" });

  const today = getTodayString();
  if (data.lastCollectedDate === today) throw new TRPCError({ code: "BAD_REQUEST", message: "今日已收集过卡牌" });

  const altarType = ALTAR_TYPES.find((t) => t.id === data.altarType);
  if (!altarType) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "祭坛类型无效" });

  const pityCount = data.pityCount ?? 0;
  const weights = await getAltarWeights(data.altarType);
  const rarity = rollRarity(weights, pityCount);
  const cardResult = await grantRandomCard(db, entities, player.id, rarity);
  if (!cardResult) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "没有可用卡牌" });

  // Update pity counter: reset if 稀有+, otherwise increment
  data.pityCount = RARE_OR_ABOVE.includes(rarity) ? 0 : pityCount + 1;
  data.lastCollectedDate = today;
  await db.wildernessFacility.update({ where: { id: altar.id }, data: { data: JSON.stringify(data) } });

  if (cardResult.name.includes("突破")) {
    await db.unlockFlag.upsert({
      where: { playerId_flagName: { playerId: player.id, flagName: "breakthrough_system" } },
      update: {},
      create: { playerId: player.id, flagName: "breakthrough_system" },
    });
  }

  return { success: true, altarName: altar.name, card: cardResult, message: `从${altar.name}获得了${cardResult.rarity}卡牌：${cardResult.name}` };
}

export async function collectAllDailyCards(db: FullDbClient, entities: IEntityManager, userId: string) {
  const player = await getPlayerOrThrow(db, userId);

  const altars = await db.wildernessFacility.findMany({
    where: { playerId: player.id, type: "altar", isDiscovered: true },
  });

  const today = getTodayString();
  const collectedCards: Array<{ altarName: string; card: { name: string; rarity: string; icon: string } }> = [];

  for (const altar of altars) {
    const data = JSON.parse(altar.data) as { altarType: string; lastCollectedDate?: string; isDefeated?: boolean; pityCount?: number };
    if (!data.isDefeated || data.lastCollectedDate === today) continue;

    const altarType = ALTAR_TYPES.find((t) => t.id === data.altarType);
    if (!altarType) continue;

    const pityCount = data.pityCount ?? 0;
    const weights = await getAltarWeights(data.altarType);
    const rarity = rollRarity(weights, pityCount);
    const cardResult = await grantRandomCard(db, entities, player.id, rarity);
    if (!cardResult) continue;

    data.pityCount = RARE_OR_ABOVE.includes(rarity) ? 0 : pityCount + 1;
    data.lastCollectedDate = today;
    await db.wildernessFacility.update({ where: { id: altar.id }, data: { data: JSON.stringify(data) } });

    if (cardResult.name.includes("突破")) {
      await db.unlockFlag.upsert({
        where: { playerId_flagName: { playerId: player.id, flagName: "breakthrough_system" } },
        update: {},
        create: { playerId: player.id, flagName: "breakthrough_system" },
      });
    }

    collectedCards.push({ altarName: altar.name, card: { name: cardResult.name, rarity: cardResult.rarity, icon: cardResult.icon } });
  }

  return {
    success: true, collectedCount: collectedCards.length, cards: collectedCards,
    message: collectedCards.length > 0 ? `从${collectedCards.length}个祭坛收集了卡牌` : "没有可收集的祭坛",
  };
}

export function getAltarTypes() {
  return ALTAR_TYPES.map((t) => ({
    id: t.id, name: t.name, icon: t.icon, description: t.description,
    bossLevel: t.guardianBoss.level, bossName: t.guardianBoss.name,
  }));
}
