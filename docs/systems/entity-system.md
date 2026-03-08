# Entity System (ECS)

The Entity System implements a lightweight ECS pattern backed by Prisma/SQLite. All player-owned instances (characters, cards, buildings, equipment) are stored as Entity records with JSON state.

**Location**: `src/engine/entity/`

## Three-Tier Hierarchy

```
EntitySchema (blueprint)
    |-- defines components and defaults
    v
EntityTemplate (configuration)
    |-- inherits schema, pre-configured data
    v
Entity (instance)
    |-- owned by player, runtime JSON state
```

### Schema

Defines which components an entity type supports and their default values.

```typescript
// Example: "character" schema
{
  name: "character",
  components: ["stats"],
  defaults: { stats: { hp: 100, atk: 10, def: 5 } }
}
```

### Template

A concrete configuration inheriting from a schema. Multiple templates can share one schema.

```typescript
// Example: "generic-character" template
{
  schemaId: "...",
  name: "generic-character",
  data: { characterId: "", level: 1, exp: 0, ... },
  icon: "",
  rarity: null
}
```

### Entity

A runtime instance owned by a player. State is stored as a JSON string merging schema defaults + template data + instance overrides.

```typescript
{
  id: "cuid...",
  templateId: "...",
  ownerId: "player-id",
  state: '{"characterId":"...","level":3,"hp":80,"attack":15,...}'
}
```

## EntityManager API

**File**: `src/engine/entity/EntityManager.ts`

```typescript
// Schema operations
createSchema(gameId, name, components, defaults?)
getSchema(gameId, name)

// Template operations
createTemplate(schemaId, name, data, options?)
getTemplateBySchemaAndName(schemaId, name)
getEntitiesByTemplate(templateId)

// Entity CRUD
createEntity(templateId, ownerId, initialState?)
getEntity(entityId)
updateEntityState(entityId, partialState)
deleteEntity(entityId)

// Query operations
getEntitiesByOwner(ownerId)
getEntitiesByOwnerAndSchema(ownerId, schemaName)
findEntityByOwnerAndTemplate(ownerId, templateId)
queryEntitiesByState(ownerId, schemaName, stateFilter)

// Batch operations
createManyEntities(entries[])
deleteManyEntities(entityIds[])
```

## Component System

**File**: `src/engine/entity/components.ts`

| Component | Purpose | Key Fields |
|-----------|---------|------------|
| `stats` | Combat/RPG stats | hp, maxHp, mp, maxMp, atk, def, spd, luck |
| `inventory` | Item storage | items[], capacity |
| `position` | World location | x, y, worldId |
| `production` | Resource generation | output (map), interval |
| `equipment` | Gear slots | slots (name -> equipmentId) |
| `skills` | Ability slots | equipped[], maxSlots |

**Helpers**:
```typescript
getComponent(state, name)    // Extract component from state
setComponent(state, name, v) // Update component, returns new state
hasComponent(state, name)    // Check if component exists
serializeState(state)        // Convert to JSON string
```

## Character Entity State

Characters use a flat state structure (not nested components):

```typescript
interface CharacterEntityState {
  characterId: string;  // References Character template model
  level: number;
  exp: number;
  maxLevel: number;
  tier: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  speed: number;
  luck: number;
  status: string;       // idle/working/exploring/injured
  workingAt: string | null;
}
```

**Utilities**: `src/server/api/utils/character-utils.ts`
- `parseCharacterState(entity)` - Parse JSON state to typed object
- `getCharacterTemplateId(db, entities)` - Find/create the generic-character template

## FK Relations

Junction tables that reference Entity:
- `CharacterSkill.playerCharacterId` -> `Entity.id`
- `CharacterProfession.playerCharacterId` -> `Entity.id`
- `HeroInstance.characterId` -> `Entity.id`
