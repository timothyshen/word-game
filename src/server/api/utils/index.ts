/**
 * API 工具函数导出
 */

export {
  getCurrentGameDay,
  getTodayString,
  getWeekStartDate,
  getWeekString,
} from "./game-time";

export {
  getPlayerOrThrow,
  getPlayerByUserId,
  calculateCurrentStamina,
  updatePlayerResources,
  addPlayerResources,
  hasEnoughResources,
  deductResourcesOrThrow,
  type ResourceType,
  type ResourceUpdates,
} from "./player-utils";
