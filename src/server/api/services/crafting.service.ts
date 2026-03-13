/**
 * Crafting Service — crafting business logic with quality system
 *
 * Handles recipe listing, material inventory, and the full craft flow:
 * validation, material/gold deduction, quality roll, equipment creation.
 */
import { TRPCError } from "@trpc/server";
import type { FullDbClient } from "../repositories/types";
import type { IEntityManager } from "~/engine/types";
import { findPlayerByUserId, updatePlayer } from "../repositories/player.repo";
import {
  findAllRecipes,
  findRecipeById,
  findRecipesByCategory,
  findPlayerMaterials,
  getMaterialCount,
  removeMaterial,
  addMaterial,
  type MaterialInfo,
  type RecipeMaterial,
} from "../repositories/crafting.repo";
import { findPlayerBuildings } from "../repositories/building.repo";
import { engine, ruleService } from "~/server/api/engine";

// ── Types ──

interface RecipeWithAvailability {
  id: string;
  name: string;
  description: string;
  category: string;
  requiredLevel: number;
  materials: Array<RecipeMaterial & { available: number; sufficient: boolean }>;
  goldCost: number;
  outputType: string;
  outputId: string;
  baseRarity: string;
  craftTime: number;
  unlockBuilding: string | null;
  unlockLevel: number | null;
  canCraft: boolean;
}

interface RecipeDetail extends RecipeWithAvailability {
  output: {
    name: string;
    slot: string;
    rarity: string;
    icon: string;
    description: string;
  } | null;
}

interface CraftResult {
  success: true;
  equipment: {
    id: string;
    name: string;
    slot: string;
    rarity: string;
    icon: string;
    description: string;
  };
  qualityTier: "normal" | "fine" | "master";
  rarityUpgraded: boolean;
}

interface QualityConfig {
  baseUpgradeChance: number;
  craftingQualityMultiplier: number;
  tiers: {
    normal: { weight: number };
    fine: { weight: number; rarityBoost: number };
    master: { weight: number; rarityBoost: number };
  };
  rarityOrder: string[];
}

// ── Helpers ──

async function getPlayerOrThrow(db: FullDbClient, userId: string) {
  const player = await findPlayerByUserId(db, userId);
  if (!player) throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  return player;
}

const RARITY_ORDER = ["普通", "精良", "稀有", "史诗", "传说"];

/** Cached equipment entity template ID */
let cachedEquipmentTemplateId: string | null = null;

async function getEquipmentEntityTemplateId(
  db: FullDbClient,
  entities: IEntityManager,
): Promise<string> {
  if (cachedEquipmentTemplateId) return cachedEquipmentTemplateId;

  const game = await db.game.findFirst({ where: { name: "诸天领域" } });
  if (!game) throw new Error("Game not found");

  const schema = (await entities.getSchema(game.id, "equipment")) as {
    id: string;
  } | null;
  if (!schema) throw new Error("Equipment entity schema not found");

  let template = (await entities.getTemplateBySchemaAndName(
    schema.id,
    "generic-equipment",
  )) as { id: string } | null;
  if (!template) {
    template = (await entities.createTemplate(
      schema.id,
      "generic-equipment",
      { enhanceLevel: 0, equippedBy: null, slot: null, equipmentId: "" },
      { description: "Generic equipment entity template" },
    )) as { id: string };
  }

  cachedEquipmentTemplateId = template.id;
  return template.id;
}

/**
 * Roll for crafting quality upgrade.
 * Returns the quality tier and rarity boost.
 * @param blacksmithLevel - player's blacksmith building level (0 if none)
 */
async function rollCraftingQuality(blacksmithLevel = 0): Promise<{
  tier: "normal" | "fine" | "master";
  rarityBoost: number;
}> {
  const config =
    await ruleService.getConfig<QualityConfig>("crafting_quality_upgrade");
  const upgradeChance =
    config.baseUpgradeChance *
    (1 + config.craftingQualityMultiplier * blacksmithLevel);

  const roll = Math.random();
  if (roll < upgradeChance) {
    // Upgraded — determine fine vs master
    const masterRoll = Math.random();
    if (masterRoll < config.tiers.master.weight) {
      return { tier: "master", rarityBoost: config.tiers.master.rarityBoost };
    }
    return { tier: "fine", rarityBoost: config.tiers.fine.rarityBoost };
  }
  return { tier: "normal", rarityBoost: 0 };
}

// ── Service functions ──

