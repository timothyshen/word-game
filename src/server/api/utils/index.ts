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
  rollRarity,
  type CardGrantResult,
} from "./card-utils";

export {
  grantRandomEquipment,
  getEquipmentDropTable,
  type EquipmentDropResult,
} from "./equipment-utils";

export {
  getCharacterTemplateId,
  parseCharacterState,
  resetCharacterTemplateCache,
  type CharacterEntityState,
  type CharacterEntity,
} from "./character-utils";

export {
  getCardTemplateId,
  parseCardState,
  resetCardTemplateCache,
  addCardEntity,
  consumeCardEntity,
  findCardEntityByCardId,
  findPlayerCardEntities,
  type CardEntityState,
  type CardEntity,
} from "./card-entity-utils";

export {
  getBuildingTemplateId,
  parseBuildingState,
  resetBuildingTemplateCache,
  createBuildingEntity,
  findPlayerBuildingEntities,
  findBuildingEntityById,
  findBuildingEntityByPosition,
  findBuildingEntityByBuildingId,
  findBuildingByAssignedChar,
  type BuildingEntityState,
  type BuildingEntity,
} from "./building-utils";
