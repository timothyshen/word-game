import { describe, it, expect, vi } from "vitest";
import { CombatModule } from "../combat.module";
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

describe("CombatModule", () => {
  it("has the correct module name", () => {
    const mod = new CombatModule();
    expect(mod.name).toBe("combat");
  });

  it('has dependencies on ["core"]', () => {
    const mod = new CombatModule();
    expect(mod.dependencies).toEqual(["core"]);
  });

  it("registers event handlers on init", async () => {
    const engine = createMockEngine();
    const mod = new CombatModule();

    await mod.init(engine);

    expect(engine.events.on).toHaveBeenCalledWith(
      "combat:start",
      expect.any(Function),
    );
    expect(engine.events.on).toHaveBeenCalledWith(
      "combat:action",
      expect.any(Function),
    );
  });

  it("unregisters event handlers on destroy", async () => {
    const engine = createMockEngine();
    const mod = new CombatModule();

    await mod.init(engine);
    await mod.destroy();

    expect(engine.events.off).toHaveBeenCalledWith(
      "combat:start",
      expect.any(Function),
    );
    expect(engine.events.off).toHaveBeenCalledWith(
      "combat:action",
      expect.any(Function),
    );
  });

  it("emits combat:started when combat:start is received", async () => {
    const engine = createMockEngine();
    const mod = new CombatModule();

    await mod.init(engine);
    await engine.events.emit(
      "combat:start",
      { userId: "user-1", combatId: "c-1", monsterLevel: 5 },
      "test",
    );

    expect(engine.events.emit).toHaveBeenCalledWith(
      "combat:started",
      { userId: "user-1", combatId: "c-1" },
      "combat",
    );
  });

  it("emits combat:victory when combat:action result is victory", async () => {
    const engine = createMockEngine();
    const mod = new CombatModule();

    await mod.init(engine);
    await engine.events.emit(
      "combat:action",
      {
        userId: "user-1",
        combatId: "c-1",
        actionId: "attack",
        result: { status: "victory", rewards: { gold: 100, exp: 50 } },
      },
      "test",
    );

    expect(engine.events.emit).toHaveBeenCalledWith(
      "combat:victory",
      { userId: "user-1", rewards: { gold: 100, exp: 50 } },
      "combat",
    );
  });

  it("emits combat:defeat when combat:action result is defeat", async () => {
    const engine = createMockEngine();
    const mod = new CombatModule();

    await mod.init(engine);
    await engine.events.emit(
      "combat:action",
      {
        userId: "user-1",
        combatId: "c-1",
        actionId: "attack",
        result: { status: "defeat" },
      },
      "test",
    );

    expect(engine.events.emit).toHaveBeenCalledWith(
      "combat:defeat",
      { userId: "user-1" },
      "combat",
    );
  });

  it("does not emit extra events when combat:action has no result", async () => {
    const engine = createMockEngine();
    const mod = new CombatModule();

    await mod.init(engine);

    (engine.events.emit as ReturnType<typeof vi.fn>).mockClear();

    await engine.events.emit(
      "combat:action",
      {
        userId: "user-1",
        combatId: "c-1",
        actionId: "attack",
      },
      "test",
    );

    // Only the direct emit call should exist — no victory/defeat emission
    expect(engine.events.emit).toHaveBeenCalledTimes(1);
    expect(engine.events.emit).not.toHaveBeenCalledWith(
      "combat:victory",
      expect.anything(),
      expect.anything(),
    );
    expect(engine.events.emit).not.toHaveBeenCalledWith(
      "combat:defeat",
      expect.anything(),
      expect.anything(),
    );
  });

  it("does not emit events after destroy", async () => {
    const engine = createMockEngine();
    const mod = new CombatModule();

    await mod.init(engine);
    await mod.destroy();

    (engine.events.emit as ReturnType<typeof vi.fn>).mockClear();

    await engine.events.emit(
      "combat:start",
      { userId: "user-2", monsterLevel: 3 },
      "test",
    );

    // After destroy, handlers were removed — only the direct emit call exists
    expect(engine.events.emit).toHaveBeenCalledTimes(1);
    expect(engine.events.emit).not.toHaveBeenCalledWith(
      "combat:started",
      expect.anything(),
      expect.anything(),
    );
  });
});
