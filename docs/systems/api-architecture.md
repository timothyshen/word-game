# API Architecture

Three-layer tRPC architecture: Routers -> Services -> Repositories.

## Context

Every tRPC procedure receives:

```typescript
{
  session: { user: { id, name, email }, expires } | null,
  db: PrismaClient,
  engine: GameEngine,      // EventBus, formulas, rules, entities, modules, state
  ruleService: GameRuleService
}
```

Session is read from `dev-session` cookie (7-day expiry). `protectedProcedure` enforces authentication.

## Router Layer

**Location**: `src/server/api/routers/`

Routers are grouped by domain:

```
routers/
├── core/           auth, player, settlement
├── combat/         combat, boss
├── economy/        altar, building, equipment, shop
├── progression/    card, breakthrough, profession, achievement
├── exploration/    exploration
├── territory/      innerCity, territory, portal
├── content/        story, character
├── world/          heroes, map, poi, events, combat
├── admin/          admin CRUD
└── root.ts         merges all routers
```

**Pattern**: Routers validate input (Zod), call service, optionally emit events, return result.

```typescript
export const someRouter = createTRPCRouter({
  action: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await service.doAction(ctx.db, ctx.session.user.id, input);
      void ctx.engine.events.emit("domain:action", payload, "router-name");
      return result;
    }),
});
```

## Service Layer

**Location**: `src/server/api/services/`

Services contain business logic and are transport-agnostic. Dependencies are passed as parameters.

```typescript
export async function doAction(
  db: FullDbClient,           // Prisma client or transaction
  userId: string,
  input?: InputType,
): Promise<ResultType> {
  const player = await findPlayerByUserId(db, userId);
  if (!player) throw new TRPCError({ code: "NOT_FOUND" });
  // ... business logic
}
```

| Service | Responsibility |
|---------|---------------|
| `player.service.ts` | Level-up, stamina, stats, hints |
| `combat.service.ts` | Turn-based inner city combat |
| `worldCombat.service.ts` | Outer city hero combat vs POI |
| `building.service.ts` | Construction, upgrades, workers |
| `card.service.ts` | Card effect resolution |
| `altar.service.ts` | Gacha discovery and challenges |
| `exploration.service.ts` | Wilderness exploration |
| `settlement.service.ts` | Daily scoring and rewards |
| `innerCity.service.ts` | Building placement, territory |
| `territory.service.ts` | Tile unlocking |
| `worldMap.service.ts` | Hero movement, map state |
| `worldHeroes.service.ts` | Hero deploy/recall/rest |
| `worldPoi.service.ts` | POI interaction |
| `worldEvents.service.ts` | Random event generation/resolution |
| `portal.service.ts` | Realm travel |
| `boss.service.ts` | Weekly boss challenges |
| `hint.service.ts` | Contextual player hints |
| `shop.service.ts` | Item shop |
| `achievement.service.ts` | Achievement tracking |
| `breakthrough.service.ts` | Tier advancement |
| `profession.service.ts` | Profession learning |
| `equipment.service.ts` | Equip/enhance |

## Repository Layer

**Location**: `src/server/api/repositories/`

Data access layer encapsulating Prisma operations.

```typescript
type FullDbClient = PrismaClient | Prisma.TransactionClient;
```

Using `FullDbClient` allows repositories to work inside transactions:

```typescript
await db.$transaction(async (tx) => {
  await playerRepo.updatePlayer(tx, id, { gold: 500 });
  await buildingRepo.updateBuilding(tx, id, { level: 2 });
});
```

| Repository | Domain |
|-----------|--------|
| `player.repo.ts` | Player queries, updates |
| `building.repo.ts` | Building entities (via EntityManager) |
| `card.repo.ts` | Card entities, unlock flags, skills |
| `character.repo.ts` | Character entities (via EntityManager) |
| `combat.repo.ts` | Combat sessions |
| `admin.repo.ts` | Template CRUD for admin |

## Utilities

**Location**: `src/server/api/utils/`

| File | Purpose |
|------|---------|
| `character-utils.ts` | Parse character entity state, get template ID |
| `hero-utils.ts` | Resolve hero character data from Entity system |
| `card-utils.ts` | Grant random cards by rarity |
| `player-utils.ts` | Player stat calculations |
| `building-utils.ts` | Building entity creation |
| `game-time.ts` | Game day calculation |
| `index.ts` | Shared helpers (updatePlayer, etc.) |

## Error Handling

All errors use `TRPCError`:
- `NOT_FOUND` - Player/entity not found
- `BAD_REQUEST` - Invalid action (insufficient resources, wrong state)
- `FORBIDDEN` - Unauthorized access
- `INTERNAL_SERVER_ERROR` - Unexpected errors

## Engine Singleton

**File**: `src/server/api/engine.ts`

```typescript
export const engine: GameEngine;       // Shared engine instance
export const ruleService: GameRuleService;

// Initialized once at module load
// Modules registered: core, combat, economy, exploration,
//   progression, content, territory, settlement
// engine.start() called fire-and-forget
```