export async function getRecipes(
  db: FullDbClient,
  entities: IEntityManager,
  userId: string,
): Promise<RecipeWithAvailability[]> {
  const player = await getPlayerOrThrow(db, userId);
  const recipes = await findAllRecipes(db);
  const playerMaterials = await findPlayerMaterials(db, entities, player.id);

  // Build a lookup map: templateId -> count
  const materialCounts = new Map<string, number>();
  for (const mat of playerMaterials) {
    materialCounts.set(mat.templateId, mat.count);
  }

  return recipes.map((recipe) => {
    const materials = JSON.parse(recipe.materials) as RecipeMaterial[];
    const materialsWithAvailability = materials.map((mat) => {
      const available = materialCounts.get(mat.materialTemplateId) ?? 0;
      return {
        ...mat,
        available,
        sufficient: available >= mat.count,
      };
    });

    const allMaterialsSufficient = materialsWithAvailability.every(
      (m) => m.sufficient,
    );
    const goldSufficient = player.gold >= recipe.goldCost;
    const levelSufficient = player.level >= recipe.requiredLevel;

    return {
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      category: recipe.category,
      requiredLevel: recipe.requiredLevel,
      materials: materialsWithAvailability,
      goldCost: recipe.goldCost,
      outputType: recipe.outputType,
      outputId: recipe.outputId,
      baseRarity: recipe.baseRarity,
      craftTime: recipe.craftTime,
      unlockBuilding: recipe.unlockBuilding,
      unlockLevel: recipe.unlockLevel,
      canCraft: allMaterialsSufficient && goldSufficient && levelSufficient,
    };
  });
}

export async function getMyMaterials(
  db: FullDbClient,
  entities: IEntityManager,
  userId: string,
): Promise<MaterialInfo[]> {
  const player = await getPlayerOrThrow(db, userId);
  return findPlayerMaterials(db, entities, player.id);
}

export async function getRecipeDetail(
  db: FullDbClient,
  entities: IEntityManager,
  userId: string,
  recipeId: string,
): Promise<RecipeDetail> {
  const player = await getPlayerOrThrow(db, userId);
  const recipe = await findRecipeById(db, recipeId);
  if (!recipe) {
    throw new TRPCError({ code: "NOT_FOUND", message: "配方不存在" });
  }

  const materials = JSON.parse(recipe.materials) as RecipeMaterial[];
  const materialsWithAvailability = await Promise.all(
    materials.map(async (mat) => {
      const available = await getMaterialCount(
        db,
        entities,
        player.id,
        mat.materialTemplateId,
      );
      return {
        ...mat,
        available,
        sufficient: available >= mat.count,
      };
    }),
  );

  const allMaterialsSufficient = materialsWithAvailability.every(
    (m) => m.sufficient,
  );
  const goldSufficient = player.gold >= recipe.goldCost;
  const levelSufficient = player.level >= recipe.requiredLevel;

  // Look up the output equipment template
  let output: RecipeDetail["output"] = null;
  if (recipe.outputType === "equipment") {
    const equipTemplate = await db.equipment.findUnique({
      where: { id: recipe.outputId },
    });
    if (equipTemplate) {
      output = {
        name: equipTemplate.name,
        slot: equipTemplate.slot,
        rarity: recipe.baseRarity,
        icon: equipTemplate.icon,
        description: equipTemplate.description,
      };
    }
  }

  return {
    id: recipe.id,
    name: recipe.name,
    description: recipe.description,
    category: recipe.category,
    requiredLevel: recipe.requiredLevel,
    materials: materialsWithAvailability,
    goldCost: recipe.goldCost,
    outputType: recipe.outputType,
    outputId: recipe.outputId,
    baseRarity: recipe.baseRarity,
    craftTime: recipe.craftTime,
    unlockBuilding: recipe.unlockBuilding,
    unlockLevel: recipe.unlockLevel,
    canCraft: allMaterialsSufficient && goldSufficient && levelSufficient,
    output,
  };
}

