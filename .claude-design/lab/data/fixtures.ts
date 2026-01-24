// Mock data for design lab variants

export const playerData = {
  name: "旅行者",
  title: "领主", // 头衔（非职业）
  profession: null, // 职业（初始无，通过突破卡获得）
  level: 12,
  actionPoints: { current: 5, max: 8 },
  currentWorld: "主位面",
};

export const resourcesData = {
  gold: 2450,
  wood: 380,
  stone: 210,
  food: 520,
  crystals: 15,
};

// 详细建筑数据
export const buildingsData = [
  {
    id: 1,
    name: "主城堡",
    level: 3,
    maxLevel: 10,
    icon: "🏰",
    status: "idle",
    slot: "core",
    description: "领地的核心建筑，决定领地等级上限和可建造数量。",
    effects: [
      { type: "领地等级", value: "+3" },
      { type: "建筑槽位", value: "9" },
      { type: "防御力", value: "+50" },
    ],
    upgradeCost: { gold: 1000, wood: 200, stone: 300 },
    upgradeTime: "4小时",
    dailyOutput: null,
  },
  {
    id: 2,
    name: "农田",
    level: 2,
    maxLevel: 5,
    icon: "🌾",
    status: "working",
    assignedChar: "村民·阿福",
    assignedCharId: 2,
    slot: "production",
    description: "生产粮食的基础设施，分配农夫可提高产量。",
    effects: [
      { type: "基础产量", value: "粮食+30/日" },
      { type: "角色加成", value: "+50%" },
    ],
    upgradeCost: { gold: 200, wood: 100 },
    upgradeTime: "1小时",
    dailyOutput: { food: 45 },
  },
  {
    id: 3,
    name: "铁匠铺",
    level: 2,
    maxLevel: 5,
    icon: "⚒️",
    status: "working",
    assignedChar: "工匠·老陈",
    assignedCharId: 3,
    slot: "production",
    description: "锻造武器装备，分配工匠可解锁高级配方。",
    effects: [
      { type: "可锻造", value: "普通/精良装备" },
      { type: "锻造速度", value: "+20%" },
    ],
    upgradeCost: { gold: 500, stone: 150 },
    upgradeTime: "2小时",
    dailyOutput: null,
    recipes: ["铁剑", "铁盾", "铁甲"],
  },
  {
    id: 4,
    name: "兵营",
    level: 1,
    maxLevel: 5,
    icon: "⚔️",
    status: "idle",
    slot: "military",
    description: "训练士兵和存放军备的场所。",
    effects: [
      { type: "士兵上限", value: "10" },
      { type: "训练速度", value: "1x" },
    ],
    upgradeCost: { gold: 300, wood: 150, stone: 100 },
    upgradeTime: "2小时",
    dailyOutput: null,
  },
  {
    id: 5,
    name: "市场",
    level: 1,
    maxLevel: 5,
    icon: "🏪",
    status: "idle",
    slot: "commerce",
    description: "进行资源交易和商品买卖。",
    effects: [
      { type: "交易税", value: "10%" },
      { type: "商品刷新", value: "每日1次" },
    ],
    upgradeCost: { gold: 400, wood: 100 },
    upgradeTime: "1.5小时",
    dailyOutput: null,
  },
  {
    id: 6,
    name: "传送门",
    level: 1,
    maxLevel: 3,
    icon: "🌀",
    status: "ready",
    slot: "special",
    description: "连接诸天世界的神秘装置。",
    effects: [
      { type: "可前往", value: "1个世界" },
      { type: "传送消耗", value: "2 AP" },
    ],
    upgradeCost: { gold: 800, crystals: 10 },
    upgradeTime: "6小时",
    dailyOutput: null,
    unlockedWorlds: ["仙侠世界"],
  },
];

