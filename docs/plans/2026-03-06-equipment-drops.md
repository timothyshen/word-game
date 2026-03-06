# Equipment Drop System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add equipment templates to seed data and implement equipment drops from combat and boss victories.

**Architecture:** Equipment templates are seeded into the existing Equipment table. A new `grantRandomEquipment` utility creates PlayerEquipment instances. Combat and Boss services call this on victory. Frontend shows drops in battle logs and reward displays.

**Tech Stack:** TypeScript, tRPC, Prisma, React

---

### Task 1: Add equipment templates to seed data

**Files:**
- Modify: `prisma/seed.ts`

**Step 1: Add equipment seed data**

After the professions section (around line 580), add equipment templates. Insert this block before the `// ===== 给测试玩家发放卡牌` section:

```typescript
  // ===== 装备模板 =====
  const equipments = [
    // === 主手 (mainHand) ===
    { name: "铁剑", slot: "mainHand", rarity: "普通", description: "普通的铁制长剑", icon: "🗡️", attackBonus: 8, defenseBonus: 0, speedBonus: 2, luckBonus: 0, hpBonus: 0, mpBonus: 0, requiredLevel: 1 },
    { name: "精钢长剑", slot: "mainHand", rarity: "精良", description: "精钢锻造的优质长剑", icon: "⚔️", attackBonus: 18, defenseBonus: 0, speedBonus: 5, luckBonus: 2, hpBonus: 0, mpBonus: 0, requiredLevel: 5 },
    { name: "寒冰之刃", slot: "mainHand", rarity: "稀有", description: "蕴含冰霜之力的魔法剑", icon: "🔷", attackBonus: 35, defenseBonus: 0, speedBonus: 8, luckBonus: 5, hpBonus: 0, mpBonus: 2, requiredLevel: 15 },
    { name: "炎龙牙", slot: "mainHand", rarity: "史诗", description: "以炎龙牙齿铸造的烈焰之剑", icon: "🔥", attackBonus: 65, defenseBonus: 5, speedBonus: 10, luckBonus: 8, hpBonus: 0, mpBonus: 12, requiredLevel: 30 },
    { name: "天界圣剑", slot: "mainHand", rarity: "传说", description: "天界守护者赐予的神圣之剑", icon: "✨", attackBonus: 130, defenseBonus: 15, speedBonus: 20, luckBonus: 15, hpBonus: 0, mpBonus: 20, requiredLevel: 50 },

    // === 副手 (offHand) ===
    { name: "木盾", slot: "offHand", rarity: "普通", description: "粗糙的木制盾牌", icon: "🛡️", attackBonus: 0, defenseBonus: 8, speedBonus: 0, luckBonus: 0, hpBonus: 2, mpBonus: 0, requiredLevel: 1 },
    { name: "铁盾", slot: "offHand", rarity: "精良", description: "坚固的铁制盾牌", icon: "🛡️", attackBonus: 0, defenseBonus: 18, speedBonus: 0, luckBonus: 2, hpBonus: 5, mpBonus: 0, requiredLevel: 5 },
    { name: "霜纹盾", slot: "offHand", rarity: "稀有", description: "刻有霜纹的魔法盾牌", icon: "❄️", attackBonus: 0, defenseBonus: 35, speedBonus: 2, luckBonus: 3, hpBonus: 10, mpBonus: 0, requiredLevel: 15 },
    { name: "暗影壁垒", slot: "offHand", rarity: "史诗", description: "暗影之力凝聚的壁垒之盾", icon: "🌑", attackBonus: 5, defenseBonus: 60, speedBonus: 5, luckBonus: 8, hpBonus: 22, mpBonus: 0, requiredLevel: 30 },
    { name: "天使之翼盾", slot: "offHand", rarity: "传说", description: "天使羽翼化为的神盾", icon: "👼", attackBonus: 10, defenseBonus: 120, speedBonus: 15, luckBonus: 15, hpBonus: 40, mpBonus: 0, requiredLevel: 50 },

    // === 头盔 (helmet) ===
    { name: "皮帽", slot: "helmet", rarity: "普通", description: "简易的皮革帽", icon: "🧢", attackBonus: 0, defenseBonus: 5, speedBonus: 0, luckBonus: 2, hpBonus: 3, mpBonus: 0, requiredLevel: 1 },
    { name: "铁盔", slot: "helmet", rarity: "精良", description: "铁制战斗头盔", icon: "⛑️", attackBonus: 0, defenseBonus: 12, speedBonus: 0, luckBonus: 3, hpBonus: 10, mpBonus: 0, requiredLevel: 5 },
    { name: "秘银头冠", slot: "helmet", rarity: "稀有", description: "秘银锻造的华丽头冠", icon: "👑", attackBonus: 5, defenseBonus: 20, speedBonus: 5, luckBonus: 5, hpBonus: 15, mpBonus: 0, requiredLevel: 15 },
    { name: "龙骨战盔", slot: "helmet", rarity: "史诗", description: "龙骨制成的威严战盔", icon: "🐲", attackBonus: 10, defenseBonus: 40, speedBonus: 8, luckBonus: 10, hpBonus: 32, mpBonus: 0, requiredLevel: 30 },
    { name: "圣光王冠", slot: "helmet", rarity: "传说", description: "散发圣光的王者之冠", icon: "💫", attackBonus: 20, defenseBonus: 80, speedBonus: 15, luckBonus: 20, hpBonus: 65, mpBonus: 0, requiredLevel: 50 },

    // === 胸甲 (chest) ===
    { name: "皮甲", slot: "chest", rarity: "普通", description: "基础的皮革护甲", icon: "🎽", attackBonus: 0, defenseBonus: 7, speedBonus: 0, luckBonus: 0, hpBonus: 3, mpBonus: 0, requiredLevel: 1 },
    { name: "锁子甲", slot: "chest", rarity: "精良", description: "精密的锁子铠甲", icon: "🦺", attackBonus: 0, defenseBonus: 16, speedBonus: 0, luckBonus: 2, hpBonus: 7, mpBonus: 0, requiredLevel: 5 },
    { name: "精灵铠甲", slot: "chest", rarity: "稀有", description: "精灵工匠打造的轻盈铠甲", icon: "🧥", attackBonus: 5, defenseBonus: 25, speedBonus: 8, luckBonus: 4, hpBonus: 8, mpBonus: 0, requiredLevel: 15 },
    { name: "暗影胸甲", slot: "chest", rarity: "史诗", description: "暗影之力加持的战甲", icon: "🌑", attackBonus: 10, defenseBonus: 48, speedBonus: 10, luckBonus: 8, hpBonus: 24, mpBonus: 0, requiredLevel: 30 },
    { name: "神圣战甲", slot: "chest", rarity: "传说", description: "神圣力量铸就的最强战甲", icon: "⚜️", attackBonus: 20, defenseBonus: 100, speedBonus: 20, luckBonus: 15, hpBonus: 45, mpBonus: 0, requiredLevel: 50 },

    // === 腰带 (belt) ===
    { name: "布带", slot: "belt", rarity: "普通", description: "普通的布腰带", icon: "🎗️", attackBonus: 0, defenseBonus: 3, speedBonus: 2, luckBonus: 0, hpBonus: 2, mpBonus: 3, requiredLevel: 1 },
    { name: "皮腰带", slot: "belt", rarity: "精良", description: "结实的皮质腰带", icon: "🎗️", attackBonus: 2, defenseBonus: 8, speedBonus: 3, luckBonus: 2, hpBonus: 5, mpBonus: 5, requiredLevel: 5 },
    { name: "力量腰封", slot: "belt", rarity: "稀有", description: "蕴含力量的魔法腰封", icon: "💪", attackBonus: 8, defenseBonus: 12, speedBonus: 5, luckBonus: 5, hpBonus: 10, mpBonus: 10, requiredLevel: 15 },
    { name: "龙鳞腰带", slot: "belt", rarity: "史诗", description: "龙鳞编织的坚韧腰带", icon: "🐉", attackBonus: 15, defenseBonus: 25, speedBonus: 10, luckBonus: 10, hpBonus: 20, mpBonus: 20, requiredLevel: 30 },
    { name: "天命腰封", slot: "belt", rarity: "传说", description: "承载天命之力的腰封", icon: "🌟", attackBonus: 30, defenseBonus: 50, speedBonus: 20, luckBonus: 20, hpBonus: 40, mpBonus: 40, requiredLevel: 50 },

    // === 手套 (gloves) ===
    { name: "布手套", slot: "gloves", rarity: "普通", description: "简单的布手套", icon: "🧤", attackBonus: 3, defenseBonus: 2, speedBonus: 3, luckBonus: 2, hpBonus: 0, mpBonus: 0, requiredLevel: 1 },
    { name: "皮手套", slot: "gloves", rarity: "精良", description: "灵活的皮手套", icon: "🧤", attackBonus: 8, defenseBonus: 5, speedBonus: 5, luckBonus: 4, hpBonus: 0, mpBonus: 3, requiredLevel: 5 },
    { name: "敏捷护手", slot: "gloves", rarity: "稀有", description: "提升敏捷的魔法护手", icon: "✋", attackBonus: 12, defenseBonus: 8, speedBonus: 15, luckBonus: 5, hpBonus: 0, mpBonus: 10, requiredLevel: 15 },
    { name: "炎魔手套", slot: "gloves", rarity: "史诗", description: "炎魔之力注入的手套", icon: "🔥", attackBonus: 25, defenseBonus: 15, speedBonus: 20, luckBonus: 10, hpBonus: 10, mpBonus: 20, requiredLevel: 30 },
    { name: "神力护腕", slot: "gloves", rarity: "传说", description: "蕴含神力的护腕", icon: "💎", attackBonus: 50, defenseBonus: 30, speedBonus: 40, luckBonus: 20, hpBonus: 20, mpBonus: 40, requiredLevel: 50 },

    // === 腿甲 (pants) ===
    { name: "布裤", slot: "pants", rarity: "普通", description: "普通的布裤", icon: "👖", attackBonus: 0, defenseBonus: 5, speedBonus: 2, luckBonus: 0, hpBonus: 3, mpBonus: 0, requiredLevel: 1 },
    { name: "皮腿甲", slot: "pants", rarity: "精良", description: "皮革腿部护甲", icon: "👖", attackBonus: 0, defenseBonus: 12, speedBonus: 3, luckBonus: 2, hpBonus: 8, mpBonus: 0, requiredLevel: 5 },
    { name: "铁胫甲", slot: "pants", rarity: "稀有", description: "铁制腿部重甲", icon: "🦿", attackBonus: 3, defenseBonus: 22, speedBonus: 5, luckBonus: 5, hpBonus: 15, mpBonus: 0, requiredLevel: 15 },
    { name: "暗影腿甲", slot: "pants", rarity: "史诗", description: "暗影之力附着的腿甲", icon: "🌑", attackBonus: 8, defenseBonus: 42, speedBonus: 12, luckBonus: 10, hpBonus: 28, mpBonus: 0, requiredLevel: 30 },
    { name: "天使护腿", slot: "pants", rarity: "传说", description: "天使守护的神圣腿甲", icon: "👼", attackBonus: 15, defenseBonus: 85, speedBonus: 25, luckBonus: 20, hpBonus: 55, mpBonus: 0, requiredLevel: 50 },

    // === 鞋子 (boots) ===
    { name: "草鞋", slot: "boots", rarity: "普通", description: "简陋的草编鞋", icon: "👟", attackBonus: 0, defenseBonus: 2, speedBonus: 5, luckBonus: 0, hpBonus: 0, mpBonus: 3, requiredLevel: 1 },
    { name: "皮靴", slot: "boots", rarity: "精良", description: "结实的皮靴", icon: "👢", attackBonus: 0, defenseBonus: 5, speedBonus: 12, luckBonus: 3, hpBonus: 0, mpBonus: 5, requiredLevel: 5 },
    { name: "疾风靴", slot: "boots", rarity: "稀有", description: "附有疾风之力的靴子", icon: "💨", attackBonus: 3, defenseBonus: 8, speedBonus: 25, luckBonus: 5, hpBonus: 5, mpBonus: 4, requiredLevel: 15 },
    { name: "暗影之靴", slot: "boots", rarity: "史诗", description: "暗影中无声行走的靴子", icon: "🌑", attackBonus: 8, defenseBonus: 15, speedBonus: 45, luckBonus: 12, hpBonus: 10, mpBonus: 10, requiredLevel: 30 },
    { name: "天行者之靴", slot: "boots", rarity: "传说", description: "行走于天地间的神靴", icon: "⚡", attackBonus: 15, defenseBonus: 30, speedBonus: 90, luckBonus: 25, hpBonus: 20, mpBonus: 20, requiredLevel: 50 },

    // === 项链 (necklace) ===
    { name: "铜坠", slot: "necklace", rarity: "普通", description: "简单的铜质坠子", icon: "📿", attackBonus: 2, defenseBonus: 0, speedBonus: 0, luckBonus: 3, hpBonus: 0, mpBonus: 5, requiredLevel: 1 },
    { name: "银链", slot: "necklace", rarity: "精良", description: "精致的银制项链", icon: "📿", attackBonus: 5, defenseBonus: 2, speedBonus: 2, luckBonus: 5, hpBonus: 3, mpBonus: 8, requiredLevel: 5 },
    { name: "智慧吊坠", slot: "necklace", rarity: "稀有", description: "增强智慧的魔法吊坠", icon: "🔮", attackBonus: 8, defenseBonus: 5, speedBonus: 5, luckBonus: 8, hpBonus: 8, mpBonus: 16, requiredLevel: 15 },
    { name: "龙心项链", slot: "necklace", rarity: "史诗", description: "龙心宝石镶嵌的项链", icon: "💠", attackBonus: 18, defenseBonus: 10, speedBonus: 10, luckBonus: 12, hpBonus: 18, mpBonus: 32, requiredLevel: 30 },
    { name: "天命项链", slot: "necklace", rarity: "传说", description: "承载天命的神圣项链", icon: "🌟", attackBonus: 35, defenseBonus: 20, speedBonus: 20, luckBonus: 25, hpBonus: 35, mpBonus: 65, requiredLevel: 50 },

    // === 戒指 (ring) — slot is "ring" for both ring1/ring2 ===
    { name: "铜戒", slot: "ring", rarity: "普通", description: "朴素的铜戒指", icon: "💍", attackBonus: 2, defenseBonus: 2, speedBonus: 2, luckBonus: 2, hpBonus: 0, mpBonus: 2, requiredLevel: 1 },
    { name: "银戒", slot: "ring", rarity: "精良", description: "精致的银戒指", icon: "💍", attackBonus: 5, defenseBonus: 4, speedBonus: 4, luckBonus: 4, hpBonus: 3, mpBonus: 5, requiredLevel: 5 },
    { name: "力量指环", slot: "ring", rarity: "稀有", description: "增幅力量的魔法指环", icon: "💎", attackBonus: 15, defenseBonus: 8, speedBonus: 5, luckBonus: 6, hpBonus: 8, mpBonus: 8, requiredLevel: 15 },
    { name: "暗影戒指", slot: "ring", rarity: "史诗", description: "暗影之力凝聚的戒指", icon: "🖤", attackBonus: 25, defenseBonus: 15, speedBonus: 12, luckBonus: 15, hpBonus: 15, mpBonus: 18, requiredLevel: 30 },
    { name: "天使指环", slot: "ring", rarity: "传说", description: "天使赐予的神圣指环", icon: "👼", attackBonus: 50, defenseBonus: 30, speedBonus: 25, luckBonus: 30, hpBonus: 30, mpBonus: 35, requiredLevel: 50 },
  ];

  for (const equip of equipments) {
    const existing = await prisma.equipment.findFirst({ where: { name: equip.name } });
    if (!existing) {
      await prisma.equipment.create({ data: equip });
    }
  }
  console.log(`Created ${equipments.length} equipment templates`);
```

