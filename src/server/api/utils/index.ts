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
  logActionInternal,
  type ActionType,
} from "./player-utils";

export {
  grantRandomCard,
  grantRandomCards,
  type CardGrantResult,
} from "./card-utils";
