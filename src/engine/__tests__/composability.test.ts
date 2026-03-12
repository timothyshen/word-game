import { describe, it, expect, vi, beforeEach } from "vitest";

import type { GameEngine, GameModule, GamePlugin } from "../types";
import type { GameEventMap, TypedGameEvent } from "../game/events";
import { createEngine, GameEngineImpl } from "../index";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePlugin(overrides: Partial<GamePlugin> & { name: string }): GamePlugin {
  return {
    manifest: {
      name: overrides.name,
      version: "1.0.0",
      provides: [],
      requires: [],
    },
    init: vi.fn(async () => {}),
    destroy: vi.fn(async () => {}),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests — Type-safe events
// ---------------------------------------------------------------------------

describe("Type-safe events", () => {
  it("should emit and receive typed events with correct payload", async () => {
    const engine = createEngine<GameEventMap>();
    const received: Array<{ type: string; payload: unknown }> = [];

    engine.events.on("combat:victory", async (event: TypedGameEvent<"combat:victory">) => {
      received.push({ type: event.type, payload: event.payload });
    });

    await engine.events.emit("combat:victory", { userId: "u1", rewards: { gold: 100 } }, "test");

    expect(received).toHaveLength(1);
    expect(received[0]!.type).toBe("combat:victory");
    expect(received[0]!.payload).toEqual({ userId: "u1", rewards: { gold: 100 } });
  });

  it("should support multiple typed event listeners", async () => {
    const engine = createEngine<GameEventMap>();
    const events: string[] = [];

    engine.events.on("player:levelUp", async () => {
      events.push("levelUp");
    });
    engine.events.on("player:expGain", async () => {
      events.push("expGain");
    });

    await engine.events.emit("player:expGain", { userId: "u1", amount: 50 }, "test");
    await engine.events.emit("player:levelUp", { userId: "u1", newLevel: 5 }, "test");

    expect(events).toEqual(["expGain", "levelUp"]);
  });

  it("should unsubscribe typed handlers with off()", async () => {
    const engine = createEngine<GameEventMap>();
    const calls: number[] = [];

    const handler = async (event: TypedGameEvent<"combat:defeat">) => {
      calls.push(1);
    };

    engine.events.on("combat:defeat", handler);
    await engine.events.emit("combat:defeat", { userId: "u1" }, "test");
    expect(calls).toHaveLength(1);

    engine.events.off("combat:defeat", handler);
    await engine.events.emit("combat:defeat", { userId: "u1" }, "test");
    expect(calls).toHaveLength(1); // No new call
  });

  it("should still support string-based event listeners (backward compat)", async () => {
    const engine = createEngine();
    const received: unknown[] = [];

    engine.events.on("custom:event", async (event) => {
      received.push(event.payload);
    });

    await engine.events.emit("custom:event", { data: "hello" }, "test");

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({ data: "hello" });
  });

  it("should include timestamp and source in typed events", async () => {
    const engine = createEngine<GameEventMap>();
    let capturedEvent: TypedGameEvent<"player:statusChanged"> | null = null;

    engine.events.on("player:statusChanged", async (event: TypedGameEvent<"player:statusChanged">) => {
      capturedEvent = event;
    });

    const before = Date.now();
    await engine.events.emit("player:statusChanged", { userId: "u1", trigger: "test" }, "core");
    const after = Date.now();

    expect(capturedEvent).not.toBeNull();
    expect(capturedEvent!.source).toBe("core");
    expect(capturedEvent!.timestamp).toBeGreaterThanOrEqual(before);
    expect(capturedEvent!.timestamp).toBeLessThanOrEqual(after);
  });
});

// ---------------------------------------------------------------------------
// Tests — Plugin configuration system
// ---------------------------------------------------------------------------

describe("Plugin configuration system", () => {
  it("should pass merged config (defaultConfig + override) to init", async () => {
    const engine = createEngine();

    interface MyConfig {
      maxRetries: number;
      timeout: number;
      debug: boolean;
    }

    const mod: GameModule<MyConfig> = {
      name: "configurable",
      defaultConfig: { maxRetries: 3, timeout: 5000, debug: false },
      init: vi.fn(async () => {}),
    };

    engine.modules.register(mod, { timeout: 10000 });
    await engine.start();

    expect(mod.init).toHaveBeenCalledWith(engine, {
      maxRetries: 3,
      timeout: 10000,
      debug: false,
    });
  });

  it("should use only defaultConfig when no override provided", async () => {
    const engine = createEngine();

    interface SimpleConfig {
      rate: number;
    }

    const mod: GameModule<SimpleConfig> = {
      name: "defaults-only",
      defaultConfig: { rate: 0.5 },
      init: vi.fn(async () => {}),
    };

    engine.modules.register(mod);
    await engine.start();

    expect(mod.init).toHaveBeenCalledWith(engine, { rate: 0.5 });
  });

  it("should pass undefined config when module has no defaultConfig and no override", async () => {
    const engine = createEngine();

    const mod: GameModule = {
      name: "plain",
      init: vi.fn(async () => {}),
    };

    engine.modules.register(mod);
    await engine.start();

    expect(mod.init).toHaveBeenCalledWith(engine, undefined);
  });

  it("should allow module to use config in init", async () => {
    const engine = createEngine();
    let capturedRate = 0;

    interface RateConfig {
      dropRate: number;
    }

    const mod: GameModule<RateConfig> = {
      name: "rate-user",
      defaultConfig: { dropRate: 0.1 },
      async init(_eng, config) {
        capturedRate = config?.dropRate ?? 0;
      },
    };

    engine.modules.register(mod, { dropRate: 0.75 });
    await engine.start();

    expect(capturedRate).toBe(0.75);
  });
});

// ---------------------------------------------------------------------------
// Tests — engine.use() API
// ---------------------------------------------------------------------------

describe("engine.use() API", () => {
  it("should register a module and return the engine for chaining", () => {
    const engine = createEngine();
    const mod: GameModule = {
      name: "test",
      init: vi.fn(async () => {}),
    };

    const result = engine.use(mod);

    expect(result).toBe(engine);
    expect(engine.modules.get("test")).toBe(mod);
  });

  it("should support method chaining for multiple modules", () => {
    const engine = createEngine();
    const a: GameModule = { name: "a", init: vi.fn(async () => {}) };
    const b: GameModule = { name: "b", init: vi.fn(async () => {}) };
    const c: GameModule = { name: "c", init: vi.fn(async () => {}) };

    engine.use(a).use(b).use(c);

    const all = engine.modules.getAll();
    expect(all).toHaveLength(3);
    expect(all.map((m) => m.name).sort()).toEqual(["a", "b", "c"]);
  });

  it("should pass config through use()", async () => {
    const engine = createEngine();

    interface GuildConfig {
      maxMembers: number;
    }

    const guildPlugin: GameModule<GuildConfig> = {
      name: "guild",
      defaultConfig: { maxMembers: 50 },
      init: vi.fn(async () => {}),
    };

    engine.use(guildPlugin, { maxMembers: 100 });
    await engine.start();

    expect(guildPlugin.init).toHaveBeenCalledWith(engine, { maxMembers: 100 });
  });

  it("should throw when registering duplicate module via use()", () => {
    const engine = createEngine();
    const mod: GameModule = { name: "dup", init: vi.fn(async () => {}) };

    engine.use(mod);

    expect(() => engine.use({ name: "dup", init: vi.fn(async () => {}) })).toThrow(
      'Module "dup" is already registered',
    );
  });
});

// ---------------------------------------------------------------------------
// Tests — Plugin manifest validation
// ---------------------------------------------------------------------------

describe("Plugin manifest validation", () => {
  it("should warn when required event is not provided by any plugin", async () => {
    const engine = createEngine();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const plugin = makePlugin({
      name: "needy-plugin",
      manifest: {
        name: "needy-plugin",
        version: "1.0.0",
        provides: ["custom:output"],
        requires: ["nonexistent:event"],
      },
    });

    engine.use(plugin);
    await engine.start();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Plugin "needy-plugin" requires event "nonexistent:event"'),
    );

    warnSpy.mockRestore();
  });

  it("should not warn when required events are provided by another plugin", async () => {
    const engine = createEngine();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const provider = makePlugin({
      name: "provider",
      manifest: {
        name: "provider",
        version: "1.0.0",
        provides: ["data:ready"],
        requires: [],
      },
    });

    const consumer = makePlugin({
      name: "consumer",
      manifest: {
        name: "consumer",
        version: "1.0.0",
        provides: [],
        requires: ["data:ready"],
      },
    });

    engine.use(provider).use(consumer);
    await engine.start();

    // Should NOT warn since "data:ready" is provided
    const relevantWarnings = warnSpy.mock.calls.filter(
      (call) => typeof call[0] === "string" && call[0].includes("data:ready"),
    );
    expect(relevantWarnings).toHaveLength(0);

    warnSpy.mockRestore();
  });

  it("should not warn for modules without manifests", async () => {
    const engine = createEngine();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const plainModule: GameModule = {
      name: "plain",
      init: vi.fn(async () => {}),
    };

    engine.use(plainModule);
    await engine.start();

    const moduleRegistryWarnings = warnSpy.mock.calls.filter(
      (call) => typeof call[0] === "string" && call[0].includes("[ModuleRegistry]"),
    );
    expect(moduleRegistryWarnings).toHaveLength(0);

    warnSpy.mockRestore();
  });

  it("should allow plugins with manifest alongside plain modules", async () => {
    const engine = createEngine();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const plainModule: GameModule = {
      name: "plain",
      init: vi.fn(async () => {}),
    };

    const plugin = makePlugin({
      name: "with-manifest",
      manifest: {
        name: "with-manifest",
        version: "1.0.0",
        provides: ["some:event"],
        requires: [],
      },
    });

    engine.use(plainModule).use(plugin);
    await engine.start();

    expect(plainModule.init).toHaveBeenCalled();
    expect(plugin.init).toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Tests — GamePlugin lifecycle
// ---------------------------------------------------------------------------

describe("GamePlugin lifecycle", () => {
  it("should initialize and destroy plugins correctly", async () => {
    const engine = createEngine();
    const initOrder: string[] = [];
    const destroyOrder: string[] = [];

    const core = makePlugin({
      name: "core",
      init: vi.fn(async () => { initOrder.push("core"); }),
      destroy: vi.fn(async () => { destroyOrder.push("core"); }),
    });

    const combat = makePlugin({
      name: "combat",
      dependencies: ["core"],
      init: vi.fn(async () => { initOrder.push("combat"); }),
      destroy: vi.fn(async () => { destroyOrder.push("combat"); }),
    });

    engine.use(core).use(combat);
    await engine.start();

    expect(initOrder).toEqual(["core", "combat"]);

    await engine.stop();

    expect(destroyOrder).toEqual(["combat", "core"]);
  });

  it("should allow plugin to subscribe to events during init", async () => {
    const engine = createEngine();
    const receivedEvents: string[] = [];

    const plugin: GamePlugin = {
      name: "event-listener",
      manifest: {
        name: "event-listener",
        version: "1.0.0",
        provides: [],
        requires: ["combat:victory"],
      },
      async init(eng) {
        eng.events.on("combat:victory", async (event) => {
          const payload = event.payload as { userId: string };
          receivedEvents.push(`victory:${payload.userId}`);
        });
      },
    };

    // Also register a provider so no warning
    const combatProvider = makePlugin({
      name: "combat-provider",
      manifest: {
        name: "combat-provider",
        version: "1.0.0",
        provides: ["combat:victory"],
      },
    });

    engine.use(combatProvider).use(plugin);
    await engine.start();

    await engine.events.emit("combat:victory", { userId: "player1" }, "combat");

    expect(receivedEvents).toEqual(["victory:player1"]);
  });
});
