/**
 * Hint Service — computes contextual hints from player state
 */

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
  characterCount: number;
  buildingCardCount: number;
  recruitCardCount: number;
  idleBuildingCount: number;
  learnedSkills: Array<{ id: string }>;
  unlockFlags: Array<{ flagName: string }>;
}

export function computeHints(player: PlayerForHints, currentGameDay: number): HintItem[] {
  const hints: HintItem[] = [];
  const flags = new Set(player.unlockFlags.map(f => f.flagName));

  // ── HIGH PRIORITY: Status alerts ──

  const expNeeded = Math.floor(100 * Math.pow(1.15, player.level - 1));
  const maxLevelForTier = player.tier * 20;
  if (player.exp >= expNeeded && player.level < maxLevelForTier) {
    hints.push({ id: "can_level_up", priority: "high", type: "status", icon: "⬆️", message: "经验足够，可以升级！", action: "levelUp" });
  }

  if (player.lastSettlementDay < currentGameDay) {
    hints.push({ id: "settlement_available", priority: "high", type: "status", icon: "🎴", message: "今日结算奖励可领取", action: "logHub:settlement" });
  }

  if (player.stamina >= player.maxStamina) {
    hints.push({ id: "stamina_full", priority: "high", type: "status", icon: "⚡", message: "体力已满，别浪费了！", action: "adventureHub:exploration" });
  }

  // ── MEDIUM PRIORITY: Actionable items ──

  if (player.buildingCardCount > 0) {
    hints.push({ id: "has_building_cards", priority: "medium", type: "status", icon: "🏗️", message: "你有建筑卡可以使用", action: "innerCity" });
  }

  if (player.recruitCardCount > 0) {
    hints.push({ id: "has_recruit_cards", priority: "medium", type: "status", icon: "👥", message: "你有招募卡可以使用", action: "inventoryHub:backpack" });
  }

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

  if (player.idleBuildingCount > 0 && player.characterCount > 0) {
    hints.push({ id: "idle_buildings", priority: "low", type: "tip", icon: "🏠", message: `${player.idleBuildingCount}个建筑未分配工人`, action: "innerCity" });
  }

  const foodNeeded = player.characterCount * 5 * 3;
  if (player.food < foodNeeded && player.characterCount > 0) {
    hints.push({ id: "low_food", priority: "low", type: "tip", icon: "🍞", message: "食物储备不足，建议建造农田", action: "innerCity" });
  }

  const skillSlots = player.tier * 6;
  if (player.learnedSkills.length < skillSlots && flags.has("progression_system")) {
    hints.push({ id: "unused_skill_slots", priority: "low", type: "tip", icon: "📖", message: "还有空闲技能槽位", action: "progressHub:profession" });
  }

  return hints;
}