// 详细角色数据
export const charactersData = [
  {
    id: 1,
    name: "剑士·李云",
    class: "战士", // 基础职业
    profession: null, // 突破职业（通过突破卡获得）
    rarity: "精英",
    level: 8,
    maxLevel: 20,
    exp: 340,
    expToNext: 500,
    status: "idle",
    hp: 85,
    maxHp: 100,
    mp: 20,
    maxMp: 20,
    portrait: "⚔️",
    stats: {
      attack: 45,
      defense: 30,
      speed: 25,
      luck: 10,
    },
    skills: [
      { name: "剑气斩", level: 2, description: "释放剑气造成150%攻击伤害", cooldown: 2 },
      { name: "铁壁", level: 1, description: "提升50%防御持续2回合", cooldown: 3 },
    ],
    equipment: {
      mainHand: "精钢长剑",
      offHand: "铁盾",
      helmet: "铁头盔",
      chest: "铁甲",
      belt: "皮带",
      gloves: null,
      pants: "铁护腿",
      boots: "皮靴",
      necklace: null,
      ring1: null,
      ring2: null,
    },
    traits: ["勇猛", "忠诚"],
    affection: 75,
    story: "曾是边境守卫，因战乱流落至此，剑术精湛，性格直爽。",
  },
  {
    id: 2,
    name: "村民·阿福",
    class: "农夫",
    profession: null,
    rarity: "普通",
    level: 4,
    maxLevel: 10,
    exp: 80,
    expToNext: 120,
    status: "working",
    workingAt: "农田",
    hp: 40,
    maxHp: 40,
    mp: 5,
    maxMp: 5,
    portrait: "👨‍🌾",
    stats: {
      attack: 8,
      defense: 10,
      speed: 12,
      luck: 20,
    },
    skills: [
      { name: "丰收", level: 3, description: "农作物产量+30%", cooldown: 0 },
    ],
    equipment: {
      mainHand: "锄头",
      offHand: null,
      helmet: "草帽",
      chest: "麻布衣",
      belt: "草绳",
      gloves: "布手套",
      pants: "麻布裤",
      boots: "草鞋",
      necklace: null,
      ring1: null,
      ring2: null,
    },
    traits: ["勤劳", "朴实"],
    affection: 60,
    story: "本地农民，对土地有着深厚的感情，是领地的粮食支柱。",
  },
  {
    id: 3,
    name: "工匠·老陈",
    class: "工匠",
    profession: null,
    rarity: "精英",
    level: 6,
    maxLevel: 15,
    exp: 200,
    expToNext: 300,
    status: "working",
    workingAt: "铁匠铺",
    hp: 50,
    maxHp: 50,
    mp: 15,
    maxMp: 15,
    portrait: "🔨",
    stats: {
      attack: 15,
      defense: 20,
      speed: 10,
      luck: 15,
    },
    skills: [
      { name: "精工", level: 2, description: "锻造时有20%概率提升品质", cooldown: 0 },
      { name: "修复", level: 1, description: "修复装备耐久度", cooldown: 5 },
    ],
    equipment: {
      mainHand: "铁锤",
      offHand: null,
      helmet: "护目镜",
      chest: "皮围裙",
      belt: "工具腰带",
      gloves: "耐热手套",
      pants: "工装裤",
      boots: "厚底靴",
      necklace: null,
      ring1: null,
      ring2: null,
    },
    traits: ["专注", "完美主义"],
    affection: 50,
    story: "游历四方的老工匠，掌握多种锻造秘技，脾气有些古怪。",
  },
  {
    id: 4,
    name: "学者·苏文",
    class: "学者",
    profession: "术士", // 示例：已获得突破职业
    rarity: "稀有",
    level: 5,
    maxLevel: 20,
    exp: 150,
    expToNext: 250,
    status: "idle",
    hp: 35,
    maxHp: 35,
    mp: 50,
    maxMp: 50,
    portrait: "📖",
    stats: {
      attack: 10,
      defense: 8,
      speed: 15,
      luck: 25,
    },
    skills: [
      { name: "博学", level: 2, description: "研究速度+40%", cooldown: 0 },
      { name: "鉴定", level: 1, description: "识别未知物品", cooldown: 1 },
      { name: "火球术", level: 1, description: "造成120%智力魔法伤害", cooldown: 2 },
    ],
    equipment: {
      mainHand: "法杖",
      offHand: "魔法书",
      helmet: null,
      chest: "学者袍",
      belt: "丝带",
      gloves: null,
      pants: "长裤",
      boots: "布鞋",
      necklace: "水晶项链",
      ring1: "智慧戒指",
      ring2: null,
    },
    traits: ["博学", "好奇"],
    affection: 40,
    story: "来自远方学院的年轻学者，对古代遗迹和神秘现象充满兴趣。",
  },
];

