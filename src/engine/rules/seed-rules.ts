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
];
