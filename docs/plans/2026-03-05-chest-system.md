# Treasure Chest System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a treasure chest system where chests are special cards stored in backpack; opening draws multiple cards based on chest rarity. Chests drop from Boss defeats, exploration events, and daily settlement.

**Architecture:** Chests are Card templates (type=`"chest"`) seeded into the database. Opening uses a new `useChestCard` function in card.service.ts that rolls cards from a weighted rarity pool. Boss victory grants a chest instead of a random card. Settlement grants a chest based on grade. No new DB tables needed.

**Tech Stack:** TypeScript, tRPC, Prisma, React

---

### Task 1: Add chest card templates to seed data

**Files:**
- Modify: `prisma/seed.ts`

**Step 1: Add chest cards to the cards array**

In `prisma/seed.ts`, add the following entries to the `cards` array (before the closing `];` on line 455):

```typescript
    // 宝箱卡
    {
      name: "普通宝箱",
      type: "chest",
      rarity: "普通",
      description: "开启后获得1张随机卡牌",
      icon: "📦",
      effects: JSON.stringify({ type: "chest", draws: 1, pool: { "普通": 70, "精良": 20, "稀有": 10 } }),
    },
    {
      name: "精良宝箱",
      type: "chest",
      rarity: "精良",
      description: "开启后获得2张随机卡牌",
      icon: "🎁",
      effects: JSON.stringify({ type: "chest", draws: 2, pool: { "精良": 40, "稀有": 40, "史诗": 20 } }),
    },
    {
      name: "稀有宝箱",
      type: "chest",
      rarity: "稀有",
      description: "开启后获得3张随机卡牌",
      icon: "💠",
      effects: JSON.stringify({ type: "chest", draws: 3, pool: { "精良": 30, "稀有": 40, "史诗": 25, "传说": 5 } }),
    },
    {
      name: "史诗宝箱",
      type: "chest",
      rarity: "史诗",
      description: "开启后获得4张随机卡牌",
      icon: "👑",
      effects: JSON.stringify({ type: "chest", draws: 4, pool: { "稀有": 20, "史诗": 40, "传说": 40 } }),
    },
    {
      name: "传说宝箱",
      type: "chest",
      rarity: "传说",
      description: "开启后获得5张随机卡牌",
      icon: "🌟",
      effects: JSON.stringify({ type: "chest", draws: 5, pool: { "史诗": 30, "传说": 70 } }),
    },
```

**Step 2: Run seed**

Run: `bun prisma db seed`

