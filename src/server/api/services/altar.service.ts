/**
 * Altar Service — altar discovery, challenge, and daily card collection
 */
import { TRPCError } from "@trpc/server";
import type { FullDbClient } from "../repositories/types";
import type { IEntityManager } from "~/engine/types";
import { findPlayerByUserId, updatePlayer } from "../repositories/player.repo";
import { grantRandomCard } from "../utils/card-utils";

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

function rollRarity(weights: Record<string, number>): string {
  const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [rarity, weight] of Object.entries(weights)) {
    if (roll < weight) return rarity;
    roll -= weight;
  }
  return "普通";
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

export async function challengeGuardian(db: FullDbClient, userId: string, altarId: string) {
  const player = await db.player.findUnique({
    where: { userId },
    include: { characters: { include: { character: true } } },
  });
  if (!player) throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });

  const altar = await db.wildernessFacility.findFirst({
    where: { id: altarId, playerId: player.id, type: "altar" },
  });
  if (!altar) throw new TRPCError({ code: "NOT_FOUND", message: "祭坛不存在" });

  const data = JSON.parse(altar.data) as { altarType: string; isDefeated?: boolean };
  if (data.isDefeated) throw new TRPCError({ code: "BAD_REQUEST", message: "守卫已被击败" });

  const altarType = ALTAR_TYPES.find((t) => t.id === data.altarType);
  if (!altarType) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "祭坛类型无效" });

  const staminaCost = 30;
  if (player.stamina < staminaCost) throw new TRPCError({ code: "BAD_REQUEST", message: "体力不足" });

  await updatePlayer(db, player.id, { stamina: { decrement: staminaCost }, lastStaminaUpdate: new Date() });

  const boss = altarType.guardianBoss;
  const playerPower = player.strength * 3 + player.agility * 2 + player.intellect * 2;
  const charactersPower = player.characters.reduce((sum, c) => sum + c.attack + c.defense + c.speed, 0);
  const bossPower = boss.attack + boss.defense * 0.5 + boss.hp * 0.01;
  const powerRatio = (playerPower + charactersPower) / bossPower;
  const baseWinChance = Math.min(0.85, Math.max(0.15, powerRatio * 0.5));
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

  const data = JSON.parse(altar.data) as { altarType: string; lastCollectedDate?: string; isDefeated?: boolean };
  if (!data.isDefeated) throw new TRPCError({ code: "BAD_REQUEST", message: "请先击败祭坛守卫" });

  const today = getTodayString();
  if (data.lastCollectedDate === today) throw new TRPCError({ code: "BAD_REQUEST", message: "今日已收集过卡牌" });

  const altarType = ALTAR_TYPES.find((t) => t.id === data.altarType);
  if (!altarType) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "祭坛类型无效" });

  const rarity = rollRarity(altarType.cardRarityWeights);
  const cardResult = await grantRandomCard(db, entities, player.id, rarity);
  if (!cardResult) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "没有可用卡牌" });

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
    const data = JSON.parse(altar.data) as { altarType: string; lastCollectedDate?: string; isDefeated?: boolean };
    if (!data.isDefeated || data.lastCollectedDate === today) continue;

    const altarType = ALTAR_TYPES.find((t) => t.id === data.altarType);
    if (!altarType) continue;

    const rarity = rollRarity(altarType.cardRarityWeights);
    const cardResult = await grantRandomCard(db, entities, player.id, rarity);
    if (!cardResult) continue;

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
