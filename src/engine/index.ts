// ---------------------------------------------------------------------------
// Game Engine — entry point
// ---------------------------------------------------------------------------

import type {
  GameEngine,
  IEventBus,
  IFormulaEngine,
  IModuleRegistry,
  IRuleEngine,
  IStateManager,
} from "./types";

import { EventBus } from "./core/EventBus";
import { FormulaEngine } from "./core/FormulaEngine";
import { ModuleRegistry } from "./core/ModuleRegistry";
import { RuleEngine } from "./core/RuleEngine";
import { StateManager } from "./core/StateManager";

// Re-export types
export type {
  Condition,
  EventHandler,
  GameEngine,
  GameEvent,
  GameModule,
  IEventBus,
  IFormulaEngine,
  IModuleRegistry,
  IRuleEngine,
  IStateManager,
  WeightedItem,
} from "./types";

// Re-export core classes
export { EventBus } from "./core/EventBus";
export { FormulaEngine } from "./core/FormulaEngine";
export { ModuleRegistry } from "./core/ModuleRegistry";
export { RuleEngine } from "./core/RuleEngine";
export { StateManager } from "./core/StateManager";

// ---------------------------------------------------------------------------
// Factory options
// ---------------------------------------------------------------------------

export interface CreateEngineOptions {
  /** Database client — optional for now */
  db?: unknown;
}

// ---------------------------------------------------------------------------
// GameEngineImpl
// ---------------------------------------------------------------------------

export class GameEngineImpl implements GameEngine {
  readonly events: IEventBus;
  readonly rules: IRuleEngine;
  readonly formulas: IFormulaEngine;
  readonly modules: IModuleRegistry;
  readonly state: IStateManager;
  readonly db: unknown;

  constructor(options?: CreateEngineOptions) {
    this.events = new EventBus();
    this.state = new StateManager();
    this.formulas = new FormulaEngine();
    this.rules = new RuleEngine(this.formulas);
    this.modules = new ModuleRegistry();
    this.db = options?.db ?? null;
  }

  /** Start the engine — initialises all registered modules */
  async start(): Promise<void> {
    await this.modules.initAll(this);
  }

  /** Stop the engine — destroys all modules and clears state */
  async stop(): Promise<void> {
    await this.modules.destroyAll();
    this.state.clear();
  }
}

// ---------------------------------------------------------------------------
// Factory function
// ---------------------------------------------------------------------------

export function createEngine(options?: CreateEngineOptions): GameEngineImpl {
  return new GameEngineImpl(options);
}
