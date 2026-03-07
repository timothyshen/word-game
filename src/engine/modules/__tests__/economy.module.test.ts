import { describe, it, expect, vi } from "vitest";
import { EconomyModule } from "../economy.module";
import type { EventHandler, GameEngine, GameEvent } from "../../types";

function createMockEngine(): GameEngine {
  const handlers = new Map<
    string,
    Array<{ handler: EventHandler; priority: number }>
  >();

  return {
    events: {
      on: vi.fn(
        (event: string, handler: EventHandler, priority = 0) => {
          if (!handlers.has(event)) handlers.set(event, []);
          handlers.get(event)!.push({ handler, priority });
        },
      ),
      off: vi.fn(
        (event: string, handler: EventHandler) => {
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
    entities: {} as GameEngine["entities"],
    db: null,
  };
}

describe("EconomyModule", () => {
  it("has the correct module name", () => {
    const mod = new EconomyModule();
    expect(mod.name).toBe("economy");
  });

  it('has dependencies on ["core"]', () => {
    const mod = new EconomyModule();
    expect(mod.dependencies).toEqual(["core"]);
  });

  it("registers event handlers on init", async () => {
    const engine = createMockEngine();
    const mod = new EconomyModule();

    await mod.init(engine);

    expect(engine.events.on).toHaveBeenCalledWith(
      "settlement:daily",
      expect.any(Function),
    );
    expect(engine.events.on).toHaveBeenCalledWith(
      "building:upgrade",
      expect.any(Function),
    );
  });

  it("unregisters event handlers on destroy", async () => {
    const engine = createMockEngine();
    const mod = new EconomyModule();

    await mod.init(engine);
    await mod.destroy();

    expect(engine.events.off).toHaveBeenCalledWith(
      "settlement:daily",
      expect.any(Function),
    );
    expect(engine.events.off).toHaveBeenCalledWith(
      "building:upgrade",
      expect.any(Function),
    );
  });

  it("emits economy:output when settlement:daily has output", async () => {
    const engine = createMockEngine();
    const mod = new EconomyModule();

    await mod.init(engine);
    await engine.events.emit(
      "settlement:daily",
      { userId: "user-1", output: { gold: 100, wood: 50 } },
      "test",
    );

    expect(engine.events.emit).toHaveBeenCalledWith(
      "economy:output",
      { userId: "user-1", output: { gold: 100, wood: 50 } },
      "economy",
    );
  });

  it("does not emit economy:output when settlement:daily has no output", async () => {
    const engine = createMockEngine();
    const mod = new EconomyModule();

    await mod.init(engine);

    (engine.events.emit as ReturnType<typeof vi.fn>).mockClear();

    await engine.events.emit(
      "settlement:daily",
      { userId: "user-1" },
      "test",
    );

    // Only the direct emit call should exist — no economy:output emission
    expect(engine.events.emit).toHaveBeenCalledTimes(1);
    expect(engine.events.emit).not.toHaveBeenCalledWith(
      "economy:output",
      expect.anything(),
      expect.anything(),
    );
  });

  it("emits building:upgraded when building:upgrade is received", async () => {
    const engine = createMockEngine();
    const mod = new EconomyModule();

    await mod.init(engine);
    await engine.events.emit(
      "building:upgrade",
      { userId: "user-1", buildingId: "b-1", newLevel: 3 },
      "test",
    );

    expect(engine.events.emit).toHaveBeenCalledWith(
      "building:upgraded",
      { userId: "user-1", buildingId: "b-1", newLevel: 3 },
      "economy",
    );
  });

  it("does not emit events after destroy", async () => {
    const engine = createMockEngine();
    const mod = new EconomyModule();

    await mod.init(engine);
    await mod.destroy();

    (engine.events.emit as ReturnType<typeof vi.fn>).mockClear();

    await engine.events.emit(
      "settlement:daily",
      { userId: "user-2", output: { gold: 200 } },
      "test",
    );

    // After destroy, handlers were removed — only the direct emit call exists
    expect(engine.events.emit).toHaveBeenCalledTimes(1);
    expect(engine.events.emit).not.toHaveBeenCalledWith(
      "economy:output",
      expect.anything(),
      expect.anything(),
    );
  });
});
