# Unlock Guide System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a progressive unlock system where UI panels are hidden until the player triggers specific actions, with toast notifications on unlock.

**Architecture:** Backend returns player's `unlockFlags` as a `Set<string>` via `player.getStatus`. Frontend uses a `useUnlocks()` hook to check flags and conditionally render buttons/panels. Unlock triggers are added to existing service functions (combat win, building built, etc.). A toast component shows "新系统已解锁：XXX" on new unlocks.

**Tech Stack:** TypeScript, tRPC, React hooks, Prisma

---

## Unlock Map

| Flag Name | Trigger | Unlocks |
|-----------|---------|---------|
| *(always)* | Registration | 探索(冒险Hub), 角色列表, 日志Hub |
| `combat_system` | First combat started | 战斗按钮 |
| `building_system` | First building built (via card) | 经济面板, 内城 |
| `recruit_system` | First character recruited | 角色详情 |
| `shop_system` | Discover merchant facility | 商店 (already triggered) |
| `altar_system` | Discover altar facility | 祭坛 (already triggered) |
| `portal_system` | Discover portal facility | 传送门 (already triggered) |
| `equipment_system` | First equipment obtained | 装备面板 |
| `card_system` | First card obtained | 背包/卡牌 |
| `progression_system` | Player level >= 5 | 进阶Hub (突破/职业) |
| `boss_system` | First boss defeated | Boss面板 |

---

### Task 1: Return unlockFlags from player.getStatus

**Files:**
- Modify: `src/server/api/repositories/player.repo.ts`
- Modify: `src/server/api/services/player.service.ts`

**Step 1: Add unlockFlags to findPlayerWithFullDetails**

In `src/server/api/repositories/player.repo.ts`, add `unlockFlags: true` to the include in `findPlayerWithFullDetails`:

```typescript
export function findPlayerWithFullDetails(db: DbClient, userId: string) {
  return db.player.findUnique({
    where: { userId },
    include: {
      profession: { include: { profession: true } },
      characters: {
        include: {
          character: true,
          profession: { include: { profession: true } },
          learnedSkills: { include: { skill: true } },
        },
      },
      cards: { include: { card: true } },
      buildings: { include: { building: true } },
      learnedSkills: { include: { skill: true } },
      unlockFlags: true,  // ADD THIS LINE
    },
  });
}
```

**Step 2: Transform flags to string array in getPlayerStatus**

In `src/server/api/services/player.service.ts`, update `getPlayerStatus` to include flags:

```typescript
export async function getPlayerStatus(db: FullDbClient, userId: string) {
  const player = await findPlayerWithFullDetails(db, userId);
  if (!player) throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });

  const { stamina } = calculateCurrentStamina(
    player.stamina, player.maxStamina, player.staminaPerMin, player.lastStaminaUpdate,
  );

  return {
    ...player,
    stamina,
    skillSlots: player.tier * 6,
    currentGameDay: getCurrentGameDay(),
    unlockedSystems: player.unlockFlags.map(f => f.flagName),  // ADD THIS LINE
  };
}
```

**Step 3: Typecheck**

Run: `bun run typecheck`

**Step 4: Commit**

```bash
git add src/server/api/repositories/player.repo.ts src/server/api/services/player.service.ts
git commit -m "feat: return unlockFlags in player.getStatus"
```

---

### Task 2: Add unlock triggers to existing services

**Files:**
- Modify: `src/server/api/services/combat.service.ts`
- Modify: `src/server/api/services/card.service.ts`
- Modify: `src/server/api/services/boss.service.ts`
- Modify: `src/server/api/services/player.service.ts`

We need to call `upsertUnlockFlag` at key moments. Import from card.repo (already has this function).

**Step 1: Unlock `combat_system` on first combat**

In `src/server/api/services/combat.service.ts`, in the `startCombat` function, after creating the combat session (near end of function), add:

```typescript
import { upsertUnlockFlag } from "../repositories/card.repo";

// After combatSession.create(...), before return:
await upsertUnlockFlag(db, player.id, "combat_system");
```

**Step 2: Unlock `building_system` on first build**

In `src/server/api/services/card.service.ts`, in `useBuildingCard`, after creating the building (after `db.playerBuilding.create`), add:

```typescript
// Already imports upsertUnlockFlag via cardRepo
await cardRepo.upsertUnlockFlag(db, player.id, "building_system");
```

**Step 3: Unlock `recruit_system` on first recruit**

In `src/server/api/services/card.service.ts`, in `useRecruitCard`, after creating the character, add:

```typescript
await cardRepo.upsertUnlockFlag(db, player.id, "recruit_system");
```

**Step 4: Unlock `card_system` on first card obtained**

In `src/server/api/services/card.service.ts`, in `addCard`, after creating/updating the player card, add:

```typescript
await cardRepo.upsertUnlockFlag(db, player.id, "card_system");
```

