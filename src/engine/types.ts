// ---------------------------------------------------------------------------
// Game Engine — foundational type definitions
// ---------------------------------------------------------------------------

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

export interface GameModule {
  /** Unique module identifier */
  name: string;
  /** Names of modules this one depends on */
  dependencies?: string[];
  /** Called once during engine startup */
  init(engine: GameEngine): Promise<void>;
  /** Optional — called when an event is dispatched */
  handleEvent?(event: GameEvent): Promise<void>;
  /** Optional — cleanup on engine shutdown */
  destroy?(): Promise<void>;
}

// ---- Sub-system interfaces -------------------------------------------------

export interface IEventBus {
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
  register(module: GameModule): void;
  get(name: string): GameModule | undefined;
  getAll(): GameModule[];
  initAll(engine: GameEngine): Promise<void>;
  destroyAll(): Promise<void>;
}

// ---- Engine ----------------------------------------------------------------

export interface GameEngine {
  events: IEventBus;
  rules: IRuleEngine;
  formulas: IFormulaEngine;
  modules: IModuleRegistry;
  state: IStateManager;
  /** Database client — kept generic until concrete implementation is chosen */
  db: unknown;
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
