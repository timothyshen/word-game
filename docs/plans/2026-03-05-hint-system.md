# Smart Hint System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a contextual hint system that tells players what they can do right now, with a HUD overlay showing top 2 hints and a full guidance panel.

**Architecture:** Backend computes hints from existing player state in `getPlayerStatus` (no new DB tables). Returns `hints: HintItem[]` sorted by priority. Frontend displays top 2 in a HUD bar (left-center), full list in a modal panel. Tutorial "read" state uses existing `unlockFlag` table with `tutorial_xxx_read` entries.

**Tech Stack:** TypeScript, tRPC, React, Prisma (existing unlockFlag model)

---

### Task 1: Create hint computation service

**Files:**
- Create: `src/server/api/services/hint.service.ts`

**Step 1: Create the hint service**

This is a pure function that takes player data (already fetched by `getPlayerStatus`) and returns hints. No extra DB queries needed — all data is already in the player object from `findPlayerWithFullDetails`.

```typescript
/**
 * Hint Service — computes contextual hints from player state
 */
import { getCurrentGameDay } from "../utils/game-time";

export interface HintItem {
  id: string;
  priority: "high" | "medium" | "low";
  type: "status" | "tutorial" | "tip";
  icon: string;
  message: string;
  action?: string;
}

const TUTORIAL_TEXTS: Record<string, { icon: string; message: string; action: string }> = {
  combat_system: { icon: "⚔️", message: "战斗系统已解锁 — 在野外遭遇怪物可进入战斗，击败后获得经验和卡牌", action: "combat" },
  building_system: { icon: "🏗️", message: "建筑系统已解锁 — 使用建筑卡在内城放置建筑，建筑会每日产出资源", action: "innerCity" },
  recruit_system: { icon: "👥", message: "招募系统已解锁 — 使用招募卡可获得新角色，角色可分配到建筑增加产出", action: "inventoryHub:backpack" },
  card_system: { icon: "🎒", message: "背包系统已解锁 — 在背包中管理你的卡牌，不同类型卡牌有不同用途", action: "inventoryHub:backpack" },
  progression_system: { icon: "⬆️", message: "进阶系统已解锁 — 可以突破职阶提升等级上限，学习职业获得加成", action: "progressHub:profession" },
  boss_system: { icon: "👹", message: "Boss系统已解锁 — 每周可挑战Boss获取丰厚奖励，每周一重置次数", action: "adventureHub:boss" },
  equipment_system: { icon: "🛡️", message: "装备系统已解锁 — 给角色穿戴装备提升战斗属性，装备可以强化", action: "characterHub:equipment" },
};

interface PlayerForHints {
  level: number;
  tier: number;
  exp: number;
  stamina: number;
  maxStamina: number;
  lastSettlementDay: number;
  food: number;
  characters: Array<{ id: string }>;
  cards: Array<{ card: { type: string }; quantity: number }>;
  buildings: Array<{ building: { baseEffects: string }; assignedCharId: string | null }>;
  learnedSkills: Array<{ id: string }>;
  unlockFlags: Array<{ flagName: string }>;
}

export function computeHints(player: PlayerForHints, currentGameDay: number): HintItem[] {
  const hints: HintItem[] = [];
  const flags = new Set(player.unlockFlags.map(f => f.flagName));

  // ── HIGH PRIORITY: Status alerts ──

  // Can level up
  const expNeeded = Math.floor(100 * Math.pow(1.15, player.level - 1));
  const maxLevelForTier = player.tier * 20;
  if (player.exp >= expNeeded && player.level < maxLevelForTier) {
    hints.push({ id: "can_level_up", priority: "high", type: "status", icon: "⬆️", message: "经验足够，可以升级！", action: "levelUp" });
  }

  // Settlement available
  if (player.lastSettlementDay < currentGameDay) {
    hints.push({ id: "settlement_available", priority: "high", type: "status", icon: "🎴", message: "今日结算奖励可领取", action: "logHub:settlement" });
  }

  // Stamina full
  if (player.stamina >= player.maxStamina) {
    hints.push({ id: "stamina_full", priority: "high", type: "status", icon: "⚡", message: "体力已满，别浪费了！", action: "adventureHub:exploration" });
  }

  // ── MEDIUM PRIORITY: Actionable items ──

  // Has building cards
  const buildingCards = player.cards.filter(c => c.card.type === "building" && c.quantity > 0);
  if (buildingCards.length > 0) {
    hints.push({ id: "has_building_cards", priority: "medium", type: "status", icon: "🏗️", message: "你有建筑卡可以使用", action: "innerCity" });
  }

  // Has recruit cards
  const recruitCards = player.cards.filter(c => c.card.type === "recruit" && c.quantity > 0);
  if (recruitCards.length > 0) {
    hints.push({ id: "has_recruit_cards", priority: "medium", type: "status", icon: "👥", message: "你有招募卡可以使用", action: "inventoryHub:backpack" });
  }

  // Tutorial hints for newly unlocked systems
  for (const [flag, tutorial] of Object.entries(TUTORIAL_TEXTS)) {
    if (flags.has(flag) && !flags.has(`tutorial_${flag}_read`)) {
      hints.push({
        id: `tutorial_${flag}`,
        priority: "medium",
        type: "tutorial",
        icon: tutorial.icon,
        message: tutorial.message,
        action: tutorial.action,
      });
    }
  }

  // ── LOW PRIORITY: Tips ──

  // Buildings without workers
  const idleBuildings = player.buildings.filter(b => !b.assignedCharId);
  if (idleBuildings.length > 0 && player.characters.length > 0) {
    hints.push({ id: "idle_buildings", priority: "low", type: "tip", icon: "🏠", message: `${idleBuildings.length}个建筑未分配工人`, action: "innerCity" });
  }

  // Low food warning
  const foodNeeded = player.characters.length * 5 * 3; // 3 days reserve
  if (player.food < foodNeeded && player.characters.length > 0) {
    hints.push({ id: "low_food", priority: "low", type: "tip", icon: "🍞", message: "食物储备不足，建议建造农田", action: "innerCity" });
  }

  // Unused skill slots
  const skillSlots = player.tier * 6;
  if (player.learnedSkills.length < skillSlots && flags.has("progression_system")) {
    hints.push({ id: "unused_skill_slots", priority: "low", type: "tip", icon: "📖", message: "还有空闲技能槽位", action: "progressHub:profession" });
  }

  return hints;
}
```

