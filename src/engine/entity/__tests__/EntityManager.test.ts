import { describe, it, expect, vi, beforeEach } from "vitest";
import { EntityManager } from "../EntityManager";
import type { IEntityStore } from "../IEntityStore";

function createMockStore() {
  return {
    createSchema: vi.fn(),
    findSchemaByGameAndName: vi.fn(),
    findSchemasByGame: vi.fn(),
    createTemplate: vi.fn(),
    findTemplateById: vi.fn(),
    findTemplatesBySchema: vi.fn(),
    findTemplateBySchemaAndName: vi.fn(),
    createEntity: vi.fn(),
    findEntityById: vi.fn(),
    findEntitiesByOwner: vi.fn(),
    findEntitiesByTemplate: vi.fn(),
    findEntityByOwnerAndTemplate: vi.fn(),
    updateEntityState: vi.fn(),
    deleteEntity: vi.fn(),
    deleteManyEntities: vi.fn(),
  } satisfies Record<keyof IEntityStore, ReturnType<typeof vi.fn>>;
}

type MockStore = ReturnType<typeof createMockStore>;

let mockStore: MockStore;

function createManager(): EntityManager {
  return new EntityManager(mockStore);
}

describe("EntityManager", () => {
  beforeEach(() => {
    mockStore = createMockStore();
  });

  // ── Schema operations ──

  it("createSchema stores components as JSON", async () => {
    const components = ["stats", "inventory"];
    const defaults = { stats: { hp: 100 } };
    mockStore.createSchema.mockResolvedValue({ id: "s1" });

    const mgr = createManager();
    await mgr.createSchema("game1", "character", components, defaults);

    expect(mockStore.createSchema).toHaveBeenCalledWith({
      gameId: "game1",
      name: "character",
      components: JSON.stringify(components),
      defaults: JSON.stringify(defaults),
    });
  });

  it("createSchema uses empty object for defaults when not provided", async () => {
    mockStore.createSchema.mockResolvedValue({ id: "s1" });

    const mgr = createManager();
    await mgr.createSchema("game1", "item", ["inventory"]);

    expect(mockStore.createSchema).toHaveBeenCalledWith({
      gameId: "game1",
      name: "item",
      components: JSON.stringify(["inventory"]),
      defaults: "{}",
    });
  });

  it("getSchema by gameId + name", async () => {
    const schema = { id: "s1", gameId: "game1", name: "character" };
    mockStore.findSchemaByGameAndName.mockResolvedValue(schema);

    const mgr = createManager();
    const result = await mgr.getSchema("game1", "character");

    expect(mockStore.findSchemaByGameAndName).toHaveBeenCalledWith("game1", "character");
    expect(result).toEqual(schema);
  });

  // ── Template operations ──

  it("createTemplate stores data as JSON", async () => {
    const data = { stats: { hp: 50, maxHp: 50, mp: 10, maxMp: 10, atk: 5, def: 3, spd: 2 } };
    mockStore.createTemplate.mockResolvedValue({ id: "t1" });

    const mgr = createManager();
    await mgr.createTemplate("s1", "goblin", data, {
      icon: "goblin.png",
      rarity: "common",
      description: "A small goblin",
    });

    expect(mockStore.createTemplate).toHaveBeenCalledWith({
      schemaId: "s1",
      name: "goblin",
      data: JSON.stringify(data),
      icon: "goblin.png",
      rarity: "common",
      description: "A small goblin",
    });
  });

  it("createTemplate uses defaults for missing opts", async () => {
    mockStore.createTemplate.mockResolvedValue({ id: "t1" });

    const mgr = createManager();
    await mgr.createTemplate("s1", "goblin", { hp: 10 });

    expect(mockStore.createTemplate).toHaveBeenCalledWith({
      schemaId: "s1",
      name: "goblin",
      data: JSON.stringify({ hp: 10 }),
      icon: "",
      rarity: null,
      description: "",
    });
  });

  // ── Entity operations ──

  it("createEntity with initial state", async () => {
    const initialState = { stats: { hp: 100 } };
    mockStore.createEntity.mockResolvedValue({ id: "e1" });

    const mgr = createManager();
    await mgr.createEntity("t1", "player1", initialState);

    expect(mockStore.findTemplateById).not.toHaveBeenCalled();
    expect(mockStore.createEntity).toHaveBeenCalledWith({
      templateId: "t1",
      ownerId: "player1",
      state: JSON.stringify(initialState),
    });
  });

  it("createEntity without initial state uses template defaults", async () => {
    const templateData = { stats: { hp: 50 } };
    const schemaDefaults = { stats: { hp: 10 }, inventory: { items: [], capacity: 5 } };
    mockStore.findTemplateById.mockResolvedValue({
      id: "t1",
      data: JSON.stringify(templateData),
      schema: { defaults: JSON.stringify(schemaDefaults) },
    });
    mockStore.createEntity.mockResolvedValue({ id: "e1" });

    const mgr = createManager();
    await mgr.createEntity("t1", "player1");

    expect(mockStore.findTemplateById).toHaveBeenCalledWith("t1");
    // Template data overrides schema defaults
    const expectedState = { ...schemaDefaults, ...templateData };
    expect(mockStore.createEntity).toHaveBeenCalledWith({
      templateId: "t1",
      ownerId: "player1",
      state: JSON.stringify(expectedState),
    });
  });

  it("getEntity returns entity with template and schema", async () => {
    const entity = {
      id: "e1",
      template: { id: "t1", schema: { id: "s1", name: "character" } },
    };
    mockStore.findEntityById.mockResolvedValue(entity);

    const mgr = createManager();
    const result = await mgr.getEntity("e1");

    expect(mockStore.findEntityById).toHaveBeenCalledWith("e1");
    expect(result).toEqual(entity);
  });

  it("getEntitiesByOwner returns matching entities", async () => {
    const entities = [{ id: "e1" }, { id: "e2" }];
    mockStore.findEntitiesByOwner.mockResolvedValue(entities);

    const mgr = createManager();
    const result = await mgr.getEntitiesByOwner("player1");

    expect(mockStore.findEntitiesByOwner).toHaveBeenCalledWith("player1", undefined);
    expect(result).toEqual(entities);
  });

  it("getEntitiesByOwner filters by schemaName", async () => {
    mockStore.findEntitiesByOwner.mockResolvedValue([]);

    const mgr = createManager();
    await mgr.getEntitiesByOwner("player1", "character");

    expect(mockStore.findEntitiesByOwner).toHaveBeenCalledWith("player1", "character");
  });

  it("updateEntityState merges partial state", async () => {
    const currentState = { stats: { hp: 100 }, inventory: { items: [] } };
    mockStore.findEntityById.mockResolvedValue({
      id: "e1",
      state: JSON.stringify(currentState),
    });
    mockStore.updateEntityState.mockResolvedValue({ id: "e1" });

    const mgr = createManager();
    await mgr.updateEntityState("e1", { stats: { hp: 50 } });

    const expectedState = { ...currentState, stats: { hp: 50 } };
    expect(mockStore.updateEntityState).toHaveBeenCalledWith(
      "e1",
      JSON.stringify(expectedState),
    );
  });

  it("updateEntityState throws for missing entity", async () => {
    mockStore.findEntityById.mockResolvedValue(null);

    const mgr = createManager();
    await expect(
      mgr.updateEntityState("missing", { hp: 1 }),
    ).rejects.toThrow("Entity not found: missing");
  });

  it("deleteEntity calls delete", async () => {
    mockStore.deleteEntity.mockResolvedValue({ id: "e1" });

    const mgr = createManager();
    await mgr.deleteEntity("e1");

    expect(mockStore.deleteEntity).toHaveBeenCalledWith("e1");
  });

  // ── Component helpers ──

  it("getEntityComponent extracts component from state", async () => {
    const state = {
      stats: { hp: 100, maxHp: 100, mp: 50, maxMp: 50, atk: 10, def: 5, spd: 3 },
    };
    mockStore.findEntityById.mockResolvedValue({
      id: "e1",
      state: JSON.stringify(state),
    });

    const mgr = createManager();
    const stats = await mgr.getEntityComponent("e1", "stats");

    expect(stats).toEqual(state.stats);
  });

  it("getEntityComponent returns undefined for missing entity", async () => {
    mockStore.findEntityById.mockResolvedValue(null);

    const mgr = createManager();
    const result = await mgr.getEntityComponent("missing", "stats");

    expect(result).toBeUndefined();
  });

  it("setEntityComponent updates component in state", async () => {
    const currentState = {
      stats: { hp: 100, maxHp: 100, mp: 50, maxMp: 50, atk: 10, def: 5, spd: 3 },
    };
    mockStore.findEntityById.mockResolvedValue({
      id: "e1",
      state: JSON.stringify(currentState),
    });
    mockStore.updateEntityState.mockResolvedValue({ id: "e1" });

    const newStats = { hp: 80, maxHp: 100, mp: 50, maxMp: 50, atk: 10, def: 5, spd: 3 };
    const mgr = createManager();
    await mgr.setEntityComponent("e1", "stats", newStats);

    expect(mockStore.updateEntityState).toHaveBeenCalledWith(
      "e1",
      JSON.stringify({ stats: newStats }),
    );
  });

  it("setEntityComponent throws for missing entity", async () => {
    mockStore.findEntityById.mockResolvedValue(null);

    const mgr = createManager();
    await expect(
      mgr.setEntityComponent("missing", "stats", {
        hp: 1, maxHp: 1, mp: 0, maxMp: 0, atk: 0, def: 0, spd: 0,
      }),
    ).rejects.toThrow("Entity not found: missing");
  });

  // ── Extended query operations ──

  it("getEntitiesByTemplate returns entities for a template", async () => {
    const entities = [{ id: "e1" }, { id: "e2" }];
    mockStore.findEntitiesByTemplate.mockResolvedValue(entities);

    const mgr = createManager();
    const result = await mgr.getEntitiesByTemplate("t1");

    expect(mockStore.findEntitiesByTemplate).toHaveBeenCalledWith("t1");
    expect(result).toEqual(entities);
  });

  it("findEntityByOwnerAndTemplate returns first match", async () => {
    const entity = { id: "e1", ownerId: "p1", templateId: "t1" };
    mockStore.findEntityByOwnerAndTemplate.mockResolvedValue(entity);

    const mgr = createManager();
    const result = await mgr.findEntityByOwnerAndTemplate("p1", "t1");

    expect(mockStore.findEntityByOwnerAndTemplate).toHaveBeenCalledWith("p1", "t1");
    expect(result).toEqual(entity);
  });

  it("getTemplateBySchemaAndName returns template by schema and name", async () => {
    const template = { id: "t1", name: "goblin", schemaId: "s1" };
    mockStore.findTemplateBySchemaAndName.mockResolvedValue(template);

    const mgr = createManager();
    const result = await mgr.getTemplateBySchemaAndName("s1", "goblin");

    expect(mockStore.findTemplateBySchemaAndName).toHaveBeenCalledWith("s1", "goblin");
    expect(result).toEqual(template);
  });

  it("createManyEntities creates multiple entities", async () => {
    mockStore.createEntity.mockResolvedValueOnce({ id: "e1" });
    mockStore.createEntity.mockResolvedValueOnce({ id: "e2" });

    const mgr = createManager();
    const result = await mgr.createManyEntities([
      { templateId: "t1", ownerId: "p1", state: { hp: 10 } },
      { templateId: "t2", ownerId: "p1", state: { hp: 20 } },
    ]);

    expect(result).toHaveLength(2);
    expect(mockStore.createEntity).toHaveBeenCalledTimes(2);
  });

  it("deleteManyEntities deletes by ids", async () => {
    mockStore.deleteManyEntities.mockResolvedValue({ count: 3 });

    const mgr = createManager();
    await mgr.deleteManyEntities(["e1", "e2", "e3"]);

    expect(mockStore.deleteManyEntities).toHaveBeenCalledWith(["e1", "e2", "e3"]);
  });

  it("queryEntitiesByState filters entities by state fields", async () => {
    const entities = [
      { id: "e1", state: JSON.stringify({ status: "idle", level: 5 }) },
      { id: "e2", state: JSON.stringify({ status: "working", level: 3 }) },
      { id: "e3", state: JSON.stringify({ status: "idle", level: 2 }) },
    ];
    mockStore.findEntitiesByOwner.mockResolvedValue(entities);

    const mgr = createManager();
    const result = await mgr.queryEntitiesByState("p1", "character", { status: "idle" });

    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe("e1");
    expect(result[1]!.id).toBe("e3");
  });

  it("queryEntitiesByState returns empty when no match", async () => {
    const entities = [
      { id: "e1", state: JSON.stringify({ status: "working" }) },
    ];
    mockStore.findEntitiesByOwner.mockResolvedValue(entities);

    const mgr = createManager();
    const result = await mgr.queryEntitiesByState("p1", "character", { status: "idle" });

    expect(result).toHaveLength(0);
  });
});
