# Combat System Phase 1 — 3人ATB小队战斗核心

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the 1v1 turn-based combat with a 3-character party ATB system supporting multiple enemies, elemental weaknesses, and target selection.

**Architecture:** Extend existing CombatSession model with new JSON fields for party ATB state. Rewrite combat.service.ts to handle multi-unit ATB combat. New CombatPanel with party display, ATB bars, and target selection.

**Tech Stack:** Prisma (SQLite), tRPC, React, Tailwind CSS, Vitest

---

## Task 1: Update Shared Types for ATB Multi-Unit Combat

**Files:**
- Modify: `src/shared/effects/types.ts`

**Step 1: Add element and ATB types**

Add these types after the existing `CombatUnit` interface (after line 178):

```typescript
// --- Element System ---

export const ELEMENTS = ["physical", "fire", "ice", "thunder", "light", "dark"] as const;
export type Element = (typeof ELEMENTS)[number];

export interface ElementalProfile {
  weaknesses: Element[];  // takes 1.5x damage
  resistances: Element[]; // takes 0.5x damage
}

// --- ATB Combat Types ---

export interface ATBUnit extends CombatUnit {
  atb: number;           // 0-100, acts at 100
  element?: Element;
  elementalProfile?: ElementalProfile;
  isAlive: boolean;
  teamIndex: number;     // position in party (0-2) or enemy group
}

export interface PartyMember extends ATBUnit {
  characterId: string;   // Entity ID of the character
  portrait: string;
  baseClass: string;
  skillSlots: CombatAction[];  // equipped extra skills
}

export interface EnemyUnit extends ATBUnit {
  tier: "normal" | "elite" | "boss";
  phase?: number;        // boss phase (1-based)
  specialMechanics?: EnemyMechanic[];
  loot: LootTable;
}

export interface EnemyMechanic {
  name: string;
  trigger: "hp_threshold" | "turn_interval" | "on_hit";
  value: number;         // HP% threshold or turn count
  effects: SkillEffect[];
  description: string;
  activated?: boolean;
}

export interface LootTable {
  exp: number;
  gold: number;
  materials?: Array<{ templateId: string; chance: number; count: number }>;
  equipment?: Array<{ equipmentId: string; chance: number }>;
  skillCards?: Array<{ skillId: string; chance: number }>;
}

// --- ATB Combat State ---

export interface ATBCombatState {
  party: PartyMember[];
  enemies: EnemyUnit[];
  turnOrder: string[];          // IDs of units sorted by ATB
  currentActorId: string | null; // unit waiting for input
  turnCount: number;
  logs: CombatLog[];
  status: "active" | "victory" | "defeat" | "fled";
  combatType: "normal" | "elite" | "boss";
  rating?: CombatRating;
}

export interface CombatLog {
  turn: number;
  actorName: string;
  message: string;
  type: "action" | "damage" | "heal" | "buff" | "system" | "critical" | "weakness" | "combo";
}

export interface CombatRating {
  grade: "S" | "A" | "B" | "C";
  turnsUsed: number;
  survivorCount: number;
  weaknessHits: number;
  combosTriggered: number;
  multiplier: number;
}

// --- Target Selection ---

export type TargetType = "single_enemy" | "all_enemies" | "single_ally" | "all_allies" | "self";

export interface CombatActionV2 extends CombatAction {
  targetType: TargetType;
  element?: Element;
}
```

**Step 2: Update MonsterConfig to include element**

Change existing `MonsterConfig` interface:

```typescript
export interface MonsterConfig {
  name: string;
  icon: string;
  level: number;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  intellect?: number;
  element?: Element;
  weaknesses?: Element[];
  resistances?: Element[];
  skills: MonsterSkill[];
  rewards: RewardEntry[];
}
```

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: May have errors in combat.service.ts since we haven't updated it yet — that's OK.

**Step 4: Commit**

```bash
git add src/shared/effects/types.ts
git commit -m "feat: add ATB combat types, element system, and party types"
```

---

## Task 2: Update Prisma Schema for Party System

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add PlayerParty model and update CombatSession**

Add after the existing CombatSession model:

```prisma
model PlayerParty {
    id       String @id @default(cuid())
    playerId String @unique
    player   Player @relation(fields: [playerId], references: [id], onDelete: Cascade)

    // JSON array of character Entity IDs (max 3)
    members  String @default("[]")

    updatedAt DateTime @updatedAt
}
```

Update CombatSession — add these fields:

```prisma
    // ATB combat state (JSON — full ATBCombatState)
    combatState  String @default("{}")
```

Add `party PlayerParty?` relation to the Player model.

**Step 2: Push schema**

Run: `bun prisma db push`

**Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add PlayerParty model and ATB combat state field"
```

---

## Task 3: Party Repository & Router

**Files:**
- Create: `src/server/api/repositories/party.repo.ts`
- Create: `src/server/api/routers/party.ts`
- Modify: `src/server/api/root.ts`

**Step 1: Create party repository**

```typescript
/**
 * Party Repository — data access for PlayerParty
 */
import type { DbClient } from "./types";

export function findParty(db: DbClient, playerId: string) {
  return db.playerParty.findUnique({ where: { playerId } });
}

export function upsertParty(db: DbClient, playerId: string, members: string[]) {
  return db.playerParty.upsert({
    where: { playerId },
    create: { playerId, members: JSON.stringify(members) },
    update: { members: JSON.stringify(members) },
  });
}

export function parsePartyMembers(party: { members: string } | null): string[] {
  if (!party) return [];
  try {
    return JSON.parse(party.members) as string[];
  } catch {
    return [];
  }
}
```

**Step 2: Create party router**

```typescript
/**
 * Party Router — manage 3-character party composition
 */
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as partyRepo from "../repositories/party.repo";

export const partyRouter = createTRPCRouter({
  getParty: protectedProcedure.query(async ({ ctx }) => {
    const party = await partyRepo.findParty(ctx.db, ctx.session.user.id);
    return partyRepo.parsePartyMembers(party);
  }),

  setParty: protectedProcedure
    .input(z.object({
      members: z.array(z.string()).min(1).max(3),
    }))
    .mutation(async ({ ctx, input }) => {
      await partyRepo.upsertParty(ctx.db, ctx.session.user.id, input.members);
      return { success: true };
    }),
});
```

**Step 3: Register router in root.ts**

Add import and register `party: partyRouter` in the appRouter.

**Step 4: Run typecheck**

Run: `bun run typecheck`

**Step 5: Commit**

```bash
git add src/server/api/repositories/party.repo.ts src/server/api/routers/party.ts src/server/api/root.ts
git commit -m "feat: add party repository and router for 3-character teams"
```

---

## Task 4: Element System in Combat Resolver

**Files:**
- Modify: `src/shared/effects/combat-resolver.ts`

**Step 1: Add element damage multiplier function**

Add at top of file after imports:

```typescript
import type { Element, ElementalProfile } from "./types";

/**
 * Calculate elemental damage multiplier.
 * Weakness = 1.5x, Resistance = 0.5x, Neutral = 1.0x
 */
export function getElementMultiplier(
  attackElement: Element | undefined,
  profile: ElementalProfile | undefined,
): { multiplier: number; isWeak: boolean; isResist: boolean } {
  if (!attackElement || !profile) return { multiplier: 1.0, isWeak: false, isResist: false };
  if (profile.weaknesses.includes(attackElement)) return { multiplier: 1.5, isWeak: true, isResist: false };
  if (profile.resistances.includes(attackElement)) return { multiplier: 0.5, isWeak: false, isResist: true };
  return { multiplier: 1.0, isWeak: false, isResist: false };
}
```

**Step 2: Update resolveDamage to use element multiplier**

In `resolveDamage`, add element parameter and apply multiplier. The `resolveSkillEffect` needs a new overload that accepts `elementalProfile`:

```typescript
export function resolveSkillEffect(
  effect: SkillEffect,
  attacker: CombatUnit,
  defender: CombatUnit,
  defenderProfile?: ElementalProfile,
): CombatResult {
  switch (effect.type) {
    case "damage":
      return resolveDamage(effect, attacker, defender, defenderProfile);
    // ... rest stays same
  }
}
```

In `resolveDamage`, after calculating damage and before applying to defender.hp:

```typescript
// Apply elemental multiplier
const elemResult = getElementMultiplier(
  effect.element as Element | undefined,
  defenderProfile,
);
damage = Math.floor(damage * elemResult.multiplier);

