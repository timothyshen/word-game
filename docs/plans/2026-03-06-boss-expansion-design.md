# Boss System Database Migration & Expansion Design

## Goal

Move Boss definitions from hardcoded array to database, expand from 4 to 18 bosses across all 5 realms.

## Data Model

New `Boss` Prisma model replacing hardcoded `BOSSES` array in boss.service.ts.

Fields: name, icon, description, level, hp, attack, defense, skills (JSON), weeklyAttemptLimit, requiredTier, requiredLevel, requiredWorld, rewardGold, rewardCrystals, rewardExp, rewardChestRarity, rewardEquipRarity, sortOrder.

BossStatus.bossId becomes foreign key to Boss table. Existing BossStatus data cleared (old string IDs incompatible).

## Boss List (18 total)

### Main Realm (4)
- 哥布林王 Lv5, 山贼头目 Lv10, 石像鬼 Lv15, 森林巨蛛 Lv20

### Fire Realm (3)
- 熔岩巨人 Lv25, 炎龙 Lv30, 火焰领主 Lv35

### Ice Realm (3)
- 冰霜狼王 Lv28, 寒冰巨龙 Lv35, 冰霜女皇 Lv42

### Shadow Realm (3)
- 暗影刺客 Lv32, 亡灵巫师 Lv40, 暗影领主 Lv48

### Celestial Realm (3)
- 圣殿骑士 Lv45, 大天使 Lv52, 天界守护者 Lv60

### Hidden (2)
- 混沌之主 Lv70, 世界之蛇 Lv80

## Service Changes

- Delete hardcoded BOSSES array
- All boss lookups become DB queries
- Skills parsed from JSON string
- Reward fields used directly (no nested rewards object)
- BOSS_CHEST_MAP / BOSS_EQUIPMENT_RARITY removed — use boss.rewardChestRarity / boss.rewardEquipRarity directly

## Migration

- Clear BossStatus table
- Add Boss model with foreign key from BossStatus
- Seed 18 bosses