**Step 2: Typecheck**

Run: `bun run typecheck`

**Step 3: Commit**

```bash
git add src/server/api/services/hint.service.ts
git commit -m "feat: add hint computation service"
```

---

### Task 2: Integrate hints into player.getStatus

**Files:**
- Modify: `src/server/api/services/player.service.ts`

**Step 1: Add hints to getPlayerStatus return value**

In `src/server/api/services/player.service.ts`, import `computeHints` and add it to the return:

```typescript
// Add import at top:
import { computeHints } from "./hint.service";

// In getPlayerStatus, change the return to:
export async function getPlayerStatus(db: FullDbClient, userId: string) {
  const player = await findPlayerWithFullDetails(db, userId);
  if (!player) throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });

  const { stamina } = calculateCurrentStamina(
    player.stamina, player.maxStamina, player.staminaPerMin, player.lastStaminaUpdate,
  );

  const currentGameDay = getCurrentGameDay();

  return {
    ...player,
    stamina,
    skillSlots: player.tier * 6,
    currentGameDay,
    unlockedSystems: player.unlockFlags.map(f => f.flagName),
    hints: computeHints(player, currentGameDay),
  };
}
```

**Step 2: Typecheck**

Run: `bun run typecheck`

**Step 3: Commit**

```bash
git add src/server/api/services/player.service.ts
git commit -m "feat: include computed hints in player.getStatus"
```

---

### Task 3: Add dismissTutorial mutation

**Files:**
- Modify: `src/server/api/routers/core/player.ts`

**Step 1: Add dismissTutorial endpoint**

In `src/server/api/routers/core/player.ts`, add a new mutation that marks a tutorial as read by upserting an unlockFlag:

```typescript
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as playerService from "../../services/player.service";
import { upsertUnlockFlag } from "../../repositories/card.repo";
import { findPlayerByUserId } from "../../repositories/player.repo";

// Add inside createTRPCRouter({...}):

  dismissTutorial: protectedProcedure
    .input(z.object({ flag: z.string().regex(/^tutorial_\w+_read$/) }))
    .mutation(async ({ ctx, input }) => {
      const player = await findPlayerByUserId(ctx.db, ctx.session.user.id);
      if (!player) return { success: false };
      await upsertUnlockFlag(ctx.db, player.id, input.flag);
      return { success: true };
    }),
```

**Step 2: Typecheck**

