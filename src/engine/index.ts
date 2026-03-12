// ---------------------------------------------------------------------------
// Game Engine — entry point
// ---------------------------------------------------------------------------

import type {
  BaseEventMap,
  GameEngine,
  GameModule,
  IEntityManager,
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
import { EntityManager } from "./entity/EntityManager";
import type { IEntityStore } from "./entity/IEntityStore";
import type { IRuleStore } from "./rules/IRuleStore";

// Re-export types
export type {
  BaseEventMap,
  Condition,
  EventHandler,
  GameEngine,
  GameEvent,
  GameModule,
  GamePlugin,
  IEntityManager,
  IEventBus,
  IFormulaEngine,
  IModuleRegistry,
  IRuleEngine,
  IStateManager,
  PluginManifest,
  TypedEvent,
  WeightedItem,
} from "./types";

export type { GameEventMap, TypedGameEvent } from "./game/events";
export type { IEntityStore } from "./entity/IEntityStore";
export type { IRuleStore } from "./rules/IRuleStore";

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
  /** @deprecated Pass entityStore instead. Kept for backward compatibility. */
  db?: unknown;
  /** Entity storage backend */
  entityStore?: IEntityStore;
  /** Rule storage backend */
  ruleStore?: IRuleStore;
}

// ---------------------------------------------------------------------------
// GameEngineImpl
// ---------------------------------------------------------------------------

export class GameEngineImpl<TMap extends BaseEventMap = BaseEventMap> implements GameEngine {
  readonly events: IEventBus<TMap>;
  readonly rules: IRuleEngine;
  readonly formulas: IFormulaEngine;
  readonly modules: IModuleRegistry;
  readonly state: IStateManager;
  readonly entities: IEntityManager;

  constructor(options?: CreateEngineOptions) {
    this.events = new EventBus() as unknown as IEventBus<TMap>;
    this.state = new StateManager();
    this.formulas = new FormulaEngine();
    this.rules = new RuleEngine(this.formulas);
    this.modules = new ModuleRegistry();

    // Resolve entity store: explicit store > auto-construct from db > throw-on-use stub
    let entityStore = options?.entityStore;
    if (!entityStore && options?.db) {
      // Backward compatibility: auto-construct PrismaEntityStore from raw db client
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const { PrismaEntityStore } = require("./entity/PrismaEntityStore") as typeof import("./entity/PrismaEntityStore");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      entityStore = new PrismaEntityStore(options.db as any);
    }

    if (entityStore) {
      this.entities = new EntityManager(entityStore);
    } else {
      // No store provided — create a stub that will fail at runtime if used
      this.entities = new EntityManager(
        new Proxy({} as IEntityStore, {
          get(_, prop) {
            return () => {
              throw new Error(
                `EntityStore not configured. Cannot call ${String(prop)}. ` +
                `Pass entityStore or db in CreateEngineOptions.`,
              );
            };
          },
        }),
      );
    }
  }

  /** Register a module/plugin and return the engine for chaining */
  use<TConfig>(plugin: GameModule<TConfig>, config?: Partial<TConfig>): this {
    this.modules.register(plugin, config);
    return this;
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

export function createEngine<TMap extends BaseEventMap = BaseEventMap>(options?: CreateEngineOptions): GameEngineImpl<TMap> {
  return new GameEngineImpl<TMap>(options);
}
