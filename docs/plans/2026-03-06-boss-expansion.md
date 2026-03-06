# Boss System Database Migration & Expansion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move Boss definitions from hardcoded array to database model, expand to 18 bosses across all 5 realms.

**Architecture:** Add Boss model to Prisma schema, migrate BossStatus to use foreign key, seed 18 bosses, rewrite boss.service.ts to query database instead of hardcoded array. Frontend unchanged (same API shape).

**Tech Stack:** TypeScript, Prisma, tRPC

---

### Task 1: Add Boss model to Prisma schema

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add Boss model**

Add before the BossStatus model (around line 608):

```prisma
// Boss模板
model Boss {
    id                 String  @id @default(cuid())
    name               String  @unique
    icon               String
    description        String
    level              Int
    hp                 Int
    attack             Int
    defense            Int
    skills             String  // JSON: Array<{name: string, damage: number, effect?: string}>
    weeklyAttemptLimit Int     @default(3)

    // 解锁条件
    requiredTier       Int     @default(0)
    requiredLevel      Int     @default(1)
    requiredWorld      String? // null = 主位面

    // 奖励
    rewardGold         Int
    rewardCrystals     Int
    rewardExp          Int
    rewardChestRarity  String  // 宝箱稀有度
    rewardEquipRarity  String  // 装备稀有度

    // 排序
    sortOrder          Int     @default(0)

    bossStatuses       BossStatus[]
}
```

**Step 2: Update BossStatus to reference Boss**

Change BossStatus model to add foreign key:

```prisma
model BossStatus {
    id       String @id @default(cuid())
    playerId String
    player   Player @relation(fields: [playerId], references: [id], onDelete: Cascade)
    bossId   String
    boss     Boss   @relation(fields: [bossId], references: [id], onDelete: Cascade)

    weeklyAttempts Int      @default(0)
    lastAttempt    DateTime?
    lastDefeat     DateTime?

    weekStartDate  DateTime

    @@index([playerId])
    @@unique([playerId, bossId])
}
```

**Step 3: Push schema changes**

Run: `bun prisma db push`

This will drop the BossStatus table and recreate it (data loss is expected and acceptable since old bossId values are incompatible string IDs).

**Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add Boss model to schema, update BossStatus foreign key"
```

---

### Task 2: Seed 18 bosses

**Files:**
- Modify: `prisma/seed.ts`

**Step 1: Add boss seed data**

Add after the equipment templates section, before the test player card assignment:

```typescript
  // ===== Boss模板 =====
  const bosses = [
    // === 主位面 ===
    {
      name: "哥布林王", icon: "👺", description: "统领哥布林部落的凶残首领", level: 5, hp: 300, attack: 20, defense: 10,
      skills: JSON.stringify([{ name: "王者重击", damage: 1.8 }, { name: "召唤小弟", damage: 0, effect: "summon" }]),
      weeklyAttemptLimit: 3, requiredTier: 0, requiredLevel: 3, requiredWorld: null,
      rewardGold: 300, rewardCrystals: 10, rewardExp: 150, rewardChestRarity: "普通", rewardEquipRarity: "普通", sortOrder: 1,
    },
    {
      name: "山贼头目", icon: "🗡️", description: "盘踞山道的山贼头子，手下众多", level: 10, hp: 600, attack: 35, defense: 18,
      skills: JSON.stringify([{ name: "连环斩", damage: 1.5 }, { name: "威吓", damage: 0, effect: "fear" }, { name: "致命一击", damage: 2.2 }]),
      weeklyAttemptLimit: 3, requiredTier: 0, requiredLevel: 8, requiredWorld: null,
      rewardGold: 500, rewardCrystals: 20, rewardExp: 250, rewardChestRarity: "精良", rewardEquipRarity: "精良", sortOrder: 2,
    },
    {
      name: "石像鬼", icon: "🗿", description: "古代遗迹中苏醒的石像守卫", level: 15, hp: 1000, attack: 45, defense: 35,
      skills: JSON.stringify([{ name: "石化之拳", damage: 1.8, effect: "stun" }, { name: "岩石护甲", damage: 0, effect: "shield" }]),
      weeklyAttemptLimit: 2, requiredTier: 0, requiredLevel: 12, requiredWorld: null,
      rewardGold: 800, rewardCrystals: 30, rewardExp: 350, rewardChestRarity: "精良", rewardEquipRarity: "精良", sortOrder: 3,
    },
    {
      name: "森林巨蛛", icon: "🕷️", description: "栖息在密林深处的巨型蜘蛛", level: 20, hp: 1500, attack: 55, defense: 25,
      skills: JSON.stringify([{ name: "毒液喷射", damage: 1.5, effect: "poison" }, { name: "蛛网缠绕", damage: 0, effect: "slow" }, { name: "致命撕咬", damage: 2.0 }]),
      weeklyAttemptLimit: 2, requiredTier: 2, requiredLevel: 18, requiredWorld: null,
      rewardGold: 1200, rewardCrystals: 40, rewardExp: 450, rewardChestRarity: "稀有", rewardEquipRarity: "稀有", sortOrder: 4,
    },
    // === 火焰位面 ===
    {
      name: "熔岩巨人", icon: "🌋", description: "由熔岩凝聚而成的远古巨人", level: 25, hp: 2500, attack: 70, defense: 45,
      skills: JSON.stringify([{ name: "熔岩投掷", damage: 2.0, effect: "burn" }, { name: "地震踩踏", damage: 1.5, effect: "aoe" }]),
      weeklyAttemptLimit: 2, requiredTier: 2, requiredLevel: 22, requiredWorld: "fire_realm",
      rewardGold: 1500, rewardCrystals: 50, rewardExp: 550, rewardChestRarity: "稀有", rewardEquipRarity: "稀有", sortOrder: 5,
    },
    {
      name: "炎龙", icon: "🐉", description: "居住在火焰位面的远古巨龙", level: 30, hp: 4000, attack: 90, defense: 50,
      skills: JSON.stringify([{ name: "龙息", damage: 2.0, effect: "burn" }, { name: "龙爪撕裂", damage: 1.5 }, { name: "火焰风暴", damage: 2.5, effect: "aoe" }]),
      weeklyAttemptLimit: 2, requiredTier: 2, requiredLevel: 28, requiredWorld: "fire_realm",
      rewardGold: 2000, rewardCrystals: 60, rewardExp: 650, rewardChestRarity: "稀有", rewardEquipRarity: "稀有", sortOrder: 6,
    },
    {
      name: "火焰领主", icon: "🔥", description: "火焰位面的至高统治者", level: 35, hp: 5500, attack: 120, defense: 65,
      skills: JSON.stringify([{ name: "烈焰风暴", damage: 2.5, effect: "burn" }, { name: "火焰吞噬", damage: 2.0, effect: "drain" }, { name: "末日之焰", damage: 3.5, effect: "aoe" }]),
      weeklyAttemptLimit: 1, requiredTier: 3, requiredLevel: 32, requiredWorld: "fire_realm",
      rewardGold: 3000, rewardCrystals: 80, rewardExp: 800, rewardChestRarity: "史诗", rewardEquipRarity: "史诗", sortOrder: 7,
    },
    // === 寒冰位面 ===
    {
      name: "冰霜狼王", icon: "🐺", description: "率领冰原狼群的凶猛狼王", level: 28, hp: 3000, attack: 75, defense: 40,
      skills: JSON.stringify([{ name: "冰霜撕咬", damage: 1.8, effect: "slow" }, { name: "嚎叫", damage: 0, effect: "fear" }, { name: "狼群围攻", damage: 2.0, effect: "aoe" }]),
      weeklyAttemptLimit: 2, requiredTier: 2, requiredLevel: 25, requiredWorld: "ice_realm",
      rewardGold: 1800, rewardCrystals: 55, rewardExp: 600, rewardChestRarity: "稀有", rewardEquipRarity: "稀有", sortOrder: 8,
    },
    {
      name: "寒冰巨龙", icon: "❄️", description: "沉睡在冰川深处的远古冰龙", level: 35, hp: 5000, attack: 110, defense: 60,
      skills: JSON.stringify([{ name: "冰息", damage: 2.0, effect: "slow" }, { name: "冰锥突刺", damage: 1.8 }, { name: "绝对零度", damage: 3.0, effect: "stun" }]),
      weeklyAttemptLimit: 2, requiredTier: 3, requiredLevel: 30, requiredWorld: "ice_realm",
      rewardGold: 2500, rewardCrystals: 70, rewardExp: 750, rewardChestRarity: "史诗", rewardEquipRarity: "史诗", sortOrder: 9,
    },
    {
      name: "冰霜女皇", icon: "👸", description: "统治寒冰位面的永恒冰霜女皇", level: 42, hp: 7000, attack: 140, defense: 85,
      skills: JSON.stringify([{ name: "冰封领域", damage: 2.0, effect: "slow" }, { name: "寒冰屏障", damage: 0, effect: "shield" }, { name: "极寒之怒", damage: 3.5, effect: "aoe" }]),
      weeklyAttemptLimit: 1, requiredTier: 3, requiredLevel: 38, requiredWorld: "ice_realm",
      rewardGold: 3500, rewardCrystals: 100, rewardExp: 900, rewardChestRarity: "史诗", rewardEquipRarity: "史诗", sortOrder: 10,
    },
    // === 暗影位面 ===
    {
      name: "暗影刺客", icon: "🗡️", description: "暗影中最致命的刺客", level: 32, hp: 3500, attack: 100, defense: 35,
      skills: JSON.stringify([{ name: "暗影突袭", damage: 2.5 }, { name: "毒刃", damage: 1.5, effect: "poison" }, { name: "消失", damage: 0, effect: "dodge" }]),
      weeklyAttemptLimit: 2, requiredTier: 3, requiredLevel: 28, requiredWorld: "shadow_realm",
      rewardGold: 2200, rewardCrystals: 65, rewardExp: 700, rewardChestRarity: "稀有", rewardEquipRarity: "稀有", sortOrder: 11,
    },
    {
      name: "亡灵巫师", icon: "💀", description: "操纵亡灵之力的邪恶巫师", level: 40, hp: 6000, attack: 130, defense: 55,
      skills: JSON.stringify([{ name: "死亡射线", damage: 2.5 }, { name: "亡灵召唤", damage: 0, effect: "summon" }, { name: "灵魂汲取", damage: 2.0, effect: "drain" }]),
      weeklyAttemptLimit: 2, requiredTier: 3, requiredLevel: 35, requiredWorld: "shadow_realm",
      rewardGold: 3000, rewardCrystals: 90, rewardExp: 850, rewardChestRarity: "史诗", rewardEquipRarity: "史诗", sortOrder: 12,
    },
    {
      name: "暗影领主", icon: "👤", description: "暗影位面的统治者，掌控黑暗力量", level: 48, hp: 8500, attack: 170, defense: 95,
      skills: JSON.stringify([{ name: "暗影吞噬", damage: 2.0, effect: "drain" }, { name: "黑暗降临", damage: 1.5, effect: "blind" }, { name: "灵魂收割", damage: 3.0 }]),
      weeklyAttemptLimit: 1, requiredTier: 4, requiredLevel: 42, requiredWorld: "shadow_realm",
      rewardGold: 4000, rewardCrystals: 120, rewardExp: 1100, rewardChestRarity: "史诗", rewardEquipRarity: "史诗", sortOrder: 13,
    },
    // === 天界 ===
    {
      name: "圣殿骑士", icon: "⚔️", description: "守护天界圣殿的精英骑士", level: 45, hp: 7500, attack: 160, defense: 90,
      skills: JSON.stringify([{ name: "圣光斩", damage: 2.0 }, { name: "神圣守护", damage: 0, effect: "shield" }, { name: "审判之剑", damage: 2.8, effect: "holy" }]),
      weeklyAttemptLimit: 2, requiredTier: 4, requiredLevel: 40, requiredWorld: "celestial_realm",
      rewardGold: 3500, rewardCrystals: 110, rewardExp: 1000, rewardChestRarity: "史诗", rewardEquipRarity: "史诗", sortOrder: 14,
    },
    {
      name: "大天使", icon: "👼", description: "天界最强大的天使战士", level: 52, hp: 10000, attack: 200, defense: 120,
      skills: JSON.stringify([{ name: "天使之怒", damage: 2.5, effect: "holy" }, { name: "神圣治愈", damage: 0, effect: "heal" }, { name: "天堂裁决", damage: 3.5 }]),
      weeklyAttemptLimit: 1, requiredTier: 4, requiredLevel: 48, requiredWorld: "celestial_realm",
      rewardGold: 5000, rewardCrystals: 150, rewardExp: 1500, rewardChestRarity: "传说", rewardEquipRarity: "传说", sortOrder: 15,
    },
    {
      name: "天界守护者", icon: "🌟", description: "守护天界入口的神圣存在", level: 60, hp: 15000, attack: 250, defense: 150,
      skills: JSON.stringify([{ name: "神圣裁决", damage: 2.5 }, { name: "天使之翼", damage: 0, effect: "heal" }, { name: "天堂之怒", damage: 4.0, effect: "holy" }]),
      weeklyAttemptLimit: 1, requiredTier: 5, requiredLevel: 55, requiredWorld: "celestial_realm",
      rewardGold: 8000, rewardCrystals: 250, rewardExp: 2500, rewardChestRarity: "传说", rewardEquipRarity: "传说", sortOrder: 16,
    },
    // === 隐藏Boss ===
    {
      name: "混沌之主", icon: "🌀", description: "来自虚空的混沌化身，毁灭一切秩序", level: 70, hp: 25000, attack: 350, defense: 200,
      skills: JSON.stringify([{ name: "混沌之力", damage: 3.0, effect: "aoe" }, { name: "虚空吞噬", damage: 2.5, effect: "drain" }, { name: "毁灭射线", damage: 4.5 }]),
      weeklyAttemptLimit: 1, requiredTier: 5, requiredLevel: 60, requiredWorld: null,
      rewardGold: 15000, rewardCrystals: 400, rewardExp: 4000, rewardChestRarity: "传说", rewardEquipRarity: "传说", sortOrder: 17,
    },
    {
      name: "世界之蛇", icon: "🐍", description: "环绕诸天的远古巨蛇，世界的终结者", level: 80, hp: 40000, attack: 500, defense: 300,
      skills: JSON.stringify([{ name: "世界缠绕", damage: 3.5, effect: "stun" }, { name: "毒雾弥漫", damage: 2.0, effect: "poison" }, { name: "吞噬万物", damage: 5.0, effect: "drain" }]),
      weeklyAttemptLimit: 1, requiredTier: 5, requiredLevel: 70, requiredWorld: null,
      rewardGold: 25000, rewardCrystals: 600, rewardExp: 6000, rewardChestRarity: "传说", rewardEquipRarity: "传说", sortOrder: 18,
    },
  ];

  for (const boss of bosses) {
    await prisma.boss.upsert({
      where: { name: boss.name },
      update: boss,
      create: boss,
    });
  }
  console.log(`Created ${bosses.length} bosses`);
