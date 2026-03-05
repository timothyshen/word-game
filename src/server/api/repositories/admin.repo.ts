/** Admin Repository — pure data access for Card, StoryChapter, StoryNode, Adventure, Building, Character, Skill, Equipment, Profession, OuterCityPOI, Stats */
import type { DbClient } from "./types";

// ===== Card =====

export function getCards(db: DbClient) {
  return db.card.findMany({ orderBy: { name: "asc" } });
}

export function getCard(db: DbClient, id: string) {
  return db.card.findUnique({ where: { id } });
}

export function createCard(
  db: DbClient,
  data: { name: string; type: string; rarity: string; description: string; icon: string; effects: string },
) {
  return db.card.create({ data });
}

export function updateCard(
  db: DbClient,
  input: { id: string } & Record<string, unknown>,
) {
  const { id, ...data } = input;
  return db.card.update({ where: { id }, data });
}

export async function deleteCard(db: DbClient, id: string) {
  await db.playerCard.deleteMany({ where: { cardId: id } });
  return db.card.delete({ where: { id } });
}

// ===== StoryChapter =====

export function getStoryChapters(db: DbClient) {
  return db.storyChapter.findMany({
    orderBy: { order: "asc" },
    include: { nodes: { orderBy: { order: "asc" } } },
  });
}

export function getStoryChapter(db: DbClient, id: string) {
  return db.storyChapter.findUnique({
    where: { id },
    include: { nodes: { orderBy: { order: "asc" } } },
  });
}

export function createStoryChapter(
  db: DbClient,
  data: { title: string; description: string; order: number; isActive: boolean; rewardsJson: string; unlockJson: string },
) {
  return db.storyChapter.create({ data });
}

export function updateStoryChapter(
  db: DbClient,
  input: { id: string } & Record<string, unknown>,
) {
  const { id, ...data } = input;
  return db.storyChapter.update({ where: { id }, data });
}

export function deleteStoryChapter(db: DbClient, id: string) {
  return db.storyChapter.delete({ where: { id } });
}

// ===== StoryNode =====

export function createStoryNode(
  db: DbClient,
  data: {
    chapterId: string; nodeId: string; title: string; content: string;
    speaker?: string; speakerIcon?: string; order: number;
    nextNodeId?: string; choicesJson?: string; rewardsJson?: string;
  },
) {
  return db.storyNode.create({ data });
}

export function updateStoryNode(
  db: DbClient,
  input: { id: string } & Record<string, unknown>,
) {
  const { id, ...data } = input;
  return db.storyNode.update({ where: { id }, data });
}

export function deleteStoryNode(db: DbClient, id: string) {
  return db.storyNode.delete({ where: { id } });
}

export async function reorderStoryNodes(
  db: DbClient,
  nodes: Array<{ id: string; order: number }>,
) {
  await Promise.all(
    nodes.map((node) =>
      db.storyNode.update({
        where: { id: node.id },
        data: { order: node.order },
      }),
    ),
  );
  return { success: true };
}

// ===== Adventure =====

export function getAdventures(db: DbClient) {
  return db.adventure.findMany({
    orderBy: [{ type: "asc" }, { minLevel: "asc" }],
  });
}

export function getAdventure(db: DbClient, id: string) {
  return db.adventure.findUnique({ where: { id } });
}

export function createAdventure(
  db: DbClient,
  data: {
    name: string; type: string; minLevel: number; maxLevel?: number;
    worldId?: string; weight: number; isActive: boolean; title: string;
    description: string; icon: string; optionsJson: string;
    rewardsJson?: string; monsterJson?: string;
  },
) {
  return db.adventure.create({ data });
}

export function updateAdventure(
  db: DbClient,
  input: { id: string } & Record<string, unknown>,
) {
  const { id, ...data } = input;
  return db.adventure.update({ where: { id }, data });
}

export function deleteAdventure(db: DbClient, id: string) {
  return db.adventure.delete({ where: { id } });
}

// ===== Building =====

export function getBuildings(db: DbClient) {
  return db.building.findMany({ orderBy: { name: "asc" } });
}

export function getBuilding(db: DbClient, id: string) {
  return db.building.findUnique({ where: { id } });
}

export function createBuilding(
  db: DbClient,
  data: { name: string; slot: string; icon: string; description: string; maxLevel: number; baseEffects: string },
) {
  return db.building.create({ data });
}

export function updateBuilding(
  db: DbClient,
  input: { id: string } & Record<string, unknown>,
) {
  const { id, ...data } = input;
  return db.building.update({ where: { id }, data });
}

export async function deleteBuilding(db: DbClient, id: string) {
  await db.innerCityBuilding.deleteMany({ where: { templateId: id } });
  await db.playerBuilding.deleteMany({ where: { buildingId: id } });
  return db.building.delete({ where: { id } });
}

// ===== Character =====

export function getCharacters(db: DbClient) {
  return db.character.findMany({ orderBy: { name: "asc" } });
}

export function getCharacter(db: DbClient, id: string) {
  return db.character.findUnique({ where: { id } });
}

export function createCharacter(
  db: DbClient,
  data: {
    name: string; baseClass: string; rarity: string; portrait: string;
    description: string; story?: string; baseAttack: number; baseDefense: number;
    baseSpeed: number; baseLuck: number; baseHp: number; baseMp: number; traits: string;
  },
) {
  return db.character.create({ data });
}

export function updateCharacter(
  db: DbClient,
  input: { id: string } & Record<string, unknown>,
) {
  const { id, ...data } = input;
  return db.character.update({ where: { id }, data });
}