// 地块属性数据
export const tileAttributesData: Record<string, TileAttributes> = {
  "0-0": { fertility: 2, minerals: 0, danger: 0, discovery: null },
  "1-0": { fertility: 3, minerals: 0, danger: 0, discovery: null },
  "2-0": { fertility: 0, minerals: 0, danger: 0, discovery: "古老石碑" },
  "3-0": { fertility: 2, minerals: 1, danger: 0, discovery: null },
  "4-0": { fertility: 1, minerals: 0, danger: 1, discovery: null },
  "5-0": { fertility: 0, minerals: 0, danger: 0, discovery: null },
  "0-1": { fertility: 2, minerals: 0, danger: 0, discovery: null },
  "1-1": { fertility: 4, minerals: 0, danger: 0, discovery: null }, // 农田位置，高肥沃度
  "2-1": { fertility: 0, minerals: 0, danger: 0, discovery: null },
  "3-1": { fertility: 1, minerals: 3, danger: 0, discovery: null }, // 铁匠铺位置，高矿产
  "4-1": { fertility: 1, minerals: 1, danger: 0, discovery: null },
  "5-1": { fertility: 0, minerals: 0, danger: 0, discovery: "水源" },
  "0-2": { fertility: 0, minerals: 0, danger: 0, discovery: null },
  "1-2": { fertility: 0, minerals: 0, danger: 0, discovery: null },
  "2-2": { fertility: 0, minerals: 0, danger: 0, discovery: null }, // 主城堡位置
  "3-2": { fertility: 0, minerals: 0, danger: 0, discovery: null },
  "4-2": { fertility: 0, minerals: 0, danger: 0, discovery: null },
  "5-2": { fertility: 0, minerals: 0, danger: 1, discovery: null },
  "0-3": { fertility: 1, minerals: 0, danger: 1, discovery: null },
  "1-3": { fertility: 0, minerals: 1, danger: 0, discovery: null }, // 兵营位置
  "2-3": { fertility: 0, minerals: 0, danger: 0, discovery: null },
  "3-3": { fertility: 0, minerals: 0, danger: 0, discovery: "商队遗迹" }, // 市场位置
  "4-3": { fertility: 2, minerals: 0, danger: 0, discovery: null },
  "5-3": { fertility: 1, minerals: 0, danger: 2, discovery: null },
  "0-4": { fertility: 1, minerals: 2, danger: 1, discovery: null },
  "1-4": { fertility: 0, minerals: 1, danger: 0, discovery: null },
  "2-4": { fertility: 0, minerals: 0, danger: 0, discovery: null },
  "3-4": { fertility: 1, minerals: 0, danger: 0, discovery: null },
  "4-4": { fertility: 0, minerals: 0, danger: 0, discovery: "魔法残留" }, // 传送门位置
  "5-4": { fertility: 0, minerals: 0, danger: 3, discovery: "危险区域" },
  "0-5": { fertility: 0, minerals: 3, danger: 2, discovery: "矿洞入口" },
  "1-5": { fertility: 2, minerals: 1, danger: 1, discovery: null },
  "2-5": { fertility: 0, minerals: 0, danger: 0, discovery: null },
  "3-5": { fertility: 3, minerals: 0, danger: 0, discovery: null },
  "4-5": { fertility: 2, minerals: 0, danger: 1, discovery: null },
  "5-5": { fertility: 0, minerals: 2, danger: 3, discovery: "神秘洞穴" },
};

export interface TileAttributes {
  fertility: number;  // 肥沃度 0-5，影响农业产出
  minerals: number;   // 矿产 0-5，影响采矿产出
  danger: number;     // 危险度 0-5，影响探索风险
  discovery: string | null;  // 发现物
}

export const tasksData = [
  { id: 1, title: "清剿山贼", type: "combat", world: "主位面", reward: "剑气斩卡", status: "available" },
  { id: 2, title: "收集灵草", type: "gather", world: "仙侠世界", reward: "灵石x50", status: "available" },
  { id: 3, title: "神秘商人", type: "event", world: "主位面", reward: "???", status: "new" },
];

export const dailyInfo = {
  day: 47,
  nextSettlement: "18:00",
  unreadEvents: 2,
};

// 经济数据
export const economyData = {
  dailyIncome: {
    gold: 120,
    wood: 30,
    stone: 20,
    food: 45,
    crystals: 0,
  },
  dailyExpense: {
    gold: 50,
    wood: 0,
    stone: 0,
    food: 25,
    crystals: 0,
  },
  netIncome: {
    gold: 70,
    wood: 30,
    stone: 20,
    food: 20,
    crystals: 0,
  },
  productionFacilities: [
    { name: "农田", level: 2, assignedChar: "阿福", output: "粮食+45/日" },
    { name: "矿场", level: 1, assignedChar: null, output: "石材+10/日" },
    { name: "伐木场", level: 2, assignedChar: null, output: "木材+30/日" },
  ],
  weeklyTrend: [
    { day: 41, gold: 2100, food: 400 },
    { day: 42, gold: 2150, food: 420 },
    { day: 43, gold: 2200, food: 435 },
    { day: 44, gold: 2280, food: 460 },
    { day: 45, gold: 2350, food: 480 },
    { day: 46, gold: 2400, food: 500 },
    { day: 47, gold: 2450, food: 520 },
  ],
};

