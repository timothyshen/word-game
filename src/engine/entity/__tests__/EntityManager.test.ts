import { describe, it, expect, vi, beforeEach } from "vitest";
import { EntityManager } from "../EntityManager";
import type { PrismaClient } from "@prisma/client";

const mockDb = {
  entitySchema: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  entityTemplate: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  entity: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
};

function createManager(): EntityManager {
  return new EntityManager(mockDb as unknown as PrismaClient);
}

describe("EntityManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Schema operations ──

  it("createSchema stores components as JSON", async () => {
    const components = ["stats", "inventory"];
    const defaults = { stats: { hp: 100 } };
    mockDb.entitySchema.create.mockResolvedValue({ id: "s1" });

    const mgr = createManager();
    await mgr.createSchema("game1", "character", components, defaults);

    expect(mockDb.entitySchema.create).toHaveBeenCalledWith({
      data: {
        gameId: "game1",
        name: "character",
        components: JSON.stringify(components),
        defaults: JSON.stringify(defaults),
      },
    });
  });

  it("createSchema uses empty object for defaults when not provided", async () => {
    mockDb.entitySchema.create.mockResolvedValue({ id: "s1" });

    const mgr = createManager();
    await mgr.createSchema("game1", "item", ["inventory"]);

    expect(mockDb.entitySchema.create).toHaveBeenCalledWith({
      data: {
        gameId: "game1",
        name: "item",
        components: JSON.stringify(["inventory"]),
        defaults: "{}",
      },
    });
  });

  it("getSchema by gameId + name", async () => {
    const schema = { id: "s1", gameId: "game1", name: "character" };
    mockDb.entitySchema.findUnique.mockResolvedValue(schema);

    const mgr = createManager();
    const result = await mgr.getSchema("game1", "character");

    expect(mockDb.entitySchema.findUnique).toHaveBeenCalledWith({
      where: { gameId_name: { gameId: "game1", name: "character" } },
    });
    expect(result).toEqual(schema);
  });

  // ── Template operations ──

  it("createTemplate stores data as JSON", async () => {
    const data = { stats: { hp: 50, maxHp: 50, mp: 10, maxMp: 10, atk: 5, def: 3, spd: 2 } };
    mockDb.entityTemplate.create.mockResolvedValue({ id: "t1" });

    const mgr = createManager();
    await mgr.createTemplate("s1", "goblin", data, {
      icon: "goblin.png",
      rarity: "common",
      description: "A small goblin",
    });

    expect(mockDb.entityTemplate.create).toHaveBeenCalledWith({
      data: {
        schemaId: "s1",
        name: "goblin",
        data: JSON.stringify(data),
        icon: "goblin.png",
        rarity: "common",
        description: "A small goblin",
      },
    });
  });

  it("createTemplate uses defaults for missing opts", async () => {
    mockDb.entityTemplate.create.mockResolvedValue({ id: "t1" });

    const mgr = createManager();
    await mgr.createTemplate("s1", "goblin", { hp: 10 });

    expect(mockDb.entityTemplate.create).toHaveBeenCalledWith({
      data: {
        schemaId: "s1",
        name: "goblin",
        data: JSON.stringify({ hp: 10 }),
        icon: "",
        rarity: null,
        description: "",
      },
    });
  });

  // ── Entity operations ──

  it("createEntity with initial state", async () => {
    const initialState = { stats: { hp: 100 } };
    mockDb.entity.create.mockResolvedValue({ id: "e1" });

    const mgr = createManager();
    await mgr.createEntity("t1", "player1", initialState);

    expect(mockDb.entityTemplate.findUnique).not.toHaveBeenCalled();
    expect(mockDb.entity.create).toHaveBeenCalledWith({
      data: {
        templateId: "t1",
        ownerId: "player1",
        state: JSON.stringify(initialState),
      },
    });
  });

  it("createEntity without initial state uses template defaults", async () => {
    const templateData = { stats: { hp: 50 } };
    const schemaDefaults = { stats: { hp: 10 }, inventory: { items: [], capacity: 5 } };
    mockDb.entityTemplate.findUnique.mockResolvedValue({
      id: "t1",
      data: JSON.stringify(templateData),
      schema: { defaults: JSON.stringify(schemaDefaults) },
    });
    mockDb.entity.create.mockResolvedValue({ id: "e1" });

    const mgr = createManager();
    await mgr.createEntity("t1", "player1");

    expect(mockDb.entityTemplate.findUnique).toHaveBeenCalledWith({
      where: { id: "t1" },
      include: { schema: true },
    });
    // Template data overrides schema defaults
    const expectedState = { ...schemaDefaults, ...templateData };
    expect(mockDb.entity.create).toHaveBeenCalledWith({
      data: {
        templateId: "t1",
        ownerId: "player1",
        state: JSON.stringify(expectedState),
      },
    });
  });

  it("getEntity returns entity with template and schema", async () => {
    const entity = {
      id: "e1",
      template: { id: "t1", schema: { id: "s1", name: "character" } },
    };
    mockDb.entity.findUnique.mockResolvedValue(entity);

    const mgr = createManager();
    const result = await mgr.getEntity("e1");

    expect(mockDb.entity.findUnique).toHaveBeenCalledWith({
      where: { id: "e1" },
      include: { template: { include: { schema: true } } },
    });
    expect(result).toEqual(entity);
  });

  it("getEntitiesByOwner returns matching entities", async () => {
    const entities = [{ id: "e1" }, { id: "e2" }];
    mockDb.entity.findMany.mockResolvedValue(entities);

    const mgr = createManager();
    const result = await mgr.getEntitiesByOwner("player1");

    expect(mockDb.entity.findMany).toHaveBeenCalledWith({
      where: { ownerId: "player1" },
      include: { template: { include: { schema: true } } },
    });
    expect(result).toEqual(entities);
  });

  it("getEntitiesByOwner filters by schemaName", async () => {
    mockDb.entity.findMany.mockResolvedValue([]);

    const mgr = createManager();
    await mgr.getEntitiesByOwner("player1", "character");

    expect(mockDb.entity.findMany).toHaveBeenCalledWith({
      where: {
        ownerId: "player1",
        template: { schema: { name: "character" } },
      },
      include: { template: { include: { schema: true } } },
    });
  });

  it("updateEntityState merges partial state", async () => {
    const currentState = { stats: { hp: 100 }, inventory: { items: [] } };
    mockDb.entity.findUnique.mockResolvedValue({
      id: "e1",
      state: JSON.stringify(currentState),
    });
    mockDb.entity.update.mockResolvedValue({ id: "e1" });

    const mgr = createManager();
    await mgr.updateEntityState("e1", { stats: { hp: 50 } });

    const expectedState = { ...currentState, stats: { hp: 50 } };
    expect(mockDb.entity.update).toHaveBeenCalledWith({
      where: { id: "e1" },
      data: { state: JSON.stringify(expectedState) },
    });
  });

  it("updateEntityState throws for missing entity", async () => {
    mockDb.entity.findUnique.mockResolvedValue(null);

    const mgr = createManager();
    await expect(
      mgr.updateEntityState("missing", { hp: 1 }),
    ).rejects.toThrow("Entity not found: missing");
  });

  it("deleteEntity calls delete", async () => {
    mockDb.entity.delete.mockResolvedValue({ id: "e1" });

    const mgr = createManager();
    await mgr.deleteEntity("e1");

    expect(mockDb.entity.delete).toHaveBeenCalledWith({
      where: { id: "e1" },
    });
  });

  // ── Component helpers ──

  it("getEntityComponent extracts component from state", async () => {
    const state = {
      stats: { hp: 100, maxHp: 100, mp: 50, maxMp: 50, atk: 10, def: 5, spd: 3 },
    };
    mockDb.entity.findUnique.mockResolvedValue({
      id: "e1",
      state: JSON.stringify(state),
    });

    const mgr = createManager();
    const stats = await mgr.getEntityComponent("e1", "stats");

    expect(stats).toEqual(state.stats);
  });

  it("getEntityComponent returns undefined for missing entity", async () => {
    mockDb.entity.findUnique.mockResolvedValue(null);

    const mgr = createManager();
    const result = await mgr.getEntityComponent("missing", "stats");

    expect(result).toBeUndefined();
  });

  it("setEntityComponent updates component in state", async () => {
    const currentState = {
      stats: { hp: 100, maxHp: 100, mp: 50, maxMp: 50, atk: 10, def: 5, spd: 3 },
    };
    mockDb.entity.findUnique.mockResolvedValue({
      id: "e1",
      state: JSON.stringify(currentState),
    });
    mockDb.entity.update.mockResolvedValue({ id: "e1" });

    const newStats = { hp: 80, maxHp: 100, mp: 50, maxMp: 50, atk: 10, def: 5, spd: 3 };
    const mgr = createManager();
    await mgr.setEntityComponent("e1", "stats", newStats);

    expect(mockDb.entity.update).toHaveBeenCalledWith({
      where: { id: "e1" },
      data: {
        state: JSON.stringify({ stats: newStats }),
      },
    });
  });

  it("setEntityComponent throws for missing entity", async () => {
    mockDb.entity.findUnique.mockResolvedValue(null);

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
    mockDb.entity.findMany.mockResolvedValue(entities);

    const mgr = createManager();
    const result = await mgr.getEntitiesByTemplate("t1");

    expect(mockDb.entity.findMany).toHaveBeenCalledWith({
      where: { templateId: "t1" },
      include: { template: { include: { schema: true } } },
    });
    expect(result).toEqual(entities);
  });

  it("findEntityByOwnerAndTemplate returns first match", async () => {
    const entity = { id: "e1", ownerId: "p1", templateId: "t1" };
    mockDb.entity.findFirst.mockResolvedValue(entity);

    const mgr = createManager();
    const result = await mgr.findEntityByOwnerAndTemplate("p1", "t1");

    expect(mockDb.entity.findFirst).toHaveBeenCalledWith({
      where: { ownerId: "p1", templateId: "t1" },
      include: { template: { include: { schema: true } } },
    });
    expect(result).toEqual(entity);
  });

  it("getTemplateBySchemaAndName returns template by schema and name", async () => {
    const template = { id: "t1", name: "goblin", schemaId: "s1" };
    mockDb.entityTemplate.findFirst.mockResolvedValue(template);

    const mgr = createManager();
    const result = await mgr.getTemplateBySchemaAndName("s1", "goblin");

    expect(mockDb.entityTemplate.findFirst).toHaveBeenCalledWith({
      where: { schemaId: "s1", name: "goblin" },
      include: { schema: true },
    });
    expect(result).toEqual(template);
  });

  it("createManyEntities creates multiple entities", async () => {
    mockDb.entity.create.mockResolvedValueOnce({ id: "e1" });
    mockDb.entity.create.mockResolvedValueOnce({ id: "e2" });

    const mgr = createManager();
    const result = await mgr.createManyEntities([
      { templateId: "t1", ownerId: "p1", state: { hp: 10 } },
      { templateId: "t2", ownerId: "p1", state: { hp: 20 } },
    ]);

    expect(result).toHaveLength(2);
    expect(mockDb.entity.create).toHaveBeenCalledTimes(2);
  });

  it("deleteManyEntities deletes by ids", async () => {
    mockDb.entity.deleteMany.mockResolvedValue({ count: 3 });

    const mgr = createManager();
    await mgr.deleteManyEntities(["e1", "e2", "e3"]);

    expect(mockDb.entity.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["e1", "e2", "e3"] } },
    });
  });

  it("queryEntitiesByState filters entities by state fields", async () => {
    const entities = [
      { id: "e1", state: JSON.stringify({ status: "idle", level: 5 }) },
      { id: "e2", state: JSON.stringify({ status: "working", level: 3 }) },
      { id: "e3", state: JSON.stringify({ status: "idle", level: 2 }) },
    ];
    mockDb.entity.findMany.mockResolvedValue(entities);

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
    mockDb.entity.findMany.mockResolvedValue(entities);

    const mgr = createManager();
    const result = await mgr.queryEntitiesByState("p1", "character", { status: "idle" });

    expect(result).toHaveLength(0);
  });
});
