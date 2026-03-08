# Card & Altar System

Cards are the primary progression mechanic. Players acquire cards through gacha (altars), exploration rewards, and settlements, then use them to recruit characters, construct buildings, learn skills, or consume for resources.

## Card System

**File**: `src/server/api/services/card.service.ts`

### Card Types

| Type | Effect | Example |
|------|--------|---------|
| `recruit` | Recruit a character | Creates character Entity |
| `building` | Place a building | Creates InnerCityBuilding |
| `skill` | Learn a skill | Creates CharacterSkill record |
| `enhance` | Buff stats | Temporary or permanent stat boost |
| `item` | Consumable item | Grant resources, open chest |

### Card Entity State

Cards are stored as Entity records:
```typescript
{ quantity: number }  // How many of this card the player owns
```

One Entity per (player, card template) pair. Quantity tracks count.

### Card Operations

- **Add card**: Find existing entity -> increment quantity, or create new entity
- **Consume card**: Decrement quantity -> delete entity if quantity reaches 0
- **Use card**: Dispatch to type-specific handler, then consume

### Type-Specific Handlers

**Recruit card**: Creates a character Entity with stats from the Character template.

**Building card**: Creates an InnerCityBuilding at specified position (caller provides coordinates).

**Skill card**: Adds a CharacterSkill junction record linking character Entity to Skill.

**Item card**: Grants resources (gold, wood, stone, food, crystals) or opens a chest with random rewards.

## Altar System

**File**: `src/server/api/services/altar.service.ts`

Gacha/summoning system where players discover altars in the wilderness, defeat guardians, and collect cards.

### Altar Types

| Type | Guardian | Rarity Weights |
|------|----------|---------------|
| Basic | Lvl 5, 100 HP | Common 60%, Fine 30%, Rare 10% |
| Sacred | Lvl 15, 300 HP | Common 30%, Fine 40%, Rare 25%, Epic 5% |
| Ancient | Lvl 30, 800 HP | Fine 30%, Rare 40%, Epic 25%, Legendary 5% |

Weights are loaded from rules: `altar_basic_weights`, `altar_sacred_weights`, `altar_ancient_weights`.

### Guardian Challenge Flow

```
1. Verify altar exists and guardian not yet defeated
2. Check stamina (from ruleService.getConfig("altar_stamina_cost"))
3. Consume stamina
4. Calculate power:
   playerPower = strength*3 + agility*2 + intellect*2
   charactersPower = sum(attack + defense + speed) from Entity system
5. Win chance from ruleService.getFormula("altar_victory_formula")
6. On victory: mark altar defeated, roll card rarity from weights
7. On defeat: just lose stamina
```

### Daily Collection

After defeating an altar guardian, players can collect one card per day from that altar. The card rarity is rolled using the altar's weighted random distribution.

### Card Rarity Colors

| Rarity | Color | Chinese |
|--------|-------|---------|
| Common | `#888` | 普通 |
| Fine | `#4a9` | 精良 |
| Rare | `#59b` | 稀有 |
| Epic | `#e67e22` | 史诗 |
| Legendary | `#c9a227` | 传说 |