// 军事数据
export const militaryData = {
  totalPower: 285,
  defensePower: 120,
  morale: 85,
  availableCharacters: [
    { id: 1, name: "李云", class: "战士", level: 8, attack: 45, defense: 30, status: "idle" },
    { id: 4, name: "苏文", class: "学者", level: 5, attack: 10, defense: 8, status: "idle" },
  ],
  workingCharacters: [
    { id: 2, name: "阿福", class: "农夫", level: 4, attack: 8, defense: 10, status: "working", workingAt: "农田" },
    { id: 3, name: "老陈", class: "工匠", level: 6, attack: 15, defense: 20, status: "working", workingAt: "铁匠铺" },
  ],
  soldiers: 10,
  maxSoldiers: 10,
  reserveSoldiers: 5,
  militaryFacilities: [
    { name: "兵营", level: 1, effects: ["士兵上限10", "训练速度1x"] },
  ],
  unbuiltFacilities: ["训练场", "城墙"],
  threats: {
    level: "medium",
    nearby: [
      { name: "山贼据点", direction: "东", distance: "近" },
      { name: "野兽巢穴", direction: "北", distance: "中" },
    ],
    nextInvasion: { type: "山贼侦查队", daysUntil: 3 },
  },
};

// 职业模板数据
export const professionTemplates = [
  {
    id: "swordsman",
    name: "剑客",
    icon: "⚔️",
    description: "精通剑术的武者，近战攻击力卓越",
    rarity: "稀有",
    bonuses: [
      { type: "物理攻击", value: "+20%" },
      { type: "剑术伤害", value: "+30%" },
      { type: "暴击率", value: "+5%" },
    ],
    unlockConditions: {
      requiredSkills: [{ name: "剑术", minLevel: 3 }],
      description: "剑术技能达到Lv.3",
    },
    skillTree: ["剑气斩", "疾风剑", "剑舞", "一剑破天"],
  },
  {
    id: "mage",
    name: "术士",
    icon: "🔮",
    description: "掌握神秘法术的施法者，擅长远程魔法攻击",
    rarity: "稀有",
    bonuses: [
      { type: "法术伤害", value: "+15%" },
      { type: "法力上限", value: "+20%" },
      { type: "施法速度", value: "+10%" },
    ],
    unlockConditions: {
      requiredSkills: [
        { name: "火球术", minLevel: 1 },
        { name: "任意法术", minLevel: 1, count: 2 },
      ],
      description: "习得2种以上法术技能",
    },
    skillTree: ["火球术", "冰霜新星", "雷击", "元素风暴"],
  },
  {
    id: "merchant",
    name: "商人",
    icon: "💰",
    description: "精明的交易者，擅长经济运营",
    rarity: "精英",
    bonuses: [
      { type: "交易税", value: "-50%" },
      { type: "物品售价", value: "+20%" },
      { type: "购买折扣", value: "-10%" },
    ],
    unlockConditions: {
      requiredActions: { trades: 10 },
      description: "完成10次交易",
    },
    skillTree: ["讨价还价", "商业嗅觉", "批发采购", "垄断市场"],
  },
  {
    id: "master_craftsman",
    name: "工匠大师",
    icon: "⚒️",
    description: "锻造技艺登峰造极的匠人",
    rarity: "史诗",
    bonuses: [
      { type: "锻造品质", value: "+1级" },
      { type: "锻造速度", value: "+30%" },
      { type: "材料消耗", value: "-15%" },
    ],
    unlockConditions: {
      requiredSkills: [{ name: "精工", minLevel: 5 }],
      description: "工匠技能达到Lv.5",
    },
    skillTree: ["精工锻造", "附魔基础", "神器铸造", "传承秘技"],
  },
  {
    id: "ranger",
    name: "游侠",
    icon: "🏹",
    description: "行走于荒野的远程战斗专家",
    rarity: "稀有",
    bonuses: [
      { type: "远程攻击", value: "+25%" },
      { type: "移动速度", value: "+15%" },
      { type: "探索效率", value: "+20%" },
    ],
    unlockConditions: {
      requiredSkills: [{ name: "射术", minLevel: 3 }],
      requiredActions: { explorations: 20 },
      description: "射术Lv.3 且 完成20次探索",
    },
    skillTree: ["精准射击", "多重箭", "陷阱布置", "野性呼唤"],
  },
  {
    id: "guardian",
    name: "守护者",
    icon: "🛡️",
    description: "铜墙铁壁般的防御专家",
    rarity: "稀有",
    bonuses: [
      { type: "防御力", value: "+30%" },
      { type: "生命上限", value: "+20%" },
      { type: "受伤减免", value: "+10%" },
    ],
    unlockConditions: {
      requiredSkills: [{ name: "铁壁", minLevel: 3 }],
      description: "防御技能达到Lv.3",
    },
    skillTree: ["盾击", "嘲讽", "坚韧不屈", "神圣护盾"],
  },
];