// Update log with element info
if (elemResult.isWeak) logs.push(`弱点命中！伤害提升50%`);
if (elemResult.isResist) logs.push(`属性抗性！伤害降低50%`);
```

**Step 3: Add multi-target resolve helper**

```typescript
/**
 * Resolve an action against multiple targets, returning combined results.
 */
export function resolveActionMultiTarget(
  action: { effects: SkillEffect[] },
  attacker: CombatUnit,
  targets: Array<{ unit: CombatUnit; profile?: ElementalProfile }>,
): CombatResult {
  const allLogs: string[] = [];
  let totalDamage = 0;
  let totalHeal = 0;
  const allBuffs: CombatBuff[] = [];

  for (const { unit: target, profile } of targets) {
    for (const effect of action.effects) {
      const result = resolveSkillEffect(effect, attacker, target, profile);
      allLogs.push(...result.logs);
      if (result.damageDealt) totalDamage += result.damageDealt;
      if (result.healAmount) totalHeal += result.healAmount;
      if (result.buffsApplied) allBuffs.push(...result.buffsApplied);
      if (result.fled) return { logs: allLogs, fled: true };
    }
  }

  return {
    logs: allLogs,
    damageDealt: totalDamage || undefined,
    healAmount: totalHeal || undefined,
    buffsApplied: allBuffs.length > 0 ? allBuffs : undefined,
  };
}
```

**Step 4: Run typecheck**

Run: `bun run typecheck`

**Step 5: Commit**

```bash
git add src/shared/effects/combat-resolver.ts
git commit -m "feat: add element system and multi-target resolution to combat resolver"
```

---

## Task 5: ATB Combat Engine

**Files:**
- Create: `src/server/api/services/atb-combat.service.ts`

This is the core ATB combat service that replaces the old 1v1 system.

**Step 1: Create ATB combat service with core functions**

Key functions to implement:

```typescript
/**
 * ATB Combat Service — 3-character party ATB combat system
 */

// --- ATB Tick ---
// Advance all units' ATB by their speed. Return the first unit to reach 100.
export function tickATB(state: ATBCombatState): string | null

// --- Start Combat ---
// Create initial ATBCombatState from party members + enemy group
export async function startATBCombat(
  db: FullDbClient,
  entities: IEntityManager,
  userId: string,
  options: { monsterLevel: number; combatType: "normal" | "elite" | "boss"; monsterConfigs?: MonsterConfig[] }
): Promise<{ combatId: string; state: ATBCombatState }>

// --- Execute Action ---
// Player chose an action for the current actor. Resolve, then advance ATB to next actor.
export async function executeATBAction(
  db: FullDbClient,
  entities: IEntityManager,
  userId: string,
  combatId: string,
  actionId: string,
  targetIds: string[],
): Promise<{ state: ATBCombatState; rewards?: CombatRewards }>

// --- Get Available Actions ---
// Return actions for the current acting unit (base + character skills + equipped skill cards)
export async function getATBActions(
  db: FullDbClient,
  userId: string,
  combatId: string,
): Promise<{ actions: CombatActionV2[]; currentActor: PartyMember }>

// --- Generate Enemy Group ---
// Create 2-4 normal monsters or 1-2 elite monsters based on combat type and level
export async function generateEnemyGroup(
  level: number,
  combatType: "normal" | "elite" | "boss",
  worldElement?: Element,
): Promise<EnemyUnit[]>

// --- Calculate Rating ---
export function calculateRating(state: ATBCombatState): CombatRating

