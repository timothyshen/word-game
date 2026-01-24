import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ===== 技能数据 =====
  const skills = [
    {
      name: "剑气斩",
      description: "释放剑气造成150%攻击伤害",
      icon: "⚔️",
      type: "combat",
      category: "sword",
      cooldown: 2,
      effects: JSON.stringify({ damage: 1.5, type: "physical" }),
      levelData: JSON.stringify([
        { level: 1, damage: 1.5 },
        { level: 2, damage: 1.8 },
        { level: 3, damage: 2.1 },
        { level: 4, damage: 2.5 },
        { level: 5, damage: 3.0 },
      ]),
    },
    {
      name: "铁壁",
      description: "提升50%防御持续2回合",
      icon: "🛡️",
      type: "combat",
      category: "shield",
      cooldown: 3,
      effects: JSON.stringify({ defenseBoost: 0.5, duration: 2 }),
      levelData: JSON.stringify([
        { level: 1, defenseBoost: 0.5, duration: 2 },
        { level: 2, defenseBoost: 0.6, duration: 2 },
        { level: 3, defenseBoost: 0.7, duration: 3 },
      ]),
    },
    {
      name: "火球术",
      description: "造成120%智力魔法伤害",
      icon: "🔥",
      type: "combat",
      category: "fire",
      cooldown: 2,
      effects: JSON.stringify({ damage: 1.2, type: "magic", element: "fire" }),
      levelData: JSON.stringify([
        { level: 1, damage: 1.2 },
        { level: 2, damage: 1.5 },
        { level: 3, damage: 1.8 },
      ]),
    },
    {
      name: "丰收",
      description: "农作物产量+30%",
      icon: "🌾",
      type: "production",
      category: "farming",
      cooldown: 0,
      effects: JSON.stringify({ productionBoost: 0.3, type: "farming" }),
      levelData: JSON.stringify([
        { level: 1, productionBoost: 0.3 },
        { level: 2, productionBoost: 0.4 },
        { level: 3, productionBoost: 0.5 },
      ]),
    },
    {
      name: "精工",
      description: "锻造时有20%概率提升品质",
      icon: "🔨",
      type: "production",
      category: "crafting",
      cooldown: 0,
      effects: JSON.stringify({ qualityBoost: 0.2, type: "crafting" }),
      levelData: JSON.stringify([
        { level: 1, qualityBoost: 0.2 },
        { level: 2, qualityBoost: 0.3 },
        { level: 3, qualityBoost: 0.4 },
      ]),
    },
    {
      name: "鉴定",
      description: "识别未知物品",
      icon: "🔍",
      type: "utility",
      category: "knowledge",
      cooldown: 1,
      effects: JSON.stringify({ identify: true }),
      levelData: JSON.stringify([
        { level: 1, successRate: 0.7 },
        { level: 2, successRate: 0.85 },
        { level: 3, successRate: 1.0 },
      ]),
    },
  ];

  for (const skill of skills) {
    await prisma.skill.upsert({
      where: { name: skill.name },
      update: skill,
      create: skill,
    });
  }
  console.log(`Created ${skills.length} skills`);

  // ===== 建筑数据 =====
  const buildings = [
    {
      name: "主城堡",
      slot: "core",
      icon: "🏰",
      description: "领地的核心建筑，决定领地等级上限和可建造数量",
      maxLevel: 10,
      baseEffects: JSON.stringify({
        territoryLevel: 1,
        buildingSlots: 3,
        defense: 10,
      }),
    },
    {
      name: "农田",
      slot: "production",
      icon: "🌾",
      description: "生产粮食的基础设施，分配农夫可提高产量",
      maxLevel: 5,
      baseEffects: JSON.stringify({
        dailyOutput: { food: 20 },
        workerBonus: 0.5,
      }),
    },
    {
      name: "矿场",
      slot: "production",
      icon: "⛏️",
      description: "开采石材和矿石",
      maxLevel: 5,
      baseEffects: JSON.stringify({
        dailyOutput: { stone: 15 },
        workerBonus: 0.5,
      }),
    },
    {
      name: "伐木场",
      slot: "production",
      icon: "🪓",
      description: "砍伐木材",
      maxLevel: 5,
      baseEffects: JSON.stringify({
        dailyOutput: { wood: 20 },
        workerBonus: 0.5,
      }),
    },
    {
      name: "铁匠铺",
      slot: "production",
      icon: "⚒️",
      description: "锻造武器装备，分配工匠可解锁高级配方",
      maxLevel: 5,
      baseEffects: JSON.stringify({
        craftingEnabled: true,
        recipes: ["iron_sword", "iron_shield"],
      }),
    },
    {
      name: "兵营",
      slot: "military",
      icon: "⚔️",
      description: "训练士兵和存放军备的场所",
      maxLevel: 5,
      baseEffects: JSON.stringify({
        soldierCapacity: 10,
        trainingSpeed: 1,
      }),
    },
    {
      name: "市场",
      slot: "commerce",
      icon: "🏪",
      description: "进行资源交易和商品买卖",
      maxLevel: 5,
      baseEffects: JSON.stringify({
        tradeTax: 0.1,
        dailyRefresh: 1,
      }),
    },
    {
      name: "卡牌祭坛",
      slot: "special",
      icon: "🎴",
      description: "抽取、合成、献祭卡牌的神秘祭坛",
      maxLevel: 3,
      baseEffects: JSON.stringify({
        drawEnabled: true,
        combineEnabled: true,
        sacrificeEnabled: true,
      }),
    },
    {
      name: "传送门",
      slot: "special",
      icon: "🌀",
      description: "连接诸天世界的神秘装置",
      maxLevel: 3,
      baseEffects: JSON.stringify({
        worldAccess: 1,
        teleportCost: 20,
      }),
    },
  ];

  for (const building of buildings) {
    await prisma.building.upsert({
      where: { id: building.name }, // 用name作临时ID
      update: building,
      create: building,
    });
  }
  console.log(`Created ${buildings.length} buildings`);

  // ===== 角色模板 =====
  const characters = [
    {
      name: "流浪剑士",
      baseClass: "战士",
      rarity: "精英",
      portrait: "⚔️",
      description: "曾是边境守卫，剑术精湛",
      story: "曾是边境守卫，因战乱流落至此，剑术精湛，性格直爽。",
      baseAttack: 15,
      baseDefense: 10,
      baseSpeed: 12,
      baseLuck: 8,
      baseHp: 100,
      baseMp: 20,
      traits: JSON.stringify(["勇猛", "忠诚"]),
    },
    {
      name: "村民",
      baseClass: "农夫",
      rarity: "普通",
      portrait: "👨‍🌾",
      description: "勤劳朴实的农民",
      story: "本地农民，对土地有着深厚的感情，是领地的粮食支柱。",
      baseAttack: 5,
      baseDefense: 5,
      baseSpeed: 8,
      baseLuck: 12,
      baseHp: 60,
      baseMp: 5,
      traits: JSON.stringify(["勤劳", "朴实"]),
    },
    {
      name: "铁匠",
      baseClass: "工匠",
      rarity: "精英",
      portrait: "🔨",
      description: "掌握多种锻造秘技的老工匠",
      story: "游历四方的老工匠，掌握多种锻造秘技，脾气有些古怪。",
      baseAttack: 8,
      baseDefense: 12,
      baseSpeed: 6,
      baseLuck: 10,
      baseHp: 80,
      baseMp: 15,
      traits: JSON.stringify(["专注", "完美主义"]),
    },
    {
      name: "年轻学者",
      baseClass: "学者",
      rarity: "稀有",
      portrait: "📖",
      description: "对古代遗迹充满兴趣的学者",
      story: "来自远方学院的年轻学者，对古代遗迹和神秘现象充满兴趣。",
      baseAttack: 6,
      baseDefense: 4,
      baseSpeed: 10,
      baseLuck: 15,
      baseHp: 50,
      baseMp: 60,
      traits: JSON.stringify(["博学", "好奇"]),
    },
  ];

  for (const char of characters) {
    await prisma.character.upsert({
      where: { id: char.name },
      update: char,
      create: char,
    });
  }
  console.log(`Created ${characters.length} character templates`);

  // ===== 卡牌数据 =====
  // 获取刚创建的技能和建筑的ID
  const allSkills = await prisma.skill.findMany();
  const allBuildings = await prisma.building.findMany();
  const allCharacters = await prisma.character.findMany();

  const cards = [
    // 技能卡
    ...allSkills.map(skill => ({
      name: `${skill.name}·技能书`,
      type: "skill",
      rarity: skill.type === "combat" ? "稀有" : "精良",
      description: `学习技能：${skill.name}`,
      icon: skill.icon,
      effects: JSON.stringify({ skillId: skill.id }),
    })),
    // 建筑卡
    ...allBuildings.filter(b => b.slot !== "core").map(building => ({
      name: `${building.name}·建造图纸`,
      type: "building",
      rarity: building.slot === "special" ? "史诗" : "精良",
      description: `建造建筑：${building.name}`,
      icon: building.icon,
      effects: JSON.stringify({ buildingId: building.id }),
    })),
    // 招募卡
    ...allCharacters.map(char => ({
      name: `${char.name}·招募令`,
      type: "recruit",
      rarity: char.rarity,
      description: `招募角色：${char.name}`,
      icon: char.portrait,
      effects: JSON.stringify({ characterId: char.id }),
    })),
    // 道具卡
    {
      name: "回复药水",
      type: "item",
      rarity: "普通",
      description: "恢复50点HP",
      icon: "🧪",
      effects: JSON.stringify({ heal: 50, type: "hp" }),
    },
    {
      name: "魔力药水",
      type: "item",
      rarity: "普通",
      description: "恢复30点MP",
      icon: "🔮",
      effects: JSON.stringify({ heal: 30, type: "mp" }),
    },
    {
      name: "烟雾弹",
      type: "item",
      rarity: "精良",
      description: "战斗中使用，100%逃跑成功",
      icon: "💨",
      effects: JSON.stringify({ escape: true, successRate: 1.0 }),
    },
    {
      name: "力量药水",
      type: "item",
      rarity: "精良",
      description: "攻击力+30%持续3回合",
      icon: "💪",
      effects: JSON.stringify({ buff: "attack", value: 0.3, duration: 3 }),
    },
    // 提升卡
    {
      name: "强化石",
      type: "enhance",
      rarity: "精良",
      description: "装备强化+1",
      icon: "💎",
      effects: JSON.stringify({ enhance: 1, targetType: "equipment" }),
    },
    {
      name: "技能升级卷轴",
      type: "enhance",
      rarity: "稀有",
      description: "任意技能等级+1",
      icon: "📜",
      effects: JSON.stringify({ skillLevelUp: 1 }),
    },
    {
      name: "经验书",
      type: "enhance",
      rarity: "普通",
      description: "获得500经验值",
      icon: "📕",
      effects: JSON.stringify({ exp: 500 }),
    },
  ];

  for (const card of cards) {
    await prisma.card.upsert({
      where: { name: card.name },
      update: card,
      create: card,
    });
  }
  console.log(`Created ${cards.length} cards`);

  // ===== 职业数据 =====
  const professions = [
    {
      name: "剑客",
      description: "精通剑术的武者，近战攻击力卓越",
      bonuses: JSON.stringify({
        attackBoost: 0.2,
        swordDamageBoost: 0.3,
        critRate: 0.05,
      }),
      unlockConditions: JSON.stringify({
        requiredSkills: [{ category: "sword", minLevel: 3 }],
      }),
    },
    {
      name: "术士",
      description: "掌握神秘法术的施法者",
      bonuses: JSON.stringify({
        magicDamageBoost: 0.15,
        maxMpBoost: 0.2,
        castSpeedBoost: 0.1,
      }),
      unlockConditions: JSON.stringify({
        requiredSkillCount: { type: "magic", count: 2 },
      }),
    },
    {
      name: "工匠大师",
      description: "锻造技艺登峰造极的匠人",
      bonuses: JSON.stringify({
        craftingQualityBoost: 1,
        craftingSpeedBoost: 0.3,
        materialSaving: 0.15,
      }),
      unlockConditions: JSON.stringify({
        requiredSkills: [{ category: "crafting", minLevel: 5 }],
      }),
    },
    {
      name: "守护者",
      description: "铜墙铁壁般的防御专家",
      bonuses: JSON.stringify({
        defenseBoost: 0.3,
        maxHpBoost: 0.2,
        damageReduction: 0.1,
      }),
      unlockConditions: JSON.stringify({
        requiredSkills: [{ category: "shield", minLevel: 3 }],
      }),
    },
  ];

  for (const prof of professions) {
    await prisma.profession.upsert({
      where: { name: prof.name },
      update: prof,
      create: prof,
    });
  }
  console.log(`Created ${professions.length} professions`);

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