Run: `bun run typecheck`

**Step 3: Commit**

```bash
git add src/server/api/routers/core/player.ts
git commit -m "feat: add dismissTutorial mutation for hint system"
```

---

### Task 4: Create HintBar HUD component

**Files:**
- Create: `src/components/game/HintBar.tsx`

**Step 1: Create the HUD hint bar**

This shows the top 2 hints in a compact bar on the left side of the screen.

```tsx
"use client";

import type { HintItem } from "~/server/api/services/hint.service";

interface HintBarProps {
  hints: HintItem[];
  onHintClick: (action: string) => void;
  onShowAll: () => void;
}

export function HintBar({ hints, onHintClick, onShowAll }: HintBarProps) {
  if (hints.length === 0) return null;

  const topHints = hints.slice(0, 2);

  return (
    <div className="flex flex-col gap-1.5 w-64">
      {topHints.map(hint => (
        <button
          key={hint.id}
          onClick={() => hint.action && onHintClick(hint.action)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs transition-all hover:scale-[1.02] ${
            hint.priority === "high"
              ? "bg-[#c9a227]/15 border border-[#c9a227]/40 text-[#c9a227]"
              : hint.type === "tutorial"
                ? "bg-[#4a9eff]/10 border border-[#4a9eff]/30 text-[#4a9eff]"
                : "bg-[#0a0a15]/80 border border-[#2a3a4a] text-[#8a8a8a]"
          }`}
        >
          <span className="text-base shrink-0">{hint.icon}</span>
          <span className="truncate">{hint.message}</span>
        </button>
      ))}
      {hints.length > 2 && (
        <button
          onClick={onShowAll}
          className="text-[10px] text-[#5a6a7a] hover:text-[#c9a227] transition-colors text-center py-1"
        >
          查看全部({hints.length})
        </button>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/game/HintBar.tsx
git commit -m "feat: add HintBar HUD component"
```

---

### Task 5: Create GuidancePanel full modal

**Files:**
- Create: `src/components/game/panels/GuidancePanel.tsx`

**Step 1: Create the full guidance panel**

```tsx
"use client";

import { api } from "~/trpc/react";
import type { HintItem } from "~/server/api/services/hint.service";

interface GuidancePanelProps {
  hints: HintItem[];
  onClose: () => void;
  onHintClick: (action: string) => void;
}

const PRIORITY_CONFIG = {
  high: { label: "紧急事项", color: "#c9a227", borderColor: "#c9a227" },
  medium: { label: "系统教学", color: "#4a9eff", borderColor: "#4a9eff" },
  low: { label: "效率建议", color: "#5a6a7a", borderColor: "#3a4a5a" },
} as const;

export function GuidancePanel({ hints, onClose, onHintClick }: GuidancePanelProps) {
  const utils = api.useUtils();
  const dismissMutation = api.player.dismissTutorial.useMutation({
    onSuccess: () => void utils.player.getStatus.invalidate(),
  });

  const grouped = {
    high: hints.filter(h => h.priority === "high"),
    medium: hints.filter(h => h.priority === "medium"),
    low: hints.filter(h => h.priority === "low"),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050810]/80 backdrop-blur-sm">
      <div className="w-[480px] max-h-[80vh] bg-[#0a0a15]/95 border border-[#2a3a4a] rounded-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2a3a4a] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#c9a227]">引导</h2>
            <p className="text-xs text-[#5a6a7a]">当前可以做的事情</p>
          </div>
          <button
            onClick={onClose}
            className="text-[#5a6a7a] hover:text-[#e0dcd0] text-xl transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {(["high", "medium", "low"] as const).map(priority => {
            const items = grouped[priority];
            if (items.length === 0) return null;
            const config = PRIORITY_CONFIG[priority];

            return (
              <div key={priority}>
                <div className="text-xs font-medium mb-2" style={{ color: config.color }}>
                  {config.label}
                </div>
                <div className="flex flex-col gap-2">
                  {items.map(hint => (
                    <div
                      key={hint.id}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors"
                      style={{ borderColor: `${config.borderColor}40`, backgroundColor: `${config.borderColor}08` }}
                    >
                      <span className="text-xl shrink-0">{hint.icon}</span>
                      <span className="flex-1 text-sm text-[#e0dcd0]">{hint.message}</span>
                      <div className="flex gap-2 shrink-0">
                        {hint.type === "tutorial" && (
                          <button
                            onClick={() => {
                              const flag = hint.id.replace("tutorial_", "tutorial_") + "_read";
                              dismissMutation.mutate({ flag: `tutorial_${hint.id.replace("tutorial_", "")}_read` });
                            }}
                            className="px-2 py-1 text-[10px] text-[#5a6a7a] hover:text-[#e0dcd0] border border-[#2a3a4a] rounded transition-colors"
                          >
                            知道了
                          </button>
                        )}
                        {hint.action && hint.action !== "levelUp" && (
                          <button
                            onClick={() => {
                              onHintClick(hint.action!);
                              onClose();
                            }}
                            className="px-2 py-1 text-[10px] border rounded transition-colors"
                            style={{ color: config.color, borderColor: `${config.borderColor}60` }}
                          >
                            前往
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {hints.length === 0 && (
            <div className="text-center py-12 text-[#5a6a7a]">
              <div className="text-4xl mb-2">✨</div>
              <div className="text-sm">一切就绪，自由探索吧！</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/game/panels/GuidancePanel.tsx
git commit -m "feat: add GuidancePanel full modal for hint system"
```

---

### Task 6: Integrate hint components into game page

**Files:**
- Modify: `src/app/game/page.tsx`

**Step 1: Add imports**

```typescript
import { HintBar } from "~/components/game/HintBar";
import { GuidancePanel } from "~/components/game/panels/GuidancePanel";
```

**Step 2: Add guidance panel state**

After the existing state declarations (around line 50), add:

```typescript
const [showGuidancePanel, setShowGuidancePanel] = useState(false);
```

**Step 3: Create a hint action handler**

After the `levelUpMutation` declaration (around line 96), add a function that translates hint action strings into panel opens:

```typescript
const handleHintAction = (action: string) => {
  if (action === "levelUp") {
    levelUpMutation.mutate();
    return;
  }
  const [hub, tab] = action.split(":");
  switch (hub) {
    case "logHub": setLogHubTab(tab ?? "settlement"); setShowLogHub(true); break;
    case "adventureHub": setAdventureHubTab(tab ?? "exploration"); setShowAdventureHub(true); break;
    case "inventoryHub": setInventoryHubTab(tab ?? "backpack"); setShowInventoryHub(true); break;
    case "progressHub": setProgressHubTab(tab ?? "profession"); setShowProgressHub(true); break;
    case "characterHub": setCharacterHubTab(tab ?? "list"); setShowCharacterHub(true); break;
    case "innerCity": setShowInnerCityPanel(true); break;
    case "combat": setCombatLevel(1); setShowCombatPanel(true); break;
  }
};
```

**Step 4: Add HintBar to the HUD**

In the HUD overlay section, after the "Bottom-left: Resources" div (after line ~231), add:

```tsx
        {/* Left-center: Hints */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-auto">
          <div className={`transition-all duration-500 delay-250 ${showHUD ? "translate-x-0 opacity-100" : "-translate-x-8 opacity-0"}`}>
            {player.hints && (
              <HintBar
                hints={player.hints}
                onHintClick={handleHintAction}
                onShowAll={() => setShowGuidancePanel(true)}
              />
            )}
          </div>
        </div>
```

**Step 5: Add GuidancePanel modal**

Before the UnlockToast component (before the `{/* 解锁通知 */}` comment), add:

```tsx
      {/* 引导面板 */}
      {showGuidancePanel && player && (
        <GuidancePanel
          hints={player.hints}
          onClose={() => setShowGuidancePanel(false)}
          onHintClick={handleHintAction}
        />
      )}
```

**Step 6: Add showGuidancePanel to ESC handler**

In the ESC key handler (line ~78), add `showGuidancePanel` to the check:

```typescript
if (showCharacterHub || showInventoryHub || showAdventureHub || showProgressHub || showLogHub || showEconomyPanel || showCombatPanel || showInnerCityPanel || showGuidancePanel) {
```

Also add it to the useEffect dependency array.

**Step 7: Typecheck**

Run: `bun run typecheck`

**Step 8: Commit**

```bash
git add src/app/game/page.tsx
git commit -m "feat: integrate hint bar and guidance panel into game page"
```

---

### Task 7: Final verification

**Step 1: Full typecheck**

Run: `bun run typecheck`

**Step 2: Full test suite**

Run: `bun test`

**Step 3: Commit any remaining changes**

```bash
git add -A
git commit -m "feat: complete smart hint system"
```
