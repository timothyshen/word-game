import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ===== 测试账号 =====
  const testUser = await prisma.user.upsert({
    where: { email: "test@test.com" },
    update: {},
    create: {
      id: "test-user-001",
      email: "test@test.com",
      name: "测试玩家",
    },
  });
  console.log(`Created test user: ${testUser.email}`);

  // 为测试用户创建玩家存档
  await prisma.player.upsert({
    where: { userId: testUser.id },
    update: {},
    create: {
      userId: testUser.id,
      name: "测试领主",
      title: "领主",
      level: 5,
      exp: 500,
      gold: 1000,
      wood: 200,
      stone: 150,
      food: 300,
      crystals: 50,
      stamina: 100,
      maxStamina: 100,
      strength: 15,
      agility: 12,
      intellect: 10,
      charisma: 10,
    },
  });
  console.log(`Created player for test user`);

  // ===== 技能数据 (typed SkillEffect[] + SkillLevelEntry[]) =====
  const skills = [
    {
      name: "剑气斩",
      description: "释放剑气造成150%攻击伤害",
      icon: "⚔️",
      type: "combat",
      category: "sword",
      cooldown: 2,
      effects: JSON.stringify([{ type: "damage", damageType: "physical", multiplier: 1.5 }]),
      levelData: JSON.stringify([
        { level: 1, effects: [{ type: "damage", damageType: "physical", multiplier: 1.5 }], mpCost: 10, cooldown: 2 },
        { level: 2, effects: [{ type: "damage", damageType: "physical", multiplier: 1.8 }], mpCost: 12, cooldown: 2 },
        { level: 3, effects: [{ type: "damage", damageType: "physical", multiplier: 2.1 }], mpCost: 15, cooldown: 2 },
        { level: 4, effects: [{ type: "damage", damageType: "physical", multiplier: 2.5 }], mpCost: 18, cooldown: 2 },
        { level: 5, effects: [{ type: "damage", damageType: "physical", multiplier: 3.0 }], mpCost: 20, cooldown: 2 },
      ]),
    },
    {
      name: "铁壁",
      description: "提升50%防御持续2回合",
      icon: "🛡️",
      type: "combat",
      category: "shield",
      cooldown: 3,
      effects: JSON.stringify([{ type: "buff", target: "self", modifiers: [{ stat: "defense", value: 0.5, type: "percent" }], duration: 2 }]),
      levelData: JSON.stringify([
        { level: 1, effects: [{ type: "buff", target: "self", modifiers: [{ stat: "defense", value: 0.5, type: "percent" }], duration: 2 }], mpCost: 5, cooldown: 3 },
        { level: 2, effects: [{ type: "buff", target: "self", modifiers: [{ stat: "defense", value: 0.6, type: "percent" }], duration: 2 }], mpCost: 7, cooldown: 3 },
        { level: 3, effects: [{ type: "buff", target: "self", modifiers: [{ stat: "defense", value: 0.7, type: "percent" }], duration: 3 }], mpCost: 10, cooldown: 3 },
      ]),
    },
    {
      name: "火球术",
      description: "造成120%智力魔法伤害",
      icon: "🔥",
      type: "combat",
      category: "fire",
      cooldown: 2,
      effects: JSON.stringify([{ type: "damage", damageType: "magic", multiplier: 1.2, element: "fire" }]),
      levelData: JSON.stringify([
        { level: 1, effects: [{ type: "damage", damageType: "magic", multiplier: 1.2, element: "fire" }], mpCost: 15, cooldown: 2 },
        { level: 2, effects: [{ type: "damage", damageType: "magic", multiplier: 1.5, element: "fire" }], mpCost: 18, cooldown: 2 },
        { level: 3, effects: [{ type: "damage", damageType: "magic", multiplier: 1.8, element: "fire" }], mpCost: 22, cooldown: 2 },
      ]),
    },
    {
      name: "丰收",
      description: "农作物产量+30%",
      icon: "🌾",
      type: "production",
      category: "farming",
      cooldown: 0,
      effects: JSON.stringify([{ type: "special", action: "productionBoost", params: { percentage: 0.3 } }]),
      levelData: JSON.stringify([
        { level: 1, effects: [{ type: "special", action: "productionBoost", params: { percentage: 0.3 } }], mpCost: 0, cooldown: 0 },
        { level: 2, effects: [{ type: "special", action: "productionBoost", params: { percentage: 0.4 } }], mpCost: 0, cooldown: 0 },
        { level: 3, effects: [{ type: "special", action: "productionBoost", params: { percentage: 0.5 } }], mpCost: 0, cooldown: 0 },
      ]),
    },
    {
      name: "精工",
      description: "锻造时有20%概率提升品质",
      icon: "🔨",
      type: "production",
      category: "crafting",
      cooldown: 0,
      effects: JSON.stringify([{ type: "special", action: "qualityBoost", params: { percentage: 0.2 } }]),
      levelData: JSON.stringify([
        { level: 1, effects: [{ type: "special", action: "qualityBoost", params: { percentage: 0.2 } }], mpCost: 0, cooldown: 0 },
        { level: 2, effects: [{ type: "special", action: "qualityBoost", params: { percentage: 0.3 } }], mpCost: 0, cooldown: 0 },
        { level: 3, effects: [{ type: "special", action: "qualityBoost", params: { percentage: 0.4 } }], mpCost: 0, cooldown: 0 },
      ]),
    },
    {
      name: "鉴定",
      description: "识别未知物品",
      icon: "🔍",
      type: "utility",
      category: "knowledge",
      cooldown: 1,
      effects: JSON.stringify([{ type: "special", action: "identify", params: { successRate: 0.7 } }]),
      levelData: JSON.stringify([
        { level: 1, effects: [{ type: "special", action: "identify", params: { successRate: 0.7 } }], mpCost: 5, cooldown: 1 },
        { level: 2, effects: [{ type: "special", action: "identify", params: { successRate: 0.85 } }], mpCost: 5, cooldown: 1 },
        { level: 3, effects: [{ type: "special", action: "identify", params: { successRate: 1.0 } }], mpCost: 5, cooldown: 1 },
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

  // ===== 建筑数据 (typed BuildingEffects) =====
  const buildings = [
    {
      name: "主城堡",
      slot: "core",
      icon: "🏰",
      description: "领地的核心建筑，决定领地等级上限和可建造数量",
      maxLevel: 10,
      baseEffects: JSON.stringify({
        statBonuses: [{ stat: "defense", value: 10, type: "flat" }],
        capacity: [{ type: "buildingSlots", amount: 3 }],
      }),
    },
    {
      name: "农田",
      slot: "production",
      icon: "🌾",
      description: "生产粮食的基础设施，分配农夫可提高产量",
      maxLevel: 5,
      baseEffects: JSON.stringify({
        production: [{ stat: "food", amountPerHour: 20 }],
        workerMultiplier: 1.5,
      }),
    },
    {
      name: "矿场",
      slot: "production",
      icon: "⛏️",
      description: "开采石材和矿石",
      maxLevel: 5,
      baseEffects: JSON.stringify({
        production: [{ stat: "stone", amountPerHour: 15 }],
        workerMultiplier: 1.5,
      }),
    },
    {
      name: "伐木场",
      slot: "production",
      icon: "🪓",
      description: "砍伐木材",
      maxLevel: 5,
      baseEffects: JSON.stringify({
        production: [{ stat: "wood", amountPerHour: 20 }],
        workerMultiplier: 1.5,
      }),
    },
    {
      name: "铁匠铺",
      slot: "production",
      icon: "⚒️",
      description: "锻造武器装备，分配工匠可解锁高级配方",
      maxLevel: 5,
      baseEffects: JSON.stringify({
        unlocks: ["crafting_basic", "iron_sword", "iron_shield"],
      }),
    },
    {
      name: "兵营",
      slot: "military",
      icon: "⚔️",
      description: "训练士兵和存放军备的场所",
      maxLevel: 5,
      baseEffects: JSON.stringify({
        capacity: [{ type: "soldiers", amount: 10 }],
      }),
    },
    {
      name: "市场",
      slot: "commerce",
      icon: "🏪",
      description: "进行资源交易和商品买卖",
      maxLevel: 5,
      baseEffects: JSON.stringify({
        unlocks: ["trading"],
        production: [{ stat: "gold", amountPerHour: 10 }],
      }),
    },
    {
      name: "卡牌祭坛",
      slot: "special",
      icon: "🎴",
      description: "抽取、合成、献祭卡牌的神秘祭坛",
      maxLevel: 3,
      baseEffects: JSON.stringify({
        unlocks: ["card_draw", "card_combine", "card_sacrifice"],
      }),
    },
    {
      name: "传送门",
      slot: "special",
      icon: "🌀",
      description: "连接诸天世界的神秘装置",
      maxLevel: 3,
      baseEffects: JSON.stringify({
        unlocks: ["world_travel"],
        capacity: [{ type: "worldAccess", amount: 1 }],
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

  // ===== 角色模板 (typed CharacterTrait[]) =====
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
      traits: JSON.stringify([
        { name: "勇猛", modifiers: [{ stat: "attack", value: 3, type: "flat" }] },
        { name: "忠诚", modifiers: [{ stat: "defense", value: 2, type: "flat" }] },
      ]),
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
      traits: JSON.stringify([
        { name: "勤劳", modifiers: [{ stat: "food", value: 0.1, type: "percent" }] },
        { name: "朴实", modifiers: [{ stat: "luck", value: 2, type: "flat" }] },
      ]),
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
      traits: JSON.stringify([
        { name: "专注", modifiers: [{ stat: "craftingQuality", value: 0.15, type: "percent" }] },
        { name: "完美主义", modifiers: [{ stat: "defense", value: 3, type: "flat" }] },
      ]),
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
      traits: JSON.stringify([
        { name: "博学", modifiers: [{ stat: "intellect", value: 5, type: "flat" }] },
        { name: "好奇", modifiers: [{ stat: "luck", value: 3, type: "flat" }] },
      ]),
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
    // 技能卡 (typed CardEffect)
    ...allSkills.map(skill => ({
      name: `${skill.name}·技能书`,
      type: "skill",
      rarity: skill.type === "combat" ? "稀有" : "精良",
      description: `学习技能：${skill.name}`,
      icon: skill.icon,
      effects: JSON.stringify({ type: "skill", skillId: skill.id }),
    })),
    // 建筑卡
    ...allBuildings.filter(b => b.slot !== "core").map(building => ({
      name: `${building.name}·建造图纸`,
      type: "building",
      rarity: building.slot === "special" ? "史诗" : "精良",
      description: `建造建筑：${building.name}`,
      icon: building.icon,
      effects: JSON.stringify({ type: "building", buildingId: building.id }),
    })),
    // 招募卡
    ...allCharacters.map(char => ({
      name: `${char.name}·招募令`,
      type: "recruit",
      rarity: char.rarity,
      description: `招募角色：${char.name}`,
      icon: char.portrait,
      effects: JSON.stringify({ type: "recruit", characterId: char.id }),
    })),
    // 道具卡
    {
      name: "回复药水",
      type: "item",
      rarity: "普通",
      description: "恢复50点HP",
      icon: "🧪",
      effects: JSON.stringify({ type: "heal", healType: "hp", amount: 50 }),
    },
    {
      name: "魔力药水",
      type: "item",
      rarity: "普通",
      description: "恢复30点MP",
      icon: "🔮",
      effects: JSON.stringify({ type: "heal", healType: "mp", amount: 30 }),
    },
    {
      name: "烟雾弹",
      type: "item",
      rarity: "精良",
      description: "战斗中使用，100%逃跑成功",
      icon: "💨",
      effects: JSON.stringify({ type: "escape", successRate: 1.0 }),
    },
    {
      name: "力量药水",
      type: "item",
      rarity: "精良",
      description: "攻击力+30%持续3回合",
      icon: "💪",
      effects: JSON.stringify({ type: "buff", modifiers: [{ stat: "attack", value: 0.3, type: "percent" }], duration: 3 }),
    },
    // 提升卡
    {
      name: "强化石",
      type: "enhance",
      rarity: "精良",
      description: "装备强化+1",
      icon: "💎",
      effects: JSON.stringify({ type: "enhance", targetType: "equipment", amount: 1 }),
    },
    {
      name: "技能升级卷轴",
      type: "enhance",
      rarity: "稀有",
      description: "任意技能等级+1",
      icon: "📜",
      effects: JSON.stringify({ type: "enhance", targetType: "skill", amount: 1 }),
    },
    {
      name: "经验书",
      type: "enhance",
      rarity: "普通",
      description: "获得500经验值",
      icon: "📕",
      effects: JSON.stringify({ type: "exp", amount: 500 }),
    },
    // 扩张卡
    {
      name: "领地扩张令",
      type: "expansion",
      rarity: "稀有",
      description: "扩展内城领地范围，获得更多建造空间",
      icon: "🗺️",
      effects: JSON.stringify({ type: "expansion", amount: 1 }),
    },
    {
      name: "高级扩张令",
      type: "expansion",
      rarity: "史诗",
      description: "大幅扩展内城领地范围",
      icon: "🌍",
      effects: JSON.stringify({ type: "expansion", amount: 2 }),
    },
    {
      name: "空间扩张符",
      type: "expansion",
      rarity: "稀有",
      description: "扩展内城领地范围",
      icon: "📐",
      effects: JSON.stringify({ type: "expansion", amount: 1 }),
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

  // ===== 职业数据 (typed StatModifier[] + Condition[]) =====
  const professions = [
    {
      name: "剑客",
      description: "精通剑术的武者，近战攻击力卓越",
      bonuses: JSON.stringify([
        { stat: "attack", value: 0.2, type: "percent" },
        { stat: "critRate", value: 0.05, type: "flat" },
      ]),
      unlockConditions: JSON.stringify([
        { type: "skill", category: "sword", minLevel: 3 },
      ]),
    },
    {
      name: "术士",
      description: "掌握神秘法术的施法者",
      bonuses: JSON.stringify([
        { stat: "intellect", value: 0.15, type: "percent" },
        { stat: "maxMp", value: 0.2, type: "percent" },
      ]),
      unlockConditions: JSON.stringify([
        { type: "skillCount", skillType: "magic", count: 2 },
      ]),
    },
    {
      name: "工匠大师",
      description: "锻造技艺登峰造极的匠人",
      bonuses: JSON.stringify([
        { stat: "craftingQuality", value: 1, type: "flat" },
        { stat: "productionSpeed", value: 0.3, type: "percent" },
      ]),
      unlockConditions: JSON.stringify([
        { type: "skill", category: "crafting", minLevel: 5 },
      ]),
    },
    {
      name: "守护者",
      description: "铜墙铁壁般的防御专家",
      bonuses: JSON.stringify([
        { stat: "defense", value: 0.3, type: "percent" },
        { stat: "maxHp", value: 0.2, type: "percent" },
        { stat: "damageReduction", value: 0.1, type: "flat" },
      ]),
      unlockConditions: JSON.stringify([
        { type: "skill", category: "shield", minLevel: 3 },
      ]),
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

  // ===== 给测试玩家分配卡牌 =====
  const testPlayerRecord = await prisma.player.findUnique({
    where: { userId: testUser.id },
  });

  if (testPlayerRecord) {
    // 获取一些卡牌给测试玩家
    const allCards = await prisma.card.findMany();

    // 获取建筑卡、扩张卡各2张
    const buildingCards = allCards.filter(c => c.type === "building").slice(0, 3);
    const expansionCards = allCards.filter(c => c.type === "expansion");
    const itemCards = allCards.filter(c => c.type === "item").slice(0, 2);

    const cardsToGive = [...buildingCards, ...expansionCards, ...itemCards];

    for (const card of cardsToGive) {
      await prisma.playerCard.upsert({
        where: {
          playerId_cardId: {
            playerId: testPlayerRecord.id,
            cardId: card.id,
          },
        },
        update: { quantity: 3 },
        create: {
          playerId: testPlayerRecord.id,
          cardId: card.id,
          quantity: 3,
        },
      });
    }
    console.log(`Gave ${cardsToGive.length} card types to test player`);

    // ===== 给测试玩家招募角色 =====
    const swordsman = await prisma.character.findFirst({ where: { name: "流浪剑士" } });
    const farmer = await prisma.character.findFirst({ where: { name: "村民" } });

    const recruitedChars: string[] = [];

    if (swordsman) {
      const pc = await prisma.playerCharacter.create({
        data: {
          playerId: testPlayerRecord.id,
          characterId: swordsman.id,
          level: 3,
          exp: 200,
          hp: swordsman.baseHp,
          maxHp: swordsman.baseHp,
          mp: swordsman.baseMp,
          maxMp: swordsman.baseMp,
          attack: swordsman.baseAttack,
          defense: swordsman.baseDefense,
          speed: swordsman.baseSpeed,
          luck: swordsman.baseLuck,
          status: "idle",
        },
      });
      recruitedChars.push(pc.id);
    }

    if (farmer) {
      const pc = await prisma.playerCharacter.create({
        data: {
          playerId: testPlayerRecord.id,
          characterId: farmer.id,
          level: 2,
          exp: 80,
          hp: farmer.baseHp,
          maxHp: farmer.baseHp,
          mp: farmer.baseMp,
          maxMp: farmer.baseMp,
          attack: farmer.baseAttack,
          defense: farmer.baseDefense,
          speed: farmer.baseSpeed,
          luck: farmer.baseLuck,
          status: "idle",
        },
      });
      recruitedChars.push(pc.id);
    }
    console.log(`Recruited ${recruitedChars.length} characters for test player`);

    // ===== 派遣英雄到外城 =====
    if (recruitedChars[0]) {
      await prisma.heroInstance.create({
        data: {
          playerId: testPlayerRecord.id,
          characterId: recruitedChars[0],
          positionX: 0,
          positionY: 0,
          status: "idle",
          stamina: 100,
        },
      });
      console.log("Deployed hero to outer city");
    }

    // ===== 初始探索区域 =====
    const exploredTiles = [
      { x: 0, y: 0, name: "城门", biome: "grassland", level: 2 },
      { x: 1, y: 0, name: "东部草原", biome: "grassland", level: 2 },
      { x: -1, y: 0, name: "西部林地", biome: "forest", level: 2 },
      { x: 0, y: 1, name: "北部平原", biome: "grassland", level: 2 },
      { x: 0, y: -1, name: "南部丘陵", biome: "mountain", level: 2 },
      { x: 1, y: 1, name: "东北荒地", biome: "desert", level: 1 },
      { x: -1, y: -1, name: "西南沼泽", biome: "swamp", level: 1 },
      { x: 2, y: 0, name: "远东", biome: "grassland", level: 1 },
      { x: -1, y: 2, name: "西北林", biome: "forest", level: 1 },
    ];

    for (const tile of exploredTiles) {
      await prisma.exploredArea.create({
        data: {
          playerId: testPlayerRecord.id,
          worldId: "main",
          positionX: tile.x,
          positionY: tile.y,
          name: tile.name,
          biome: tile.biome,
          explorationLevel: tile.level,
        },
      });
    }
    console.log(`Created ${exploredTiles.length} explored areas for test player`);
  }

  // ===== 外城兴趣点 =====
  const outerCityPOIs = [
    // 资源点
    { positionX: 2, positionY: 0, name: "金矿", icon: "💰", type: "resource", difficulty: 1, resourceType: "gold", resourceAmount: 50 },
    { positionX: -1, positionY: 2, name: "伐木场", icon: "🪵", type: "resource", difficulty: 1, resourceType: "wood", resourceAmount: 30 },
    { positionX: 0, positionY: -2, name: "采石场", icon: "🪨", type: "resource", difficulty: 1, resourceType: "stone", resourceAmount: 20 },
    { positionX: 3, positionY: 1, name: "农田", icon: "🌾", type: "resource", difficulty: 1, resourceType: "food", resourceAmount: 40 },
    // 驻军点
    { positionX: -2, positionY: -1, name: "强盗营地", icon: "⚔️", type: "garrison", difficulty: 2, guardianLevel: 3 },
    { positionX: 1, positionY: 3, name: "哥布林巢穴", icon: "👺", type: "garrison", difficulty: 3, guardianLevel: 5 },
    // 巢穴
    { positionX: -3, positionY: 2, name: "狼穴", icon: "🐺", type: "lair", difficulty: 2, guardianLevel: 4 },
    { positionX: 2, positionY: -3, name: "巨蜘蛛巢", icon: "🕷️", type: "lair", difficulty: 4, guardianLevel: 8 },
    // 定居点
    { positionX: -2, positionY: 3, name: "流浪商人", icon: "🏕️", type: "settlement", difficulty: 1 },
    { positionX: 3, positionY: -2, name: "隐士小屋", icon: "🏚️", type: "settlement", difficulty: 1 },
    // 神殿 - 祈祷获得buff
    { positionX: 0, positionY: 3, name: "风神殿", icon: "🏛️", type: "shrine", difficulty: 1, resourceType: "stamina", resourceAmount: 30 },
    { positionX: -3, positionY: -2, name: "战神殿", icon: "⚔️", type: "shrine", difficulty: 2, resourceType: "attack", resourceAmount: 5 },
    // 遗迹 - 探索获得宝藏
    { positionX: 4, positionY: 0, name: "古代遗迹", icon: "🏚️", type: "ruin", difficulty: 3, guardianLevel: 4, resourceType: "gold", resourceAmount: 100 },
    { positionX: -1, positionY: -3, name: "失落神庙", icon: "🗿", type: "ruin", difficulty: 4, guardianLevel: 6, resourceType: "crystals", resourceAmount: 10 },
    // 商队 - 交易
    { positionX: 2, positionY: 2, name: "沙漠商队", icon: "🐪", type: "caravan", difficulty: 1, resourceType: "trade", resourceAmount: 0 },
    { positionX: -3, positionY: 0, name: "旅行商人", icon: "🧳", type: "caravan", difficulty: 1, resourceType: "trade", resourceAmount: 0 },
  ];

  for (const poi of outerCityPOIs) {
    await prisma.outerCityPOI.upsert({
      where: {
        positionX_positionY: {
          positionX: poi.positionX,
          positionY: poi.positionY,
        },
      },
      update: {},
      create: {
        positionX: poi.positionX,
        positionY: poi.positionY,
        name: poi.name,
        icon: poi.icon,
        type: poi.type,
        difficulty: poi.difficulty,
        resourceType: poi.resourceType ?? null,
        resourceAmount: poi.resourceAmount ?? 0,
        guardianLevel: poi.guardianLevel ?? 0,
      },
    });
  }
  console.log(`Created ${outerCityPOIs.length} outer city POIs`);

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