Note: Ring uses slot "ring" — when equipping, the equipment system maps it to ring1/ring2.

**Step 2: Run seed**

Run: `bun prisma db seed`

**Step 3: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: add 50 equipment templates to seed data"
```

---

### Task 2: Add equipment drop utility function

**Files:**
- Create: `src/server/api/utils/equipment-utils.ts`

**Step 1: Create equipment drop utilities**

Create `src/server/api/utils/equipment-utils.ts`:

```typescript
import type { PrismaClient } from "@prisma/client";

export interface EquipmentDropResult {
  id: string;
  name: string;
  slot: string;
  rarity: string;
  icon: string;
  description: string;
}

/**
 * Get equipment drop chance and rarity pool based on monster level.
 */
export function getEquipmentDropTable(monsterLevel: number): {
  chance: number;
  pool: Record<string, number>;
} {
  if (monsterLevel >= 36) return { chance: 0.20, pool: { "稀有": 40, "史诗": 40, "传说": 20 } };
  if (monsterLevel >= 21) return { chance: 0.18, pool: { "精良": 40, "稀有": 40, "史诗": 20 } };
  if (monsterLevel >= 11) return { chance: 0.15, pool: { "普通": 40, "精良": 40, "稀有": 20 } };
  if (monsterLevel >= 6)  return { chance: 0.12, pool: { "普通": 70, "精良": 30 } };
  return { chance: 0.08, pool: { "普通": 100 } };
}

