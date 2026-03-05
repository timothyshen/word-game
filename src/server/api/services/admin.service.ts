/**
 * Admin Service — admin business logic
 * Currently all admin operations are pure CRUD, so we re-export from the repository.
 */
export {
  getCards, getCard, createCard, updateCard, deleteCard,
  getStoryChapters, getStoryChapter, createStoryChapter, updateStoryChapter, deleteStoryChapter,
  createStoryNode, updateStoryNode, deleteStoryNode, reorderStoryNodes,
  getAdventures, getAdventure, createAdventure, updateAdventure, deleteAdventure,
  getBuildings, getBuilding, createBuilding, updateBuilding, deleteBuilding,
  getCharacters, getCharacter, createCharacter, updateCharacter, deleteCharacter,
  getSkills, getSkill, createSkill, updateSkill, deleteSkill,
  getEquipments, getEquipment, createEquipment, updateEquipment, deleteEquipment,
  getProfessions, getProfession, createProfession, updateProfession, deleteProfession,
  getPois, getPoi, createPoi, updatePoi, deletePoi,
  getStats,
} from "../repositories/admin.repo";
