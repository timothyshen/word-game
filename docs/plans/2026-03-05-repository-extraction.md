# Repository Layer Extraction Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract Prisma data-access calls from service files into dedicated repository files, following the existing pattern in `player.repo.ts` and `settlement.repo.ts`.

**Architecture:** Each repository file contains pure functions accepting `(db: DbClient, ...params)` with zero business logic. Services import repo functions and handle validation, error throwing, and business orchestration. Repository functions are reusable across services.

**Tech Stack:** TypeScript, Prisma ORM, tRPC

---

## Conventions (from existing repos)

- File: `src/server/api/repositories/<name>.repo.ts`
- Import `DbClient` from `./types` (not `FullDbClient` — repos work inside transactions too)
- Functions are `export function` (not async unless needed — Prisma returns Promises)
- JSDoc header comment: `/** <Entity> Repository — pure data access for <models> */`
- Export all repos from `repositories/index.ts`
- No `TRPCError` in repos — services handle errors
- No business logic (calculations, validations) — only queries

---

### Task 1: Extract `admin.repo.ts`

**Files:**
- Create: `src/server/api/repositories/admin.repo.ts`
- Modify: `src/server/api/repositories/index.ts`
- Modify: `src/server/api/services/admin.service.ts`

**Step 1: Create `admin.repo.ts`**

The admin service is already 100% data access (no business logic). Move ALL functions from `admin.service.ts` into `admin.repo.ts`, changing `FullDbClient` → `DbClient`.

```typescript
/**
 * Admin Repository — pure data access for Card, StoryChapter, StoryNode, Adventure, Building, Character, Skill, Equipment, Profession, OuterCityPOI, Stats
 */
import type { DbClient } from "./types";

// ===== Card =====
export function getCards(db: DbClient) {
  return db.card.findMany({ orderBy: { name: "asc" } });
}
// ... (move ALL functions from admin.service.ts, replacing FullDbClient with DbClient, removing async keyword where not needed)
```

Key changes:
- `FullDbClient` → `DbClient` on all functions
- Remove `async` keyword on simple return-Prisma-promise functions
- `deleteCard`, `deleteBuilding`, `deleteCharacter`, `deleteSkill`, `deleteEquipment`, `deleteProfession` keep `async` because they have sequential awaits
- `reorderStoryNodes` keeps `async`
- `getStats` keeps `async`

**Step 2: Update `admin.service.ts` to re-export from repo**

Replace the entire content of `admin.service.ts` with:

```typescript
/**
 * Admin Service — admin business logic
 * Currently all admin operations are pure CRUD, so we re-export from the repository.
 */
export {
  getCards, getCard, createCard, updateCard, deleteCard,
  getStoryChapters, getStoryChapter, createStoryChapter, updateStoryChapter, deleteStoryChapter,
  createStoryNode, updateStoryNode, deleteStoryNode, reorderStoryNodes,
  getAdventures, getAdventure, createAdventure, updateAdventure, deleteAdventure,
  getBuildings, getBuilding, createBuilding, updateBuilding, deleteBuilding,
  getCharacters, getCharacter, createCharacter, updateCharacter, deleteCharacter,
  getSkills, getSkill, createSkill, updateSkill, deleteSkill,
  getEquipments, getEquipment, createEquipment, updateEquipment, deleteEquipment,
  getProfessions, getProfession, createProfession, updateProfession, deleteProfession,
  getPois, getPoi, createPoi, updatePoi, deletePoi,
  getStats,
} from "../repositories/admin.repo";
```

**Step 3: Update `repositories/index.ts`**

Add: `export * from "./admin.repo";`

**Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: PASS — no type errors

**Step 5: Run tests**

Run: `bun test`
Expected: PASS — admin tests still work

**Step 6: Commit**

```bash
git add src/server/api/repositories/admin.repo.ts src/server/api/repositories/index.ts src/server/api/services/admin.service.ts
git commit -m "refactor: extract admin.repo.ts from admin.service.ts"
```

---

### Task 2: Extract `card.repo.ts`

**Files:**
- Create: `src/server/api/repositories/card.repo.ts`
- Modify: `src/server/api/repositories/index.ts`
- Modify: `src/server/api/services/card.service.ts`

**Step 1: Create `card.repo.ts`**

Extract data-access patterns from card.service.ts:

```typescript
/**
 * Card Repository — pure data access for PlayerCard, Card, UnlockFlag
 */
import type { DbClient } from "./types";

// ── PlayerCard queries ──

export function findPlayerCards(db: DbClient, playerId: string) {
  return db.playerCard.findMany({
    where: { playerId },
    include: { card: true },
    orderBy: [{ card: { type: "asc" } }, { card: { rarity: "asc" } }],
  });
}

export function findPlayerCardsByType(db: DbClient, playerId: string, type: string) {
  return db.playerCard.findMany({
    where: { playerId, card: { type } },
    include: { card: true },
  });
}

export function findPlayerCardByCardId(db: DbClient, playerId: string, cardId: string) {
  return db.playerCard.findFirst({
    where: { playerId, cardId },
    include: { card: true },
  });
}

export function findPlayerCardUnique(db: DbClient, playerId: string, cardId: string) {
  return db.playerCard.findUnique({
    where: { playerId_cardId: { playerId, cardId } },
  });
}

export function deletePlayerCard(db: DbClient, id: string) {
  return db.playerCard.delete({ where: { id } });
}

export function updatePlayerCardQuantity(db: DbClient, id: string, quantity: number) {
  return db.playerCard.update({ where: { id }, data: { quantity } });
}

export function createPlayerCardRecord(db: DbClient, playerId: string, cardId: string, quantity: number) {
  return db.playerCard.create({ data: { playerId, cardId, quantity } });
}

// ── Card template queries ──

export function findCardById(db: DbClient, id: string) {
  return db.card.findUnique({ where: { id } });
}

// ── UnlockFlag ──

export function upsertUnlockFlag(db: DbClient, playerId: string, flagName: string) {
  return db.unlockFlag.upsert({
    where: { playerId_flagName: { playerId, flagName } },
    update: {},
    create: { playerId, flagName },
  });
}

// ── Consume card helper ──

/** Decrement card quantity by 1, or delete if last copy */
export async function consumeCard(db: DbClient, playerCardId: string, currentQuantity: number) {
  if (currentQuantity === 1) {
    await db.playerCard.delete({ where: { id: playerCardId } });
  } else {
    await db.playerCard.update({
      where: { id: playerCardId },
      data: { quantity: currentQuantity - 1 },
    });
  }
}

// ── Skill learning queries ──

export function findPlayerSkillUnique(db: DbClient, playerId: string, skillId: string) {
  return db.playerSkill.findUnique({
    where: { playerId_skillId: { playerId, skillId } },
  });
}

export function createPlayerSkillRecord(db: DbClient, playerId: string, skillId: string, level: number) {
  return db.playerSkill.create({ data: { playerId, skillId, level } });
}

export function updatePlayerSkillLevel(db: DbClient, id: string, level: number) {
  return db.playerSkill.update({ where: { id }, data: { level } });
}

export function findCharacterSkillUnique(db: DbClient, playerCharacterId: string, skillId: string) {
  return db.characterSkill.findUnique({
    where: { playerCharacterId_skillId: { playerCharacterId, skillId } },
  });
}

export function createCharacterSkillRecord(db: DbClient, playerCharacterId: string, skillId: string, level: number) {
  return db.characterSkill.create({ data: { playerCharacterId, skillId, level } });
}

export function updateCharacterSkillLevel(db: DbClient, id: string, level: number) {
  return db.characterSkill.update({ where: { id }, data: { level } });
}

export function findSkillById(db: DbClient, id: string) {
  return db.skill.findUnique({ where: { id } });
}

// ── Building template (for building cards) ──

export function findBuildingById(db: DbClient, id: string) {
  return db.building.findUnique({ where: { id } });
}

export function findPlayerBuildingByPosition(db: DbClient, playerId: string, positionX: number, positionY: number) {
  return db.playerBuilding.findUnique({
    where: { playerId_positionX_positionY: { playerId, positionX, positionY } },
  });
}

export function createPlayerBuildingRecord(
  db: DbClient,
  data: { playerId: string; buildingId: string; level: number; positionX: number; positionY: number },
) {
  return db.playerBuilding.create({ data, include: { building: true } });
}

// ── Character template (for recruit cards) ──

export function findCharacterById(db: DbClient, id: string) {
  return db.character.findUnique({ where: { id } });
}

export function createPlayerCharacterRecord(
  db: DbClient,
  data: {
    playerId: string; characterId: string; level: number; tier: number;
    hp: number; maxHp: number; mp: number; maxMp: number;
    attack: number; defense: number; speed: number; luck: number;
  },
) {
  return db.playerCharacter.create({ data, include: { character: true } });
}
```