/**
 * Roll a rarity from a weighted pool.
 */
function rollRarity(pool: Record<string, number>): string {
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
 * Grant a random equipment of the given rarity to a player.
 * Creates a new PlayerEquipment instance (unequipped).
 * Returns equipment info if granted, null if no equipment of that rarity exists.
 */
export async function grantRandomEquipment(
  db: PrismaClient,
  playerId: string,
  rarity: string,
): Promise<EquipmentDropResult | null> {
  const templates = await db.equipment.findMany({ where: { rarity } });
  if (templates.length === 0) return null;

  const template = templates[Math.floor(Math.random() * templates.length)]!;

  await db.playerEquipment.create({
    data: { playerId, equipmentId: template.id },
  });

  return {
    id: template.id,
    name: template.name,
    slot: template.slot,
    rarity: template.rarity,
    icon: template.icon,
    description: template.description,
  };
}
```

**Step 2: Export from utils index**

In `src/server/api/utils/index.ts`, add:

```typescript
export * from "./equipment-utils";
```

**Step 3: Typecheck**

Run: `bun run typecheck`

**Step 4: Commit**

```bash
git add src/server/api/utils/equipment-utils.ts src/server/api/utils/index.ts
git commit -m "feat: add equipment drop utility with level-based rarity pools"
```

---

### Task 3: Add equipment drops to normal combat

**Files:**
- Modify: `src/server/api/services/combat.service.ts`

**Step 1: Add equipment drop after card drop in victory block**

In `src/server/api/services/combat.service.ts`, add import at top:

```typescript
import { grantRandomEquipment, getEquipmentDropTable } from "../utils/equipment-utils";
```

After the card drop block (around line 537, after the `if (Math.random() < rewards.cardChance)` block), add:

```typescript
    // Equipment drop
    const equipDrop = getEquipmentDropTable(monster.level);
    let droppedEquipment = null;
    if (Math.random() < equipDrop.chance) {
      const rarity = rollRarity(equipDrop.pool);
      droppedEquipment = await grantRandomEquipment(db, player.id, rarity);
      if (droppedEquipment) {
        newLogs.push(`⚔️ 获得装备：${droppedEquipment.name}（${droppedEquipment.rarity}）`);
      }
    }
```

Also import `rollRarity` from card-utils (it's already exported there) or use the local one in equipment-utils. Since `rollRarity` is already in `card-utils.ts`, import from there:

```typescript
import { grantRandomCard } from "../utils/card-utils";
// Change to:
import { grantRandomCard, rollRarity } from "../utils/card-utils";
```

And use it in the equipment drop block.

**Step 2: Typecheck**

Run: `bun run typecheck`

**Step 3: Commit**

```bash
git add src/server/api/services/combat.service.ts
git commit -m "feat: add equipment drops to normal combat victories"
```

---

### Task 4: Add equipment drops to boss victories

**Files:**
- Modify: `src/server/api/services/boss.service.ts`

**Step 1: Add equipment drop after chest drop in victory block**

In `src/server/api/services/boss.service.ts`, add import:

```typescript
import { grantRandomEquipment } from "../utils/equipment-utils";
```

Add boss rarity → equipment rarity mapping (reuse existing `BOSS_CHEST_MAP` pattern):

```typescript
const BOSS_EQUIPMENT_RARITY: Record<string, string> = {
  "精良": "精良",
  "稀有": "稀有",
  "史诗": "史诗",
  "传说": "传说",
};
```

After the chest drop block (around line 321), add:

```typescript
    // 装备掉落 (100% on victory)
    let droppedEquipment = null;
    const equipRarity = BOSS_EQUIPMENT_RARITY[rewards.cardRarity];
    if (equipRarity) {
      droppedEquipment = await grantRandomEquipment(db, player.id, equipRarity);
    }
```

Update the return statement to include `equipment`:

```typescript
    return {
      victory: true,
      bossName: boss.name,
      rewards: {
        gold: rewards.gold,
        crystals: rewards.crystals,
        exp: rewards.exp,
        chest: droppedChest,
        equipment: droppedEquipment,
      },
      message: `击败了${boss.name}！`,
    };
```

**Step 2: Typecheck**

Run: `bun run typecheck`

**Step 3: Commit**

```bash
git add src/server/api/services/boss.service.ts
git commit -m "feat: boss victory now drops equipment (100%)"
```

---

### Task 5: Update BossPanel to show equipment reward

**Files:**
- Modify: `src/components/game/panels/BossPanel.tsx`

**Step 1: Update battleResult type**

Change the `battleResult` state type to include equipment:

```typescript
  const [battleResult, setBattleResult] = useState<{
    victory: boolean;
    message: string;
    rewards?: {
      gold: number;
      crystals: number;
      exp: number;
      chest?: { name: string; rarity: string; icon: string } | null;
      equipment?: { name: string; rarity: string; icon: string } | null;
    };
  } | null>(null);
```

**Step 2: Add equipment display in rewards**

After the chest display line, add:

```tsx
                {battleResult.rewards.equipment && (
                  <span className="text-[#e67e22]">⚔️ {battleResult.rewards.equipment.name}</span>
                )}
```

**Step 3: Typecheck**

Run: `bun run typecheck`

**Step 4: Commit**

```bash
git add src/components/game/panels/BossPanel.tsx
git commit -m "feat: show equipment drop in boss battle results"
```

---

### Task 6: Final verification

**Step 1: Run seed**

Run: `bun prisma db seed`

**Step 2: Full typecheck**

Run: `bun run typecheck`

**Step 3: Full test suite**

Run: `bun test`

**Step 4: Commit any remaining changes**

```bash
git add -A
git commit -m "feat: complete equipment drop system"
```