// 突破卡数据
export const breakthroughCardData = {
  // 当前可用的突破卡（示例：给李云的）
  availableCards: [
    {
      id: "bt_001",
      characterId: 1,
      characterName: "剑士·李云",
      isPlayer: false,
      // 根据角色已有技能生成的可选职业
      professionOptions: [
        {
          professionId: "swordsman",
          matchScore: 95, // 技能匹配度
          matchReason: "剑气斩 Lv.2, 铁壁 Lv.1 高度匹配",
          recommended: true,
        },
        {
          professionId: "guardian",
          matchScore: 60,
          matchReason: "铁壁 Lv.1 部分匹配",
          recommended: false,
        },
      ],
      expiresIn: 3, // 3日后过期
      obtainedFrom: "突破关卡·青铜试炼",
    },
  ],

  // 已使用的突破卡记录
  usedCards: [
    {
      id: "bt_used_001",
      characterId: 4,
      characterName: "学者·苏文",
      selectedProfession: "mage",
      usedAt: "第42日",
    },
  ],

  // 突破条件说明
  breakthroughInfo: {
    title: "突破系统",
    description: "当角色满足特定条件时，可获得突破卡。使用突破卡可为角色选择一个职业，解锁职业技能树和专属加成。",
    conditions: [
      "角色等级达到10级",
      "拥有至少一个Lv.3技能",
      "完成对应职业的解锁条件",
    ],
    notes: [
      "每个角色只能拥有一个职业",
      "职业一旦选择无法更改",
      "突破卡有时效限制，请及时使用",
    ],
  },
};

// 结算系统数据
export const settlementData = {
  // 当日行动记录
  todayActions: [
    { type: "build", description: "建造了伐木场", baseScore: 50, bonus: 20, bonusReason: "首次建造", time: "09:15" },
    { type: "explore", description: "探索了森林深处", baseScore: 40, bonus: 30, bonusReason: "发现新区域", time: "10:30" },
    { type: "combat", description: "击败了山贼小队", baseScore: 40, bonus: 20, bonusReason: "无伤击杀", time: "11:45" },
    { type: "upgrade", description: "升级农田到Lv.3", baseScore: 90, bonus: 10, bonusReason: "连续升级", time: "14:20" },
    { type: "production", description: "农田产出粮食", baseScore: 10, bonus: 2, bonusReason: "超额产出", time: "18:00" },
    { type: "recruit", description: "招募了流浪剑士", baseScore: 60, bonus: 30, bonusReason: "精英品质", time: "16:00" },
  ],

  // 分数统计
  scoreBreakdown: {
    build: 70,      // 建造分
    explore: 70,    // 探索分
    combat: 60,     // 战斗分
    upgrade: 100,   // 升级分
    production: 12, // 生产分
    recruit: 90,    // 招募分
    total: 402,     // 总分
  },

  // 奖励预览
  rewards: {
    scoreRange: "400-499",
    cards: [
      { name: "精良武器箱", rarity: "精良", type: "item", isNew: true },
      { name: "招募令", rarity: "精良", type: "recruit", isNew: false },
      { name: "强化石", rarity: "稀有", type: "enhance", isNew: true },
    ],
    bonusRewards: [
      { name: "连续3日200+分奖励", reward: "稀有卡×1", progress: "2/3" },
    ],
  },

  // 连续记录
  streakData: {
    currentStreak: 2,
    bestStreak: 5,
    streakBonus: [
      { days: 3, threshold: 200, reward: "稀有卡×1", current: 2 },
      { days: 7, threshold: 300, reward: "史诗卡×1", current: 2 },
    ],
  },

  // 历史记录（近7日）
  history: [
    { day: 41, score: 185, cards: 2 },
    { day: 42, score: 230, cards: 3 },
    { day: 43, score: 310, cards: 4 },
    { day: 44, score: 275, cards: 3 },
    { day: 45, score: 420, cards: 5 },
    { day: 46, score: 380, cards: 4 },
    { day: 47, score: 402, cards: 5 }, // 今日
  ],
};

