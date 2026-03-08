# Territory & Building System

Two territory systems: inner city (building placement) and outer city (tile unlocking).

## Inner City

**File**: `src/server/api/services/innerCity.service.ts`

Players place buildings in a rounded-rectangle territory with collision detection.

### Territory Configuration

```typescript
// InnerCityConfig model
{
  territoryWidth: 4.0,   // Half-width from center
  territoryHeight: 4.0,  // Half-height from center
  cornerRadius: 1.5      // Rounded corner radius
}
// Dimensions come from ruleService.getConfig("innercity_initial_territory")
```

### Building Placement

1. Check building card exists and is a building type
2. Verify position is within territory bounds (rounded-rect check)
3. Check collision with existing buildings (radius-based)
4. Create `InnerCityBuilding` record
5. Consume the card entity
6. Emit `territory:build` event

**Collision detection**: `src/shared/building-radius.ts`
```typescript
getBuildingSize(name, level)  // Returns { radius, visualW, visualH, height }
canPlaceBuilding(building, territory, existingBuildings)  // Boolean
```

### Territory Expansion

Players can expand territory dimensions using expansion cards:
- Multipliers from `ruleService.getConfig("innercity_expand_multipliers")`
- Width and height increase by multiplier

### Building Upgrade

- Cost from `ruleService.getConfig("innercity_upgrade_base_cost")` scaled by level
- Increments building level

### Demolish

- Refund percentage from `ruleService.getConfig("innercity_demolish_refund")`
- Removes `InnerCityBuilding` record

### Build Score

Score awarded per placement from `ruleService.getConfig("innercity_build_score")`, recorded in `ActionLog` for daily settlement.

## Outer Territory

**File**: `src/server/api/services/territory.service.ts`

Grid-based territory tiles that players unlock through exploration.

### Tile Model

```typescript
// TerritoryTile
{
  playerId, positionX, positionY,
  terrain: "grass" | "dirt" | "water" | "road",
  unlocked: boolean,
  unlockedAt?: DateTime,
  unlockCost?: string  // JSON: {gold, wood, stone}
}
```

### Unlock Mechanics

- Must be adjacent to an already-unlocked tile (or center 0,0)
- Cost scales with distance and total unlocked count:

```typescript
distance = abs(x) + abs(y)
distanceMultiplier = 1 + distance * 0.3
countMultiplier = 1 + floor(unlockedCount / 5) * 0.2
cost = baseCost * distanceMultiplier * countMultiplier
```

## Building System

**File**: `src/server/api/services/building.service.ts`

Manages building entities (stored in Entity system) and resource production.

### Production Calculation

```
output = baseOutput * levelMultiplier * workerBonus

levelMultiplier = 1 + (level - 1) * 0.3
workerBonus = hasWorker ? 1.5 : 1.0
```

Buildings define production in their template `baseEffects` JSON:
```json
{
  "production": { "gold": 10, "wood": 5, "stone": 3 },
  "slot": "production"
}
```

### Worker Assignment

Characters can be assigned to buildings to boost output by 50%. The character entity's `workingAt` state is updated, and the building entity's `assignedCharId` state tracks the assigned character.
