/**
 * Shop Service — shop purchase business logic
 */
import { TRPCError } from "@trpc/server";
import type { FullDbClient } from "../repositories/types";
import { findPlayerByUserId, updatePlayer } from "../repositories/player.repo";

interface ShopItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: "card" | "resource" | "special";
  price: { gold?: number; crystals?: number };
  stock?: number;
  effect?: { type: string; value: number };
}

const SHOP_ITEMS: ShopItem[] = [
  { id: "wood_pack_s", name: "木材包（小）", icon: "🪵", description: "获得100木材", category: "resource", price: { gold: 50 }, effect: { type: "wood", value: 100 } },
  { id: "wood_pack_m", name: "木材包（中）", icon: "🪵", description: "获得500木材", category: "resource", price: { gold: 200 }, effect: { type: "wood", value: 500 } },
  { id: "stone_pack_s", name: "石材包（小）", icon: "🪨", description: "获得100石材", category: "resource", price: { gold: 60 }, effect: { type: "stone", value: 100 } },
  { id: "stone_pack_m", name: "石材包（中）", icon: "🪨", description: "获得500石材", category: "resource", price: { gold: 250 }, effect: { type: "stone", value: 500 } },
  { id: "food_pack_s", name: "粮食包（小）", icon: "🌾", description: "获得100粮食", category: "resource", price: { gold: 40 }, effect: { type: "food", value: 100 } },
  { id: "food_pack_m", name: "粮食包（中）", icon: "🌾", description: "获得500粮食", category: "resource", price: { gold: 160 }, effect: { type: "food", value: 500 } },
  { id: "stamina_potion", name: "体力药水", icon: "⚡", description: "恢复50点体力", category: "special", price: { gold: 100 }, stock: 5, effect: { type: "stamina", value: 50 } },
  { id: "crystal_pack", name: "水晶包", icon: "💎", description: "获得10水晶", category: "special", price: { gold: 500 }, stock: 3, effect: { type: "crystals", value: 10 } },
  { id: "exp_book_s", name: "经验书（小）", icon: "📕", description: "获得100经验值", category: "special", price: { gold: 150 }, effect: { type: "exp", value: 100 } },
  { id: "exp_book_m", name: "经验书（中）", icon: "📗", description: "获得500经验值", category: "special", price: { gold: 600 }, effect: { type: "exp", value: 500 } },
  { id: "rare_card_pack", name: "稀有卡包", icon: "🎴", description: "随机获得一张稀有卡牌", category: "card", price: { crystals: 50 }, stock: 1 },
  { id: "epic_card_pack", name: "史诗卡包", icon: "🃏", description: "随机获得一张史诗卡牌", category: "card", price: { crystals: 150 }, stock: 1 },
];

function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

async function getPlayerOrThrow(db: FullDbClient, userId: string) {
  const player = await findPlayerByUserId(db, userId);
  if (!player) throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  return player;
}

export async function getItems(db: FullDbClient, userId: string, category: string) {
  const player = await getPlayerOrThrow(db, userId);
  const today = getTodayString();

  const purchases = await db.shopPurchase.findMany({
    where: { playerId: player.id, date: today },
  });
  const purchaseMap = new Map(purchases.map((p) => [p.itemId, p.quantity]));

  const items = SHOP_ITEMS.filter((item) => category === "all" || item.category === category).map((item) => {
    const purchased = purchaseMap.get(item.id) ?? 0;
    const remaining = item.stock !== undefined ? item.stock - purchased : undefined;
    return {
      ...item,
      purchased,
      remaining,
      canBuy: (remaining === undefined || remaining > 0) && ((item.price.gold ?? 0) <= player.gold) && ((item.price.crystals ?? 0) <= player.crystals),
    };
  });

  return { items, playerResources: { gold: player.gold, crystals: player.crystals } };
}