// --- Build Party Members ---
// Load 3 character entities and convert to PartyMember combat units
export async function buildPartyMembers(
  db: FullDbClient,
  entities: IEntityManager,
  userId: string,
): Promise<PartyMember[]>
```

**Step 2: Implement tickATB**

```typescript
export function tickATB(state: ATBCombatState): string | null {
  const allUnits = [...state.party, ...state.enemies].filter(u => u.isAlive);
  if (allUnits.length === 0) return null;

  // Find the unit closest to ATB 100
  // Calculate how much each unit needs to reach 100, pick the minimum
  let minTicksNeeded = Infinity;
  for (const unit of allUnits) {
    const remaining = 100 - unit.atb;
    const speed = Math.max(1, unit.speed);
    const ticks = remaining / speed;
    if (ticks < minTicksNeeded) minTicksNeeded = ticks;
  }

  // Advance all units by that amount
  for (const unit of allUnits) {
    unit.atb += unit.speed * minTicksNeeded;
  }

  // Find the unit with highest ATB (should be ~100)
  allUnits.sort((a, b) => b.atb - a.atb);
  const actor = allUnits[0]!;
  actor.atb = 100; // clamp

  return actor.id;
}
```

**Step 3: Implement enemy group generation**

Generate 2-4 normal monsters with elemental profiles based on area.

**Step 4: Implement startATBCombat**

Load party, generate enemies, create CombatSession with JSON combatState.

**Step 5: Implement executeATBAction**

Resolve action against targets, check for victory/defeat, run enemy AI turns (enemies act automatically when their ATB fills), advance to next player actor.

**Step 6: Implement enemy AI**

When an enemy's ATB fills, automatically select a skill and target:
- Prefer skills off cooldown
- Target lowest HP party member for damage skills
- Use healing if available and HP < 30%

**Step 7: Implement calculateRating**

```typescript
export function calculateRating(state: ATBCombatState): CombatRating {
  const survivors = state.party.filter(p => p.isAlive).length;
  const weaknessHits = state.logs.filter(l => l.type === "weakness").length;
  const combos = state.logs.filter(l => l.type === "combo").length;

  let score = 100;
  score -= state.turnCount * 3;      // fewer turns = better
  score += survivors * 15;            // survival bonus
  score += weaknessHits * 5;          // elemental play bonus
  score += combos * 10;               // combo bonus

  const grade = score >= 90 ? "S" : score >= 70 ? "A" : score >= 50 ? "B" : "C";
  const multiplier = grade === "S" ? 1.5 : grade === "A" ? 1.2 : grade === "B" ? 1.0 : 0.8;

  return { grade, turnsUsed: state.turnCount, survivorCount: survivors, weaknessHits, combosTriggered: combos, multiplier };
}
```

**Step 8: Run typecheck**

Run: `bun run typecheck`

**Step 9: Commit**

```bash
git add src/server/api/services/atb-combat.service.ts
git commit -m "feat: implement ATB combat engine with party system and element mechanics"
```

---

## Task 6: Update Combat Router for ATB System

**Files:**
- Modify: `src/server/api/routers/combat/combat.ts`

**Step 1: Add new ATB endpoints alongside existing ones**

Add new procedures:
- `startATBCombat` — starts 3v multi-enemy combat
- `getATBStatus` — returns full ATBCombatState
- `getATBActions` — returns actions for current actor
- `executeATBAction` — execute with target selection
- `abandonCombat` — flee from combat

Keep old endpoints for backward compatibility initially.

**Step 2: Update input schemas**

```typescript
startATBCombat: protectedProcedure
  .input(z.object({
    monsterLevel: z.number().min(1).max(100).default(1),
    combatType: z.enum(["normal", "elite", "boss"]).default("normal"),
  }))
  .mutation(...)

executeATBAction: protectedProcedure
  .input(z.object({
    combatId: z.string(),
    actionId: z.string(),
    targetIds: z.array(z.string()).min(1),
  }))
  .mutation(...)
```

**Step 3: Commit**

```bash
git add src/server/api/routers/combat/combat.ts
git commit -m "feat: add ATB combat router endpoints"
```

---

## Task 7: New CombatPanel Frontend

**Files:**
- Create: `src/components/game/panels/ATBCombatPanel.tsx`
- Modify: `src/hooks/use-game-panels.ts`
- Modify: `src/app/game/page.tsx`

**Step 1: Create ATBCombatPanel component**

Layout (top to bottom):
1. **Enemy area** — enemy cards with HP bars, element icons, tier badges
2. **Combat log** — scrollable, color-coded by log type
3. **Party area** — 3 character cards with HP/MP/ATB bars
4. **Action panel** — shown when a party member's ATB is full

Key sub-components (all in same file):
- `EnemyCard` — name, HP bar, element icon, buffs
- `PartyCard` — portrait, HP bar, MP bar, ATB bar, buffs
- `ActionBar` — 5 action buttons with target selection
- `CombatLogView` — scrollable log with color coding

**Step 2: Implement ATB visualization**

ATB bar fills from 0-100. Use CSS transition for smooth fill:
```tsx
<div className="h-1 bg-[var(--game-gold)]/20">
  <div
    className="h-full bg-[var(--game-gold)] transition-all duration-300"
    style={{ width: `${unit.atb}%` }}
  />