**Step 2: Update `card.service.ts` to use repo functions**

Replace all direct `db.playerCard.*`, `db.card.*`, `db.unlockFlag.*`, etc. calls with imports from `card.repo.ts`. The key DRY win: the `consumeCard` function replaces 4 duplicated consume-card blocks.

Example transformation for `useCard`:
```typescript
import * as cardRepo from "../repositories/card.repo";

export async function useCard(db: FullDbClient, userId: string, input: { cardId: string; quantity: number; targetId?: string }) {
  const player = await getPlayerOrThrow(db, userId);
  const playerCard = await cardRepo.findPlayerCardByCardId(db, player.id, input.cardId);
  if (!playerCard || playerCard.quantity < input.quantity) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "卡牌数量不足" });
  }
  // Consume
  if (playerCard.quantity === input.quantity) {
    await cardRepo.deletePlayerCard(db, playerCard.id);
  } else {
    await cardRepo.updatePlayerCardQuantity(db, playerCard.id, playerCard.quantity - input.quantity);
  }
  // ... rest of business logic stays in service
}
```

For `useBuildingCard`, `useRecruitCard`, `useItemCard`, `learnSkill` — replace the duplicated consume-card pattern with `await cardRepo.consumeCard(db, playerCard.id, playerCard.quantity)`.

**Step 3: Update `repositories/index.ts`**

Add: `export * from "./card.repo";`

**Step 4: Typecheck + test**

Run: `bun run typecheck && bun test`

**Step 5: Commit**

```bash
git add src/server/api/repositories/card.repo.ts src/server/api/repositories/index.ts src/server/api/services/card.service.ts
git commit -m "refactor: extract card.repo.ts, DRY card consumption pattern"
```

---

### Task 3: Extract `innerCity.repo.ts`

**Files:**
- Create: `src/server/api/repositories/innerCity.repo.ts`
- Modify: `src/server/api/repositories/index.ts`
- Modify: `src/server/api/services/innerCity.service.ts`

**Step 1: Create `innerCity.repo.ts`**

```typescript
/**
 * InnerCity Repository — pure data access for InnerCityConfig, InnerCityBuilding
 */
import type { DbClient } from "./types";

export function findConfig(db: DbClient, playerId: string) {
  return db.innerCityConfig.findUnique({ where: { playerId } });
}

export function createConfig(db: DbClient, playerId: string, width: number, height: number, cornerRadius: number) {
  return db.innerCityConfig.create({
    data: { playerId, territoryWidth: width, territoryHeight: height, cornerRadius },
  });
}

export function updateConfig(db: DbClient, playerId: string, data: { territoryWidth: number; territoryHeight: number; cornerRadius: number }) {
  return db.innerCityConfig.update({ where: { playerId }, data });
}

export function countBuildings(db: DbClient, playerId: string) {
  return db.innerCityBuilding.count({ where: { playerId } });
}

export function findBuildings(db: DbClient, playerId: string) {
  return db.innerCityBuilding.findMany({
    where: { playerId },
    include: { template: true },
  });
}

export function findBuildingById(db: DbClient, id: string, playerId: string) {
  return db.innerCityBuilding.findFirst({
    where: { id, playerId },
    include: { template: true },
  });
}

export function createBuilding(
  db: DbClient,
  data: { playerId: string; templateId: string; positionX: number; positionY: number; level: number },
) {
  return db.innerCityBuilding.create({ data, include: { template: true } });
}

export function updateBuildingLevel(db: DbClient, id: string, level: number) {
  return db.innerCityBuilding.update({
    where: { id },
    data: { level },
    include: { template: true },
  });
}

export function deleteBuilding(db: DbClient, id: string) {
  return db.innerCityBuilding.delete({ where: { id } });
}

export function findBuildingTemplate(db: DbClient, name: string) {
  return db.building.findFirst({ where: { name } });
}
```

**Step 2: Update `innerCity.service.ts`**

Replace all `db.innerCityConfig.*` and `db.innerCityBuilding.*` calls with imports from `innerCity.repo`. Player updates (`db.player.update`) can use existing `updatePlayer` from `player.repo`.