export async function craft(
  db: FullDbClient,
  entities: IEntityManager,
  userId: string,
  recipeId: string,
): Promise<CraftResult> {
  const player = await getPlayerOrThrow(db, userId);
  const recipe = await findRecipeById(db, recipeId);
  if (!recipe) {
    throw new TRPCError({ code: "NOT_FOUND", message: "配方不存在" });
  }

  // 1. Validate player level
  if (player.level < recipe.requiredLevel) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "等级不足" });
  }

  // 2. Validate building unlock (if recipe requires it)
  if (recipe.unlockBuilding) {
    const buildings = await findPlayerBuildings(db, entities, player.id);
    const requiredBuilding = buildings.find(
      (b) => b.building.name === recipe.unlockBuilding,
    );
    if (!requiredBuilding) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `需要建筑: ${recipe.unlockBuilding}`,
      });
    }
    if (recipe.unlockLevel && requiredBuilding.level < recipe.unlockLevel) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `建筑 ${recipe.unlockBuilding} 等级不足，需要 ${recipe.unlockLevel} 级`,
      });
    }
  }

  // 3. Validate materials
  const materials = JSON.parse(recipe.materials) as RecipeMaterial[];
  for (const mat of materials) {
    const count = await getMaterialCount(
      db,
      entities,
      player.id,
      mat.materialTemplateId,
    );
    if (count < mat.count) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "材料不足" });
    }
  }

  // 4. Validate gold
  if (player.gold < recipe.goldCost) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "金币不足" });
  }

  // 5. Deduct materials
  for (const mat of materials) {
    const removed = await removeMaterial(
      db,
      entities,
      player.id,
      mat.materialTemplateId,
      mat.count,
    );
    if (!removed) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "材料扣除失败" });
    }
  }

  // 6. Deduct gold
  await updatePlayer(db, player.id, { gold: { decrement: recipe.goldCost } });

  // 7. Quality roll (boosted by blacksmith building level)
  const allBuildings = await findPlayerBuildings(db, entities, player.id);
  const blacksmith = allBuildings.find(
    (b) => b.building.name === "铁匠铺" || b.building.name === "锻造坊",
  );
  const blacksmithLevel = blacksmith?.level ?? 0;
  const qualityResult = await rollCraftingQuality(blacksmithLevel);

  // 8. Determine final rarity
  let finalRarityIndex =
    RARITY_ORDER.indexOf(recipe.baseRarity) + qualityResult.rarityBoost;
  finalRarityIndex = Math.min(finalRarityIndex, RARITY_ORDER.length - 1);
  const finalRarity = RARITY_ORDER[finalRarityIndex]!;

  // 9. Create equipment entity
  const equipTemplate = await db.equipment.findUnique({
    where: { id: recipe.outputId },
  });
  if (!equipTemplate) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "装备模板不存在",
    });
  }

  const entityTemplateId = await getEquipmentEntityTemplateId(db, entities);
  const createdEntity = (await entities.createEntity(
    entityTemplateId,
    player.id,
    {
      enhanceLevel: 0,
      equippedBy: null,
      slot: null,
      equipmentId: equipTemplate.id,
    },
  )) as { id: string };

  // 10. Emit crafting events
  await engine.events.emit("crafting:completed", {
    userId,
    recipeId,
    equipmentId: createdEntity.id,
    rarity: finalRarity,
    qualityTier: qualityResult.tier,
  }, "crafting");

  if (qualityResult.rarityBoost > 0) {
    await engine.events.emit("crafting:qualityUpgrade", {
      userId,
      recipeId,
      fromRarity: recipe.baseRarity,
      toRarity: finalRarity,
    }, "crafting");
  }

  // 11. Return result
  return {
    success: true,
    equipment: {
      id: createdEntity.id,
      name: equipTemplate.name,
      slot: equipTemplate.slot,
      rarity: finalRarity,
      icon: equipTemplate.icon,
      description: equipTemplate.description,
    },
    qualityTier: qualityResult.tier,
    rarityUpgraded: finalRarity !== recipe.baseRarity,
  };
}

// ── Material Salvage ──

/**
 * Salvage 5 lower-rarity materials into 1 next-rarity material.
 * Rarity tiers: 普通 → 精良 → 稀有 → 史诗 → 传说
 */
export async function salvageMaterials(
  db: FullDbClient,
  entities: IEntityManager,
  userId: string,
  materialTemplateId: string,
): Promise<{ success: true; consumed: { templateId: string; count: number }; produced: { templateId: string; name: string; rarity: string; count: number } }> {
  const player = await getPlayerOrThrow(db, userId);
  const SALVAGE_COST = 5;

  // Get the source material info
  const count = await getMaterialCount(db, entities, player.id, materialTemplateId);
  if (count < SALVAGE_COST) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `需要至少${SALVAGE_COST}个材料才能分解提炼` });
  }

  // Find source template to determine rarity
  const game = await db.game.findFirst({ where: { name: "诸天领域" } });
  if (!game) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "游戏未初始化" });

  const materialSchema = await entities.getSchema(game.id, "material");
  if (!materialSchema) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "材料架构不存在" });

  const schemaId = (materialSchema as { id: string }).id;
  const allTemplates = (await entities.getTemplatesBySchema(schemaId)) as Array<{ id: string; name: string; rarity: string | null }>;
  const sourceTemplate = allTemplates.find(t => t.id === materialTemplateId);
  if (!sourceTemplate || !sourceTemplate.rarity) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "无效的材料" });
  }

  const sourceRarityIndex = RARITY_ORDER.indexOf(sourceTemplate.rarity);
  if (sourceRarityIndex < 0 || sourceRarityIndex >= RARITY_ORDER.length - 1) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "该稀有度的材料无法继续提炼" });
  }

  const targetRarity = RARITY_ORDER[sourceRarityIndex + 1]!;

  // Find a matching higher-rarity template
  const targetTemplates = allTemplates.filter(t => t.rarity === targetRarity);
  if (targetTemplates.length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `没有${targetRarity}品质的材料模板` });
  }
  const targetTemplate = targetTemplates[Math.floor(Math.random() * targetTemplates.length)]!;

  // Deduct source materials
  const removed = await removeMaterial(db, entities, player.id, materialTemplateId, SALVAGE_COST);
  if (!removed) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "材料扣除失败" });
  }

  // Grant 1 higher-rarity material
  await addMaterial(db, entities, player.id, targetTemplate.id, 1);

  return {
    success: true,
    consumed: { templateId: materialTemplateId, count: SALVAGE_COST },
    produced: { templateId: targetTemplate.id, name: targetTemplate.name, rarity: targetRarity, count: 1 },
  };
}