**Step 5: Unlock `boss_system` on first boss defeat**

Read `src/server/api/services/boss.service.ts` to find the victory path. After boss defeat logic, add:

```typescript
import { upsertUnlockFlag } from "../repositories/card.repo";
// After boss defeat:
await upsertUnlockFlag(db, player.id, "boss_system");
```

**Step 6: Unlock `progression_system` on level up to 5**

In `src/server/api/services/player.service.ts`, in `levelUp`, after updating the player, add:

```typescript
import { upsertUnlockFlag } from "../repositories/card.repo";

// After updatePlayer, check new level:
if (newLevel >= 5) {
  await upsertUnlockFlag(db, player.id, "progression_system");
}
```

**Step 7: Unlock `equipment_system` on first equipment obtained**

Read `src/server/api/services/equipment.service.ts` to find the "add equipment" flow. After granting equipment, add the unlock flag.

**Step 8: Typecheck**

Run: `bun run typecheck`

**Step 9: Commit**

```bash
git add src/server/api/services/combat.service.ts src/server/api/services/card.service.ts src/server/api/services/boss.service.ts src/server/api/services/player.service.ts src/server/api/services/equipment.service.ts
git commit -m "feat: add unlock triggers for progressive system discovery"
```

---

### Task 3: Create useUnlocks hook

**Files:**
- Create: `src/hooks/use-unlocks.ts`

**Step 1: Create the hook**

```typescript
/**
 * Hook for checking which game systems are unlocked for the current player.
 * Uses the unlockedSystems array from player.getStatus.
 */

// Systems that are always available (no unlock needed)
const ALWAYS_UNLOCKED = new Set([
  "exploration",  // 探索/冒险Hub
  "character_list", // 角色列表
  "log",          // 日志Hub
  "settings",     // ESC菜单
]);

// Map of flag names to the systems they unlock
const FLAG_TO_SYSTEMS: Record<string, string[]> = {
  combat_system: ["combat"],
  building_system: ["economy", "inner_city"],
  recruit_system: ["character_detail"],
  shop_system: ["shop"],
  altar_system: ["altar"],
  portal_system: ["portal"],
  equipment_system: ["equipment"],
  card_system: ["backpack"],
  progression_system: ["progression"],
  boss_system: ["boss"],
};

export function useUnlocks(unlockedSystems: string[] | undefined) {
  const flags = new Set(unlockedSystems ?? []);

  const unlocked = new Set(ALWAYS_UNLOCKED);
  for (const [flag, systems] of Object.entries(FLAG_TO_SYSTEMS)) {
    if (flags.has(flag)) {
      for (const sys of systems) unlocked.add(sys);
    }
  }

  return {
    /** Check if a system is unlocked */
    has: (system: string) => unlocked.has(system),
    /** The raw flag set from the database */
    flags,
    /** All currently unlocked system names */
    all: unlocked,
  };
}
```

**Step 2: Commit**

```bash
git add src/hooks/use-unlocks.ts
git commit -m "feat: add useUnlocks hook for progressive UI"
```

---

### Task 4: Create UnlockToast component

**Files:**
- Create: `src/components/game/UnlockToast.tsx`

**Step 1: Create the toast component**

```tsx
"use client";

import { useState, useEffect, useRef } from "react";

const SYSTEM_LABELS: Record<string, { name: string; icon: string }> = {
  combat_system: { name: "战斗系统", icon: "⚔️" },
  building_system: { name: "建筑管理", icon: "🏗️" },
  recruit_system: { name: "角色详情", icon: "👥" },
  shop_system: { name: "商店", icon: "🛒" },
  altar_system: { name: "祭坛", icon: "⛩️" },
  portal_system: { name: "传送门", icon: "🌀" },
  equipment_system: { name: "装备系统", icon: "🛡️" },
  card_system: { name: "背包", icon: "🎒" },
  progression_system: { name: "进阶系统", icon: "⬆️" },
  boss_system: { name: "Boss挑战", icon: "👹" },
};

interface UnlockToastProps {
  unlockedSystems: string[];
}

export function UnlockToast({ unlockedSystems }: UnlockToastProps) {
  const [toasts, setToasts] = useState<Array<{ id: string; flag: string }>>([]);
  const prevFlags = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentFlags = new Set(unlockedSystems);
    const newFlags: string[] = [];

    for (const flag of currentFlags) {
      if (!prevFlags.current.has(flag) && SYSTEM_LABELS[flag]) {
        newFlags.push(flag);
      }
    }

    if (newFlags.length > 0) {
      const newToasts = newFlags.map(flag => ({
        id: `${flag}_${Date.now()}`,
        flag,
      }));
      setToasts(prev => [...prev, ...newToasts]);

      // Auto-remove after 4 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => !newToasts.some(nt => nt.id === t.id)));
      }, 4000);
    }

    prevFlags.current = currentFlags;
  }, [unlockedSystems]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2">
      {toasts.map(toast => {
        const label = SYSTEM_LABELS[toast.flag];
        if (!label) return null;
        return (
          <div
            key={toast.id}
            className="px-6 py-3 bg-[#0a0a15]/95 border border-[#c9a227] rounded-lg shadow-lg shadow-[#c9a227]/20 animate-in fade-in slide-in-from-top-4 duration-500"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{label.icon}</span>
              <div>
                <div className="text-xs text-[#c9a227] font-medium tracking-wider uppercase">新系统已解锁</div>
                <div className="text-[#e0dcd0] font-bold">{label.name}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/game/UnlockToast.tsx
git commit -m "feat: add UnlockToast component for system unlock notifications"
```

