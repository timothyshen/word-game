import type { PrismaClient } from "@prisma/client";

export interface CardGrantResult {
  id: string;
  name: string;
  type: string;
  rarity: string;
  icon: string;
  description: string;
}

/**
 * Grant a random card of the given rarity to a player.
 * Uses upsert to atomically handle both new and existing cards.
 * Returns card info if granted, null if no cards of that rarity exist.
 */
export async function grantRandomCard(
  db: PrismaClient,
  playerId: string,
  rarity: string,
): Promise<CardGrantResult | null> {
  const cards = await db.card.findMany({ where: { rarity, type: { not: "chest" } } });
  if (cards.length === 0) return null;

  const card = cards[Math.floor(Math.random() * cards.length)]!;

  await db.playerCard.upsert({
    where: {
      playerId_cardId: { playerId, cardId: card.id },
    },
    update: { quantity: { increment: 1 } },
    create: { playerId, cardId: card.id, quantity: 1 },
  });

  return {
    id: card.id,
    name: card.name,
    type: card.type,
    rarity: card.rarity,
    icon: card.icon,
    description: card.description,
  };
}

/**
 * Grant multiple random cards of a given rarity.
 * Returns array of granted card info.
 */
export async function grantRandomCards(
  db: PrismaClient,
  playerId: string,
  rarity: string,
  count: number,
): Promise<CardGrantResult[]> {
  const results: CardGrantResult[] = [];
  for (let i = 0; i < count; i++) {
    const result = await grantRandomCard(db, playerId, rarity);
    if (result) results.push(result);
  }
  return results;
}

/**
 * Roll a rarity from a weighted pool.
 * Pool is e.g. { "普通": 70, "精良": 20, "稀有": 10 } where values are relative weights.
 */
export function rollRarity(pool: Record<string, number>): string {
  const entries = Object.entries(pool);
  const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * totalWeight;
  for (const [rarity, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return rarity;
  }
  return entries[entries.length - 1]![0];
}

/**
 * Open a chest: roll N cards from weighted rarity pool, grant them to player.
 */
export async function openChest(
  db: PrismaClient,
  playerId: string,
  draws: number,
  pool: Record<string, number>,
): Promise<CardGrantResult[]> {
  const results: CardGrantResult[] = [];
  for (let i = 0; i < draws; i++) {
    const rarity = rollRarity(pool);
    const card = await grantRandomCard(db, playerId, rarity);
    if (card) results.push(card);
  }
  return results;
}
