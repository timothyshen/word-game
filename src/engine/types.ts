// ---------------------------------------------------------------------------
// Game Engine — foundational type definitions
// ---------------------------------------------------------------------------

import type { GameEventMap, TypedGameEvent } from "./events";

// ---- Events ----------------------------------------------------------------

export interface GameEvent {
  /** Event identifier, e.g. "combat:victory", "exploration:complete" */
  type: string;
  /** Arbitrary event data */
  payload: unknown;
  /** Unix-ms timestamp of when the event was created */
  timestamp: number;
  /** Which module emitted this event */
  source: string;
}

export type EventHandler = (event: GameEvent) => Promise<void> | void;

// ---- Modules ---------------------------------------------------------------

export interface GameModule<TConfig = void> {
  /** Unique module identifier */
  name: string;
  /** Names of modules this one depends on */
  dependencies?: string[];
  /** Default configuration values for this module */
  defaultConfig?: TConfig;
  /** Called once during engine startup */
  init(engine: GameEngine, config?: TConfig): Promise<void>;
  /** Optional — called when an event is dispatched */
  handleEvent?(event: GameEvent): Promise<void>;
  /** Optional — cleanup on engine shutdown */
  destroy?(): Promise<void>;
}

// ---- Sub-system interfaces -------------------------------------------------

export interface IEventBus {
  // Typed overloads — compile-time only
  on<K extends keyof GameEventMap>(
    event: K,
    handler: (event: TypedGameEvent<K>) => Promise<void> | void,
    priority?: number,
  ): void;
  off<K extends keyof GameEventMap>(
    event: K,
    handler: (event: TypedGameEvent<K>) => Promise<void> | void,
  ): void;
  emit<K extends keyof GameEventMap>(
    event: K,
    payload: GameEventMap[K],
    source?: string,
  ): Promise<void>;
  // Backward-compatible string overloads
  on(event: string, handler: EventHandler, priority?: number): void;
  off(event: string, handler: EventHandler): void;
  emit(event: string, payload: unknown, source?: string): Promise<void>;
}

export interface IStateManager {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttl?: number): void;
  delete(key: string): void;
  clear(): void;
}

export interface IFormulaEngine {
  calculate(formula: string, variables: Record<string, number>): number;
}

export interface IRuleEngine {
  evaluate(condition: Condition, context: Record<string, unknown>): boolean;
  weightedRandom(weights: WeightedItem[]): string;
}

export interface IModuleRegistry {
  register<TConfig>(module: GameModule<TConfig>, config?: TConfig): void;
  get(name: string): GameModule | undefined;
  getAll(): GameModule[];
  initAll(engine: GameEngine): Promise<void>;
  destroyAll(): Promise<void>;
}

// ---- Entity Manager --------------------------------------------------------

export interface IEntityManager {
  createSchema(gameId: string, name: string, components: string[], defaults?: Record<string, unknown>): Promise<unknown>;
  getSchema(gameId: string, name: string): Promise<unknown>;
  getSchemasByGame(gameId: string): Promise<unknown[]>;
  createTemplate(schemaId: string, name: string, data: Record<string, unknown>, opts?: { icon?: string; rarity?: string; description?: string }): Promise<unknown>;
  getTemplate(id: string): Promise<unknown>;
  getTemplatesBySchema(schemaId: string): Promise<unknown[]>;
  getTemplateBySchemaAndName(schemaId: string, name: string): Promise<unknown>;
  createEntity(templateId: string, ownerId: string, initialState?: Record<string, unknown>): Promise<unknown>;
  getEntity(id: string): Promise<unknown>;
  getEntitiesByOwner(ownerId: string, schemaName?: string): Promise<unknown[]>;
  getEntitiesByTemplate(templateId: string): Promise<unknown[]>;
  findEntityByOwnerAndTemplate(ownerId: string, templateId: string): Promise<unknown>;
  createManyEntities(entries: Array<{ templateId: string; ownerId: string; state?: Record<string, unknown> }>): Promise<unknown[]>;
  deleteManyEntities(ids: string[]): Promise<unknown>;
  queryEntitiesByState(ownerId: string, schemaName: string, stateFilter: Record<string, unknown>): Promise<unknown[]>;
  updateEntityState(id: string, partialState: Record<string, unknown>): Promise<unknown>;
  deleteEntity(id: string): Promise<unknown>;
}

// ---- Engine ----------------------------------------------------------------

export interface GameEngine {
  events: IEventBus;
  rules: IRuleEngine;
  formulas: IFormulaEngine;
  modules: IModuleRegistry;
  state: IStateManager;
  entities: IEntityManager;
}

// ---- Conditions & weighted random ------------------------------------------

export type Condition =
  | { type: "gte"; field: string; value: number }
  | { type: "lte"; field: string; value: number }
  | { type: "eq"; field: string; value: unknown }
  | { type: "has"; field: string }
  | { type: "and"; conditions: Condition[] }
  | { type: "or"; conditions: Condition[] }
  | { type: "not"; condition: Condition }
  | { type: "formula"; expression: string; operator: string; value: number }
  | { type: "weighted_random"; weights: WeightedItem[] };

export interface WeightedItem {
  value: string;
  weight: number;
}
