// ---------------------------------------------------------------------------
// ECS-lite Component Type Definitions & Helpers
// ---------------------------------------------------------------------------

/** Core combat / RPG stats for characters and enemies. */
export interface StatsComponent {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atk: number;
  def: number;
  spd: number;
  luck?: number;
}

/** Bag of items with a capacity limit. */
export interface InventoryComponent {
  items: Array<{ id: string; quantity: number }>;
  capacity: number;
}

/** Location of an entity inside a world / map. */
export interface PositionComponent {
  x: number;
  y: number;
  worldId: string;
}

/** Periodic resource production (buildings, etc.). */
export interface ProductionComponent {
  output: Record<string, number>; // e.g. { gold: 10, wood: 5 }
  interval: number; // seconds between outputs
}

/** Equipment slot mapping. */
export interface EquipmentComponent {
  slots: Record<string, string | null>; // slotName -> equipmentId or null
}

/** Equipped skill list with a slot cap. */
export interface SkillsComponent {
  equipped: string[]; // skill IDs
  maxSlots: number;
}

// ---------------------------------------------------------------------------
// Component registry
// ---------------------------------------------------------------------------

/** Maps component names to their corresponding interface types. */
export interface ComponentMap {
  stats: StatsComponent;
  inventory: InventoryComponent;
  position: PositionComponent;
  production: ProductionComponent;
  equipment: EquipmentComponent;
  skills: SkillsComponent;
}

/** String-literal union of all known component names. */
export type ComponentName = keyof ComponentMap;

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Parse entity state JSON and extract a specific component.
 * Entity state is stored as: { "stats": {...}, "equipment": {...}, ... }
 */
export function getComponent<K extends ComponentName>(
  state: string | Record<string, unknown>,
  name: K,
): ComponentMap[K] | undefined {
  const parsed =
    typeof state === "string"
      ? (JSON.parse(state) as Record<string, unknown>)
      : state;
  return parsed[name] as ComponentMap[K] | undefined;
}

/**
 * Set a component value in entity state, returning the updated state object.
 */
export function setComponent<K extends ComponentName>(
  state: string | Record<string, unknown>,
  name: K,
  value: ComponentMap[K],
): Record<string, unknown> {
  const parsed =
    typeof state === "string"
      ? (JSON.parse(state) as Record<string, unknown>)
      : { ...state };
  parsed[name] = value;
  return parsed;
}

/**
 * Check if entity state has a specific component.
 */
export function hasComponent(
  state: string | Record<string, unknown>,
  name: ComponentName,
): boolean {
  const parsed =
    typeof state === "string"
      ? (JSON.parse(state) as Record<string, unknown>)
      : state;
  return name in parsed && parsed[name] != null;
}

/**
 * Serialize state object to JSON string for database storage.
 */
export function serializeState(state: Record<string, unknown>): string {
  return JSON.stringify(state);
}