// 城外野外设施数据
export const wildernessData = {
  // 当前可见设施
  facilities: [
    {
      id: "w1",
      type: "resource",
      name: "铁矿脉",
      icon: "⛏️",
      position: { x: 2, y: -1 },
      description: "富含铁矿石的矿脉",
      rewards: ["铁矿石×20", "稀有矿石×2"],
      apCost: 2,
      remainingUses: 3,
      expiresIn: null, // 永久直到用完
    },
    {
      id: "w2",
      type: "merchant",
      name: "流浪商人",
      icon: "🏕️",
      position: { x: 4, y: 0 },
      description: "来自远方的神秘商人",
      goods: ["稀有材料", "技能书", "装备"],
      apCost: 1,
      expiresIn: 2, // 2天后离开
    },
    {
      id: "w3",
      type: "monster",
      name: "狼群巢穴",
      icon: "🐺",
      position: { x: 1, y: -2 },
      description: "危险的狼群聚集地",
      difficulty: "中等",
      rewards: ["狼皮×5", "经验+100", "战斗卡"],
      apCost: 3,
      expiresIn: null,
    },
    {
      id: "w4",
      type: "ruin",
      name: "古老石碑",
      icon: "🗿",
      position: { x: 5, y: -1 },
      description: "刻有神秘符文的石碑",
      rewards: ["???"],
      apCost: 2,
      requiresItem: "解读卷轴",
      expiresIn: null,
    },
    {
      id: "w5",
      type: "portal",
      name: "时空裂隙",
      icon: "🌀",
      position: { x: 0, y: -2 },
      description: "通往未知世界的裂缝",
      destination: "仙侠世界·外围",
      apCost: 4,
      expiresIn: 1, // 明日消失
      isNew: true,
    },
  ],

  // 已探索区域
  exploredAreas: [
    { x: 0, y: -1, name: "城门外", discovered: "第30日" },
    { x: 1, y: -1, name: "小树林", discovered: "第32日" },
    { x: 2, y: -1, name: "矿山入口", discovered: "第35日" },
    { x: 3, y: -1, name: "废弃营地", discovered: "第40日" },
  ],

  // 迷雾区域（未探索）
  fogAreas: [
    { x: 4, y: -1, hint: "似乎有人烟..." },
    { x: 5, y: -1, hint: "古老的气息..." },
    { x: 0, y: -2, hint: "能量波动..." },
    { x: 1, y: -2, hint: "危险的嚎叫..." },
    { x: 2, y: -2, hint: "未知区域" },
  ],

  // 刷新倒计时
  refreshInfo: {
    nextRefresh: "18:00",
    refreshItems: ["资源点", "商人营地", "传送裂隙"],
    permanentItems: ["怪物巢穴", "神秘遗迹"],
  },
};

// 角色技能详情（用于判断突破条件）
export const characterSkillsDetail = {
  1: { // 李云
    skills: [
      { name: "剑气斩", level: 2, type: "combat", category: "sword" },
      { name: "铁壁", level: 1, type: "defense", category: "shield" },
    ],
    combatCount: 45,
    explorations: 12,
    trades: 3,
  },
  2: { // 阿福
    skills: [
      { name: "丰收", level: 3, type: "production", category: "farming" },
    ],
    combatCount: 5,
    explorations: 2,
    trades: 8,
  },
  3: { // 老陈
    skills: [
      { name: "精工", level: 2, type: "production", category: "crafting" },
      { name: "修复", level: 1, type: "utility", category: "crafting" },
    ],
    combatCount: 10,
    explorations: 5,
    trades: 15,
  },
  4: { // 苏文
    skills: [
      { name: "博学", level: 2, type: "utility", category: "knowledge" },
      { name: "鉴定", level: 1, type: "utility", category: "knowledge" },
      { name: "火球术", level: 1, type: "magic", category: "fire" },
    ],
    combatCount: 20,
    explorations: 8,
    trades: 5,
  },
};
