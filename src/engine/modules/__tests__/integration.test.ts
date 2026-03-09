import { describe, it, expect, vi } from "vitest";
import { createEngine } from "../../index";
import { registerAllModules } from "../index";
import type { GameEvent } from "../../types";

describe("Module integration", () => {
  it("full event flow: combat -> progression -> content", async () => {
    const engine = createEngine();
    registerAllModules(engine);
    await engine.start();

    const emittedEvents: Array<{ type: string; payload: unknown }> = [];
    const captureAll = (event: GameEvent) => {
      emittedEvents.push({ type: event.type, payload: event.payload });
    };

    // Listen for events we expect to be emitted by modules
    engine.events.on("combat:started", captureAll);
    engine.events.on("combat:victory", captureAll);
    engine.events.on("card:acquired", captureAll);
    engine.events.on("progression:check", captureAll);
    engine.events.on("content:checkUnlocks", captureAll);

    // Step 1: Emit combat:start -> CombatModule should emit combat:started
    await engine.events.emit(
      "combat:start",
      { userId: "user-1", combatId: "c-1", monsterLevel: 5 },
      "test",
    );

    expect(emittedEvents).toContainEqual(
      expect.objectContaining({ type: "combat:started" }),
    );

    // Step 2: Emit combat:action with victory result
    // -> CombatModule emits combat:victory
    // -> ProgressionModule listens and emits card:acquired + progression:check
    emittedEvents.length = 0;
    await engine.events.emit(
      "combat:action",
      {
        userId: "user-1",
        combatId: "c-1",
        actionId: "attack",
        result: {
          status: "victory",
          rewards: {
            cards: [{ id: "card-1", name: "Flame Sword" }],
          },
        },
      },
      "test",
    );

    expect(emittedEvents).toContainEqual(
      expect.objectContaining({ type: "combat:victory" }),
    );
    expect(emittedEvents).toContainEqual(
      expect.objectContaining({
        type: "card:acquired",
        payload: { userId: "user-1", cardId: "card-1", cardName: "Flame Sword" },
      }),
    );
    expect(emittedEvents).toContainEqual(
      expect.objectContaining({
        type: "progression:check",
        payload: { userId: "user-1", trigger: "combat_victory" },
      }),
    );

    // Step 3: Emit player:levelUp -> ContentModule emits content:checkUnlocks
    emittedEvents.length = 0;
    await engine.events.emit(
      "player:levelUp",
      { userId: "user-1", newLevel: 10 },
      "test",
    );

    expect(emittedEvents).toContainEqual(
      expect.objectContaining({
        type: "content:checkUnlocks",
        payload: { userId: "user-1", newLevel: 10 },
      }),
    );

    await engine.stop();
  });

  it("territory module reacts to building:upgraded from economy", async () => {
    const engine = createEngine();
    registerAllModules(engine);
    await engine.start();

    const emittedEvents: Array<{ type: string; payload: unknown }> = [];
    engine.events.on("territory:expanded", (event: GameEvent) => {
      emittedEvents.push({ type: event.type, payload: event.payload });
    });

    // EconomyModule listens to building:upgrade and emits building:upgraded
    // TerritoryModule listens to building:upgraded and emits territory:expanded
    await engine.events.emit(
      "building:upgrade",
      { userId: "user-1", buildingId: "b-1", newLevel: 3 },
      "test",
    );

    expect(emittedEvents).toContainEqual(
      expect.objectContaining({
        type: "territory:expanded",
        payload: { userId: "user-1", buildingId: "b-1" },
      }),
    );

    await engine.stop();
  });

  it("settlement module reacts to system:dailyReset", async () => {
    const engine = createEngine();
    registerAllModules(engine);
    await engine.start();

    const emittedEvents: Array<{ type: string; payload: unknown }> = [];
    engine.events.on("settlement:daily", (event: GameEvent) => {
      emittedEvents.push({ type: event.type, payload: event.payload });
    });

    await engine.events.emit(
      "system:dailyReset",
      { userId: "user-1" },
      "test",
    );

    expect(emittedEvents).toContainEqual(
      expect.objectContaining({
        type: "settlement:daily",
        payload: { userId: "user-1" },
      }),
    );

    await engine.stop();
  });

  it("all 9 modules are registered", async () => {
    const engine = createEngine();
    registerAllModules(engine);

    const modules = engine.modules.getAll();
    const names = modules.map((m) => m.name).sort();

    expect(names).toEqual([
      "combat",
      "content",
      "core",
      "crafting",
      "economy",
      "exploration",
      "progression",
      "settlement",
      "territory",
    ]);
  });

  it("boss:challenge victory triggers progression:check", async () => {
    const engine = createEngine();
    registerAllModules(engine);
    await engine.start();

    const emittedEvents: Array<{ type: string; payload: unknown }> = [];
    engine.events.on("progression:check", (event: GameEvent) => {
      emittedEvents.push({ type: event.type, payload: event.payload });
    });

    await engine.events.emit(
      "boss:challenge",
      { userId: "user-1", bossId: "b-1", victory: true },
      "test",
    );

    expect(emittedEvents).toContainEqual(
      expect.objectContaining({
        type: "progression:check",
        payload: expect.objectContaining({ trigger: "boss_challenge" }),
      }),
    );

    await engine.stop();
  });

  it("territory events flow through TerritoryModule", async () => {
    const engine = createEngine();
    registerAllModules(engine);
    await engine.start();

    const emittedEvents: Array<{ type: string; payload: unknown }> = [];
    engine.events.on("territory:expanded", (event: GameEvent) => {
      emittedEvents.push({ type: event.type, payload: event.payload });
    });

    await engine.events.emit(
      "territory:build",
      { userId: "user-1", positionX: 1, positionY: 2 },
      "test",
    );

    expect(emittedEvents).toContainEqual(
      expect.objectContaining({
        type: "territory:expanded",
        payload: expect.objectContaining({ trigger: "build" }),
      }),
    );

    await engine.stop();
  });

  it("character:levelUp triggers both progression and content checks", async () => {
    const engine = createEngine();
    registerAllModules(engine);
    await engine.start();

    const emittedEvents: Array<{ type: string; payload: unknown }> = [];
    engine.events.on("progression:check", (event: GameEvent) => {
      emittedEvents.push({ type: event.type, payload: event.payload });
    });
    engine.events.on("content:checkUnlocks", (event: GameEvent) => {
      emittedEvents.push({ type: event.type, payload: event.payload });
    });

    await engine.events.emit(
      "character:levelUp",
      { userId: "user-1", characterId: "c-1", newLevel: 10 },
      "test",
    );

    expect(emittedEvents).toContainEqual(
      expect.objectContaining({
        type: "progression:check",
        payload: expect.objectContaining({ trigger: "character_level_up" }),
      }),
    );
    expect(emittedEvents).toContainEqual(
      expect.objectContaining({ type: "content:checkUnlocks" }),
    );

    await engine.stop();
  });

  it("engine starts and stops cleanly with all modules", async () => {
    const engine = createEngine();
    registerAllModules(engine);

    await engine.start();
    await engine.stop();
    // If we reach here without throwing, the test passes
    expect(true).toBe(true);
  });
});
