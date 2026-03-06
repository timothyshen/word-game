# Treasure Chest System Design

## Goal

Add a treasure chest system where chests are special cards (type=chest) stored in backpack. Opening a chest draws multiple cards based on chest rarity. Chests drop from Boss defeats, exploration events, and daily settlement.

## Data Model

No new DB tables. Chests are Card templates with `type = "chest"`. Stored as PlayerCard in backpack.

### Chest Types

| Chest | Rarity | Cards Drawn | Pool Weights |
|-------|--------|-------------|-------------|
| 普通宝箱 | 普通 | 1 | 70% 普通, 20% 精良, 10% 稀有 |
| 精良宝箱 | 精良 | 2 | 40% 精良, 40% 稀有, 20% 史诗 |
| 稀有宝箱 | 稀有 | 3 | 30% 精良, 40% 稀有, 25% 史诗, 5% 传说 |
| 史诗宝箱 | 史诗 | 4 | 20% 稀有, 40% 史诗, 40% 传说 |
| 传说宝箱 | 传说 | 5 | 30% 史诗, 70% 传说 |

## Drop Sources

### Boss Defeat (100% drop)
- 哥布林王 (Lv10) → 精良宝箱
- 炎龙 (Lv25) → 稀有宝箱
- 暗影领主 (Lv40) → 史诗宝箱
- 天界守护者 (Lv60) → 传说宝箱

### Exploration Events
- Extend existing event reward system to include chest drops
- Typically 普通/精良, rare events may drop 稀有

### Daily Settlement
- D grade: no chest
- C grade (200+): 1× 普通宝箱
- B grade (300+): 1× 精良宝箱
- A grade (400+): 1× 稀有宝箱
- S grade (500+): 1× 史诗宝箱

## Interaction Flow

1. Player sees chest cards in backpack
2. Click chest → "使用" button → opens chest
3. Backend: consume chest card, roll N cards from rarity pool, grant to player
4. Frontend: show result popup with drawn cards list + rarity colors
5. Reuse existing card.useCard flow with type=chest branch

## Implementation Notes

- Add 5 chest Card templates to seed data
- Add `useChestCard` function in card.service.ts
- Modify boss.service.ts to grant chest card on victory
- Modify settlement.service.ts to include chest in rewards
- Exploration chest drops via existing event reward system
- Frontend: add chest result display in backpack panel's card-use flow