**Step 3: Update `repositories/index.ts`**

Add: `export * as innerCityRepo from "./innerCity.repo";` (namespace to avoid conflicts with admin repo's building functions)

**Step 4: Typecheck + test**

Run: `bun run typecheck && bun test`

**Step 5: Commit**

```bash
git add src/server/api/repositories/innerCity.repo.ts src/server/api/repositories/index.ts src/server/api/services/innerCity.service.ts
git commit -m "refactor: extract innerCity.repo.ts from innerCity.service.ts"
```

---

### Task 4: Extract `exploration.repo.ts`

**Files:**
- Create: `src/server/api/repositories/exploration.repo.ts`
- Modify: `src/server/api/repositories/index.ts`
- Modify: `src/server/api/services/exploration.service.ts`

**Step 1: Create `exploration.repo.ts`**

```typescript
/**
 * Exploration Repository — pure data access for ExploredArea, WildernessFacility, Adventure
 */
import type { DbClient } from "./types";

// ── ExploredArea ──

export function findExploredAreas(db: DbClient, playerId: string, worldId: string) {
  return db.exploredArea.findMany({
    where: { playerId, worldId },
    orderBy: { discoveredAt: "asc" },
  });
}

export function findExploredArea(db: DbClient, playerId: string, worldId: string, positionX: number, positionY: number) {
  return db.exploredArea.findUnique({
    where: { playerId_worldId_positionX_positionY: { playerId, worldId, positionX, positionY } },
  });
}

export function createExploredArea(
  db: DbClient,
  data: { playerId: string; worldId: string; positionX: number; positionY: number; name: string },
) {
  return db.exploredArea.create({ data });
}

export function updateExploredAreaEvent(db: DbClient, id: string, pendingEvent: string | null) {
  return db.exploredArea.update({ where: { id }, data: { pendingEvent } });
}

export function setExploredAreaPendingEvent(
  db: DbClient,
  playerId: string, worldId: string, positionX: number, positionY: number,
  pendingEvent: string,
) {
  return db.exploredArea.update({
    where: { playerId_worldId_positionX_positionY: { playerId, worldId, positionX, positionY } },
    data: { pendingEvent },
  });
}

// ── WildernessFacility ──

export function findActiveFacilities(db: DbClient, playerId: string, worldId: string) {
  const now = new Date();
  return db.wildernessFacility.findMany({
    where: {
      playerId, worldId, isDiscovered: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
  });
}

export function findFacilityById(db: DbClient, id: string, playerId: string) {
  return db.wildernessFacility.findFirst({ where: { id, playerId } });
}

export function createFacility(
  db: DbClient,
  data: {
    playerId: string; worldId: string; type: string; name: string; icon: string;
    description: string; positionX: number; positionY: number; data: string;
    remainingUses: number | null; isDiscovered: boolean;
  },
) {
  return db.wildernessFacility.create({ data });
}

export function updateFacilityUses(db: DbClient, id: string, remainingUses: number) {
  return db.wildernessFacility.update({ where: { id }, data: { remainingUses } });
}

export function deleteFacility(db: DbClient, id: string) {
  return db.wildernessFacility.delete({ where: { id } });
}

// ── Adventure ──

export function findActiveAdventures(db: DbClient, areaLevel: number, worldId: string) {
  return db.adventure.findMany({
    where: {
      isActive: true,
      minLevel: { lte: areaLevel },
      AND: [
        { OR: [{ maxLevel: null }, { maxLevel: { gte: areaLevel } }] },
        { OR: [{ worldId: null }, { worldId }] },
      ],
    },
  });
}
```

**Step 2: Update `exploration.service.ts`**

Replace all `db.exploredArea.*`, `db.wildernessFacility.*`, `db.adventure.*` calls with repo imports. Keep `db.player.update` calls using `updatePlayer` from player.repo where applicable, or keep direct for stamina updates. Keep `db.actionLog.create` using `createActionLog` from player.repo.

**Step 3: Update `repositories/index.ts`**

Add: `export * as explorationRepo from "./exploration.repo";`

**Step 4: Typecheck + test**

Run: `bun run typecheck && bun test`

**Step 5: Commit**

```bash
git add src/server/api/repositories/exploration.repo.ts src/server/api/repositories/index.ts src/server/api/services/exploration.service.ts
git commit -m "refactor: extract exploration.repo.ts from exploration.service.ts"
```

---

### Task 5: Extract `character.repo.ts`

**Files:**
- Create: `src/server/api/repositories/character.repo.ts`
- Modify: `src/server/api/repositories/index.ts`
- Modify: `src/server/api/services/character.service.ts`

**Step 1: Create `character.repo.ts`**

```typescript
/**
 * Character Repository — pure data access for PlayerCharacter
 */
import type { Prisma } from "../../../../generated/prisma";
import type { DbClient } from "./types";

const CHARACTER_INCLUDE = {
  character: true,
  profession: { include: { profession: true } },
  learnedSkills: { include: { skill: true } },
} as const;

export function findPlayerCharacters(db: DbClient, playerId: string) {
  return db.playerCharacter.findMany({
    where: { playerId },
    include: CHARACTER_INCLUDE,
    orderBy: { createdAt: "asc" },
  });
}

export function findPlayerCharacterById(db: DbClient, id: string, playerId: string) {
  return db.playerCharacter.findFirst({
    where: { id, playerId },
    include: CHARACTER_INCLUDE,
  });
}

export function findPlayerCharacterWithTemplate(db: DbClient, id: string, playerId: string) {
  return db.playerCharacter.findFirst({
    where: { id, playerId },
    include: { character: true },
  });
}

export function findIdleCharacters(db: DbClient, playerId: string) {
  return db.playerCharacter.findMany({
    where: { playerId, status: "idle" },
    include: { character: true },
  });
}

export function updateCharacter(db: DbClient, id: string, data: Prisma.PlayerCharacterUpdateInput) {
  return db.playerCharacter.update({ where: { id }, data });
}

export function findBuildingByAssignedChar(db: DbClient, playerId: string, characterId: string) {
  return db.playerBuilding.findFirst({
    where: { playerId, assignedCharId: characterId },
    include: { building: true },
  });
}

export function findPlayerBuildingWithTemplate(db: DbClient, id: string, playerId: string) {
  return db.playerBuilding.findFirst({
    where: { id, playerId },
    include: { building: true },
  });
}

export function updatePlayerBuilding(db: DbClient, id: string, data: Prisma.PlayerBuildingUpdateInput) {
  return db.playerBuilding.update({ where: { id }, data });
}
```

**Step 2: Update `character.service.ts`**

Replace all `db.playerCharacter.*` and `db.playerBuilding.*` calls with repo imports. The deeply-nested `CHARACTER_INCLUDE` is now defined once in the repo.

**Step 3: Update `repositories/index.ts`**

Add: `export * as characterRepo from "./character.repo";`

**Step 4: Typecheck + test**

Run: `bun run typecheck && bun test`

**Step 5: Commit**

```bash
git add src/server/api/repositories/character.repo.ts src/server/api/repositories/index.ts src/server/api/services/character.service.ts
git commit -m "refactor: extract character.repo.ts, DRY character include pattern"
```

---

### Task 6: Extract `combat.repo.ts`

**Files:**
- Create: `src/server/api/repositories/combat.repo.ts`
- Modify: `src/server/api/repositories/index.ts`
- Modify: `src/server/api/services/combat.service.ts`

**Step 1: Create `combat.repo.ts`**

```typescript
/**
 * Combat Repository — pure data access for CombatSession, PlayerSkill (combat)
 */
import type { DbClient } from "./types";

export function findActiveCombat(db: DbClient, playerId: string) {
  return db.combatSession.findFirst({ where: { playerId, status: "active" } });
}

export function findCombatById(db: DbClient, id: string, playerId: string) {
  return db.combatSession.findFirst({ where: { id, playerId } });
}

export function createCombatSession(
  db: DbClient,
  data: {
    playerId: string; status: string; currentTurn: number;
    playerTeam: string; enemyTeam: string; combatType: string;
    areaLevel: number; logs: string; rewards: string;
  },
) {
  return db.combatSession.create({ data });
}

export function updateCombatSession(
  db: DbClient,
  id: string,
  data: {
    status?: string; currentTurn?: number;
    playerTeam?: string; enemyTeam?: string; logs?: string;
  },
) {
  return db.combatSession.update({ where: { id }, data });
}

export function findCombatHistory(db: DbClient, playerId: string, limit: number) {
  return db.combatSession.findMany({
    where: { playerId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export function findPlayerCombatSkills(db: DbClient, playerId: string) {
  return db.playerSkill.findMany({
    where: { playerId },
    include: { skill: true },
  });
}

export function findPlayerSkillBySkillId(db: DbClient, playerId: string, skillId: string) {
  return db.playerSkill.findFirst({
    where: { playerId, skillId },
    include: { skill: true },
  });
}
```

**Step 2: Update `combat.service.ts`**

Replace all `db.combatSession.*` and skill queries with repo imports. Player updates (gold, exp, combatWins) use `updatePlayer` from player.repo. ActionLog uses `createActionLog` from player.repo.

**Step 3: Update `repositories/index.ts`**

Add: `export * as combatRepo from "./combat.repo";`

**Step 4: Typecheck + test**

Run: `bun run typecheck && bun test`

**Step 5: Commit**

```bash
git add src/server/api/repositories/combat.repo.ts src/server/api/repositories/index.ts src/server/api/services/combat.service.ts
git commit -m "refactor: extract combat.repo.ts from combat.service.ts"
```

---

### Task 7: Extract `building.repo.ts`

**Files:**
- Create: `src/server/api/repositories/building.repo.ts`
- Modify: `src/server/api/repositories/index.ts`
- Modify: `src/server/api/services/building.service.ts`

**Step 1: Create `building.repo.ts`**

```typescript
/**
 * Building Repository — pure data access for PlayerBuilding, EconomyLog
 */
import type { DbClient } from "./types";

export function findPlayerBuildings(db: DbClient, playerId: string) {
  return db.playerBuilding.findMany({
    where: { playerId },
    include: { building: true },
    orderBy: { createdAt: "asc" },
  });
}

export function findPlayerBuildingById(db: DbClient, id: string, playerId: string) {
  return db.playerBuilding.findFirst({
    where: { id, playerId },
    include: { building: true },
  });
}

export function updatePlayerBuildingLevel(db: DbClient, id: string, level: number) {
  return db.playerBuilding.update({
    where: { id },
    data: { level },
    include: { building: true },
  });
}

export function updatePlayerBuildingAssignment(
  db: DbClient,
  id: string,
  data: { assignedCharId: string | null; status: string },
) {
  return db.playerBuilding.update({ where: { id }, data });
}

export function findCharacterWithTemplate(db: DbClient, id: string, playerId: string) {
  return db.playerCharacter.findFirst({
    where: { id, playerId },
    include: { character: true },
  });
}

export function countPlayerCharacters(db: DbClient, playerId: string) {
  return db.playerCharacter.findMany({ where: { playerId } });
}

export function upsertEconomyLog(
  db: DbClient,
  playerId: string,
  day: number,
  data: {
    goldIncome: number; woodIncome: number; stoneIncome: number;
    foodIncome: number; foodExpense: number;
  },
) {
  return db.economyLog.upsert({
    where: { playerId_day: { playerId, day } },
    update: data,
    create: { playerId, day, ...data },
  });
}
```

**Step 2: Update `building.service.ts`**

Replace all `db.playerBuilding.*`, `db.playerCharacter.*`, `db.economyLog.*` calls with repo imports.

**Step 3: Update `repositories/index.ts`**

Add: `export * as buildingRepo from "./building.repo";`

**Step 4: Typecheck + test**

Run: `bun run typecheck && bun test`

**Step 5: Commit**

```bash
git add src/server/api/repositories/building.repo.ts src/server/api/repositories/index.ts src/server/api/services/building.service.ts
git commit -m "refactor: extract building.repo.ts from building.service.ts"
```

---

### Task 8: Final verification

**Step 1: Full typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 2: Full test suite**

Run: `bun test`
Expected: PASS

**Step 3: Verify repository index exports all repos**

Read `src/server/api/repositories/index.ts` and confirm it exports:
- `player.repo`
- `settlement.repo`
- `admin.repo`
- `card.repo`
- `innerCity.repo` (namespaced)
- `exploration.repo` (namespaced)
- `character.repo` (namespaced)
- `combat.repo` (namespaced)
- `building.repo` (namespaced)

**Step 4: Commit any remaining changes**

```bash
git add -A
git commit -m "refactor: complete repository layer extraction (7 repos)"
```