export async function buyItem(db: FullDbClient, userId: string, itemId: string, quantity: number) {
  const player = await getPlayerOrThrow(db, userId);

  const item = SHOP_ITEMS.find((i) => i.id === itemId);
  if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "物品不存在" });

  const today = getTodayString();

  if (item.stock !== undefined) {
    const todayPurchase = await db.shopPurchase.findUnique({
      where: { playerId_itemId_date: { playerId: player.id, itemId, date: today } },
    });
    const alreadyPurchased = todayPurchase?.quantity ?? 0;
    if (alreadyPurchased + quantity > item.stock) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `该物品今日限购${item.stock}个，已购买${alreadyPurchased}个` });
    }
  }

  const totalGold = (item.price.gold ?? 0) * quantity;
  const totalCrystals = (item.price.crystals ?? 0) * quantity;
  if (player.gold < totalGold) throw new TRPCError({ code: "BAD_REQUEST", message: "金币不足" });
  if (player.crystals < totalCrystals) throw new TRPCError({ code: "BAD_REQUEST", message: "水晶不足" });

  await updatePlayer(db, player.id, { gold: { decrement: totalGold }, crystals: { decrement: totalCrystals } });

  if (item.stock !== undefined) {
    await db.shopPurchase.upsert({
      where: { playerId_itemId_date: { playerId: player.id, itemId, date: today } },
      update: { quantity: { increment: quantity } },
      create: { playerId: player.id, itemId, date: today, quantity },
    });
  }

  let result: Record<string, unknown> = {};

  if (item.effect) {
    const totalEffect = item.effect.value * quantity;
    switch (item.effect.type) {
      case "wood":
        await updatePlayer(db, player.id, { wood: { increment: totalEffect } });
        result = { resourceGained: { wood: totalEffect } };
        break;
      case "stone":
        await updatePlayer(db, player.id, { stone: { increment: totalEffect } });
        result = { resourceGained: { stone: totalEffect } };
        break;
      case "food":
        await updatePlayer(db, player.id, { food: { increment: totalEffect } });
        result = { resourceGained: { food: totalEffect } };
        break;
      case "crystals":
        await updatePlayer(db, player.id, { crystals: { increment: totalEffect } });
        result = { resourceGained: { crystals: totalEffect } };
        break;
      case "stamina": {
        const newStamina = Math.min(player.stamina + totalEffect, player.maxStamina);
        await updatePlayer(db, player.id, { stamina: newStamina, lastStaminaUpdate: new Date() });
        result = { staminaRestored: newStamina - player.stamina };
        break;
      }
      case "exp":
        await updatePlayer(db, player.id, { exp: { increment: totalEffect } });
        result = { expGained: totalEffect };
        break;
    }
  }

  if (item.category === "card") {
    const rarity = item.id === "epic_card_pack" ? "史诗" : "稀有";
    const cards = await db.card.findMany({ where: { rarity } });
    if (cards.length > 0) {
      const grantedCards: Array<{ name: string; rarity: string }> = [];
      for (let i = 0; i < quantity; i++) {
        const card = cards[Math.floor(Math.random() * cards.length)]!;
        const existing = await db.playerCard.findUnique({
          where: { playerId_cardId: { playerId: player.id, cardId: card.id } },
        });
        if (existing) {
          await db.playerCard.update({ where: { id: existing.id }, data: { quantity: { increment: 1 } } });
        } else {
          await db.playerCard.create({ data: { playerId: player.id, cardId: card.id, quantity: 1 } });
        }
        grantedCards.push({ name: card.name, rarity: card.rarity });
      }
      result = { cardsGranted: grantedCards };
    }
  }

  return { success: true, itemName: item.name, quantity, cost: { gold: totalGold, crystals: totalCrystals }, ...result };
}

export async function sellCard(db: FullDbClient, userId: string, cardId: string, quantity: number) {
  const player = await getPlayerOrThrow(db, userId);

  const playerCard = await db.playerCard.findFirst({
    where: { playerId: player.id, cardId },
    include: { card: true },
  });
  if (!playerCard || playerCard.quantity < quantity) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "卡牌数量不足" });
  }

  const rarityPrices: Record<string, { gold: number; crystals: number }> = {
    "普通": { gold: 10, crystals: 0 }, "精良": { gold: 30, crystals: 1 },
    "稀有": { gold: 80, crystals: 3 }, "史诗": { gold: 200, crystals: 10 }, "传说": { gold: 500, crystals: 30 },
  };
  const price = rarityPrices[playerCard.card.rarity] ?? rarityPrices["普通"]!;
  const totalGold = price.gold * quantity;
  const totalCrystals = price.crystals * quantity;

  if (playerCard.quantity === quantity) {
    await db.playerCard.delete({ where: { id: playerCard.id } });
  } else {
    await db.playerCard.update({ where: { id: playerCard.id }, data: { quantity: { decrement: quantity } } });
  }

  await updatePlayer(db, player.id, { gold: { increment: totalGold }, crystals: { increment: totalCrystals } });

  return { success: true, cardName: playerCard.card.name, cardRarity: playerCard.card.rarity, quantity, gained: { gold: totalGold, crystals: totalCrystals } };
}

export async function getSellPrice(db: FullDbClient, userId: string, cardId: string) {
  const player = await getPlayerOrThrow(db, userId);

  const playerCard = await db.playerCard.findFirst({
    where: { playerId: player.id, cardId },
    include: { card: true },
  });
  if (!playerCard) throw new TRPCError({ code: "NOT_FOUND", message: "未拥有该卡牌" });

  const rarityPrices: Record<string, { gold: number; crystals: number }> = {
    "普通": { gold: 10, crystals: 0 }, "精良": { gold: 30, crystals: 1 },
    "稀有": { gold: 80, crystals: 3 }, "史诗": { gold: 200, crystals: 10 }, "传说": { gold: 500, crystals: 30 },
  };
  const price = rarityPrices[playerCard.card.rarity] ?? rarityPrices["普通"]!;

  return {
    cardName: playerCard.card.name, cardRarity: playerCard.card.rarity, quantity: playerCard.quantity,
    pricePerUnit: price, totalPrice: { gold: price.gold * playerCard.quantity, crystals: price.crystals * playerCard.quantity },
  };
}
