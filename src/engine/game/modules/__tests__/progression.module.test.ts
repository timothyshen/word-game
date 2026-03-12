import { describe, it, expect, vi } from "vitest";
import { ProgressionModule } from "../progression.module";
import type { EventHandler, GameEngine, GameEvent } from "../../../types";

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

describe("ProgressionModule", () => {
  it("has the correct module name", () => {
    const mod = new ProgressionModule();
    expect(mod.name).toBe("progression");
  });

  it('has dependencies on ["core", "combat", "exploration"]', () => {
    const mod = new ProgressionModule();
    expect(mod.dependencies).toEqual(["core", "combat", "exploration"]);
  });

  it("registers event handlers on init", async () => {
    const engine = createMockEngine();
    const mod = new ProgressionModule();

    await mod.init(engine);

    expect(engine.events.on).toHaveBeenCalledWith(
      "combat:victory",
      expect.any(Function),
    );
    expect(engine.events.on).toHaveBeenCalledWith(
      "exploration:complete",
      expect.any(Function),
    );
  });

  it("unregisters event handlers on destroy", async () => {
    const engine = createMockEngine();
    const mod = new ProgressionModule();

    await mod.init(engine);
    await mod.destroy();

    expect(engine.events.off).toHaveBeenCalledWith(
      "combat:victory",
      expect.any(Function),
    );
    expect(engine.events.off).toHaveBeenCalledWith(
      "exploration:complete",
      expect.any(Function),
    );
  });

  it("emits card:acquired for each card in combat:victory rewards", async () => {
    const engine = createMockEngine();
    const mod = new ProgressionModule();

    await mod.init(engine);
    await engine.events.emit(
      "combat:victory",
      {
        userId: "user-1",
        rewards: {
          cards: [
            { id: "card-1", name: "Flame Sword" },
            { id: "card-2", name: "Ice Shield" },
          ],
        },
      },
      "test",
    );

    expect(engine.events.emit).toHaveBeenCalledWith(
      "card:acquired",
      { userId: "user-1", cardId: "card-1", cardName: "Flame Sword" },
      "progression",
    );
    expect(engine.events.emit).toHaveBeenCalledWith(
      "card:acquired",
      { userId: "user-1", cardId: "card-2", cardName: "Ice Shield" },
      "progression",
    );
  });

  it("emits progression:check even when combat:victory has no cards", async () => {
    const engine = createMockEngine();
    const mod = new ProgressionModule();

    await mod.init(engine);
    await engine.events.emit(
      "combat:victory",
      { userId: "user-1", rewards: {} },
      "test",
    );

    expect(engine.events.emit).toHaveBeenCalledWith(
      "progression:check",
      { userId: "user-1", trigger: "combat_victory" },
      "progression",
    );
  });

  it("emits card:acquired for each card in exploration:complete result", async () => {
    const engine = createMockEngine();
    const mod = new ProgressionModule();

    await mod.init(engine);
    await engine.events.emit(
      "exploration:complete",
      {
        userId: "user-1",
        result: {
          cards: [{ id: "card-3", name: "Healing Herb" }],
        },
      },
      "test",
    );

    expect(engine.events.emit).toHaveBeenCalledWith(
      "card:acquired",
      { userId: "user-1", cardId: "card-3", cardName: "Healing Herb" },
      "progression",
    );
  });

  it("emits progression:check even when exploration:complete has no cards", async () => {
    const engine = createMockEngine();
    const mod = new ProgressionModule();

    await mod.init(engine);
    await engine.events.emit(
      "exploration:complete",
      { userId: "user-1", result: {} },
      "test",
    );

    expect(engine.events.emit).toHaveBeenCalledWith(
      "progression:check",
      { userId: "user-1", trigger: "exploration_complete" },
      "progression",
    );
  });

  it("does not emit events after destroy", async () => {
    const engine = createMockEngine();
    const mod = new ProgressionModule();

    await mod.init(engine);
    await mod.destroy();

    (engine.events.emit as ReturnType<typeof vi.fn>).mockClear();

    await engine.events.emit(
      "combat:victory",
      { userId: "user-2", rewards: { cards: [{ id: "c1", name: "X" }] } },
      "test",
    );

    // After destroy, handlers were removed — only the direct emit call exists
    expect(engine.events.emit).toHaveBeenCalledTimes(1);
    expect(engine.events.emit).not.toHaveBeenCalledWith(
      "card:acquired",
      expect.anything(),
      expect.anything(),
    );
  });
});
