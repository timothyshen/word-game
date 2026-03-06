# Equipment Drop System Design

## Goal

Add equipment templates to seed data and implement equipment drops from combat/boss victories, making the equipment system functional.

## Data Model

No new DB tables. Equipment model already exists with 11 slots, rarity tiers, stat bonuses, enhancement levels. PlayerEquipment stores player-owned equipment instances.

### Equipment Templates (~50 items)

10 slots (ring shared) x 5 rarities = 50 templates.

| Slot | 普通 | 精良 | 稀有 | 史诗 | 传说 |
|------|------|------|------|------|------|
| 主手 | 铁剑 | 精钢长剑 | 寒冰之刃 | 炎龙牙 | 天界圣剑 |
| 副手 | 木盾 | 铁盾 | 霜纹盾 | 暗影壁垒 | 天使之翼盾 |
| 头盔 | 皮帽 | 铁盔 | 秘银头冠 | 龙骨战盔 | 圣光王冠 |
| 胸甲 | 皮甲 | 锁子甲 | 精灵铠甲 | 暗影胸甲 | 神圣战甲 |
| 腰带 | 布带 | 皮腰带 | 力量腰封 | 龙鳞腰带 | 天命腰封 |
| 手套 | 布手套 | 皮手套 | 敏捷护手 | 炎魔手套 | 神力护腕 |
| 腿甲 | 布裤 | 皮腿甲 | 铁胫甲 | 暗影腿甲 | 天使护腿 |
| 鞋子 | 草鞋 | 皮靴 | 疾风靴 | 暗影之靴 | 天行者之靴 |
| 项链 | 铜坠 | 银链 | 智慧吊坠 | 龙心项链 | 天命项链 |
| 戒指 | 铜戒 | 银戒 | 力量指环 | 暗影戒指 | 天使指环 |

**Stat budget**: 普通 5-10, 精良 15-25, 稀有 30-50, 史诗 60-100, 传说 120-200

**Level requirements**: 普通 Lv1, 精良 Lv5, 稀有 Lv15, 史诗 Lv30, 传说 Lv50

## Drop Rules

### Normal Combat

| Monster Level | Drop Chance | Rarity Pool |
|--------------|-------------|-------------|
| 1-5 | 8% | 100% 普通 |
| 6-10 | 12% | 70% 普通, 30% 精良 |
| 11-20 | 15% | 40% 普通, 40% 精良, 20% 稀有 |
| 21-35 | 18% | 40% 精良, 40% 稀有, 20% 史诗 |
| 36+ | 20% | 40% 稀有, 40% 史诗, 20% 传说 |

Slot is random. Equipment template is random within the rolled rarity.

### Boss Drops (100%)

| Boss | Equipment Rarity |
|------|-----------------|
| 哥布林王 (Lv10) | 精良 |
| 炎龙 (Lv25) | 稀有 |
| 暗影领主 (Lv40) | 史诗 |
| 天界守护者 (Lv60) | 传说 |

Boss always drops one equipment in addition to the chest.

## Implementation

- Add ~50 equipment templates to `prisma/seed.ts`
- Create `grantRandomEquipment(db, playerId, rarity)` in a new `equipment-utils.ts`
- Add equipment drop logic to `combat.service.ts` victory rewards
- Add equipment drop to `boss.service.ts` victory rewards
- Update BossPanel to show equipment in rewards
- Update CombatPanel battle log to show equipment drops
