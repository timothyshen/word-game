/**
 * 游戏颜色常量
 * 统一管理稀有度、等级、地形等颜色定义
 */

/**
 * 稀有度颜色映射
 * 用于卡牌、装备、角色等
 */
export const RARITY_COLORS: Record<string, string> = {
  普通: "#888",
  精良: "#4a9",
  稀有: "#59b",
  史诗: "#e67e22",
  传说: "#c9a227",
};

/**
 * 评级颜色映射
 * 用于结算评级等
 */
export const GRADE_COLORS: Record<string, string> = {
  S: "#c9a227",
  A: "#4a9",
  B: "#59b",
  C: "#888",
  D: "#666",
};

/**
 * 地形颜色映射
 * 用于外城地图
 */
export const BIOME_COLORS: Record<string, string> = {
  grassland: "#5a9a6a",
  forest: "#3d7a37",
  mountain: "#8a8a8a",
  desert: "#d4b44a",
  swamp: "#4d7a5a",
};

/**
 * 地形图标映射
 */
export const BIOME_ICONS: Record<string, string> = {
  grassland: "🌿",
  forest: "🌲",
  mountain: "⛰️",
  desert: "🏜️",
  swamp: "🌊",
};

/**
 * POI类型颜色映射
 */
export const POI_COLORS: Record<string, string> = {
  resource: "#4a9",
  garrison: "#e74c3c",
  lair: "#9b59b6",
  settlement: "#3498db",
  shrine: "#f1c40f",
  ruin: "#95a5a6",
  caravan: "#e67e22",
};

/**
 * POI类型图标映射
 */
export const POI_ICONS: Record<string, string> = {
  resource: "💎",
  garrison: "⚔️",
  lair: "🐉",
  settlement: "🏘️",
  shrine: "🏛️",
  ruin: "🏚️",
  caravan: "🐪",
};

/**
 * 行动类型图标映射
 */
export const ACTION_ICONS: Record<string, string> = {
  build: "🏗️",
  explore: "🧭",
  combat: "⚔️",
  research: "📚",
  craft: "⚒️",
  trade: "💰",
  rest: "💤",
  upgrade: "⬆️",
  production: "📦",
  gathering: "🧺",
  portal: "🌀",
  recruit: "👤",
};

/**
 * 装备槽位图标映射
 */
export const EQUIPMENT_SLOT_ICONS: Record<string, string> = {
  mainHand: "🗡️",
  offHand: "🛡️",
  head: "🪖",
  chest: "🥋",
  belt: "🎗️",
  hands: "🧤",
  legs: "👖",
  feet: "👢",
  neck: "📿",
  ring1: "💍",
  ring2: "💎",
};

/**
 * 获取稀有度颜色，带默认值
 */
export function getRarityColor(rarity: string): string {
  return RARITY_COLORS[rarity] ?? "#888";
}

/**
 * 获取评级颜色，带默认值
 */
export function getGradeColor(grade: string): string {
  return GRADE_COLORS[grade] ?? "#888";
}

/**
 * 获取地形颜色，带默认值
 */
export function getBiomeColor(biome: string): string {
  return BIOME_COLORS[biome] ?? "#333";
}
