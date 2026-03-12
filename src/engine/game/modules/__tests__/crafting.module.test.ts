import { describe, it, expect, vi, beforeEach } from "vitest";
import { CraftingModule } from "../crafting.module";
import { createEngine } from "../../../index";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CraftingModule", () => {
  it("should have correct manifest metadata", () => {
    const mod = new CraftingModule();

    expect(mod.name).toBe("crafting");
    expect(mod.manifest.name).toBe("crafting");
    expect(mod.manifest.version).toBe("1.0.0");
    expect(mod.manifest.provides).toContain("crafting:completed");
    expect(mod.manifest.provides).toContain("crafting:qualityUpgrade");
    expect(mod.manifest.provides).toContain("crafting:materialDrop");
    expect(mod.manifest.requires).toContain("exploration:complete");
    expect(mod.manifest.requires).toContain("combat:victory");
  });

  it("should depend on 'core' module", () => {
    const mod = new CraftingModule();
    expect(mod.dependencies).toContain("core");
  });

  it("should subscribe to crafting:completed during init", async () => {
    const engine = createEngine();
    const mod = new CraftingModule();

    // Register core dependency stub
    engine.use({
      name: "core",
      async init() {},
    });
    engine.use(mod);
    await engine.start();

    // Emit crafting:completed and check that progression:check is emitted
    const progressionEvents: unknown[] = [];
    engine.events.on("progression:check", async (event) => {
      progressionEvents.push(event.payload);
    });

    await engine.events.emit("crafting:completed", {
      userId: "u1",
      recipeId: "r1",
      equipmentId: "eq1",
      rarity: "精良",
      qualityTier: "fine",
    }, "crafting");

    expect(progressionEvents).toHaveLength(1);
    expect(progressionEvents[0]).toEqual({
      userId: "u1",
      trigger: "crafting_completed",
    });
  });

  it("should unsubscribe from events on destroy", async () => {
    const engine = createEngine();
    const mod = new CraftingModule();

    engine.use({
      name: "core",
      async init() {},
    });
    engine.use(mod);
    await engine.start();

    // Destroy should unsubscribe
    await mod.destroy();

    // Emit again — no progression:check should fire
    const progressionEvents: unknown[] = [];
    engine.events.on("progression:check", async (event) => {
      progressionEvents.push(event.payload);
    });

    await engine.events.emit("crafting:completed", {
      userId: "u1",
      recipeId: "r1",
      equipmentId: "eq1",
      rarity: "普通",
      qualityTier: "normal",
    }, "crafting");

    expect(progressionEvents).toHaveLength(0);
  });
});
