# World Exploration System

The outer city is a grid-based world map where heroes explore, fight, and gather resources.

## Hero System

**File**: `src/server/api/services/worldHeroes.service.ts`

Heroes are character entities deployed to the outer world.

### HeroInstance Model

```typescript
{
  id: string,
  playerId: string,
  characterId: string,  // References character Entity
  positionX: number,
  positionY: number,
  status: "idle" | "moving" | "exploring" | "fighting",
  stamina: number       // 0-100
}
```

### Operations

| Action | Description |
|--------|-------------|
| Deploy | Create HeroInstance from character entity, position at (0,0) |
| Recall | Delete HeroInstance, character returns to inner city |
| Rest | Consume food, restore stamina (base 30 + city bonus) |

### Character Data Resolution

Since HeroInstance.characterId references Entity, character stats are resolved via:
```typescript
import { resolveHeroCharacter } from "../utils/hero-utils";
const { state, template } = await resolveHeroCharacter(db, entities, hero.characterId);
// state: CharacterEntityState (hp, attack, defense, speed, ...)
// template: { name, portrait }
```

## World Map

**File**: `src/server/api/services/worldMap.service.ts`

### Map State

Returns:
- `heroes` - All deployed HeroInstance records
- `exploredAreas` - Discovered tiles with exploration level
- `availableCharacters` - Character entities not yet deployed as heroes
- `pois` - Points of Interest on the map

### Movement

```
1. Hero must be "idle" status (not fighting)
2. Target must be adjacent (Manhattan distance = 1)
3. Consume hero stamina (5 per move)
4. Update hero position
5. Discover target tile (explorationLevel = 2)
6. Set adjacent tiles to fog (explorationLevel = 1)
7. Check for POI at target position
8. If no POI: chance of random event (50% new area, 30% explored)
```

### Exploration Levels

| Level | State | Meaning |
|-------|-------|---------|
| 0 | Hidden | Not yet seen |
| 1 | Fog | Adjacent to explored tile, no details |
| 2 | Visible | Fully explored, details visible |

## Points of Interest (POI)

**File**: `src/server/api/services/worldPoi.service.ts`

### POI Types

| Type | Interaction | Combat? |
|------|------------|---------|
| `resource` | Harvest resources directly | No |
| `garrison` | Guard post | Yes |
| `lair` | Monster den | Yes |
| `ruin` | Ancient ruin with treasure | Yes |
| `shrine` | Blessing/buff location | No |
| `caravan` | Trade encounter | No |

### POI Interaction Flow

```
Hero at POI position -> interactWithPOI()
  -> resource: Grant gold/wood/stone/food
  -> garrison/lair/ruin: Start combat (see combat.md)
  -> shrine: Stamina restore or stat buff
  -> caravan: Random trade (gold for other resources)
```

### Resource Harvesting

```typescript
// Resource POI
{
  resourceType: "wood" | "stone" | "food" | "gold",
  resourceAmount: 50,
  remainingUses: 3  // null = infinite
}
```

Each harvest costs hero stamina and grants `resourceAmount` of the resource type.

### Shrine Buffs

- `stamina` type: Restore hero stamina
- `attack` type: Permanently increase character attack via Entity state update

## Random Events

**File**: `src/server/api/services/worldEvents.service.ts`

Events triggered randomly when exploring new tiles.

### Event Generation

```typescript
function generateRandomEvent(areaLevel: number): ExplorationEvent
```

Area level is calculated from distance to origin: `max(1, floor(distance / 3))`

### Event Types & Weights

| Type | Weight | Description |
|------|--------|-------------|
| resource | 25 | Find harvestable materials |
| monster | 20 | Combat encounter |
| nothing | 20 | Empty area |
| merchant | 15 | NPC trader |
| treasure | 10 | Chest with loot |
| trap | 10 | Damage or dodge |

### Event Structure

```typescript
interface ExplorationEvent {
  type: string;
  title: string;
  description: string;
  icon: string;
  options: Array<{
    id: string;
    text: string;
    action: "collect" | "fight" | "flee" | "open" | "trade" |
            "take_damage" | "dodge" | "continue" | "leave";
  }>;
  rewards?: { gold?, wood?, stone?, food?, exp? };
  monster?: { name, hp, attack, defense, rewards };
}
```

### Choice Resolution

```typescript
handleChoice(db, entities, userId, { heroId, action, eventData })
```

| Action | Effect |
|--------|--------|
| `collect` | Grant event rewards to player |
| `fight` | Compare hero power vs monster -> win/lose |
| `flee` | 70% success, fail costs 10 stamina |
| `open` | Open treasure chest for gold |
| `take_damage` | Lose 15 hero stamina |
| `dodge` | 50% success, fail costs 10 stamina |
| `trade` | Spend gold for other resources |
| `continue`/`leave` | No effect, proceed |
