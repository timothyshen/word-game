import { describe, it, expect, vi } from "vitest";
import { CoreModule } from "../core.module";
import type { GameEngine, GameEvent } from "../../types";

function createMockEngine(): GameEngine {
  const handlers = new Map<
    string,
    Array<{ handler: (...args: unknown[]) => unknown; priority: number }>
  >();

  return {
    events: {
      on: vi.fn((event: string, handler: (...args: unknown[]) => unknown, priority = 0) => {
        if (!handlers.has(event)) handlers.set(event, []);
        handlers.get(event)!.push({ handler, priority });
      }),
      off: vi.fn((event: string, handler: (...args: unknown[]) => unknown) => {
        const list = handlers.get(event);
        if (list) {
          const idx = list.findIndex((h) => h.handler === handler);
          if (idx >= 0) list.splice(idx, 1);
        }
      }),
      emit: vi.fn(async (event: string, payload: unknown, source?: string) => {
        const list = handlers.get(event) ?? [];
        for (const { handler } of list) {
          await handler({
            type: event,
            payload,
            timestamp: Date.now(),
            source: source ?? "test",
          } satisfies GameEvent);
        }
      }),
    },
    rules: {} as GameEngine["rules"],
    formulas: {} as GameEngine["formulas"],
    modules: {} as GameEngine["modules"],
    state: {} as GameEngine["state"],
    db: null,
  };
}

describe("CoreModule", () => {
  it("has the correct module name", () => {
    const mod = new CoreModule();
    expect(mod.name).toBe("core");
  });

  it("has no dependencies", () => {
    const mod = new CoreModule();
    expect(mod.dependencies).toBeUndefined();
  });

  it("registers event handlers on init", async () => {
    const engine = createMockEngine();
    const mod = new CoreModule();

    await mod.init(engine);

    expect(engine.events.on).toHaveBeenCalledWith(
      "player:expGain",
      expect.any(Function),
      10,
    );
  });

  it("unregisters event handlers on destroy", async () => {
    const engine = createMockEngine();
    const mod = new CoreModule();

    await mod.init(engine);
    await mod.destroy();

    expect(engine.events.off).toHaveBeenCalledWith(
      "player:expGain",
      expect.any(Function),
    );
  });

  it("emits player:statusChanged when player:expGain is received", async () => {
    const engine = createMockEngine();
    const mod = new CoreModule();

    await mod.init(engine);
    await engine.events.emit(
      "player:expGain",
      { userId: "user-1", amount: 50 },
      "test",
    );

    // The first emit call is from our test trigger above.
    // The second emit call should be the statusChanged event from the handler.
    expect(engine.events.emit).toHaveBeenCalledWith(
      "player:statusChanged",
      { userId: "user-1" },
      "core",
    );
  });

  it("does not emit events after destroy", async () => {
    const engine = createMockEngine();
    const mod = new CoreModule();

    await mod.init(engine);
    await mod.destroy();

    // Clear previous calls
    (engine.events.emit as ReturnType<typeof vi.fn>).mockClear();

    await engine.events.emit(
      "player:expGain",
      { userId: "user-2", amount: 100 },
      "test",
    );

    // After destroy, the handler was removed, so only the direct emit call
    // should exist — no statusChanged emission.
    expect(engine.events.emit).toHaveBeenCalledTimes(1);
    expect(engine.events.emit).not.toHaveBeenCalledWith(
      "player:statusChanged",
      expect.anything(),
      expect.anything(),
    );
  });
});
