/**
 * 游戏常量
 * 统一管理体力消耗、战斗数值等游戏数据
 */

/**
 * 体力消耗常量
 */
export const STAMINA_COSTS = {
  MOVE: 5,           // 移动一格
  HARVEST: 10,       // 采集资源
  REST: 5,           // 休息（消耗食物恢复）
  EXPLORE: 15,       // 探索未知区域
  COMBAT_START: 15,  // 开始战斗
  PRAY: 5,           // 神殿祈祷
  TRADE: 5,          // 商队交易
} as const;

/**
 * 战斗相关常量
 */
export const COMBAT = {
  BASE_CRIT_RATE: 0.15,
  CRIT_MULTIPLIER: 1.5,
  SKILL_MULTIPLIER: 1.5,
  DEFEND_DAMAGE_REDUCTION: 0.5,
  FLEE_BASE_CHANCE: 0.5,
  FLEE_SPEED_BONUS: 0.3,
} as const;

/**
 * 资源相关常量
 */
export const RESOURCES = {
  REST_FOOD_COST: 10,
  REST_STAMINA_RESTORE: 30,
  HARVEST_MIN: 10,
  HARVEST_VARIANCE: 10,
} as const;

/**
 * 内城网格常量
 */
export const INNER_CITY = {
  INITIAL_GRID_RADIUS: 2,
  INITIAL_SPACE_CAPACITY: 50,
  BUILDING_HEIGHT_PER_LEVEL: 0.5,
} as const;

/**
 * 外城地图常量
 */
export const OUTER_CITY = {
  MAP_RADIUS: 3,
  GRID_SIZE: 40,
  POI_RESPAWN_HOURS: 24,
} as const;

/**
 * 每日/每周重置相关
 */
export const RESET = {
  BOSS_WEEKLY_ATTEMPTS: 3,
  ALTAR_DAILY_FREE_DRAWS: 1,
  SHOP_DAILY_STOCK_REFRESH: true,
} as const;
