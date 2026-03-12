export interface SeedRule {
  name: string;
  category: string;
  ruleType: "formula" | "condition" | "weighted_random" | "config";
  definition: string; // JSON stringified
  description: string;
}

export const SEED_RULES: SeedRule[] = [
  // ===== player (~8 rules) =====
  {
    name: "player_exp_required",
    category: "player",
    ruleType: "formula",
    definition: JSON.stringify({ formula: "100 * pow(1.15, level - 1)" }),
    description: "Experience needed to level up",
  },
  {
    name: "player_max_level",
    category: "player",
    ruleType: "formula",
    definition: JSON.stringify({ formula: "tier * 20" }),
    description: "Max level per tier",
  },
  {
    name: "player_skill_slots",
    category: "player",
    ruleType: "formula",
    definition: JSON.stringify({ formula: "tier * 6" }),
    description: "Skill slots per tier",
  },
  {
    name: "player_stat_growth",
    category: "player",
    ruleType: "formula",
    definition: JSON.stringify({ formula: "floor(level * 0.5) + 1" }),
    description: "Stat points gained per level",
  },
  {
    name: "player_stamina_per_level",
    category: "player",
    ruleType: "config",
    definition: JSON.stringify({ value: 5 }),
    description: "Max stamina increase per level",
  },
  {
    name: "player_charisma_growth",
    category: "player",
    ruleType: "formula",
    definition: JSON.stringify({ formula: "ceil(statGrowth * 0.5)" }),
    description: "Charisma growth per level",
  },
  {
    name: "player_initial_resources",
    category: "player",
    ruleType: "config",
    definition: JSON.stringify({
      gold: 500,
      wood: 200,
      stone: 100,
      food: 300,
      stamina: 100,
      maxStamina: 100,
    }),
    description: "Starting resources for new players",
  },
  {
    name: "player_initial_stats",
    category: "player",
    ruleType: "config",
    definition: JSON.stringify({
      strength: 10,
      agility: 10,
      intellect: 10,
      charisma: 14,
    }),
    description: "Starting stats for new players",
  },

  // ===== combat (~10 rules) =====
  {
    name: "combat_base_damage",
    category: "combat",
    ruleType: "formula",
    definition: JSON.stringify({ formula: "max(1, atk - def * 0.5)" }),
    description: "Base damage calculation",
  },
  {
    name: "combat_damage_variance",
    category: "combat",
    ruleType: "formula",
    definition: JSON.stringify({ formula: "0.9 + random * 0.2" }),
    description: "Damage variance multiplier range",
  },
  {
    name: "combat_crit_chance",
    category: "combat",
    ruleType: "formula",
    definition: JSON.stringify({ formula: "0.1 + luck * 0.005" }),
    description: "Critical hit chance",
  },
  {
    name: "combat_crit_multiplier",
    category: "combat",
    ruleType: "config",
    definition: JSON.stringify({ value: 1.5 }),
    description: "Critical damage multiplier",
  },
  {
    name: "combat_monster_scaling",
    category: "combat",
    ruleType: "formula",
    definition: JSON.stringify({ formula: "1 + (level - 1) * 0.25" }),
    description: "Monster stat scaling by level",
  },
  {
    name: "combat_reward_exp",
    category: "combat",
    ruleType: "formula",
    definition: JSON.stringify({ formula: "15 * level" }),
    description: "Experience reward per monster level",
  },
  {
    name: "combat_reward_gold",
    category: "combat",
    ruleType: "formula",
    definition: JSON.stringify({ formula: "10 * level" }),
    description: "Gold reward per monster level",
  },
  {
    name: "combat_card_drop_chance",
    category: "combat",
    ruleType: "formula",
    definition: JSON.stringify({ formula: "0.1 + level * 0.03" }),
    description: "Card drop probability after combat",
  },
  {
    name: "combat_stamina_cost",
    category: "combat",
    ruleType: "config",
    definition: JSON.stringify({ value: 15 }),
    description: "Stamina cost to start combat",
  },
  {
    name: "combat_flee_chance",
    category: "combat",
    ruleType: "formula",
    definition: JSON.stringify({ formula: "min(0.9, 0.5 + speed * 0.01)" }),
    description: "Flee success chance",
  },

  // ===== altar (~5 rules) =====
  {
    name: "altar_basic_weights",
    category: "altar",
    ruleType: "weighted_random",
    definition: JSON.stringify([
      { value: "普通", weight: 60 },
      { value: "精良", weight: 30 },
      { value: "稀有", weight: 10 },
    ]),
    description: "Basic altar summon rarity weights",
  },
  {
    name: "altar_sacred_weights",
    category: "altar",
    ruleType: "weighted_random",
    definition: JSON.stringify([
      { value: "普通", weight: 30 },
      { value: "精良", weight: 40 },
      { value: "稀有", weight: 25 },
      { value: "史诗", weight: 5 },
    ]),
    description: "Sacred altar summon rarity weights",
  },
  {
    name: "altar_ancient_weights",
    category: "altar",
    ruleType: "weighted_random",
    definition: JSON.stringify([
      { value: "精良", weight: 30 },
      { value: "稀有", weight: 40 },
      { value: "史诗", weight: 25 },
      { value: "传说", weight: 5 },
    ]),
    description: "Ancient altar summon rarity weights",
  },
  {
    name: "altar_stamina_cost",
    category: "altar",
    ruleType: "config",
    definition: JSON.stringify({ value: 30 }),
    description: "Stamina cost per altar summon",
  },
  {
    name: "altar_victory_formula",
    category: "altar",
    ruleType: "formula",
    definition: JSON.stringify({
      formula: "min(0.85, max(0.15, powerRatio * 0.5))",
    }),
    description: "Boss victory chance based on power ratio",
  },

  // ===== economy (~5 rules) =====
  {
    name: "building_output_multiplier",
    category: "economy",
    ruleType: "formula",
    definition: JSON.stringify({ formula: "1 + (level - 1) * 0.3" }),
    description: "Building output scaling by level",
  },
  {
    name: "building_worker_bonus",
    category: "economy",
    ruleType: "config",
    definition: JSON.stringify({ value: 1.5 }),
    description: "Worker output multiplier when assigned",
  },
  {
    name: "building_food_consumption",
    category: "economy",
    ruleType: "config",
    definition: JSON.stringify({ value: 5 }),
    description: "Food consumed per character per day",
  },
  {
    name: "building_upgrade_score",
    category: "economy",
    ruleType: "formula",
    definition: JSON.stringify({ formula: "30 * level" }),
    description: "Action score for upgrading a building",
  },
  {
    name: "building_production_score",
    category: "economy",
    ruleType: "formula",
    definition: JSON.stringify({ formula: "floor(totalOutput / 10)" }),
    description: "Daily action score from production",
  },

  // ===== exploration (~6 rules) =====
  {
    name: "explore_stamina_cost",
    category: "exploration",
    ruleType: "config",
    definition: JSON.stringify({ value: 15 }),
    description: "Stamina cost to explore a tile",
  },
  {
    name: "explore_event_stamina_cost",
    category: "exploration",
    ruleType: "config",
    definition: JSON.stringify({ value: 10 }),
    description: "Stamina cost to trigger an event",
  },
  {
    name: "explore_facility_spawn_chance",
    category: "exploration",
    ruleType: "config",
    definition: JSON.stringify({ value: 0.4 }),
    description: "Chance for a facility to appear on exploration",
  },
  {
    name: "explore_resource_scaling",
    category: "exploration",
    ruleType: "formula",
    definition: JSON.stringify({ formula: "baseAmount * (1 + level * 0.2)" }),
    description: "Resource reward scaling by player level",
  },
  {
    name: "explore_monster_level",
    category: "exploration",
    ruleType: "formula",
    definition: JSON.stringify({
      formula: "max(1, level + floor(random * 3) - 1)",
    }),
    description: "Monster level variance during exploration",
  },
  {
    name: "explore_base_score",
    category: "exploration",
    ruleType: "config",
    definition: JSON.stringify({ value: 40 }),
    description: "Action score for exploring",
  },

  // ===== settlement (~5 rules) =====
  {
    name: "settlement_grade_thresholds",
    category: "settlement",
    ruleType: "config",
    definition: JSON.stringify({ S: 500, A: 400, B: 300, C: 200 }),
    description: "Score thresholds for settlement grades",
  },
  {
    name: "settlement_streak_threshold",
    category: "settlement",
    ruleType: "config",
    definition: JSON.stringify({ value: 200 }),
    description: "Min score to count toward streak",
  },
  {
    name: "settlement_streak_3_reward",
    category: "settlement",
    ruleType: "config",
    definition: JSON.stringify({ rarity: "稀有" }),
    description: "Reward card rarity for 3-day streak",
  },
  {
    name: "settlement_streak_7_reward",
    category: "settlement",
    ruleType: "config",
    definition: JSON.stringify({ rarity: "史诗" }),
    description: "Reward card rarity for 7-day streak",
  },
  {
    name: "settlement_grade_chests",
    category: "settlement",
    ruleType: "config",
    definition: JSON.stringify({
      D: null,
      C: "普通宝箱",
      B: "精良宝箱",
      A: "稀有宝箱",
      S: "史诗宝箱",
    }),
    description: "Chest reward per settlement grade",
  },

  // ===== progression (~5 rules) =====
  {
    name: "breakthrough_tier_1",
    category: "progression",
    ruleType: "config",
    definition: JSON.stringify({ level: 10, gold: 500, crystals: 20 }),
    description: "Requirements for tier 1 breakthrough",
  },
  {
    name: "breakthrough_tier_2",
    category: "progression",
    ruleType: "config",
    definition: JSON.stringify({ level: 20, gold: 1500, crystals: 50 }),
    description: "Requirements for tier 2 breakthrough",
  },
  {
    name: "breakthrough_tier_3",
    category: "progression",
    ruleType: "config",
    definition: JSON.stringify({
      level: 30,
      gold: 3000,
      crystals: 100,
      item: "突破石",
    }),
    description: "Requirements for tier 3 breakthrough",
  },
  {
    name: "breakthrough_tier_4",
    category: "progression",
    ruleType: "config",
    definition: JSON.stringify({
      level: 40,
      gold: 5000,
      crystals: 200,
      item: "高级突破石",
    }),
    description: "Requirements for tier 4 breakthrough",
  },
  {
    name: "breakthrough_level_cap_increase",
    category: "progression",
    ruleType: "config",
    definition: JSON.stringify({ value: 20 }),
    description: "Level cap increase per breakthrough",
  },

  // ===== equipment (~4 rules) =====
  {
    name: "equipment_max_enhance",
    category: "equipment",
    ruleType: "config",
    definition: JSON.stringify({ value: 10 }),
    description: "Max enhancement level",
  },
  {
    name: "equipment_enhance_cost",
    category: "equipment",
    ruleType: "formula",
    definition: JSON.stringify({
      formula: "baseGold * rarityMult * (1 + currentLevel * 0.5)",
    }),
    description: "Gold cost for equipment enhancement",
  },
  {
    name: "equipment_enhance_success",
    category: "equipment",
    ruleType: "formula",
    definition: JSON.stringify({
      formula: "max(0.3, 1 - currentLevel * 0.08)",
    }),
    description: "Enhancement success rate",
  },
  {
    name: "equipment_rarity_multipliers",
    category: "equipment",
    ruleType: "config",
    definition: JSON.stringify({
      "普通": 1,
      "精良": 1.5,
      "稀有": 2,
      "史诗": 3,
      "传说": 5,
    }),
    description: "Stat multipliers by equipment rarity",
  },

  // ===== shop (~2 rules) =====
  { name: "shop_items", category: "economy", ruleType: "config", definition: JSON.stringify([
    { id: "wood_pack_s", name: "木材包（小）", icon: "🪵", description: "获得100木材", category: "resource", price: { gold: 50 }, effect: { type: "wood", value: 100 } },
    { id: "wood_pack_m", name: "木材包（中）", icon: "🪵", description: "获得500木材", category: "resource", price: { gold: 200 }, effect: { type: "wood", value: 500 } },
    { id: "stone_pack_s", name: "石材包（小）", icon: "🪨", description: "获得100石材", category: "resource", price: { gold: 60 }, effect: { type: "stone", value: 100 } },
    { id: "stone_pack_m", name: "石材包（中）", icon: "🪨", description: "获得500石材", category: "resource", price: { gold: 250 }, effect: { type: "stone", value: 500 } },
    { id: "food_pack_s", name: "粮食包（小）", icon: "🌾", description: "获得100粮食", category: "resource", price: { gold: 40 }, effect: { type: "food", value: 100 } },
    { id: "food_pack_m", name: "粮食包（中）", icon: "🌾", description: "获得500粮食", category: "resource", price: { gold: 160 }, effect: { type: "food", value: 500 } },
    { id: "stamina_potion", name: "体力药水", icon: "⚡", description: "恢复50点体力", category: "special", price: { gold: 100 }, stock: 5, effect: { type: "stamina", value: 50 } },
    { id: "crystal_pack", name: "水晶包", icon: "💎", description: "获得10水晶", category: "special", price: { gold: 500 }, stock: 3, effect: { type: "crystals", value: 10 } },
    { id: "exp_book_s", name: "经验书（小）", icon: "📕", description: "获得100经验值", category: "special", price: { gold: 150 }, effect: { type: "exp", value: 100 } },
    { id: "exp_book_m", name: "经验书（中）", icon: "📗", description: "获得500经验值", category: "special", price: { gold: 600 }, effect: { type: "exp", value: 500 } },
    { id: "rare_card_pack", name: "稀有卡包", icon: "🎴", description: "随机获得一张稀有卡牌", category: "card", price: { crystals: 50 }, stock: 1 },
    { id: "epic_card_pack", name: "史诗卡包", icon: "🃏", description: "随机获得一张史诗卡牌", category: "card", price: { crystals: 150 }, stock: 1 },
  ]), description: "Shop item catalog" },
  { name: "shop_sell_prices", category: "economy", ruleType: "config", definition: JSON.stringify({
    "普通": { gold: 10, crystals: 0 }, "精良": { gold: 30, crystals: 1 },
    "稀有": { gold: 80, crystals: 3 }, "史诗": { gold: 200, crystals: 10 }, "传说": { gold: 500, crystals: 30 },
  }), description: "Card sell prices by rarity" },

  // ===== innerCity (~6 rules) =====
  { name: "innercity_initial_territory", category: "territory", ruleType: "config", definition: JSON.stringify({ halfW: 4.0, halfH: 4.0, cornerR: 1.5 }), description: "Initial territory dimensions" },
  { name: "innercity_expand_multipliers", category: "territory", ruleType: "config", definition: JSON.stringify({ widthPerAmount: 1.5, cornerPerAmount: 0.5 }), description: "Territory expansion multipliers" },
  { name: "innercity_upgrade_cost", category: "territory", ruleType: "formula", definition: JSON.stringify({ gold: "baseGold * level", wood: "baseWood * level", stone: "baseStone * level" }), description: "Building upgrade cost formula" },
  { name: "innercity_upgrade_base_cost", category: "territory", ruleType: "config", definition: JSON.stringify({ gold: 100, wood: 50, stone: 30 }), description: "Base upgrade costs" },
  { name: "innercity_demolish_refund", category: "territory", ruleType: "config", definition: JSON.stringify({ goldBase: 50, woodBase: 25, stoneBase: 15, refundRate: 0.5 }), description: "Demolish refund formula" },
  { name: "innercity_build_score", category: "territory", ruleType: "config", definition: JSON.stringify({ value: 50 }), description: "Action score for building placement" },

  // ===== crafting =====
  {
    name: "crafting_material_drop",
    category: "crafting",
    ruleType: "config",
    definition: JSON.stringify({
      combat: { baseChance: 0.3, rarityByLevel: [
        { maxLevel: 5, pool: { "普通": 1.0 } },
        { maxLevel: 15, pool: { "普通": 0.7, "精良": 0.3 } },
        { maxLevel: 30, pool: { "普通": 0.3, "精良": 0.4, "稀有": 0.3 } },
        { maxLevel: 999, pool: { "精良": 0.3, "稀有": 0.4, "史诗": 0.2, "传说": 0.1 } },
      ]},
      exploration: { baseChance: 0.4, rarityByLevel: [
        { maxLevel: 5, pool: { "普通": 1.0 } },
        { maxLevel: 15, pool: { "普通": 0.6, "精良": 0.4 } },
        { maxLevel: 30, pool: { "普通": 0.2, "精良": 0.4, "稀有": 0.4 } },
        { maxLevel: 999, pool: { "精良": 0.2, "稀有": 0.4, "史诗": 0.3, "传说": 0.1 } },
      ]},
    }),
    description: "Material drop chances and rarity pools by source and level",
  },
  {
    name: "crafting_quality_upgrade",
    category: "crafting",
    ruleType: "config",
    definition: JSON.stringify({
      baseUpgradeChance: 0.15,
      craftingQualityMultiplier: 0.02,
      tiers: {
        normal: { weight: 0.85 },
        fine: { weight: 0.85, rarityBoost: 1 },
        master: { weight: 0.15, rarityBoost: 2 },
      },
      rarityOrder: ["普通", "精良", "稀有", "史诗", "传说"],
    }),
    description: "Crafting quality upgrade chances and tier weights",
  },

  // ===== army (~6 rules) =====
  {
    name: "army_recruit_cost",
    category: "army",
    ruleType: "config",
    definition: JSON.stringify({
      tierCosts: { 1: 10, 2: 25, 3: 60, 4: 150 },
      description: "Gold cost per unit by tier",
    }),
    description: "Gold cost per unit by tier",
  },
  {
    name: "army_damage_formula",
    category: "army",
    ruleType: "formula",
    definition: JSON.stringify({
      formula: "max(1, (atk * count * commandMult) - (def * targetCount * targetDefMult * 0.3))",
    }),
    description: "Army combat damage calculation",
  },
  {
    name: "army_casualty_formula",
    category: "army",
    ruleType: "formula",
    definition: JSON.stringify({
      formula: "min(targetCount, max(1, floor(damage / targetHp)))",
    }),
    description: "Army combat casualty calculation",
  },
  {
    name: "army_reward_exp",
    category: "army",
    ruleType: "formula",
    definition: JSON.stringify({ formula: "10 + level * 8" }),
    description: "Experience reward for army combat victory",
  },
  {
    name: "army_reward_gold",
    category: "army",
    ruleType: "formula",
    definition: JSON.stringify({ formula: "20 + level * 5" }),
    description: "Gold reward for army combat victory",
  },
  {
    name: "army_troop_scaling",
    category: "army",
    ruleType: "formula",
    definition: JSON.stringify({ formula: "1 + level * 0.12" }),
    description: "Enemy troop stat scaling by level",
  },
];
