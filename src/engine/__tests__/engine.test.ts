import { describe, expect, it, vi } from "vitest";

import type { GameModule } from "../types";
import { createEngine, GameEngineImpl } from "../index";
import { EventBus } from "../core/EventBus";
import { FormulaEngine } from "../core/FormulaEngine";
import { ModuleRegistry } from "../core/ModuleRegistry";
import { RuleEngine } from "../core/RuleEngine";
import { StateManager } from "../core/StateManager";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeModule(
  name: string,
  deps?: string[],
  hasDestroy = true,
): GameModule {
  return {
    name,
    dependencies: deps,
    init: vi.fn(async () => {}),
    ...(hasDestroy ? { destroy: vi.fn(async () => {}) } : {}),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GameEngineImpl", () => {
  describe("createEngine factory", () => {
    it("should return a GameEngineImpl instance with all components", () => {
      const engine = createEngine();

      expect(engine).toBeInstanceOf(GameEngineImpl);
      expect(engine.events).toBeInstanceOf(EventBus);
      expect(engine.state).toBeInstanceOf(StateManager);
      expect(engine.formulas).toBeInstanceOf(FormulaEngine);
      expect(engine.rules).toBeInstanceOf(RuleEngine);
      expect(engine.modules).toBeInstanceOf(ModuleRegistry);
      expect(engine.entities).toBeDefined();
    });

    it("should create engine with entityStore option", () => {
      const fakeStore = { createSchema: vi.fn() };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const engine = createEngine({ entityStore: fakeStore as any });

      expect(engine.entities).toBeDefined();
    });

    it("should create engine without any options", () => {
      const engine = createEngine({});

      expect(engine.entities).toBeDefined();
    });
  });

  describe("start()", () => {
    it("should call modules.initAll with the engine instance", async () => {
      const engine = createEngine();
      const mod = makeModule("test-mod");

      engine.modules.register(mod);
      await engine.start();

      expect(mod.init).toHaveBeenCalledWith(engine, undefined);
    });

    it("should initialise all registered modules", async () => {
      const engine = createEngine();
      const a = makeModule("a");
      const b = makeModule("b");

      engine.modules.register(a);
      engine.modules.register(b);
      await engine.start();

      expect(a.init).toHaveBeenCalledOnce();
      expect(b.init).toHaveBeenCalledOnce();
    });
  });

  describe("stop()", () => {
    it("should destroy all modules and clear state", async () => {
      const engine = createEngine();
      const mod = makeModule("cleanup-mod");

      engine.modules.register(mod);
      await engine.start();

      // Set some state to verify it gets cleared
      engine.state.set("key1", "value1");
      engine.state.set("key2", 42);

      await engine.stop();

      expect(mod.destroy).toHaveBeenCalledOnce();
      expect(engine.state.get("key1")).toBeUndefined();
      expect(engine.state.get("key2")).toBeUndefined();
    });

    it("should destroy modules in reverse init order", async () => {
      const engine = createEngine();
      const order: string[] = [];

      const base: GameModule = {
        name: "base",
        init: vi.fn(async () => {}),
        destroy: vi.fn(async () => {
          order.push("base");
        }),
      };

      const dependent: GameModule = {
        name: "dependent",
        dependencies: ["base"],
        init: vi.fn(async () => {}),
        destroy: vi.fn(async () => {
          order.push("dependent");
        }),
      };

      engine.modules.register(dependent);
      engine.modules.register(base);
      await engine.start();
      await engine.stop();

      // Init order: base, dependent → destroy order: dependent, base
      expect(order).toEqual(["dependent", "base"]);
    });
  });

  describe("full integration", () => {
    it("should allow a module to receive events after engine start", async () => {
      const engine = createEngine();
      const receivedEvents: string[] = [];

      const listener: GameModule = {
        name: "listener",
        async init(eng) {
          eng.events.on("test:ping", async (event) => {
            receivedEvents.push(event.type);
          });
        },
      };

      engine.modules.register(listener);
      await engine.start();

      await engine.events.emit("test:ping", { data: 1 }, "test");

      expect(receivedEvents).toEqual(["test:ping"]);
    });

    it("should allow modules to use state during lifecycle", async () => {
      const engine = createEngine();

      const producer: GameModule = {
        name: "producer",
        async init(eng) {
          eng.state.set("shared-value", 100);
        },
      };

      const consumer: GameModule = {
        name: "consumer",
        dependencies: ["producer"],
        async init(eng) {
          const val = eng.state.get<number>("shared-value");
          eng.state.set("doubled", (val ?? 0) * 2);
        },
      };

      engine.modules.register(consumer);
      engine.modules.register(producer);
      await engine.start();

      expect(engine.state.get("shared-value")).toBe(100);
      expect(engine.state.get("doubled")).toBe(200);
    });

    it("should handle multiple modules with dependency chain", async () => {
      const engine = createEngine();
      const initOrder: string[] = [];

      const core: GameModule = {
        name: "core",
        async init() {
          initOrder.push("core");
        },
      };

      const combat: GameModule = {
        name: "combat",
        dependencies: ["core"],
        async init() {
          initOrder.push("combat");
        },
      };

      const boss: GameModule = {
        name: "boss",
        dependencies: ["combat"],
        async init() {
          initOrder.push("boss");
        },
      };

      engine.modules.register(boss);
      engine.modules.register(core);
      engine.modules.register(combat);
      await engine.start();

      expect(initOrder).toEqual(["core", "combat", "boss"]);
    });

    it("should allow modules to use formulas and rules", async () => {
      const engine = createEngine();
      let damage = 0;

      const combatModule: GameModule = {
        name: "combat",
        async init(eng) {
          // Use formula engine to calculate damage
          damage = eng.formulas.calculate("atk * 2 - def", {
            atk: 50,
            def: 20,
          });

          // Use rule engine to evaluate a condition
          const canCrit = eng.rules.evaluate(
            { type: "gte", field: "luck", value: 80 },
            { luck: 90 },
          );

          if (canCrit) {
            damage *= 2;
          }
        },
      };

      engine.modules.register(combatModule);
      await engine.start();

      // (50 * 2 - 20) = 80, crit (luck 90 >= 80) => 160
      expect(damage).toBe(160);
    });
  });
});
