/**
 * World Combat Service — outer city combat business logic
 */
import { TRPCError } from "@trpc/server";
import type { FullDbClient } from "../repositories/types";
import { getInnerCityBonuses } from "./worldHelpers";

// ===== Constants =====

const ENEMY_NAMES: Record<string, string> = {
  garrison: "守卫",
  lair: "巢穴怪物",
  ruin: "遗迹守护者",
};

const ENEMY_ICONS: Record<string, string> = {
  garrison: "⚔️",
  lair: "🐺",
  ruin: "👻",
};

const COMBATABLE_POI_TYPES = new Set(["garrison", "lair", "ruin"]);

// ===== Helpers =====

async function findPlayerOrThrow(db: FullDbClient, userId: string) {
  const player = await db.player.findFirst({ where: { userId } });
  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }
  return player;
}

async function findHeroOrThrow(db: FullDbClient, heroId: string, playerId: string) {
  const hero = await db.heroInstance.findFirst({
    where: { id: heroId, playerId },
    include: {
      character: {
        include: { character: true },
      },
    },
  });
  if (!hero) {
    throw new TRPCError({ code: "NOT_FOUND", message: "英雄不存在" });
  }
  return hero;
}

async function findPoiOrThrow(db: FullDbClient, poiId: string) {
  const poi = await db.outerCityPOI.findUnique({ where: { id: poiId } });
  if (!poi) {
    throw new TRPCError({ code: "NOT_FOUND", message: "兴趣点不存在" });
  }
  return poi;
}

function computeEnemyStats(poi: { guardianLevel: number | null; difficulty: number }) {
  const enemyLevel = poi.guardianLevel || poi.difficulty;
  return {
    level: enemyLevel,
    hp: 50 + enemyLevel * 20,
    atk: 8 + enemyLevel * 3,
    def: 3 + enemyLevel * 2,
  };
}

// ===== Public API =====

export async function startCombat(
  db: FullDbClient,
  userId: string,
  input: { heroId: string; poiId: string },
) {
  const player = await findPlayerOrThrow(db, userId);
  const hero = await findHeroOrThrow(db, input.heroId, player.id);
  const poi = await findPoiOrThrow(db, input.poiId);

  if (!COMBATABLE_POI_TYPES.has(poi.type)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "该地点无法战斗" });
  }

  if (poi.isDefeated) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "该地点已被征服" });
  }

  if (hero.positionX !== poi.positionX || hero.positionY !== poi.positionY) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "英雄不在该位置" });
  }

  // 更新英雄状态
  await db.heroInstance.update({
    where: { id: hero.id },
    data: { status: "fighting" },
  });

  // 生成敌人数据
  const enemy = computeEnemyStats(poi);

  return {
    success: true,
    combat: {
      heroId: hero.id,
      poiId: poi.id,
      turn: 1,
      hero: {
        name: hero.character.character.name,
        portrait: hero.character.character.portrait,
        hp: hero.character.hp,
        maxHp: hero.character.maxHp,
        attack: hero.character.attack,
        defense: hero.character.defense,
      },
      enemy: {
        name: `${ENEMY_NAMES[poi.type] ?? "敌人"} Lv.${enemy.level}`,
        icon: poi.icon || ENEMY_ICONS[poi.type] || "👹",
        hp: enemy.hp,
        maxHp: enemy.hp,
        attack: enemy.atk,
        defense: enemy.def,
        level: enemy.level,
      },
      logs: [`战斗开始！${hero.character.character.name} 对阵 ${poi.name}`],
    },
  };
}

