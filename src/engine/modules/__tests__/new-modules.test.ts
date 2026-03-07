import { describe, it, expect, vi } from "vitest";
import { ContentModule } from "../content.module";
import { TerritoryModule } from "../territory.module";
import { SettlementModule } from "../settlement.module";
import type { GameEngine, GameEvent } from "../../types";

function createMockEngine(): GameEngine {
  const handlers = new Map<
    string,
    Array<{ handler: (...args: unknown[]) => unknown; priority: number }>
  >();

  return {
    events: {
      on: vi.fn(
        (
          event: string,
          handler: (...args: unknown[]) => unknown,
          priority = 0,
        ) => {
          if (!handlers.has(event)) handlers.set(event, []);
          handlers.get(event)!.push({ handler, priority });
        },
      ),
      off: vi.fn(
        (event: string, handler: (...args: unknown[]) => unknown) => {
          const list = handlers.get(event);
          if (list) {
            const idx = list.findIndex((h) => h.handler === handler);
            if (idx >= 0) list.splice(idx, 1);
          }
        },
      ),
      emit: vi.fn(
        async (event: string, payload: unknown, source?: string) => {
          const list = handlers.get(event) ?? [];
          for (const { handler } of list) {
            await handler({
              type: event,
              payload,
              timestamp: Date.now(),
              source: source ?? "test",
            } satisfies GameEvent);
          }
        },
      ),
    },
    rules: {} as GameEngine["rules"],
    formulas: {} as GameEngine["formulas"],
    modules: {} as GameEngine["modules"],
    state: {} as GameEngine["state"],
    db: null,
  };
}

// ---------------------------------------------------------------------------
// ContentModule
// ---------------------------------------------------------------------------
describe("ContentModule", () => {
  it("has the correct module name and dependencies", () => {
    const mod = new ContentModule();
    expect(mod.name).toBe("content");
    expect(mod.dependencies).toEqual(["core"]);
  });

  it("registers event handlers on init", async () => {
    const engine = createMockEngine();
    const mod = new ContentModule();
    await mod.init(engine);

    expect(engine.events.on).toHaveBeenCalledWith(
      "player:levelUp",
      expect.any(Function),
    );
  });

  it("unregisters event handlers on destroy", async () => {
    const engine = createMockEngine();
    const mod = new ContentModule();
    await mod.init(engine);
    await mod.destroy();

    expect(engine.events.off).toHaveBeenCalledWith(
      "player:levelUp",
      expect.any(Function),
    );
  });

  it("emits content:checkUnlocks when player:levelUp is received", async () => {
    const engine = createMockEngine();
    const mod = new ContentModule();
    await mod.init(engine);

    await engine.events.emit(
      "player:levelUp",
      { userId: "user-1", newLevel: 10 },
      "test",
    );

    expect(engine.events.emit).toHaveBeenCalledWith(
      "content:checkUnlocks",
      { userId: "user-1", newLevel: 10 },
      "content",
    );
  });

  it("does not emit events after destroy", async () => {
    const engine = createMockEngine();
    const mod = new ContentModule();
    await mod.init(engine);
    await mod.destroy();

    (engine.events.emit as ReturnType<typeof vi.fn>).mockClear();

    await engine.events.emit(
      "player:levelUp",
      { userId: "user-1", newLevel: 5 },
      "test",
    );

    expect(engine.events.emit).toHaveBeenCalledTimes(1);
    expect(engine.events.emit).not.toHaveBeenCalledWith(
      "content:checkUnlocks",
      expect.anything(),
      expect.anything(),
    );
  });
});

// ---------------------------------------------------------------------------
// TerritoryModule
// ---------------------------------------------------------------------------
describe("TerritoryModule", () => {
  it("has the correct module name and dependencies", () => {
    const mod = new TerritoryModule();
    expect(mod.name).toBe("territory");
    expect(mod.dependencies).toEqual(["core", "economy"]);
  });

  it("registers event handlers on init", async () => {
    const engine = createMockEngine();
    const mod = new TerritoryModule();
    await mod.init(engine);

    expect(engine.events.on).toHaveBeenCalledWith(
      "building:upgraded",
      expect.any(Function),
    );
  });

  it("unregisters event handlers on destroy", async () => {
    const engine = createMockEngine();
    const mod = new TerritoryModule();
    await mod.init(engine);
    await mod.destroy();

    expect(engine.events.off).toHaveBeenCalledWith(
      "building:upgraded",
      expect.any(Function),
    );
  });

  it("emits territory:expanded when building:upgraded is received", async () => {
    const engine = createMockEngine();
    const mod = new TerritoryModule();
    await mod.init(engine);

    await engine.events.emit(
      "building:upgraded",
      { userId: "user-1", buildingId: "b-1", newLevel: 3 },
      "test",
    );

    expect(engine.events.emit).toHaveBeenCalledWith(
      "territory:expanded",
      { userId: "user-1", buildingId: "b-1" },
      "territory",
    );
  });

  it("does not emit events after destroy", async () => {
    const engine = createMockEngine();
    const mod = new TerritoryModule();
    await mod.init(engine);
    await mod.destroy();

    (engine.events.emit as ReturnType<typeof vi.fn>).mockClear();

    await engine.events.emit(
      "building:upgraded",
      { userId: "user-1", buildingId: "b-1" },
      "test",
    );

    expect(engine.events.emit).toHaveBeenCalledTimes(1);
    expect(engine.events.emit).not.toHaveBeenCalledWith(
      "territory:expanded",
      expect.anything(),
      expect.anything(),
    );
  });
});

// ---------------------------------------------------------------------------
// SettlementModule
// ---------------------------------------------------------------------------
describe("SettlementModule", () => {
  it("has the correct module name and dependencies", () => {
    const mod = new SettlementModule();
    expect(mod.name).toBe("settlement");
    expect(mod.dependencies).toEqual(["core", "economy"]);
  });

  it("registers event handlers on init", async () => {
    const engine = createMockEngine();
    const mod = new SettlementModule();
    await mod.init(engine);

    expect(engine.events.on).toHaveBeenCalledWith(
      "system:dailyReset",
      expect.any(Function),
    );
  });

  it("unregisters event handlers on destroy", async () => {
    const engine = createMockEngine();
    const mod = new SettlementModule();
    await mod.init(engine);
    await mod.destroy();

    expect(engine.events.off).toHaveBeenCalledWith(
      "system:dailyReset",
      expect.any(Function),
    );
  });

  it("emits settlement:daily when system:dailyReset is received", async () => {
    const engine = createMockEngine();
    const mod = new SettlementModule();
    await mod.init(engine);

    await engine.events.emit(
      "system:dailyReset",
      { userId: "user-1" },
      "test",
    );

    expect(engine.events.emit).toHaveBeenCalledWith(
      "settlement:daily",
      { userId: "user-1" },
      "settlement",
    );
  });

  it("does not emit events after destroy", async () => {
    const engine = createMockEngine();
    const mod = new SettlementModule();
    await mod.init(engine);
    await mod.destroy();

    (engine.events.emit as ReturnType<typeof vi.fn>).mockClear();

    await engine.events.emit(
      "system:dailyReset",
      { userId: "user-1" },
      "test",
    );

    expect(engine.events.emit).toHaveBeenCalledTimes(1);
    expect(engine.events.emit).not.toHaveBeenCalledWith(
      "settlement:daily",
      expect.anything(),
      expect.anything(),
    );
  });
});
