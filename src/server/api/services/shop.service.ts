/**
 * Shop Service — shop purchase business logic
 */
import { TRPCError } from "@trpc/server";
import type { FullDbClient } from "../repositories/types";
import type { IEntityManager } from "~/engine/types";
import { findPlayerByUserId, updatePlayer } from "../repositories/player.repo";
import { addCardEntity, findCardEntityByCardId, parseCardState, consumeCardEntity } from "../utils/card-entity-utils";
import * as cardRepo from "../repositories/card.repo";
import { ruleService } from "~/server/api/engine";

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

async function getShopItems(): Promise<ShopItem[]> {
  return ruleService.getConfig<ShopItem[]>("shop_items");
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

export async function getItems(db: FullDbClient, userId: string, category: string) {
  const player = await getPlayerOrThrow(db, userId);
  const today = getTodayString();

  const purchases = await db.shopPurchase.findMany({
    where: { playerId: player.id, date: today },
  });
  const purchaseMap = new Map(purchases.map((p) => [p.itemId, p.quantity]));

  const shopItems = await getShopItems();
  const items = shopItems.filter((item) => category === "all" || item.category === category).map((item) => {
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

export async function buyItem(db: FullDbClient, entities: IEntityManager, userId: string, itemId: string, quantity: number) {
  const player = await getPlayerOrThrow(db, userId);

  const shopItems = await getShopItems();
  const item = shopItems.find((i) => i.id === itemId);
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
        await addCardEntity(db, entities, player.id, card.id, 1);
        grantedCards.push({ name: card.name, rarity: card.rarity });
      }
      result = { cardsGranted: grantedCards };
    }
  }

  return { success: true, itemName: item.name, quantity, cost: { gold: totalGold, crystals: totalCrystals }, ...result };
}

export async function sellCard(db: FullDbClient, entities: IEntityManager, userId: string, cardId: string, quantity: number) {
  const player = await getPlayerOrThrow(db, userId);

  const playerCard = await cardRepo.findPlayerCardByCardId(db, entities, player.id, cardId);
  if (!playerCard || playerCard.quantity < quantity) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "卡牌数量不足" });
  }

  const rarityPrices = await ruleService.getConfig<Record<string, { gold: number; crystals: number }>>("shop_sell_prices");
  const price = rarityPrices[playerCard.card.rarity] ?? rarityPrices["普通"]!;
  const totalGold = price.gold * quantity;
  const totalCrystals = price.crystals * quantity;

  if (playerCard.quantity === quantity) {
    await cardRepo.deletePlayerCard(entities, playerCard.id);
  } else {
    await cardRepo.updatePlayerCardQuantity(entities, playerCard.id, playerCard.quantity - quantity);
  }

  await updatePlayer(db, player.id, { gold: { increment: totalGold }, crystals: { increment: totalCrystals } });

  return { success: true, cardName: playerCard.card.name, cardRarity: playerCard.card.rarity, quantity, gained: { gold: totalGold, crystals: totalCrystals } };
}

export async function getSellPrice(db: FullDbClient, entities: IEntityManager, userId: string, cardId: string) {
  const player = await getPlayerOrThrow(db, userId);

  const playerCard = await cardRepo.findPlayerCardByCardId(db, entities, player.id, cardId);
  if (!playerCard) throw new TRPCError({ code: "NOT_FOUND", message: "未拥有该卡牌" });

  const rarityPrices = await ruleService.getConfig<Record<string, { gold: number; crystals: number }>>("shop_sell_prices");
  const price = rarityPrices[playerCard.card.rarity] ?? rarityPrices["普通"]!;

  return {
    cardName: playerCard.card.name, cardRarity: playerCard.card.rarity, quantity: playerCard.quantity,
    pricePerUnit: price, totalPrice: { gold: price.gold * playerCard.quantity, crystals: price.crystals * playerCard.quantity },
  };
}