export async function performAction(
  db: FullDbClient,
  userId: string,
  input: {
    heroId: string;
    poiId: string;
    action: "attack" | "defend" | "skill" | "flee";
    heroHp: number;
    enemyHp: number;
    turn: number;
  },
) {
  const player = await findPlayerOrThrow(db, userId);
  const hero = await findHeroOrThrow(db, input.heroId, player.id);
  const poi = await findPoiOrThrow(db, input.poiId);

  const logs: string[] = [];
  let heroHp = input.heroHp;
  let enemyHp = input.enemyHp;
  let turn = input.turn;

  // 获取内城建筑加成
  const cityBonuses = await getInnerCityBonuses(db, player.id);

  // 应用内城加成到战斗属性
  const heroBaseAtk = hero.character.attack;
  const heroBaseDef = hero.character.defense;
  const heroAtk = Math.floor(heroBaseAtk * (1 + cityBonuses.attackBonus));
  const heroDef = Math.floor(heroBaseDef * (1 + cityBonuses.defenseBonus));

  const enemyLevel = poi.guardianLevel || poi.difficulty;
  const enemyAtk = 8 + enemyLevel * 3;
  const enemyDef = 3 + enemyLevel * 2;

  // 显示加成信息（仅首回合）
  if (turn === 1 && (cityBonuses.attackBonus > 0 || cityBonuses.defenseBonus > 0)) {
    const bonusInfo: string[] = [];
    if (cityBonuses.attackBonus > 0) bonusInfo.push(`攻击+${Math.floor(cityBonuses.attackBonus * 100)}%`);
    if (cityBonuses.defenseBonus > 0) bonusInfo.push(`防御+${Math.floor(cityBonuses.defenseBonus * 100)}%`);
    logs.push(`内城加成: ${bonusInfo.join(", ")}`);
  }

  // 处理逃跑
  if (input.action === "flee") {
    const fleeChance = 0.5 + (hero.character.speed / 100) * 0.3;
    if (Math.random() < fleeChance) {
      await db.heroInstance.update({
        where: { id: hero.id },
        data: { status: "idle" },
      });
      return {
        success: true,
        result: "fled" as const,
        logs: ["成功逃离战斗！"],
        heroHp,
        enemyHp,
        turn,
      };
    } else {
      logs.push("逃跑失败！");
      const damage = Math.max(1, enemyAtk - heroDef);
      heroHp -= damage;
      logs.push(`敌人攻击造成 ${damage} 伤害`);
    }
  } else {
    // 英雄行动
    if (input.action === "attack") {
      const damage = Math.max(1, heroAtk - enemyDef);
      const crit = Math.random() < 0.15;
      const finalDamage = crit ? Math.floor(damage * 1.5) : damage;
      enemyHp -= finalDamage;
      logs.push(`${hero.character.character.name} 攻击造成 ${finalDamage} 伤害${crit ? "（暴击！）" : ""}`);
    } else if (input.action === "defend") {
      logs.push(`${hero.character.character.name} 进入防御姿态`);
    } else if (input.action === "skill") {
      const damage = Math.max(1, Math.floor(heroAtk * 1.5) - enemyDef);
      enemyHp -= damage;
      logs.push(`${hero.character.character.name} 使用技能造成 ${damage} 伤害！`);
    }

    // 敌人反击（如果还活着）
    if (enemyHp > 0) {
      const defendMod = input.action === "defend" ? 0.5 : 1;
      const damage = Math.max(1, Math.floor((enemyAtk - heroDef) * defendMod));
      heroHp -= damage;
      logs.push(`敌人反击造成 ${damage} 伤害${input.action === "defend" ? "（已减半）" : ""}`);
    }
  }

  turn++;

  // 检查战斗结果 - 胜利
  if (enemyHp <= 0) {
    await db.heroInstance.update({
      where: { id: hero.id },
      data: { status: "idle" },
    });

    await db.outerCityPOI.update({
      where: { id: poi.id },
      data: {
        isDefeated: true,
        defeatedAt: new Date(),
        respawnsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    let goldReward = 20 + enemyLevel * 10;
    let expReward = 10 + enemyLevel * 5;
    let crystalsReward = 0;
    let extraMessage = "";

    if (poi.type === "ruin") {
      if (poi.resourceType === "gold") {
        goldReward += poi.resourceAmount ?? 0;
        extraMessage = `，发现宝藏 ${poi.resourceAmount} 金币`;
      } else if (poi.resourceType === "crystals") {
        crystalsReward = poi.resourceAmount ?? 0;
        extraMessage = `，发现 ${crystalsReward} 水晶`;
      }
    }

    await db.player.update({
      where: { id: player.id },
      data: {
        gold: { increment: goldReward },
        exp: { increment: expReward },
        crystals: { increment: crystalsReward },
      },
    });

    await db.playerCharacter.update({
      where: { id: hero.characterId },
      data: {
        exp: { increment: expReward },
      },
    });

    logs.push(`胜利！获得 ${goldReward} 金币，${expReward} 经验${extraMessage}`);

    return {
      success: true,
      result: "victory" as const,
      logs,
      heroHp: Math.max(0, heroHp),
      enemyHp: 0,
      turn,
      rewards: { gold: goldReward, exp: expReward, crystals: crystalsReward },
    };
  }

  // 检查战斗结果 - 失败
  if (heroHp <= 0) {
    await db.heroInstance.update({
      where: { id: hero.id },
      data: { status: "idle", stamina: Math.max(0, hero.stamina - 30) },
    });

    await db.playerCharacter.update({
      where: { id: hero.characterId },
      data: { hp: Math.floor(hero.character.maxHp * 0.3) },
    });

    logs.push("战斗失败...英雄撤退");

    return {
      success: true,
      result: "defeat" as const,
      logs,
      heroHp: 0,
      enemyHp,
      turn,
    };
  }

  // 战斗继续
  return {
    success: true,
    result: "ongoing" as const,
    logs,
    heroHp,
    enemyHp,
    turn,
  };
}