**Step 3: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: add chest card templates to seed data"
```

---

### Task 2: Add chest opening logic to card-utils

**Files:**
- Modify: `src/server/api/utils/card-utils.ts`

**Step 1: Add weighted rarity roll and openChest functions**

Append to `src/server/api/utils/card-utils.ts`:

```typescript
/**
 * Roll a rarity from a weighted pool.
 * Pool is { "普通": 70, "精良": 20, "稀有": 10 } where values are relative weights.
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
 * Returns array of granted cards.
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
```

**Step 2: Typecheck**

Run: `bun run typecheck`

**Step 3: Commit**

```bash
git add src/server/api/utils/card-utils.ts
git commit -m "feat: add chest opening logic with weighted rarity rolls"
```

---

### Task 3: Add useChestCard to card service

**Files:**
- Modify: `src/server/api/services/card.service.ts`

**Step 1: Add useChestCard function**

Add this function after `useRecruitCard` in `src/server/api/services/card.service.ts`:

```typescript
export async function useChestCard(
  db: FullDbClient,
  userId: string,
  cardId: string,
) {
  const player = await getPlayerOrThrow(db, userId);

  const playerCard = await cardRepo.findPlayerCardByCardId(db, player.id, cardId);
  if (!playerCard || playerCard.quantity < 1) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "没有该宝箱" });
  }
  if (playerCard.card.type !== "chest") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "该卡牌不是宝箱" });
  }

  const effects = JSON.parse(playerCard.card.effects) as { draws: number; pool: Record<string, number> };

  // Open chest
  const { openChest } = await import("../utils/card-utils");
  const grantedCards = await openChest(db as Parameters<typeof openChest>[0], player.id, effects.draws, effects.pool);

  // Consume chest
  await cardRepo.consumeCard(db, playerCard.id, playerCard.quantity);

  return {
    opened: true,
    chestName: playerCard.card.name,
    chestRarity: playerCard.card.rarity,
    cards: grantedCards,
  };
}
```

**Step 2: Export useChestCard in the card router**

In `src/server/api/routers/progression/card.ts` (or wherever card routes are), add a new mutation:

First read the card router to find the exact location. It should be at `src/server/api/routers/progression/card.ts`. Add:

```typescript
  openChest: protectedProcedure
    .input(z.object({ cardId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return cardService.useChestCard(ctx.db, ctx.session.user.id, input.cardId);
    }),
```

**Step 3: Typecheck**

Run: `bun run typecheck`

**Step 4: Commit**

```bash
git add src/server/api/services/card.service.ts src/server/api/routers/progression/card.ts
git commit -m "feat: add useChestCard service and openChest mutation"
```

---

### Task 4: Boss drops chest instead of random card

**Files:**
- Modify: `src/server/api/services/boss.service.ts`

**Step 1: Replace random card drop with chest grant**

In `src/server/api/services/boss.service.ts`, find the victory reward section (around line 301-324). Replace the card drop logic with chest granting.

Change the boss rewards to map `cardRarity` to a chest name. The existing `rewards.cardChance` becomes 1.0 (always drop chest on victory), and instead of `grantRandomCard` we grant the chest card:

```typescript
    // Replace the existing card drop block (lines 301-324) with:

    // 宝箱掉落 (100% on victory)
    const chestName = `${rewards.cardRarity}宝箱`;
    const chestCard = await db.card.findFirst({ where: { name: chestName, type: "chest" } });
    let droppedChest = null;
    if (chestCard) {
      await db.playerCard.upsert({
        where: { playerId_cardId: { playerId: player.id, cardId: chestCard.id } },
        update: { quantity: { increment: 1 } },
        create: { playerId: player.id, cardId: chestCard.id, quantity: 1 },
      });
      droppedChest = { name: chestCard.name, rarity: chestCard.rarity, icon: chestCard.icon };
    }
```

Update the return to use `chest` instead of `card`:

```typescript
    return {
      victory: true,
      bossName: boss.name,
      rewards: {
        gold: rewards.gold,
        crystals: rewards.crystals,
        exp: rewards.exp,
        chest: droppedChest,
      },
      message: `击败了${boss.name}！`,
    };
```

Also remove the old `grantRandomCard` import if it's no longer used in this file.

**Step 2: Typecheck**

Run: `bun run typecheck`

**Step 3: Commit**

```bash
git add src/server/api/services/boss.service.ts
git commit -m "feat: boss victory now drops chest card instead of random card"
```

---

### Task 5: Settlement grants chest based on grade

**Files:**
- Modify: `src/server/api/services/settlement.service.ts`

**Step 1: Add chest rewards alongside existing card rewards**

In `src/server/api/services/settlement.service.ts`, after the existing card granting loop (around line 196-200), add chest granting:

```typescript
  // Grant chest based on best grade
  let chestReward = null;
  const bestGrade = settlementResults.reduce((best, r) => {
    const gradeOrder = ["D", "C", "B", "A", "S"];
    return gradeOrder.indexOf(r.grade) > gradeOrder.indexOf(best) ? r.grade : best;
  }, "D");

  const GRADE_CHEST: Record<string, string | null> = {
    D: null,
    C: "普通宝箱",
    B: "精良宝箱",
    A: "稀有宝箱",
    S: "史诗宝箱",
  };

  const chestName = GRADE_CHEST[bestGrade];
  if (chestName) {
    const chestCard = await db.card.findFirst({ where: { name: chestName, type: "chest" } });
    if (chestCard) {
      await db.playerCard.upsert({
        where: { playerId_cardId: { playerId: player.id, cardId: chestCard.id } },
        update: { quantity: { increment: 1 } },
        create: { playerId: player.id, cardId: chestCard.id, quantity: 1 },
      });
      chestReward = { name: chestCard.name, rarity: chestCard.rarity, icon: chestCard.icon };
    }
  }
```

Add `chestReward` to the return object:

```typescript
  return {
    settled: true,
    daysSettled: currentDay - player.lastSettlementDay,
    results: settlementResults,
    totalRewardCards,
    grantedCards,
    chestReward,
    newStreakDays,
  };
```

**Step 2: Typecheck**

Run: `bun run typecheck`

**Step 3: Commit**

```bash
git add src/server/api/services/settlement.service.ts
git commit -m "feat: settlement grants chest card based on daily grade"
```

---

### Task 6: Update frontend to handle chest cards

**Files:**
- Modify: `src/components/game/panels/BackpackTab.tsx` (or wherever card use UI is)

**Step 1: Find the backpack/inventory component**

Read the backpack panel component to find where cards are displayed and used. Look for the card use flow to add chest-specific handling.

**Step 2: Add openChest mutation call**

When a chest card is clicked and "使用" is pressed, call `api.card.openChest.useMutation` instead of the generic `useCard`. Show a result popup with the list of drawn cards.

**Step 3: Add chest result display**

After opening, show a result modal similar to altar collect result:

```tsx
{chestResult && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
    <div className="bg-[#0a0a15]/95 border border-[#c9a227] rounded-lg p-6 max-w-md">
      <h3 className="text-[#c9a227] font-bold text-lg mb-4 text-center">
        {chestResult.chestName} 开启结果
      </h3>
      <div className="flex flex-col gap-2">
        {chestResult.cards.map((card, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2 border border-[#2a3a4a] rounded">
            <span className="text-xl">{card.icon}</span>
            <span className="flex-1 text-sm text-[#e0dcd0]">{card.name}</span>
            <span className="text-xs" style={{ color: RARITY_COLORS[card.rarity] }}>{card.rarity}</span>
          </div>
        ))}
      </div>
      <button
        onClick={() => setChestResult(null)}
        className="mt-4 w-full py-2 bg-[#c9a227]/20 border border-[#c9a227] text-[#c9a227] rounded text-sm"
      >
        确认
      </button>
    </div>
  </div>
)}
```

**Step 4: Typecheck**

Run: `bun run typecheck`

**Step 5: Commit**

```bash
git add src/components/game/panels/
git commit -m "feat: add chest opening UI in backpack panel"
```

---

### Task 7: Final verification

**Step 1: Run seed to create chest cards**

Run: `bun prisma db seed`

**Step 2: Full typecheck**

Run: `bun run typecheck`

**Step 3: Full test suite**

Run: `bun test`

**Step 4: Commit any remaining changes**

```bash
git add -A
git commit -m "feat: complete treasure chest system"
```