```

**Step 2: Run seed**

Run: `bun prisma db seed`

**Step 3: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: seed 18 bosses across 5 realms"
```

---

### Task 3: Rewrite boss.service.ts to use database

**Files:**
- Modify: `src/server/api/services/boss.service.ts`

**Step 1: Replace entire file**

Rewrite `src/server/api/services/boss.service.ts`:

```typescript
/**
 * Boss Service — boss challenge system business logic
 */
import { TRPCError } from "@trpc/server";
import type { FullDbClient } from "../repositories/types";
import { findPlayerByUserId } from "../repositories/player.repo";
import { getCurrentGameDay, getWeekStartDate } from "../utils/game-time";
import { grantRandomEquipment } from "../utils/equipment-utils";

async function getPlayerOrThrow(db: FullDbClient, userId: string) {
  const player = await findPlayerByUserId(db, userId);
  if (!player) throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  return player;
}

export async function getAllBosses(db: FullDbClient, userId: string) {
  const player = await getPlayerOrThrow(db, userId);
  const weekStart = getWeekStartDate();

  const bosses = await db.boss.findMany({ orderBy: { sortOrder: "asc" } });

  const bossStatuses = await db.bossStatus.findMany({
    where: {
      playerId: player.id,
      weekStartDate: { gte: weekStart },
    },
  });
  const statusMap = new Map(bossStatuses.map(s => [s.bossId, s]));

  return bosses.map(boss => {
    const isUnlocked =
      player.tier >= boss.requiredTier &&
      player.level >= boss.requiredLevel &&
      (!boss.requiredWorld || player.currentWorld === boss.requiredWorld);

    const status = statusMap.get(boss.id);
    const weeklyAttempts = status?.weeklyAttempts ?? 0;
    const canChallenge = isUnlocked && weeklyAttempts < boss.weeklyAttemptLimit;

    return {
      id: boss.id,
      name: boss.name,
      icon: boss.icon,
      description: boss.description,
      level: boss.level,
      hp: boss.hp,
      isUnlocked,
      canChallenge,
      weeklyAttempts,
      weeklyAttemptLimit: boss.weeklyAttemptLimit,
      lastDefeat: status?.lastDefeat,
      rewards: {
        gold: boss.rewardGold,
        crystals: boss.rewardCrystals,
        exp: boss.rewardExp,
        cardRarity: boss.rewardChestRarity,
      },
      unlockCondition: {
        tier: boss.requiredTier || undefined,
        level: boss.requiredLevel,
        world: boss.requiredWorld ?? undefined,
      },
    };
  });
}

export async function challengeBoss(db: FullDbClient, userId: string, bossId: string) {
  const player = await db.player.findUnique({
    where: { userId },
    include: { characters: { include: { character: true } } },
  });

  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }

  const boss = await db.boss.findUnique({ where: { id: bossId } });
  if (!boss) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Boss不存在" });
  }

  // 检查解锁条件
  if (boss.requiredTier && player.tier < boss.requiredTier) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `需要达到${boss.requiredTier}阶` });
  }
  if (player.level < boss.requiredLevel) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `需要达到${boss.requiredLevel}级` });
  }

  // 检查本周挑战次数
  const weekStart = getWeekStartDate();
  let bossStatus = await db.bossStatus.findUnique({
    where: { playerId_bossId: { playerId: player.id, bossId } },
  });

  if (bossStatus && bossStatus.weekStartDate >= weekStart) {
    if (bossStatus.weeklyAttempts >= boss.weeklyAttemptLimit) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "本周挑战次数已用完" });
    }
  } else {
    if (bossStatus) {
      await db.bossStatus.update({
        where: { id: bossStatus.id },
        data: { weeklyAttempts: 0, weekStartDate: weekStart },
      });
      bossStatus.weeklyAttempts = 0;
    }
  }

  // 消耗体力
  const staminaCost = 30;
  if (player.stamina < staminaCost) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "体力不足" });
  }

  await db.player.update({
    where: { id: player.id },
    data: {
      stamina: { decrement: staminaCost },
      lastStaminaUpdate: new Date(),
    },
  });

  // 计算战斗力
  const playerPower = player.strength * 3 + player.agility * 2 + player.intellect * 2;
  const charactersPower = player.characters.reduce(
    (sum, c) => sum + c.attack + c.defense + c.speed,
    0
  );
  const totalPower = playerPower + charactersPower;
  const bossPower = boss.attack + boss.defense * 0.5 + boss.hp * 0.01;

  const powerRatio = totalPower / bossPower;
  const baseWinChance = Math.min(0.9, Math.max(0.1, powerRatio * 0.5));
  const victory = Math.random() < baseWinChance;

  // 更新挑战次数
  if (bossStatus) {
    await db.bossStatus.update({
      where: { id: bossStatus.id },
      data: {
        weeklyAttempts: (bossStatus.weeklyAttempts ?? 0) + 1,
        lastAttempt: new Date(),
        lastDefeat: victory ? new Date() : bossStatus.lastDefeat,
      },
    });
  } else {
    await db.bossStatus.create({
      data: {
        playerId: player.id,
        bossId,
        weeklyAttempts: 1,
        lastAttempt: new Date(),
        lastDefeat: victory ? new Date() : null,
        weekStartDate: weekStart,
      },
    });

    // First boss challenge - unlock boss system
    await db.unlockFlag.upsert({
      where: {
        playerId_flagName: {
          playerId: player.id,
          flagName: "boss_system",
        },
      },
      update: {},
      create: {
        playerId: player.id,
        flagName: "boss_system",
      },
    });
  }

  if (victory) {
    // 发放奖励
    await db.player.update({
      where: { id: player.id },
      data: {
        gold: { increment: boss.rewardGold },
        crystals: { increment: boss.rewardCrystals },
        exp: { increment: boss.rewardExp },
      },
    });

    await db.actionLog.create({
      data: {
        playerId: player.id,
        day: getCurrentGameDay(),
        type: "combat",
        description: `击败了Boss：${boss.name}`,
        baseScore: 50 * boss.level,
        bonus: 100,
        bonusReason: "Boss战胜利",
      },
    });

    // 宝箱掉落 (100% on victory)
    const chestName = `${boss.rewardChestRarity}宝箱`;
    let droppedChest = null;
    const chestCard = await db.card.findFirst({ where: { name: chestName, type: "chest" } });
    if (chestCard) {
      await db.playerCard.upsert({
        where: { playerId_cardId: { playerId: player.id, cardId: chestCard.id } },
        update: { quantity: { increment: 1 } },
        create: { playerId: player.id, cardId: chestCard.id, quantity: 1 },
      });
      droppedChest = { name: chestCard.name, rarity: chestCard.rarity, icon: chestCard.icon };
    }

    // 装备掉落 (100% on victory)
    const droppedEquipment = await grantRandomEquipment(db, player.id, boss.rewardEquipRarity);

    return {
      victory: true,
      bossName: boss.name,
      rewards: {
        gold: boss.rewardGold,
        crystals: boss.rewardCrystals,
        exp: boss.rewardExp,
        chest: droppedChest,
        equipment: droppedEquipment,
      },
      message: `击败了${boss.name}！`,
    };
  } else {
    return {
      victory: false,
      bossName: boss.name,
      message: `挑战${boss.name}失败，下次再来！`,
      remainingAttempts: boss.weeklyAttemptLimit - ((bossStatus?.weeklyAttempts ?? 0) + 1),
    };
  }
}

export async function getBossDetail(db: FullDbClient, bossId: string) {
  const boss = await db.boss.findUnique({ where: { id: bossId } });
  if (!boss) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Boss不存在" });
  }

  const skills = JSON.parse(boss.skills) as Array<{ name: string; damage: number; effect?: string }>;

  return {
    id: boss.id,
    name: boss.name,
    icon: boss.icon,
    description: boss.description,
    level: boss.level,
    hp: boss.hp,
    attack: boss.attack,
    defense: boss.defense,
    weeklyAttemptLimit: boss.weeklyAttemptLimit,
    skills: skills.map(s => ({
      name: s.name,
      description: s.effect ?? "普通攻击",
    })),
    rewards: {
      gold: boss.rewardGold,
      crystals: boss.rewardCrystals,
      exp: boss.rewardExp,
      cardRarity: boss.rewardChestRarity,
    },
    unlockCondition: {
      tier: boss.requiredTier || undefined,
      level: boss.requiredLevel,
      world: boss.requiredWorld ?? undefined,
    },
  };
}
```

**Step 2: Update boss router for getBossDetail**

In `src/server/api/routers/combat/boss.ts`, getBossDetail now needs `ctx.db`:

```typescript
  getDetail: protectedProcedure
    .input(z.object({ bossId: z.string() }))
    .query(({ ctx, input }) => {
      return bossService.getBossDetail(ctx.db, input.bossId);
    }),
```

**Step 3: Typecheck**

Run: `bun run typecheck`

**Step 4: Commit**

```bash
git add src/server/api/services/boss.service.ts src/server/api/routers/combat/boss.ts
git commit -m "refactor: rewrite boss service to use database instead of hardcoded array"
```

---

### Task 4: Final verification

**Step 1: Push schema**

Run: `bun prisma db push`

**Step 2: Run seed**

Run: `bun prisma db seed`

**Step 3: Full typecheck**

Run: `bun run typecheck`

**Step 4: Full test suite**

Run: `bun test`

**Step 5: Commit any remaining changes**

```bash
git add -A
git commit -m "feat: complete boss system database migration with 18 bosses"
```
