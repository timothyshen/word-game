import { describe, expect, it, vi } from "vitest";

import type { GameEngine, GameModule } from "../../types";
import { ModuleRegistry } from "../ModuleRegistry";

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

const fakeEngine = {} as GameEngine;

describe("ModuleRegistry", () => {
  it("should register and get a module", () => {
    const registry = new ModuleRegistry();
    const mod = makeModule("test");

    registry.register(mod);

    expect(registry.get("test")).toBe(mod);
  });

  it("should return undefined for missing module", () => {
    const registry = new ModuleRegistry();

    expect(registry.get("nonexistent")).toBeUndefined();
  });

  it("should return all registered modules", () => {
    const registry = new ModuleRegistry();
    const a = makeModule("a");
    const b = makeModule("b");

    registry.register(a);
    registry.register(b);

    const all = registry.getAll();
    expect(all).toHaveLength(2);
    expect(all).toContain(a);
    expect(all).toContain(b);
  });

  it("should throw on duplicate module name", () => {
    const registry = new ModuleRegistry();
    const mod = makeModule("dup");

    registry.register(mod);

    expect(() => registry.register(makeModule("dup"))).toThrowError(
      'Module "dup" is already registered',
    );
  });

  it("should call init on all modules during initAll", async () => {
    const registry = new ModuleRegistry();
    const a = makeModule("a");
    const b = makeModule("b");

    registry.register(a);
    registry.register(b);

    await registry.initAll(fakeEngine);

    expect(a.init).toHaveBeenCalledWith(fakeEngine, undefined);
    expect(b.init).toHaveBeenCalledWith(fakeEngine, undefined);
  });

  it("should respect dependency order (A depends on B → B inits first)", async () => {
    const registry = new ModuleRegistry();
    const order: string[] = [];

    const b: GameModule = {
      name: "b",
      init: vi.fn(async () => {
        order.push("b");
      }),
    };

    const a: GameModule = {
      name: "a",
      dependencies: ["b"],
      init: vi.fn(async () => {
        order.push("a");
      }),
    };

    registry.register(a);
    registry.register(b);

    await registry.initAll(fakeEngine);

    expect(order).toEqual(["b", "a"]);
  });

  it("should throw on missing dependency", async () => {
    const registry = new ModuleRegistry();
    const mod = makeModule("a", ["missing"]);

    registry.register(mod);

    await expect(registry.initAll(fakeEngine)).rejects.toThrowError(
      'Module "a" depends on "missing", which is not registered',
    );
  });

  it("should throw on circular dependency", async () => {
    const registry = new ModuleRegistry();
    const a = makeModule("a", ["b"]);
    const b = makeModule("b", ["a"]);

    registry.register(a);
    registry.register(b);

    await expect(registry.initAll(fakeEngine)).rejects.toThrowError(
      "Circular dependency detected among modules",
    );
  });

  it("should call destroy in reverse init order", async () => {
    const registry = new ModuleRegistry();
    const order: string[] = [];

    const b: GameModule = {
      name: "b",
      init: vi.fn(async () => {}),
      destroy: vi.fn(async () => {
        order.push("b");
      }),
    };

    const a: GameModule = {
      name: "a",
      dependencies: ["b"],
      init: vi.fn(async () => {}),
      destroy: vi.fn(async () => {
        order.push("a");
      }),
    };

    registry.register(a);
    registry.register(b);

    await registry.initAll(fakeEngine);
    await registry.destroyAll();

    // Init order: b, a → destroy order: a, b
    expect(order).toEqual(["a", "b"]);
  });

  it("should skip modules without destroy method", async () => {
    const registry = new ModuleRegistry();
    const withDestroy = makeModule("with", undefined, true);
    const withoutDestroy = makeModule("without", undefined, false);

    registry.register(withDestroy);
    registry.register(withoutDestroy);

    await registry.initAll(fakeEngine);

    // Should not throw
    await registry.destroyAll();

    expect(withDestroy.destroy).toHaveBeenCalledOnce();
  });

  it("should pass merged config to init", async () => {
    const registry = new ModuleRegistry();

    interface TestConfig {
      maxItems?: number;
      rate?: number;
    }

    const mod: GameModule<TestConfig> = {
      name: "configurable",
      defaultConfig: { maxItems: 5, rate: 0.5 },
      init: vi.fn(async () => {}),
    };

    registry.register(mod, { rate: 0.8 });

    await registry.initAll(fakeEngine);

    expect(mod.init).toHaveBeenCalledWith(fakeEngine, {
      maxItems: 5,
      rate: 0.8,
    });
  });

  it("should pass undefined config when no default or override provided", async () => {
    const registry = new ModuleRegistry();
    const mod = makeModule("plain");

    registry.register(mod);

    await registry.initAll(fakeEngine);

    expect(mod.init).toHaveBeenCalledWith(fakeEngine, undefined);
  });
});
