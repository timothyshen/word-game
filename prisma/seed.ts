import { PrismaClient } from "../generated/prisma";
import { SEED_RULES } from "../src/engine/rules/seed-rules";

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
      gold: 10000,
      wood: 2000,
      stone: 1500,
      food: 5000,
      crystals: 200,
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
    // 宝箱卡
    {
      name: "普通宝箱",
      type: "chest",
      rarity: "普通",
      description: "开启后获得1张随机卡牌",
      icon: "📦",
      effects: JSON.stringify({ type: "chest", draws: 1, pool: { "普通": 70, "精良": 20, "稀有": 10 } }),
    },
    {
      name: "精良宝箱",
      type: "chest",
      rarity: "精良",
      description: "开启后获得2张随机卡牌",
      icon: "🎁",
      effects: JSON.stringify({ type: "chest", draws: 2, pool: { "精良": 40, "稀有": 40, "史诗": 20 } }),
    },
    {
      name: "稀有宝箱",
      type: "chest",
      rarity: "稀有",
      description: "开启后获得3张随机卡牌",
      icon: "💠",
      effects: JSON.stringify({ type: "chest", draws: 3, pool: { "精良": 30, "稀有": 40, "史诗": 25, "传说": 5 } }),
    },
    {
      name: "史诗宝箱",
      type: "chest",
      rarity: "史诗",
      description: "开启后获得4张随机卡牌",
      icon: "👑",
      effects: JSON.stringify({ type: "chest", draws: 4, pool: { "稀有": 20, "史诗": 40, "传说": 40 } }),
    },
    {
      name: "传说宝箱",
      type: "chest",
      rarity: "传说",
      description: "开启后获得5张随机卡牌",
      icon: "🌟",
      effects: JSON.stringify({ type: "chest", draws: 5, pool: { "史诗": 30, "传说": 70 } }),
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

  // ===== 装备模板 =====
  const equipments = [
    // === 主手 (mainHand) ===
    { name: "铁剑", slot: "mainHand", rarity: "普通", description: "普通的铁制长剑", icon: "🗡️", attackBonus: 8, defenseBonus: 0, speedBonus: 2, luckBonus: 0, hpBonus: 0, mpBonus: 0, requiredLevel: 1 },
    { name: "精钢长剑", slot: "mainHand", rarity: "精良", description: "精钢锻造的优质长剑", icon: "⚔️", attackBonus: 18, defenseBonus: 0, speedBonus: 5, luckBonus: 2, hpBonus: 0, mpBonus: 0, requiredLevel: 5 },
    { name: "寒冰之刃", slot: "mainHand", rarity: "稀有", description: "蕴含冰霜之力的魔法剑", icon: "🔷", attackBonus: 35, defenseBonus: 0, speedBonus: 8, luckBonus: 5, hpBonus: 0, mpBonus: 2, requiredLevel: 15 },
    { name: "炎龙牙", slot: "mainHand", rarity: "史诗", description: "以炎龙牙齿铸造的烈焰之剑", icon: "🔥", attackBonus: 65, defenseBonus: 5, speedBonus: 10, luckBonus: 8, hpBonus: 0, mpBonus: 12, requiredLevel: 30 },
    { name: "天界圣剑", slot: "mainHand", rarity: "传说", description: "天界守护者赐予的神圣之剑", icon: "✨", attackBonus: 130, defenseBonus: 15, speedBonus: 20, luckBonus: 15, hpBonus: 0, mpBonus: 20, requiredLevel: 50 },
    // === 副手 (offHand) ===
    { name: "木盾", slot: "offHand", rarity: "普通", description: "粗糙的木制盾牌", icon: "🛡️", attackBonus: 0, defenseBonus: 8, speedBonus: 0, luckBonus: 0, hpBonus: 2, mpBonus: 0, requiredLevel: 1 },
    { name: "铁盾", slot: "offHand", rarity: "精良", description: "坚固的铁制盾牌", icon: "🛡️", attackBonus: 0, defenseBonus: 18, speedBonus: 0, luckBonus: 2, hpBonus: 5, mpBonus: 0, requiredLevel: 5 },
    { name: "霜纹盾", slot: "offHand", rarity: "稀有", description: "刻有霜纹的魔法盾牌", icon: "❄️", attackBonus: 0, defenseBonus: 35, speedBonus: 2, luckBonus: 3, hpBonus: 10, mpBonus: 0, requiredLevel: 15 },
    { name: "暗影壁垒", slot: "offHand", rarity: "史诗", description: "暗影之力凝聚的壁垒之盾", icon: "🌑", attackBonus: 5, defenseBonus: 60, speedBonus: 5, luckBonus: 8, hpBonus: 22, mpBonus: 0, requiredLevel: 30 },
    { name: "天使之翼盾", slot: "offHand", rarity: "传说", description: "天使羽翼化为的神盾", icon: "👼", attackBonus: 10, defenseBonus: 120, speedBonus: 15, luckBonus: 15, hpBonus: 40, mpBonus: 0, requiredLevel: 50 },
    // === 头盔 (helmet) ===
    { name: "皮帽", slot: "helmet", rarity: "普通", description: "简易的皮革帽", icon: "🧢", attackBonus: 0, defenseBonus: 5, speedBonus: 0, luckBonus: 2, hpBonus: 3, mpBonus: 0, requiredLevel: 1 },
    { name: "铁盔", slot: "helmet", rarity: "精良", description: "铁制战斗头盔", icon: "⛑️", attackBonus: 0, defenseBonus: 12, speedBonus: 0, luckBonus: 3, hpBonus: 10, mpBonus: 0, requiredLevel: 5 },
    { name: "秘银头冠", slot: "helmet", rarity: "稀有", description: "秘银锻造的华丽头冠", icon: "👑", attackBonus: 5, defenseBonus: 20, speedBonus: 5, luckBonus: 5, hpBonus: 15, mpBonus: 0, requiredLevel: 15 },
    { name: "龙骨战盔", slot: "helmet", rarity: "史诗", description: "龙骨制成的威严战盔", icon: "🐲", attackBonus: 10, defenseBonus: 40, speedBonus: 8, luckBonus: 10, hpBonus: 32, mpBonus: 0, requiredLevel: 30 },
    { name: "圣光王冠", slot: "helmet", rarity: "传说", description: "散发圣光的王者之冠", icon: "💫", attackBonus: 20, defenseBonus: 80, speedBonus: 15, luckBonus: 20, hpBonus: 65, mpBonus: 0, requiredLevel: 50 },
    // === 胸甲 (chest) ===
    { name: "皮甲", slot: "chest", rarity: "普通", description: "基础的皮革护甲", icon: "🎽", attackBonus: 0, defenseBonus: 7, speedBonus: 0, luckBonus: 0, hpBonus: 3, mpBonus: 0, requiredLevel: 1 },
    { name: "锁子甲", slot: "chest", rarity: "精良", description: "精密的锁子铠甲", icon: "🦺", attackBonus: 0, defenseBonus: 16, speedBonus: 0, luckBonus: 2, hpBonus: 7, mpBonus: 0, requiredLevel: 5 },
    { name: "精灵铠甲", slot: "chest", rarity: "稀有", description: "精灵工匠打造的轻盈铠甲", icon: "🧥", attackBonus: 5, defenseBonus: 25, speedBonus: 8, luckBonus: 4, hpBonus: 8, mpBonus: 0, requiredLevel: 15 },
    { name: "暗影胸甲", slot: "chest", rarity: "史诗", description: "暗影之力加持的战甲", icon: "🌑", attackBonus: 10, defenseBonus: 48, speedBonus: 10, luckBonus: 8, hpBonus: 24, mpBonus: 0, requiredLevel: 30 },
    { name: "神圣战甲", slot: "chest", rarity: "传说", description: "神圣力量铸就的最强战甲", icon: "⚜️", attackBonus: 20, defenseBonus: 100, speedBonus: 20, luckBonus: 15, hpBonus: 45, mpBonus: 0, requiredLevel: 50 },
    // === 腰带 (belt) ===
    { name: "布带", slot: "belt", rarity: "普通", description: "普通的布腰带", icon: "🎗️", attackBonus: 0, defenseBonus: 3, speedBonus: 2, luckBonus: 0, hpBonus: 2, mpBonus: 3, requiredLevel: 1 },
    { name: "皮腰带", slot: "belt", rarity: "精良", description: "结实的皮质腰带", icon: "🎗️", attackBonus: 2, defenseBonus: 8, speedBonus: 3, luckBonus: 2, hpBonus: 5, mpBonus: 5, requiredLevel: 5 },
    { name: "力量腰封", slot: "belt", rarity: "稀有", description: "蕴含力量的魔法腰封", icon: "💪", attackBonus: 8, defenseBonus: 12, speedBonus: 5, luckBonus: 5, hpBonus: 10, mpBonus: 10, requiredLevel: 15 },
    { name: "龙鳞腰带", slot: "belt", rarity: "史诗", description: "龙鳞编织的坚韧腰带", icon: "🐉", attackBonus: 15, defenseBonus: 25, speedBonus: 10, luckBonus: 10, hpBonus: 20, mpBonus: 20, requiredLevel: 30 },
    { name: "天命腰封", slot: "belt", rarity: "传说", description: "承载天命之力的腰封", icon: "🌟", attackBonus: 30, defenseBonus: 50, speedBonus: 20, luckBonus: 20, hpBonus: 40, mpBonus: 40, requiredLevel: 50 },
    // === 手套 (gloves) ===
    { name: "布手套", slot: "gloves", rarity: "普通", description: "简单的布手套", icon: "🧤", attackBonus: 3, defenseBonus: 2, speedBonus: 3, luckBonus: 2, hpBonus: 0, mpBonus: 0, requiredLevel: 1 },
    { name: "皮手套", slot: "gloves", rarity: "精良", description: "灵活的皮手套", icon: "🧤", attackBonus: 8, defenseBonus: 5, speedBonus: 5, luckBonus: 4, hpBonus: 0, mpBonus: 3, requiredLevel: 5 },
    { name: "敏捷护手", slot: "gloves", rarity: "稀有", description: "提升敏捷的魔法护手", icon: "✋", attackBonus: 12, defenseBonus: 8, speedBonus: 15, luckBonus: 5, hpBonus: 0, mpBonus: 10, requiredLevel: 15 },
    { name: "炎魔手套", slot: "gloves", rarity: "史诗", description: "炎魔之力注入的手套", icon: "🔥", attackBonus: 25, defenseBonus: 15, speedBonus: 20, luckBonus: 10, hpBonus: 10, mpBonus: 20, requiredLevel: 30 },
    { name: "神力护腕", slot: "gloves", rarity: "传说", description: "蕴含神力的护腕", icon: "💎", attackBonus: 50, defenseBonus: 30, speedBonus: 40, luckBonus: 20, hpBonus: 20, mpBonus: 40, requiredLevel: 50 },
    // === 腿甲 (pants) ===
    { name: "布裤", slot: "pants", rarity: "普通", description: "普通的布裤", icon: "👖", attackBonus: 0, defenseBonus: 5, speedBonus: 2, luckBonus: 0, hpBonus: 3, mpBonus: 0, requiredLevel: 1 },
    { name: "皮腿甲", slot: "pants", rarity: "精良", description: "皮革腿部护甲", icon: "👖", attackBonus: 0, defenseBonus: 12, speedBonus: 3, luckBonus: 2, hpBonus: 8, mpBonus: 0, requiredLevel: 5 },
    { name: "铁胫甲", slot: "pants", rarity: "稀有", description: "铁制腿部重甲", icon: "🦿", attackBonus: 3, defenseBonus: 22, speedBonus: 5, luckBonus: 5, hpBonus: 15, mpBonus: 0, requiredLevel: 15 },
    { name: "暗影腿甲", slot: "pants", rarity: "史诗", description: "暗影之力附着的腿甲", icon: "🌑", attackBonus: 8, defenseBonus: 42, speedBonus: 12, luckBonus: 10, hpBonus: 28, mpBonus: 0, requiredLevel: 30 },
    { name: "天使护腿", slot: "pants", rarity: "传说", description: "天使守护的神圣腿甲", icon: "👼", attackBonus: 15, defenseBonus: 85, speedBonus: 25, luckBonus: 20, hpBonus: 55, mpBonus: 0, requiredLevel: 50 },
    // === 鞋子 (boots) ===
    { name: "草鞋", slot: "boots", rarity: "普通", description: "简陋的草编鞋", icon: "👟", attackBonus: 0, defenseBonus: 2, speedBonus: 5, luckBonus: 0, hpBonus: 0, mpBonus: 3, requiredLevel: 1 },
    { name: "皮靴", slot: "boots", rarity: "精良", description: "结实的皮靴", icon: "👢", attackBonus: 0, defenseBonus: 5, speedBonus: 12, luckBonus: 3, hpBonus: 0, mpBonus: 5, requiredLevel: 5 },
    { name: "疾风靴", slot: "boots", rarity: "稀有", description: "附有疾风之力的靴子", icon: "💨", attackBonus: 3, defenseBonus: 8, speedBonus: 25, luckBonus: 5, hpBonus: 5, mpBonus: 4, requiredLevel: 15 },
    { name: "暗影之靴", slot: "boots", rarity: "史诗", description: "暗影中无声行走的靴子", icon: "🌑", attackBonus: 8, defenseBonus: 15, speedBonus: 45, luckBonus: 12, hpBonus: 10, mpBonus: 10, requiredLevel: 30 },
    { name: "天行者之靴", slot: "boots", rarity: "传说", description: "行走于天地间的神靴", icon: "⚡", attackBonus: 15, defenseBonus: 30, speedBonus: 90, luckBonus: 25, hpBonus: 20, mpBonus: 20, requiredLevel: 50 },
    // === 项链 (necklace) ===
    { name: "铜坠", slot: "necklace", rarity: "普通", description: "简单的铜质坠子", icon: "📿", attackBonus: 2, defenseBonus: 0, speedBonus: 0, luckBonus: 3, hpBonus: 0, mpBonus: 5, requiredLevel: 1 },
    { name: "银链", slot: "necklace", rarity: "精良", description: "精致的银制项链", icon: "📿", attackBonus: 5, defenseBonus: 2, speedBonus: 2, luckBonus: 5, hpBonus: 3, mpBonus: 8, requiredLevel: 5 },
    { name: "智慧吊坠", slot: "necklace", rarity: "稀有", description: "增强智慧的魔法吊坠", icon: "🔮", attackBonus: 8, defenseBonus: 5, speedBonus: 5, luckBonus: 8, hpBonus: 8, mpBonus: 16, requiredLevel: 15 },
    { name: "龙心项链", slot: "necklace", rarity: "史诗", description: "龙心宝石镶嵌的项链", icon: "💠", attackBonus: 18, defenseBonus: 10, speedBonus: 10, luckBonus: 12, hpBonus: 18, mpBonus: 32, requiredLevel: 30 },
    { name: "天命项链", slot: "necklace", rarity: "传说", description: "承载天命的神圣项链", icon: "🌟", attackBonus: 35, defenseBonus: 20, speedBonus: 20, luckBonus: 25, hpBonus: 35, mpBonus: 65, requiredLevel: 50 },
    // === 戒指 (ring) ===
    { name: "铜戒", slot: "ring", rarity: "普通", description: "朴素的铜戒指", icon: "💍", attackBonus: 2, defenseBonus: 2, speedBonus: 2, luckBonus: 2, hpBonus: 0, mpBonus: 2, requiredLevel: 1 },
    { name: "银戒", slot: "ring", rarity: "精良", description: "精致的银戒指", icon: "💍", attackBonus: 5, defenseBonus: 4, speedBonus: 4, luckBonus: 4, hpBonus: 3, mpBonus: 5, requiredLevel: 5 },
    { name: "力量指环", slot: "ring", rarity: "稀有", description: "增幅力量的魔法指环", icon: "💎", attackBonus: 15, defenseBonus: 8, speedBonus: 5, luckBonus: 6, hpBonus: 8, mpBonus: 8, requiredLevel: 15 },
    { name: "暗影戒指", slot: "ring", rarity: "史诗", description: "暗影之力凝聚的戒指", icon: "🖤", attackBonus: 25, defenseBonus: 15, speedBonus: 12, luckBonus: 15, hpBonus: 15, mpBonus: 18, requiredLevel: 30 },
    { name: "天使指环", slot: "ring", rarity: "传说", description: "天使赐予的神圣指环", icon: "👼", attackBonus: 50, defenseBonus: 30, speedBonus: 25, luckBonus: 30, hpBonus: 30, mpBonus: 35, requiredLevel: 50 },
  ];

  for (const equip of equipments) {
    const existing = await prisma.equipment.findFirst({ where: { name: equip.name } });
    if (!existing) {
      await prisma.equipment.create({ data: equip });
    }
  }
  console.log(`Created ${equipments.length} equipment templates`);

  // ===== Boss模板 =====
  const bosses = [
    // === 主位面 ===
    { name: "哥布林王", icon: "👺", description: "统领哥布林部落的凶残首领", level: 5, hp: 300, attack: 20, defense: 10, skills: JSON.stringify([{ name: "王者重击", damage: 1.8 }, { name: "召唤小弟", damage: 0, effect: "summon" }]), weeklyAttemptLimit: 3, requiredTier: 0, requiredLevel: 3, requiredWorld: null, rewardGold: 300, rewardCrystals: 10, rewardExp: 150, rewardChestRarity: "普通", rewardEquipRarity: "普通", sortOrder: 1 },
    { name: "山贼头目", icon: "🗡️", description: "盘踞山道的山贼头子，手下众多", level: 10, hp: 600, attack: 35, defense: 18, skills: JSON.stringify([{ name: "连环斩", damage: 1.5 }, { name: "威吓", damage: 0, effect: "fear" }, { name: "致命一击", damage: 2.2 }]), weeklyAttemptLimit: 3, requiredTier: 0, requiredLevel: 8, requiredWorld: null, rewardGold: 500, rewardCrystals: 20, rewardExp: 250, rewardChestRarity: "精良", rewardEquipRarity: "精良", sortOrder: 2 },
    { name: "石像鬼", icon: "🗿", description: "古代遗迹中苏醒的石像守卫", level: 15, hp: 1000, attack: 45, defense: 35, skills: JSON.stringify([{ name: "石化之拳", damage: 1.8, effect: "stun" }, { name: "岩石护甲", damage: 0, effect: "shield" }]), weeklyAttemptLimit: 2, requiredTier: 0, requiredLevel: 12, requiredWorld: null, rewardGold: 800, rewardCrystals: 30, rewardExp: 350, rewardChestRarity: "精良", rewardEquipRarity: "精良", sortOrder: 3 },
    { name: "森林巨蛛", icon: "🕷️", description: "栖息在密林深处的巨型蜘蛛", level: 20, hp: 1500, attack: 55, defense: 25, skills: JSON.stringify([{ name: "毒液喷射", damage: 1.5, effect: "poison" }, { name: "蛛网缠绕", damage: 0, effect: "slow" }, { name: "致命撕咬", damage: 2.0 }]), weeklyAttemptLimit: 2, requiredTier: 2, requiredLevel: 18, requiredWorld: null, rewardGold: 1200, rewardCrystals: 40, rewardExp: 450, rewardChestRarity: "稀有", rewardEquipRarity: "稀有", sortOrder: 4 },
    // === 火焰位面 ===
    { name: "熔岩巨人", icon: "🌋", description: "由熔岩凝聚而成的远古巨人", level: 25, hp: 2500, attack: 70, defense: 45, skills: JSON.stringify([{ name: "熔岩投掷", damage: 2.0, effect: "burn" }, { name: "地震踩踏", damage: 1.5, effect: "aoe" }]), weeklyAttemptLimit: 2, requiredTier: 2, requiredLevel: 22, requiredWorld: "fire_realm", rewardGold: 1500, rewardCrystals: 50, rewardExp: 550, rewardChestRarity: "稀有", rewardEquipRarity: "稀有", sortOrder: 5 },
    { name: "炎龙", icon: "🐉", description: "居住在火焰位面的远古巨龙", level: 30, hp: 4000, attack: 90, defense: 50, skills: JSON.stringify([{ name: "龙息", damage: 2.0, effect: "burn" }, { name: "龙爪撕裂", damage: 1.5 }, { name: "火焰风暴", damage: 2.5, effect: "aoe" }]), weeklyAttemptLimit: 2, requiredTier: 2, requiredLevel: 28, requiredWorld: "fire_realm", rewardGold: 2000, rewardCrystals: 60, rewardExp: 650, rewardChestRarity: "稀有", rewardEquipRarity: "稀有", sortOrder: 6 },
    { name: "火焰领主", icon: "🔥", description: "火焰位面的至高统治者", level: 35, hp: 5500, attack: 120, defense: 65, skills: JSON.stringify([{ name: "烈焰风暴", damage: 2.5, effect: "burn" }, { name: "火焰吞噬", damage: 2.0, effect: "drain" }, { name: "末日之焰", damage: 3.5, effect: "aoe" }]), weeklyAttemptLimit: 1, requiredTier: 3, requiredLevel: 32, requiredWorld: "fire_realm", rewardGold: 3000, rewardCrystals: 80, rewardExp: 800, rewardChestRarity: "史诗", rewardEquipRarity: "史诗", sortOrder: 7 },
    // === 寒冰位面 ===
    { name: "冰霜狼王", icon: "🐺", description: "率领冰原狼群的凶猛狼王", level: 28, hp: 3000, attack: 75, defense: 40, skills: JSON.stringify([{ name: "冰霜撕咬", damage: 1.8, effect: "slow" }, { name: "嚎叫", damage: 0, effect: "fear" }, { name: "狼群围攻", damage: 2.0, effect: "aoe" }]), weeklyAttemptLimit: 2, requiredTier: 2, requiredLevel: 25, requiredWorld: "ice_realm", rewardGold: 1800, rewardCrystals: 55, rewardExp: 600, rewardChestRarity: "稀有", rewardEquipRarity: "稀有", sortOrder: 8 },
    { name: "寒冰巨龙", icon: "❄️", description: "沉睡在冰川深处的远古冰龙", level: 35, hp: 5000, attack: 110, defense: 60, skills: JSON.stringify([{ name: "冰息", damage: 2.0, effect: "slow" }, { name: "冰锥突刺", damage: 1.8 }, { name: "绝对零度", damage: 3.0, effect: "stun" }]), weeklyAttemptLimit: 2, requiredTier: 3, requiredLevel: 30, requiredWorld: "ice_realm", rewardGold: 2500, rewardCrystals: 70, rewardExp: 750, rewardChestRarity: "史诗", rewardEquipRarity: "史诗", sortOrder: 9 },
    { name: "冰霜女皇", icon: "👸", description: "统治寒冰位面的永恒冰霜女皇", level: 42, hp: 7000, attack: 140, defense: 85, skills: JSON.stringify([{ name: "冰封领域", damage: 2.0, effect: "slow" }, { name: "寒冰屏障", damage: 0, effect: "shield" }, { name: "极寒之怒", damage: 3.5, effect: "aoe" }]), weeklyAttemptLimit: 1, requiredTier: 3, requiredLevel: 38, requiredWorld: "ice_realm", rewardGold: 3500, rewardCrystals: 100, rewardExp: 900, rewardChestRarity: "史诗", rewardEquipRarity: "史诗", sortOrder: 10 },
    // === 暗影位面 ===
    { name: "暗影刺客", icon: "🗡️", description: "暗影中最致命的刺客", level: 32, hp: 3500, attack: 100, defense: 35, skills: JSON.stringify([{ name: "暗影突袭", damage: 2.5 }, { name: "毒刃", damage: 1.5, effect: "poison" }, { name: "消失", damage: 0, effect: "dodge" }]), weeklyAttemptLimit: 2, requiredTier: 3, requiredLevel: 28, requiredWorld: "shadow_realm", rewardGold: 2200, rewardCrystals: 65, rewardExp: 700, rewardChestRarity: "稀有", rewardEquipRarity: "稀有", sortOrder: 11 },
    { name: "亡灵巫师", icon: "💀", description: "操纵亡灵之力的邪恶巫师", level: 40, hp: 6000, attack: 130, defense: 55, skills: JSON.stringify([{ name: "死亡射线", damage: 2.5 }, { name: "亡灵召唤", damage: 0, effect: "summon" }, { name: "灵魂汲取", damage: 2.0, effect: "drain" }]), weeklyAttemptLimit: 2, requiredTier: 3, requiredLevel: 35, requiredWorld: "shadow_realm", rewardGold: 3000, rewardCrystals: 90, rewardExp: 850, rewardChestRarity: "史诗", rewardEquipRarity: "史诗", sortOrder: 12 },
    { name: "暗影领主", icon: "👤", description: "暗影位面的统治者，掌控黑暗力量", level: 48, hp: 8500, attack: 170, defense: 95, skills: JSON.stringify([{ name: "暗影吞噬", damage: 2.0, effect: "drain" }, { name: "黑暗降临", damage: 1.5, effect: "blind" }, { name: "灵魂收割", damage: 3.0 }]), weeklyAttemptLimit: 1, requiredTier: 4, requiredLevel: 42, requiredWorld: "shadow_realm", rewardGold: 4000, rewardCrystals: 120, rewardExp: 1100, rewardChestRarity: "史诗", rewardEquipRarity: "史诗", sortOrder: 13 },
    // === 天界 ===
    { name: "圣殿骑士", icon: "⚔️", description: "守护天界圣殿的精英骑士", level: 45, hp: 7500, attack: 160, defense: 90, skills: JSON.stringify([{ name: "圣光斩", damage: 2.0 }, { name: "神圣守护", damage: 0, effect: "shield" }, { name: "审判之剑", damage: 2.8, effect: "holy" }]), weeklyAttemptLimit: 2, requiredTier: 4, requiredLevel: 40, requiredWorld: "celestial_realm", rewardGold: 3500, rewardCrystals: 110, rewardExp: 1000, rewardChestRarity: "史诗", rewardEquipRarity: "史诗", sortOrder: 14 },
    { name: "大天使", icon: "👼", description: "天界最强大的天使战士", level: 52, hp: 10000, attack: 200, defense: 120, skills: JSON.stringify([{ name: "天使之怒", damage: 2.5, effect: "holy" }, { name: "神圣治愈", damage: 0, effect: "heal" }, { name: "天堂裁决", damage: 3.5 }]), weeklyAttemptLimit: 1, requiredTier: 4, requiredLevel: 48, requiredWorld: "celestial_realm", rewardGold: 5000, rewardCrystals: 150, rewardExp: 1500, rewardChestRarity: "传说", rewardEquipRarity: "传说", sortOrder: 15 },
    { name: "天界守护者", icon: "🌟", description: "守护天界入口的神圣存在", level: 60, hp: 15000, attack: 250, defense: 150, skills: JSON.stringify([{ name: "神圣裁决", damage: 2.5 }, { name: "天使之翼", damage: 0, effect: "heal" }, { name: "天堂之怒", damage: 4.0, effect: "holy" }]), weeklyAttemptLimit: 1, requiredTier: 5, requiredLevel: 55, requiredWorld: "celestial_realm", rewardGold: 8000, rewardCrystals: 250, rewardExp: 2500, rewardChestRarity: "传说", rewardEquipRarity: "传说", sortOrder: 16 },
    // === 隐藏Boss ===
    { name: "混沌之主", icon: "🌀", description: "来自虚空的混沌化身，毁灭一切秩序", level: 70, hp: 25000, attack: 350, defense: 200, skills: JSON.stringify([{ name: "混沌之力", damage: 3.0, effect: "aoe" }, { name: "虚空吞噬", damage: 2.5, effect: "drain" }, { name: "毁灭射线", damage: 4.5 }]), weeklyAttemptLimit: 1, requiredTier: 5, requiredLevel: 60, requiredWorld: null, rewardGold: 15000, rewardCrystals: 400, rewardExp: 4000, rewardChestRarity: "传说", rewardEquipRarity: "传说", sortOrder: 17 },
    { name: "世界之蛇", icon: "🐍", description: "环绕诸天的远古巨蛇，世界的终结者", level: 80, hp: 40000, attack: 500, defense: 300, skills: JSON.stringify([{ name: "世界缠绕", damage: 3.5, effect: "stun" }, { name: "毒雾弥漫", damage: 2.0, effect: "poison" }, { name: "吞噬万物", damage: 5.0, effect: "drain" }]), weeklyAttemptLimit: 1, requiredTier: 5, requiredLevel: 70, requiredWorld: null, rewardGold: 25000, rewardCrystals: 600, rewardExp: 6000, rewardChestRarity: "传说", rewardEquipRarity: "传说", sortOrder: 18 },
  ];

  for (const boss of bosses) {
    await prisma.boss.upsert({
      where: { name: boss.name },
      update: boss,
      create: boss,
    });
  }
  console.log(`Created ${bosses.length} bosses`);

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
      await prisma.exploredArea.upsert({
        where: {
          playerId_worldId_positionX_positionY: {
            playerId: testPlayerRecord.id,
            worldId: "main",
            positionX: tile.x,
            positionY: tile.y,
          },
        },
        update: {},
        create: {
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

  // ========== 剧情章节与节点 ==========
  const storyChapters = [
    {
      title: "领主的觉醒",
      description: "你从沉睡中醒来，发现自己成为了一片荒芜领地的领主。一切从这里开始...",
      order: 1,
      rewardsJson: JSON.stringify({ gold: 200, exp: 100 }),
      unlockJson: JSON.stringify({}),
      nodes: [
        { nodeId: "awakening_1", title: "沉睡的领主", content: "你缓缓睁开双眼，周围是一片破旧的石室。窗外透进微弱的光线，照亮了散落一地的古老卷轴。", speaker: "旁白", speakerIcon: "📜", order: 1, nextNodeId: "awakening_2" },
        { nodeId: "awakening_2", title: "管家的问候", content: "一位老者推门而入，躬身行礼：'领主大人，您终于醒了！我是您的管家老陈，这片领地已经荒废多年，正等着您来重建。'", speaker: "管家老陈", speakerIcon: "👴", order: 2, nextNodeId: "awakening_3" },
        { nodeId: "awakening_3", title: "领地现状", content: "管家带你走出石室，眼前是一片杂草丛生的空地。远处有几座破旧的建筑，依稀能看出曾经的繁华。'领主大人，虽然现在一片荒芜，但只要用心经营，这里一定能恢复往日的荣光。'", speaker: "管家老陈", speakerIcon: "👴", order: 3, choicesJson: JSON.stringify([
          { text: "让我先看看周围有什么", nextNodeId: "awakening_4a" },
          { text: "告诉我领地目前有哪些资源", nextNodeId: "awakening_4b" },
        ]) },
        { nodeId: "awakening_4a", title: "初步探索", content: "你环顾四周。北面是一片密林，东面有一条小河，南面是一望无际的平原，西面矗立着一座山丘。'这些地方都蕴藏着丰富的资源，领主大人。不过也有不少危险潜伏其中。'", speaker: "管家老陈", speakerIcon: "👴", order: 4, nextNodeId: "awakening_5", rewardsJson: JSON.stringify({ exp: 50 }) },
        { nodeId: "awakening_4b", title: "资源盘点", content: "'目前我们有少量的金币和基础物资。粮仓里还有些存粮，但不会撑太久。我建议先修缮一下主要建筑，然后招募一些人手。'", speaker: "管家老陈", speakerIcon: "👴", order: 4, nextNodeId: "awakening_5", rewardsJson: JSON.stringify({ gold: 100 }) },
        { nodeId: "awakening_5", title: "新的开始", content: "管家递给你一把钥匙：'这是领主府的钥匙。从今天起，这片土地的命运就掌握在您手中了。祝您好运，领主大人！'", speaker: "管家老陈", speakerIcon: "👴", order: 5, rewardsJson: JSON.stringify({ gold: 100, exp: 50 }) },
      ],
    },
    {
      title: "边境危机",
      description: "领地边境传来不安的消息，一群强盗正在附近活动。你需要做出决断。",
      order: 2,
      rewardsJson: JSON.stringify({ gold: 500, crystals: 5, exp: 200 }),
      unlockJson: JSON.stringify({ level: 3 }),
      nodes: [
        { nodeId: "crisis_1", title: "紧急报告", content: "一名哨兵气喘吁吁地跑来：'领主大人！边境发现一群强盗，他们已经洗劫了附近的商队，正朝我们这边移动！'", speaker: "哨兵", speakerIcon: "🏃", order: 1, nextNodeId: "crisis_2" },
        { nodeId: "crisis_2", title: "商议对策", content: "管家皱着眉头：'领主大人，我们有三个选择：正面迎击、设伏诱敌，或者谈判招安。每种方案各有利弊。'", speaker: "管家老陈", speakerIcon: "👴", order: 2, choicesJson: JSON.stringify([
          { text: "正面迎击！展示我们的实力", nextNodeId: "crisis_3a" },
          { text: "设伏诱敌，智取为上", nextNodeId: "crisis_3b" },
          { text: "尝试谈判招安", nextNodeId: "crisis_3c" },
        ]) },
        { nodeId: "crisis_3a", title: "正面交锋", content: "你率领守卫正面迎击强盗。经过一番激战，强盗被击退，但你方也有不少损伤。战后在强盗营地中发现了不少金币和物资。", speaker: "旁白", speakerIcon: "⚔️", order: 3, nextNodeId: "crisis_4", rewardsJson: JSON.stringify({ gold: 300, exp: 100 }) },
        { nodeId: "crisis_3b", title: "智取强盗", content: "你在必经之路上设下埋伏。当强盗经过时，伏兵四起，打了他们一个措手不及。强盗首领被生擒，缴获大量赃物。", speaker: "旁白", speakerIcon: "🧠", order: 3, nextNodeId: "crisis_4", rewardsJson: JSON.stringify({ gold: 400, crystals: 3, exp: 150 }) },
        { nodeId: "crisis_3c", title: "招安谈判", content: "你派使者与强盗首领谈判。原来他们是被战乱逼上梁山的农民。你许诺给他们土地和工作，大部分人同意归顺。", speaker: "旁白", speakerIcon: "🤝", order: 3, nextNodeId: "crisis_4", rewardsJson: JSON.stringify({ exp: 200 }) },
        { nodeId: "crisis_4", title: "危机解除", content: "边境危机得到解决。管家满意地点头：'领主大人处事果断，领地的名声也因此传开了。以后应该能吸引更多人才前来投奔。'", speaker: "管家老陈", speakerIcon: "👴", order: 4, rewardsJson: JSON.stringify({ gold: 200, exp: 100 }) },
      ],
    },
    {
      title: "神秘商人",
      description: "一位神秘的旅行商人来到领地，带来了关于传送门的消息。",
      order: 3,
      rewardsJson: JSON.stringify({ crystals: 10, exp: 300 }),
      unlockJson: JSON.stringify({ level: 5 }),
      nodes: [
        { nodeId: "merchant_1", title: "不速之客", content: "一位身披斗篷的旅行者来到领地大门前。他自称是跨越位面的商人，带来了远方的珍奇货物和重要消息。", speaker: "旁白", speakerIcon: "🧳", order: 1, nextNodeId: "merchant_2" },
        { nodeId: "merchant_2", title: "位面传说", content: "'诸位可曾听说过诸天位面？在我们所在的主位面之外，还存在着火焰位面、寒冰位面、暗影位面和天界。每个位面都有独特的资源和强大的守护者。'", speaker: "神秘商人", speakerIcon: "🧙", order: 2, nextNodeId: "merchant_3" },
        { nodeId: "merchant_3", title: "传送门的线索", content: "'在你领地北方的深林中，我曾感应到传送门的能量波动。如果你能找到并激活它，就能前往其他位面探索。不过...'他压低声音，'每个位面都有强大的Boss镇守，需要足够的实力才能生存。'", speaker: "神秘商人", speakerIcon: "🧙", order: 3, choicesJson: JSON.stringify([
          { text: "你能带我去传送门的位置吗？", nextNodeId: "merchant_4a" },
          { text: "告诉我更多关于各位面Boss的信息", nextNodeId: "merchant_4b" },
        ]) },
        { nodeId: "merchant_4a", title: "传送门之路", content: "'抱歉，我还有其他位面的生意要做。但我可以卖给你一张古老的地图，上面标注了传送门的大致位置。'他从包裹中取出一张泛黄的羊皮卷。", speaker: "神秘商人", speakerIcon: "🧙", order: 4, nextNodeId: "merchant_5", rewardsJson: JSON.stringify({ crystals: 5 }) },
        { nodeId: "merchant_4b", title: "Boss情报", content: "'火焰位面有烈焰魔将，寒冰位面有冰霜女皇，暗影位面有虚空领主，天界有圣光守护者。每个都不是好惹的角色。不过打败他们的奖励也非常丰厚。'", speaker: "神秘商人", speakerIcon: "🧙", order: 4, nextNodeId: "merchant_5", rewardsJson: JSON.stringify({ exp: 100 }) },
        { nodeId: "merchant_5", title: "离别赠礼", content: "商人即将离去时，从包裹中取出几颗闪烁的水晶：'这是诸天水晶，在各个位面都能使用。算是我的一点心意，希望日后还能在其他位面与你再会。'", speaker: "神秘商人", speakerIcon: "🧙", order: 5, rewardsJson: JSON.stringify({ crystals: 5, exp: 200 }) },
      ],
    },
  ];

  for (const chapter of storyChapters) {
    const { nodes, ...chapterData } = chapter;
    const existing = await prisma.storyChapter.findFirst({ where: { title: chapterData.title } });
    const created = existing ?? await prisma.storyChapter.create({ data: chapterData });
    for (const node of nodes) {
      await prisma.storyNode.upsert({
        where: { chapterId_nodeId: { chapterId: created.id, nodeId: node.nodeId } },
        update: {},
        create: { chapterId: created.id, ...node },
      });
    }
  }
  console.log(`Created ${storyChapters.length} story chapters with nodes`);

  // ========== 冒险事件 ==========
  const adventures = [
    // 资源类事件
    { name: "废弃矿洞", type: "resource", minLevel: 1, maxLevel: 10, weight: 120, title: "废弃矿洞", description: "你发现了一个废弃的矿洞，里面似乎还有未开采的矿石。", icon: "⛏️", optionsJson: JSON.stringify([{ text: "进入矿洞采集", action: "collect" }, { text: "标记位置，稍后再来", action: "leave" }]), rewardsJson: JSON.stringify({ gold: 30, stone: 50 }) },
    { name: "丰饶果林", type: "resource", minLevel: 1, maxLevel: 15, weight: 100, title: "丰饶果林", description: "一片结满果实的果林，散发着诱人的香气。", icon: "🌳", optionsJson: JSON.stringify([{ text: "采集果实", action: "collect" }, { text: "继续前进", action: "leave" }]), rewardsJson: JSON.stringify({ food: 80 }) },
    { name: "伐木场遗址", type: "resource", minLevel: 3, maxLevel: 20, weight: 100, title: "伐木场遗址", description: "一处废弃的伐木场，周围散落着大量木材。", icon: "🪓", optionsJson: JSON.stringify([{ text: "收集木材", action: "collect" }, { text: "继续前进", action: "leave" }]), rewardsJson: JSON.stringify({ wood: 80 }) },
    { name: "隐藏金矿", type: "resource", minLevel: 10, maxLevel: 30, weight: 60, title: "隐藏的金矿脉", description: "岩壁上闪烁着金色的光芒——这里有一条天然金矿脉！", icon: "💰", optionsJson: JSON.stringify([{ text: "开采金矿", action: "collect" }, { text: "离开", action: "leave" }]), rewardsJson: JSON.stringify({ gold: 200 }) },
    { name: "水晶洞穴", type: "resource", minLevel: 15, weight: 40, title: "水晶洞穴", description: "洞穴深处散发着神秘的紫色光芒，空气中弥漫着魔力的气息。", icon: "💎", optionsJson: JSON.stringify([{ text: "采集水晶", action: "collect" }, { text: "离开", action: "leave" }]), rewardsJson: JSON.stringify({ crystals: 5, exp: 30 }) },

    // 怪物类事件
    { name: "哥布林巡逻队", type: "monster", minLevel: 1, maxLevel: 10, weight: 100, title: "哥布林巡逻队", description: "一小队哥布林挡住了去路，它们手持破旧的武器，看起来并不太强。", icon: "👺", optionsJson: JSON.stringify([{ text: "战斗！", action: "fight" }, { text: "绕路走", action: "leave" }]), monsterJson: JSON.stringify({ name: "哥布林", baseHp: 30, baseAtk: 8, baseDef: 3, expReward: 20, goldReward: 15, cardChance: 0.1 }) },
    { name: "野狼群", type: "monster", minLevel: 5, maxLevel: 15, weight: 80, title: "野狼群", description: "一群饥饿的野狼围了上来，领头的灰狼体型庞大，眼中闪烁着凶光。", icon: "🐺", optionsJson: JSON.stringify([{ text: "迎战群狼", action: "fight" }, { text: "点火驱赶", action: "leave" }]), monsterJson: JSON.stringify({ name: "灰狼首领", baseHp: 60, baseAtk: 15, baseDef: 5, expReward: 40, goldReward: 25, cardChance: 0.12 }) },
    { name: "石像鬼", type: "monster", minLevel: 10, maxLevel: 25, weight: 70, title: "苏醒的石像鬼", description: "路边的石像突然动了起来！它张开石质的翅膀，发出沙哑的吼叫。", icon: "🗿", optionsJson: JSON.stringify([{ text: "与之战斗", action: "fight" }, { text: "快速撤退", action: "leave" }]), monsterJson: JSON.stringify({ name: "石像鬼", baseHp: 100, baseAtk: 22, baseDef: 15, expReward: 80, goldReward: 50, cardChance: 0.15 }) },
    { name: "暗影刺客", type: "monster", minLevel: 20, maxLevel: 40, weight: 50, title: "暗影伏击", description: "黑暗中闪过一道寒光！一名暗影刺客正潜伏在路旁，准备突袭。", icon: "🗡️", optionsJson: JSON.stringify([{ text: "反击！", action: "fight" }, { text: "防御并撤退", action: "leave" }]), monsterJson: JSON.stringify({ name: "暗影刺客", baseHp: 150, baseAtk: 35, baseDef: 10, expReward: 150, goldReward: 100, cardChance: 0.2 }) },

    // 宝藏类事件
    { name: "古老宝箱", type: "treasure", minLevel: 1, maxLevel: 20, weight: 60, title: "古老的宝箱", description: "你在灌木丛后发现了一个锈迹斑斑的宝箱。锁已经损坏，只需轻轻一推就能打开。", icon: "📦", optionsJson: JSON.stringify([{ text: "打开宝箱", action: "open" }, { text: "可能是陷阱，离开", action: "leave" }]), rewardsJson: JSON.stringify({ gold: 80, exp: 20 }) },
    { name: "勇者遗物", type: "treasure", minLevel: 10, maxLevel: 30, weight: 40, title: "勇者的遗物", description: "一具骸骨靠在树下，手中紧握着一个精致的盒子。看起来是某位冒险者的遗物。", icon: "💀", optionsJson: JSON.stringify([{ text: "恭敬地打开盒子", action: "open" }, { text: "为他祈祷后离开", action: "leave" }]), rewardsJson: JSON.stringify({ gold: 150, crystals: 3, exp: 50 }) },
    { name: "龙之宝库", type: "treasure", minLevel: 25, weight: 20, title: "龙之宝库", description: "你发现了传说中龙族藏匿财宝的洞穴入口。洞口散发着灼热的气息，但能看到里面金光闪闪。", icon: "🐲", optionsJson: JSON.stringify([{ text: "冒险进入", action: "open" }, { text: "太危险了，离开", action: "leave" }]), rewardsJson: JSON.stringify({ gold: 500, crystals: 10, exp: 200 }) },

    // 商人类事件
    { name: "流浪商人", type: "merchant", minLevel: 1, weight: 80, title: "流浪商人", description: "一位背着大包小包的商人在路边休息。他看到你后热情地打招呼：'要看看我的商品吗？价格公道！'", icon: "🧳", optionsJson: JSON.stringify([{ text: "看看有什么好东西", action: "trade" }, { text: "不了，继续赶路", action: "leave" }]), rewardsJson: JSON.stringify({ gold: 50, exp: 10 }) },
    { name: "精灵药师", type: "merchant", minLevel: 10, weight: 50, title: "精灵药师", description: "一位精灵药师在林间空地上摆出了各种药剂。'这些都是用稀有草药调配的，对冒险者很有用。'", icon: "🧝", optionsJson: JSON.stringify([{ text: "购买药剂", action: "trade" }, { text: "继续前进", action: "leave" }]), rewardsJson: JSON.stringify({ exp: 30 }) },

    // 陷阱类事件
    { name: "毒沼泽", type: "trap", minLevel: 5, maxLevel: 25, weight: 60, title: "毒沼泽", description: "前方的地面看起来有些异样...突然，你的脚陷入了沼泽！有毒的气体正在升起。", icon: "☠️", optionsJson: JSON.stringify([{ text: "奋力挣脱", action: "escape" }, { text: "等待救援", action: "wait" }]), rewardsJson: JSON.stringify({ exp: 30 }) },
    { name: "落石陷阱", type: "trap", minLevel: 8, maxLevel: 30, weight: 50, title: "落石陷阱", description: "头顶传来咔嚓声响，碎石开始坠落！这是人为设置的陷阱！", icon: "🪨", optionsJson: JSON.stringify([{ text: "快速闪避", action: "escape" }, { text: "硬抗", action: "endure" }]), rewardsJson: JSON.stringify({ exp: 40 }) },

    // 特殊类事件
    { name: "许愿泉", type: "special", minLevel: 1, weight: 30, title: "许愿泉", description: "你发现了一口散发着淡蓝色光芒的泉水。传说向泉水许愿可以获得神秘的力量。", icon: "⛲", optionsJson: JSON.stringify([{ text: "投入金币许愿", action: "wish", cost: { gold: 50 } }, { text: "饮用泉水", action: "drink" }, { text: "离开", action: "leave" }]), rewardsJson: JSON.stringify({ crystals: 3, exp: 50 }) },
    { name: "流浪诗人", type: "special", minLevel: 5, weight: 40, title: "流浪诗人", description: "一位诗人坐在路边弹奏着琴弦，悠扬的曲调让人心旷神怡。'旅者，要听一曲吗？也许我的歌声能给你带来好运。'", icon: "🎵", optionsJson: JSON.stringify([{ text: "坐下倾听", action: "listen" }, { text: "继续赶路", action: "leave" }]), rewardsJson: JSON.stringify({ exp: 40 }) },
    { name: "古代祭坛", type: "special", minLevel: 15, weight: 25, title: "古代祭坛", description: "一座古老的祭坛矗立在空地中央，上面刻满了神秘的符文。祭坛散发着微弱的能量波动。", icon: "🏛️", optionsJson: JSON.stringify([{ text: "献上祭品", action: "sacrifice", cost: { crystals: 5 } }, { text: "研究符文", action: "study" }, { text: "离开", action: "leave" }]), rewardsJson: JSON.stringify({ crystals: 10, exp: 100 }) },
  ];

  for (const adventure of adventures) {
    await prisma.adventure.upsert({
      where: { name: adventure.name },
      update: {},
      create: adventure,
    });
  }
  console.log(`Created ${adventures.length} adventure events`);

  // ===== 游戏规则 =====
  await seedGameRules(prisma);

  console.log("Seeding complete!");
}

async function seedGameRules(db: PrismaClient): Promise<void> {
  for (const rule of SEED_RULES) {
    await db.gameRule.upsert({
      where: { name: rule.name },
      update: {
        category: rule.category,
        ruleType: rule.ruleType,
        definition: rule.definition,
        description: rule.description,
      },
      create: {
        name: rule.name,
        category: rule.category,
        ruleType: rule.ruleType,
        definition: rule.definition,
        description: rule.description,
      },
    });
  }
  console.log(`Seeded ${SEED_RULES.length} game rules`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