---

### Task 5: Integrate unlock checks into game page

**Files:**
- Modify: `src/app/game/page.tsx`

This is the main integration task. We need to:
1. Import `useUnlocks` and `UnlockToast`
2. Call `useUnlocks(player.unlockedSystems)`
3. Conditionally render buttons based on `unlocks.has("system_name")`
4. Add `<UnlockToast>` component

**Step 1: Add imports and hook call**

At the top of `GamePage`, after the player query, add:

```typescript
import { useUnlocks } from "~/hooks/use-unlocks";
import { UnlockToast } from "~/components/game/UnlockToast";

// Inside GamePage, after player data is loaded:
const unlocks = useUnlocks(player?.unlockedSystems);
```

**Step 2: Filter bottom-right quick actions**

Replace the static quick actions array (line ~234) with a filtered version:

```typescript
{[
  { icon: "👥", label: "角色", system: "character_list", onClick: () => { setCharacterHubTab("list"); setShowCharacterHub(true); } },
  { icon: "🎒", label: "背包", system: "backpack", onClick: () => { setInventoryHubTab("backpack"); setShowInventoryHub(true); } },
  { icon: "🗺️", label: "冒险", system: "exploration", onClick: () => { setAdventureHubTab("exploration"); setShowAdventureHub(true); } },
  { icon: "⚔️", label: "战斗", system: "combat", onClick: () => { setCombatLevel(1); setShowCombatPanel(true); } },
  { icon: "🏙️", label: "城市", system: "inner_city", onClick: () => setShowInnerCityPanel(true) },
].filter(a => unlocks.has(a.system)).map((action, i) => (
  // ... existing button JSX
))}
```

**Step 3: Filter bottom-center secondary actions**

```typescript
{[
  { icon: "📊", label: "经济", system: "economy", onClick: () => setShowEconomyPanel(true) },
  { icon: "⬆️", label: "进阶", system: "progression", onClick: () => { setProgressHubTab("profession"); setShowProgressHub(true); } },
  { icon: "🎴", label: "结算", system: "log", onClick: () => { setLogHubTab("settlement"); setShowLogHub(true); }, highlight: true },
  { icon: "📋", label: "记录", system: "log", onClick: () => { setLogHubTab("action"); setShowLogHub(true); } },
].filter(a => unlocks.has(a.system)).map((action, i) => (
  // ... existing button JSX
))}
```

**Step 4: Add UnlockToast**

Before the closing `</div>` of the main container, add:

```tsx
{player && <UnlockToast unlockedSystems={player.unlockedSystems} />}
```

**Step 5: Typecheck**

Run: `bun run typecheck`

**Step 6: Test manually**

1. Create a new account
2. Verify only 探索, 角色, 日志 buttons appear
3. Start combat → 战斗 button should appear with toast
4. Build something → 经济, 城市 should appear

**Step 7: Commit**

```bash
git add src/app/game/page.tsx
git commit -m "feat: integrate progressive unlock into game page UI"
```

---

### Task 6: Ensure new players get initial unlocks on registration

**Files:**
- Modify: `src/server/api/services/player.service.ts`

New players start with `building_system` and `card_system` already unlocked (since they get starter buildings and cards in `getOrCreatePlayer`).

**Step 1: Add initial unlocks in getOrCreatePlayer**

In `player.service.ts`, after `initializePlayerCards`, add:

```typescript
import { upsertUnlockFlag } from "../repositories/card.repo";

// In getOrCreatePlayer, after initializePlayerCards:
await upsertUnlockFlag(db, player.id, "building_system");
await upsertUnlockFlag(db, player.id, "card_system");
```

**Step 2: Typecheck + commit**

```bash
bun run typecheck
git add src/server/api/services/player.service.ts
git commit -m "feat: grant initial unlock flags on player registration"
```

---

### Task 7: Final verification

**Step 1: Full typecheck**

Run: `bun run typecheck`

**Step 2: Full test suite**

Run: `bun test`

**Step 3: Verify unlock flow**

Manually test the full unlock progression with a fresh account.

**Step 4: Commit any remaining changes**

```bash
git add -A
git commit -m "feat: complete progressive unlock guide system"
```
