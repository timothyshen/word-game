// ============================================================
// Effect System — Core Type Definitions
// ============================================================

// --- Primitives ---

export const STAT_KEYS = [
  // Combat stats
  "attack", "defense", "speed", "luck", "hp", "maxHp", "mp", "maxMp",
  "intellect", "strength", "agility",
  // Resources
  "gold", "crystals", "food", "wood", "stone", "iron",
  // Experience
  "exp",
  // Special modifiers
  "critRate", "critDamage", "lifesteal", "damageReduction",
  "productionSpeed", "craftingQuality",
] as const;

export type StatKey = (typeof STAT_KEYS)[number];

export interface StatModifier {
  stat: StatKey;
  value: number;
  type: "flat" | "percent";
}

// --- Rewards ---

export type RewardEntry =
  | { type: "resource"; stat: StatKey; amount: number }
  | { type: "card"; rarity: string; count: number }
  | { type: "item"; itemId: string; count: number };

// --- Conditions ---

export type Condition =
  | { type: "level"; min: number }
  | { type: "tier"; min: number }
  | { type: "stat"; stat: StatKey; min: number }
  | { type: "skill"; category: string; minLevel: number }
  | { type: "skillCount"; skillType: string; count: number }
  | { type: "item"; itemId: string; count?: number }
  | { type: "flag"; flagName: string };

// --- Skill Effects ---

export type SkillEffect =
  | { type: "damage"; damageType: "physical" | "magic"; multiplier: number; element?: string }
  | { type: "heal"; healType: "hp" | "mp"; target: "self" | "ally"; amount: number; isPercent?: boolean }
  | { type: "buff"; target: "self" | "enemy"; modifiers: StatModifier[]; duration: number }
  | { type: "flee"; successRate: number }
  | { type: "special"; action: string; params: Record<string, number> };

export interface SkillLevelEntry {
  level: number;
  effects: SkillEffect[];
  mpCost: number;
  cooldown: number;
}

// --- Card Effects ---

export type CardEffect =
  | { type: "building"; buildingId: string }
  | { type: "recruit"; characterId: string }
  | { type: "skill"; skillId: string }
  | { type: "heal"; healType: "hp" | "mp"; amount: number }
  | { type: "buff"; modifiers: StatModifier[]; duration: number }
  | { type: "escape"; successRate: number }
  | { type: "enhance"; targetType: "equipment" | "skill"; amount: number }
  | { type: "exp"; amount: number }
  | { type: "expansion"; amount: number }
  | { type: "unlock"; flagName: string };

// --- Building Effects ---

export interface BuildingProduction {
  stat: StatKey;
  amountPerHour: number;
}

export interface BuildingCapacity {
  type: string;
  amount: number;
}

export interface BuildingEffects {
  production?: BuildingProduction[];
  statBonuses?: StatModifier[];
  unlocks?: string[];
  capacity?: BuildingCapacity[];
  workerMultiplier?: number;
  upgradeCostMultiplier?: number;
}

// --- Monster Config ---

export interface MonsterSkill {
  name: string;
  effects: SkillEffect[];
  cooldown: number;
}

export interface MonsterConfig {
  name: string;
  icon: string;
  level: number;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  intellect?: number;
  element?: Element;
  weaknesses?: Element[];
  resistances?: Element[];
  skills: MonsterSkill[];
  rewards: RewardEntry[];
}

// --- Story ---

export interface StoryChoice {
  text: string;
  nextNodeId: string;
  conditions?: Condition[];
  rewards?: RewardEntry[];
}

// --- Adventure ---

export interface AdventureCost {
  stat: StatKey;
  amount: number;
}

export interface AdventureOutcome {
  weight: number;
  description: string;
  rewards?: RewardEntry[];
  combat?: MonsterConfig;
  damage?: number;
}

export interface AdventureOption {
  text: string;
  action: string;
  conditions?: Condition[];
  cost?: AdventureCost[];
  outcomes: AdventureOutcome[];
}

// --- Character Traits ---

export interface CharacterTrait {
  name: string;
  modifiers: StatModifier[];
}

// --- Combat Runtime Types ---

export interface CombatBuff {
  name: string;
  modifiers: StatModifier[];
  turnsRemaining: number;
  source: "self" | "enemy";
}

export interface CombatUnit {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  speed: number;
  luck: number;
  intellect: number;
  buffs: CombatBuff[];
}

export interface CombatAction {
  id: string;
  name: string;
  description: string;
  icon: string;
  mpCost: number;
  cooldown: number;
  currentCooldown: number;
  effects: SkillEffect[];
  category?: string;
}

export interface CombatResult {
  logs: string[];
  damageDealt?: number;
  healAmount?: number;
  buffsApplied?: CombatBuff[];
  fled?: boolean;
  specialAction?: { action: string; params: Record<string, number> };
}

// --- Element System ---

export const ELEMENTS = ["physical", "fire", "ice", "thunder", "light", "dark"] as const;
export type Element = (typeof ELEMENTS)[number];

export interface ElementalProfile {
  weaknesses: Element[];
  resistances: Element[];
}

// --- ATB Combat Types ---

export interface ATBUnit extends CombatUnit {
  atb: number;
  element?: Element;
  elementalProfile?: ElementalProfile;
  isAlive: boolean;
  teamIndex: number;
}

export interface PartyMember extends ATBUnit {
  characterId: string;
  portrait: string;
  baseClass: string;
  skillSlots: CombatAction[];
}

export interface EnemyUnit extends ATBUnit {
  tier: "normal" | "elite" | "boss";
  phase?: number;
  /** Base stats before phase multipliers (set at creation for bosses) */
  baseAttack?: number;
  baseSpeed?: number;
  specialMechanics?: EnemyMechanic[];
  loot: LootTable;
}

export interface EnemyMechanic {
  name: string;
  trigger: "hp_threshold" | "turn_interval" | "on_hit";
  value: number;
  effects: SkillEffect[];
  description: string;
  activated?: boolean;
}

export interface LootTable {
  exp: number;
  gold: number;
  materials?: Array<{ templateId: string; chance: number; count: number }>;
  equipment?: Array<{ equipmentId: string; chance: number }>;
  skillCards?: Array<{ skillId: string; chance: number }>;
}

export interface RecentAction {
  actorId: string;
  actionCategory: string;
  turn: number;
  targetId: string;
}

export interface ATBCombatState {
  party: PartyMember[];
  enemies: EnemyUnit[];
  currentActorId: string | null;
  turnCount: number;
  logs: CombatLog[];
  status: "active" | "victory" | "defeat" | "fled";
  combatType: "normal" | "elite" | "boss";
  rating?: CombatRating;
  recentActions?: RecentAction[];
}

export interface CombatLog {
  turn: number;
  actorName: string;
  message: string;
  type: "action" | "damage" | "heal" | "buff" | "system" | "critical" | "weakness" | "combo";
}

export interface CombatRating {
  grade: "S" | "A" | "B" | "C";
  turnsUsed: number;
  survivorCount: number;
  weaknessHits: number;
  combosTriggered: number;
  multiplier: number;
}

export type TargetType = "single_enemy" | "all_enemies" | "single_ally" | "all_allies" | "self";

export interface CombatActionV2 extends CombatAction {
  targetType: TargetType;
  element?: Element;
}

// --- Stat Calculator Types ---

export interface BaseStats {
  attack: number;
  defense: number;
  speed: number;
  luck: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  intellect: number;
  strength: number;
  agility: number;
  [key: string]: number;
}

export interface StatSource {
  label: string;
  modifiers: StatModifier[];
}
