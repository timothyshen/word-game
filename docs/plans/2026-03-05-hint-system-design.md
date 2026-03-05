# Smart Hint System Design

## Goal

Provide contextual hints telling players what they can do right now, combining a HUD overlay (top 2 hints) with a full guidance panel.

## Architecture

Backend computes hints from existing player state in `player.getStatus` — no new DB tables needed. Returns `hints: HintItem[]` sorted by priority. Frontend displays top 2 in HUD, full list in a modal panel. Tutorial "read" state stored as `unlockFlag` entries (e.g., `tutorial_combat_read`).

## HintItem Shape

```typescript
interface HintItem {
  id: string;
  priority: "high" | "medium" | "low";
  type: "status" | "tutorial" | "tip";
  icon: string;
  message: string;
  action?: string; // panel to open on click
}
```

## Hint Rules

| ID | Priority | Type | Condition | Message | Action |
|---|---|---|---|---|---|
| `can_level_up` | high | status | exp >= expNeeded && level < maxLevel | 经验足够，可以升级！ | levelUp |
| `settlement_available` | high | status | lastSettlementDay < currentDay | 今日结算奖励可领取 | logHub:settlement |
| `stamina_full` | high | status | stamina >= maxStamina | 体力已满，别浪费了！ | adventureHub:exploration |
| `has_building_cards` | medium | status | has type=building cards | 你有建筑卡可以使用 | innerCity |
| `has_recruit_cards` | medium | status | has type=recruit cards | 你有招募卡可以使用 | inventoryHub:backpack |
| `boss_available` | medium | status | weekly boss attempts remaining | 本周还有N次Boss挑战 | adventureHub:boss |
| `tutorial_*` | medium | tutorial | system just unlocked && not read | Per-system tutorial text | corresponding panel |
| `idle_buildings` | low | tip | buildings without workers | N个建筑未分配工人 | innerCity |
| `low_food` | low | tip | food < characters×5×3 | 食物储备不足，建议建造农田 | innerCity |
| `unused_skill_slots` | low | tip | learnedSkills < tier×6 | 还有空闲技能槽位 | progressHub:profession |

## UI

### HUD Hint Bar (left-center, above resources)
- Max 2 highest-priority hints
- One line each: icon + text + clickable
- "查看全部(N)" button at bottom opens full panel
- Hidden when no hints

### Full Guidance Panel (modal)
- Three sections: 紧急事项 (high), 系统教学 (tutorial), 效率建议 (low)
- Each hint has action button to jump to panel
- Tutorial hints have "知道了" dismiss button (writes `tutorial_xxx_read` unlockFlag)
- Style consistent with existing Hub panels

## Tutorial Texts (frontend constants)

| Flag | Text |
|---|---|
| combat_system | 战斗系统已解锁 — 在野外遭遇怪物可进入战斗，击败后获得经验和卡牌 |
| building_system | 建筑系统已解锁 — 使用建筑卡在内城放置建筑，建筑会每日产出资源 |
| recruit_system | 招募系统已解锁 — 使用招募卡可获得新角色，角色可分配到建筑增加产出 |
| card_system | 背包系统已解锁 — 在背包中管理你的卡牌，不同类型卡牌有不同用途 |
| progression_system | 进阶系统已解锁 — 可以突破职阶提升等级上限，学习职业获得加成 |
| boss_system | Boss系统已解锁 — 每周可挑战Boss获取丰厚奖励，每周一重置次数 |
| equipment_system | 装备系统已解锁 — 给角色穿戴装备提升战斗属性，装备可以强化 |