</div>
```

When ATB reaches 100, the character card pulses/glows to indicate readiness.

**Step 3: Implement target selection**

When player selects a single-target action:
1. Action buttons dim
2. Enemy cards become clickable with hover highlight
3. Clicking an enemy confirms the target
4. Cancel button returns to action selection

For all-target actions, skip target selection.

**Step 4: Wire up tRPC calls**

```typescript
const startMutation = api.combat.startATBCombat.useMutation({...});
const actionMutation = api.combat.executeATBAction.useMutation({...});
const { data: status } = api.combat.getATBStatus.useQuery({combatId}, {enabled: !!combatId});
const { data: actions } = api.combat.getATBActions.useQuery({combatId}, {enabled: !!combatId && !!status?.currentActorId});
```

**Step 5: Update game page to use new panel**

Replace CombatPanel with ATBCombatPanel in game page. Update useGamePanels hook if needed.

**Step 6: Commit**

```bash
git add src/components/game/panels/ATBCombatPanel.tsx src/hooks/use-game-panels.ts src/app/game/page.tsx
git commit -m "feat: implement ATB combat panel with party display and target selection"
```

---

## Task 8: Party Management UI

**Files:**
- Create: `src/components/game/panels/PartyPanel.tsx`
- Modify: `src/hooks/use-game-panels.ts`
- Modify: `src/app/game/page.tsx`

**Step 1: Create PartyPanel**

Shows current 3-member party with ability to swap characters.
- Left side: current party (3 slots, can be empty)
- Right side: available characters (scrollable list)
- Drag-and-drop or click to add/remove
- "Save Party" button calls `api.party.setParty`

**Step 2: Add party button to game page**

Add a party management button near the combat button.

**Step 3: Commit**

```bash
git add src/components/game/panels/PartyPanel.tsx src/hooks/use-game-panels.ts src/app/game/page.tsx
git commit -m "feat: add party management panel for 3-character team composition"
```

---

## Task 9: Integration Testing

**Files:**
- Create: `src/server/api/__tests__/atb-combat.test.ts`

**Step 1: Test ATB tick logic**

```typescript
describe("ATB Combat", () => {
  describe("tickATB", () => {
    it("should advance all units by speed and return fastest", () => {
      // Create state with units of different speeds
      // Verify correct unit acts first
    });

    it("should allow fast units to act twice before slow units", () => {
      // Unit with 2x speed should act twice
    });
  });
});
```

**Step 2: Test element system**

```typescript
describe("getElementMultiplier", () => {
  it("should return 1.5x for weakness", () => {...});
  it("should return 0.5x for resistance", () => {...});
  it("should return 1.0x for neutral", () => {...});
  it("should return 1.0x when no element", () => {...});
});
```

**Step 3: Test combat rating**

```typescript
describe("calculateRating", () => {
  it("should give S rating for fast, clean victories", () => {...});
  it("should give C rating for long, messy fights", () => {...});
});
```

**Step 4: Run tests**

Run: `bun test src/server/api/__tests__/atb-combat.test.ts`

**Step 5: Commit**

```bash
git add src/server/api/__tests__/atb-combat.test.ts
git commit -m "test: add ATB combat unit tests for tick, elements, and rating"
```

---

## Implementation Order (Parallelizable Tasks)

```
Task 1 (types) ──┐
                  ├──→ Task 4 (element resolver) ──┐
Task 2 (schema) ──┤                                ├──→ Task 5 (ATB engine) ──→ Task 6 (router) ──→ Task 9 (tests)
                  │                                │
Task 3 (party)  ──┘                                └──→ Task 7 (combat UI) ──→ Task 8 (party UI)
```

**Parallelizable groups:**
- **Group A**: Tasks 1, 2, 3 (independent foundation)
- **Group B**: Tasks 4, 5 (depend on Group A)
- **Group C**: Tasks 6, 7, 8 (depend on Group B)
- **Group D**: Task 9 (depends on all)
