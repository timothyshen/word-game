/**
 * Data migration script: PlayerEquipment, PlayerCharacter, PlayerCard, PlayerBuilding → Entity system
 *
 * Usage: bunx tsx prisma/entity-migration.ts
 *
 * This script reads existing Prisma model records and creates corresponding Entity records.
 * It is idempotent — it skips records that already have matching entities.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const game = await prisma.game.findFirst({ where: { name: "诸天领域" } });
  if (!game) {
    console.error("Game '诸天领域' not found. Run seed first.");
    process.exit(1);
  }

  // Resolve schemas and ensure generic templates exist
  const schemas = await resolveSchemas(game.id);

  let totalMigrated = 0;

  totalMigrated += await migrateEquipment(schemas.equipment);
  totalMigrated += await migrateCharacters(schemas.character);
  totalMigrated += await migrateCards(schemas.card);
  totalMigrated += await migrateBuildings(schemas.building);

  console.log(`\nMigration complete. Total entities created: ${totalMigrated}`);
}

interface SchemaInfo {
  schemaId: string;
  templateId: string;
}

async function resolveSchemas(gameId: string): Promise<Record<string, SchemaInfo>> {
  const result: Record<string, SchemaInfo> = {};

  for (const [name, templateName, defaultData] of [
    ["equipment", "generic-equipment", { enhanceLevel: 0, equippedBy: null, slot: null, equipmentId: "" }],
    ["character", "generic-character", {
      characterId: "", level: 1, exp: 0, maxLevel: 10, tier: 1,
      hp: 100, maxHp: 100, mp: 50, maxMp: 50,
      attack: 10, defense: 5, speed: 8, luck: 5,
      status: "idle", workingAt: null,
    }],
    ["card", "generic-card", { cardId: "", quantity: 0 }],
    ["building", "generic-building", {
      buildingId: "", level: 1, positionX: 0, positionY: 0, assignedCharId: null,
    }],
  ] as const) {
    const schema = await prisma.entitySchema.findUnique({
      where: { gameId_name: { gameId, name: name as string } },
    });
    if (!schema) {
      console.warn(`Schema '${name}' not found, skipping...`);
      continue;
    }

    let template = await prisma.entityTemplate.findFirst({
      where: { schemaId: schema.id, name: templateName as string },
    });
    if (!template) {
      template = await prisma.entityTemplate.create({
        data: {
          schemaId: schema.id,
          name: templateName as string,
          data: JSON.stringify(defaultData),
          description: `Generic ${name} entity template`,
        },
      });
    }

    result[name as string] = { schemaId: schema.id, templateId: template.id };
  }

  return result;
}

async function migrateEquipment(info: SchemaInfo | undefined): Promise<number> {
  if (!info) return 0;

  const records = await prisma.playerEquipment.findMany({
    include: { equippedItems: true },
  });

  let created = 0;
  for (const rec of records) {
    // Check if entity already exists for this player + equipment combo
    const existing = await prisma.entity.findMany({
      where: { ownerId: rec.playerId, templateId: info.templateId },
    });
    const alreadyMigrated = existing.some((e: { state: string }) => {
      const state = JSON.parse(e.state) as { equipmentId: string };
      return state.equipmentId === rec.equipmentId;
    });
    if (alreadyMigrated) continue;

    const equip = rec.equippedItems[0];
    await prisma.entity.create({
      data: {
        templateId: info.templateId,
        ownerId: rec.playerId,
        state: JSON.stringify({
          enhanceLevel: rec.enhanceLevel,
          equippedBy: equip?.playerCharacterId ?? null,
          slot: equip?.slot ?? null,
          equipmentId: rec.equipmentId,
        }),
      },
    });
    created++;
  }

  console.log(`Equipment: migrated ${created}/${records.length} records`);
  return created;
}

async function migrateCharacters(info: SchemaInfo | undefined): Promise<number> {
  if (!info) return 0;

  const records = await prisma.playerCharacter.findMany();

  let created = 0;
  for (const rec of records) {
    const existing = await prisma.entity.findMany({
      where: { ownerId: rec.playerId, templateId: info.templateId },
    });
    const alreadyMigrated = existing.some((e: { state: string }) => {
      const state = JSON.parse(e.state) as { characterId: string };
      return state.characterId === rec.characterId;
    });
    if (alreadyMigrated) continue;

    await prisma.entity.create({
      data: {
        templateId: info.templateId,
        ownerId: rec.playerId,
        state: JSON.stringify({
          characterId: rec.characterId,
          level: rec.level,
          exp: rec.exp,
          maxLevel: rec.maxLevel,
          tier: rec.tier,
          hp: rec.hp,
          maxHp: rec.maxHp,
          mp: rec.mp,
          maxMp: rec.maxMp,
          attack: rec.attack,
          defense: rec.defense,
          speed: rec.speed,
          luck: rec.luck,
          status: rec.status,
          workingAt: rec.workingAt,
        }),
      },
    });
    created++;
  }

  console.log(`Characters: migrated ${created}/${records.length} records`);
  return created;
}

async function migrateCards(info: SchemaInfo | undefined): Promise<number> {
  if (!info) return 0;

  const records = await prisma.playerCard.findMany();

  let created = 0;
  for (const rec of records) {
    const existing = await prisma.entity.findMany({
      where: { ownerId: rec.playerId, templateId: info.templateId },
    });
    const alreadyMigrated = existing.some((e: { state: string }) => {
      const state = JSON.parse(e.state) as { cardId: string };
      return state.cardId === rec.cardId;
    });
    if (alreadyMigrated) continue;

    await prisma.entity.create({
      data: {
        templateId: info.templateId,
        ownerId: rec.playerId,
        state: JSON.stringify({
          cardId: rec.cardId,
          quantity: rec.quantity,
        }),
      },
    });
    created++;
  }

  console.log(`Cards: migrated ${created}/${records.length} records`);
  return created;
}

async function migrateBuildings(info: SchemaInfo | undefined): Promise<number> {
  if (!info) return 0;

  const records = await prisma.playerBuilding.findMany();

  let created = 0;
  for (const rec of records) {
    const existing = await prisma.entity.findMany({
      where: { ownerId: rec.playerId, templateId: info.templateId },
    });
    const alreadyMigrated = existing.some((e: { state: string }) => {
      const state = JSON.parse(e.state) as { buildingId: string };
      return state.buildingId === rec.buildingId;
    });
    if (alreadyMigrated) continue;

    await prisma.entity.create({
      data: {
        templateId: info.templateId,
        ownerId: rec.playerId,
        state: JSON.stringify({
          buildingId: rec.buildingId,
          level: rec.level,
          positionX: rec.positionX,
          positionY: rec.positionY,
          assignedCharId: rec.assignedCharacterId,
        }),
      },
    });
    created++;
  }

  console.log(`Buildings: migrated ${created}/${records.length} records`);
  return created;
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
