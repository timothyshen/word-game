import { describe, it, expect, vi } from "vitest";
import { ExplorationModule } from "../exploration.module";
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
    use: vi.fn().mockReturnThis(),
  };
}

describe("ExplorationModule", () => {
  it("has the correct module name", () => {
    const mod = new ExplorationModule();
    expect(mod.name).toBe("exploration");
  });

  it('has dependencies on ["core"]', () => {
    const mod = new ExplorationModule();
    expect(mod.dependencies).toEqual(["core"]);
  });

  it("registers event handlers on init", async () => {
    const engine = createMockEngine();
    const mod = new ExplorationModule();

    await mod.init(engine);

    expect(engine.events.on).toHaveBeenCalledWith(
      "exploration:start",
      expect.any(Function),
    );
  });

  it("unregisters event handlers on destroy", async () => {
    const engine = createMockEngine();
    const mod = new ExplorationModule();

    await mod.init(engine);
    await mod.destroy();

    expect(engine.events.off).toHaveBeenCalledWith(
      "exploration:start",
      expect.any(Function),
    );
  });

  it("emits exploration:complete when exploration:start is received", async () => {
    const engine = createMockEngine();
    const mod = new ExplorationModule();

    await mod.init(engine);
    await engine.events.emit(
      "exploration:start",
      { userId: "user-1", areaLevel: 3, result: { loot: "sword" } },
      "test",
    );

    expect(engine.events.emit).toHaveBeenCalledWith(
      "exploration:complete",
      { userId: "user-1", result: { loot: "sword" } },
      "exploration",
    );
  });

  it("emits both exploration:complete and exploration:encounter when encounter is present", async () => {
    const engine = createMockEngine();
    const mod = new ExplorationModule();

    await mod.init(engine);
    await engine.events.emit(
      "exploration:start",
      {
        userId: "user-1",
        areaLevel: 5,
        encounter: { monsterType: "goblin", monsterLevel: 4 },
      },
      "test",
    );

    expect(engine.events.emit).toHaveBeenCalledWith(
      "exploration:complete",
      { userId: "user-1", result: undefined },
      "exploration",
    );
    expect(engine.events.emit).toHaveBeenCalledWith(
      "exploration:encounter",
      { userId: "user-1", monsterType: "goblin", monsterLevel: 4 },
      "exploration",
    );
  });

  it("does not emit events after destroy", async () => {
    const engine = createMockEngine();
    const mod = new ExplorationModule();

    await mod.init(engine);
    await mod.destroy();

    (engine.events.emit as ReturnType<typeof vi.fn>).mockClear();

    await engine.events.emit(
      "exploration:start",
      { userId: "user-2", areaLevel: 1 },
      "test",
    );

    // After destroy, handlers were removed — only the direct emit call exists
    expect(engine.events.emit).toHaveBeenCalledTimes(1);
    expect(engine.events.emit).not.toHaveBeenCalledWith(
      "exploration:complete",
      expect.anything(),
      expect.anything(),
    );
  });
});