export async function deleteCharacter(db: DbClient, id: string) {
  const pcs = await db.playerCharacter.findMany({
    where: { characterId: id },
    select: { id: true },
  });
  const pcIds = pcs.map((pc) => pc.id);
  if (pcIds.length > 0) {
    await db.heroInstance.deleteMany({ where: { characterId: { in: pcIds } } });
    await db.characterSkill.deleteMany({ where: { playerCharacterId: { in: pcIds } } });
    await db.characterProfession.deleteMany({ where: { playerCharacterId: { in: pcIds } } });
    await db.equippedItem.deleteMany({ where: { playerCharacterId: { in: pcIds } } });
    await db.playerCharacter.deleteMany({ where: { characterId: id } });
  }
  return db.character.delete({ where: { id } });
}

// ===== Skill =====

export function getSkills(db: DbClient) {
  return db.skill.findMany({ orderBy: { name: "asc" } });
}

export function getSkill(db: DbClient, id: string) {
  return db.skill.findUnique({ where: { id } });
}

export function createSkill(
  db: DbClient,
  data: {
    name: string; description: string; icon: string; type: string;
    category: string; effects: string; cooldown: number; levelData: string;
  },
) {
  return db.skill.create({ data });
}

export function updateSkill(
  db: DbClient,
  input: { id: string } & Record<string, unknown>,
) {
  const { id, ...data } = input;
  return db.skill.update({ where: { id }, data });
}

export async function deleteSkill(db: DbClient, id: string) {
  await db.playerSkill.deleteMany({ where: { skillId: id } });
  await db.characterSkill.deleteMany({ where: { skillId: id } });
  return db.skill.delete({ where: { id } });
}

// ===== Equipment =====

export function getEquipments(db: DbClient) {
  return db.equipment.findMany({ orderBy: { name: "asc" } });
}

export function getEquipment(db: DbClient, id: string) {
  return db.equipment.findUnique({ where: { id } });
}

export function createEquipment(
  db: DbClient,
  data: {
    name: string; slot: string; rarity: string; description: string; icon: string;
    attackBonus: number; defenseBonus: number; speedBonus: number; luckBonus: number;
    hpBonus: number; mpBonus: number; specialEffects?: string; requiredLevel: number;
  },
) {
  return db.equipment.create({ data });
}

export function updateEquipment(
  db: DbClient,
  input: { id: string } & Record<string, unknown>,
) {
  const { id, ...data } = input;
  return db.equipment.update({ where: { id }, data });
}

export async function deleteEquipment(db: DbClient, id: string) {
  const pes = await db.playerEquipment.findMany({
    where: { equipmentId: id },
    select: { id: true },
  });
  const peIds = pes.map((pe) => pe.id);
  if (peIds.length > 0) {
    await db.equippedItem.deleteMany({ where: { playerEquipmentId: { in: peIds } } });
    await db.playerEquipment.deleteMany({ where: { equipmentId: id } });
  }
  return db.equipment.delete({ where: { id } });
}

// ===== Profession =====

export function getProfessions(db: DbClient) {
  return db.profession.findMany({ orderBy: { name: "asc" } });
}

export function getProfession(db: DbClient, id: string) {
  return db.profession.findUnique({ where: { id } });
}

export function createProfession(
  db: DbClient,
  data: { name: string; description: string; bonuses: string; unlockConditions: string },
) {
  return db.profession.create({ data });
}

export function updateProfession(
  db: DbClient,
  input: { id: string } & Record<string, unknown>,
) {
  const { id, ...data } = input;
  return db.profession.update({ where: { id }, data });
}

export async function deleteProfession(db: DbClient, id: string) {
  await db.playerProfession.deleteMany({ where: { professionId: id } });
  await db.characterProfession.deleteMany({ where: { professionId: id } });
  return db.profession.delete({ where: { id } });
}

// ===== OuterCityPOI =====

export function getPois(db: DbClient) {
  return db.outerCityPOI.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] });
}

export function getPoi(db: DbClient, id: string) {
  return db.outerCityPOI.findUnique({ where: { id } });
}

export function createPoi(
  db: DbClient,
  data: {
    positionX: number; positionY: number; name: string; icon: string;
    type: string; difficulty: number; resourceType?: string;
    resourceAmount: number; guardianLevel: number;
  },
) {
  return db.outerCityPOI.create({ data });
}

export function updatePoi(
  db: DbClient,
  input: { id: string } & Record<string, unknown>,
) {
  const { id, ...data } = input;
  return db.outerCityPOI.update({ where: { id }, data });
}

export function deletePoi(db: DbClient, id: string) {
  return db.outerCityPOI.delete({ where: { id } });
}

// ===== Stats =====

interface AdminStats {
  cards: number;
  chapters: number;
  adventures: number;
  players: number;
  buildings: number;
  characters: number;
  skills: number;
  equipment: number;
  professions: number;
  pois: number;
}

export async function getStats(db: DbClient): Promise<AdminStats> {
  const [
    cardCount, chapterCount, adventureCount, playerCount, buildingCount,
    characterCount, skillCount, equipmentCount, professionCount, poiCount,
  ] = await Promise.all([
    db.card.count(),
    db.storyChapter.count(),
    db.adventure.count(),
    db.player.count(),
    db.building.count(),
    db.character.count(),
    db.skill.count(),
    db.equipment.count(),
    db.profession.count(),
    db.outerCityPOI.count(),
  ]);

  return {
    cards: cardCount,
    chapters: chapterCount,
    adventures: adventureCount,
    players: playerCount,
    buildings: buildingCount,
    characters: characterCount,
    skills: skillCount,
    equipment: equipmentCount,
    professions: professionCount,
    pois: poiCount,
  };
}
