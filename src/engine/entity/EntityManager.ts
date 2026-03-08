import type { PrismaClient } from "@prisma/client";
import { getComponent, setComponent, serializeState } from "./components";
import type { ComponentName, ComponentMap } from "./components";

export class EntityManager {
  constructor(private db: PrismaClient) {}

  // ── Schema operations ──

  async createSchema(
    gameId: string,
    name: string,
    components: string[],
    defaults?: Record<string, unknown>,
  ) {
    return this.db.entitySchema.create({
      data: {
        gameId,
        name,
        components: JSON.stringify(components),
        defaults: defaults ? JSON.stringify(defaults) : "{}",
      },
    });
  }

  async getSchema(gameId: string, name: string) {
    return this.db.entitySchema.findUnique({
      where: { gameId_name: { gameId, name } },
    });
  }

  async getSchemasByGame(gameId: string) {
    return this.db.entitySchema.findMany({ where: { gameId } });
  }

  // ── Template operations ──

  async createTemplate(
    schemaId: string,
    name: string,
    data: Record<string, unknown>,
    opts?: { icon?: string; rarity?: string; description?: string },
  ) {
    return this.db.entityTemplate.create({
      data: {
        schemaId,
        name,
        data: JSON.stringify(data),
        icon: opts?.icon ?? "",
        rarity: opts?.rarity ?? null,
        description: opts?.description ?? "",
      },
    });
  }

  async getTemplate(id: string) {
    return this.db.entityTemplate.findUnique({
      where: { id },
      include: { schema: true },
    });
  }

  async getTemplatesBySchema(schemaId: string) {
    return this.db.entityTemplate.findMany({ where: { schemaId } });
  }

  // ── Entity operations ──

  async createEntity(
    templateId: string,
    ownerId: string,
    initialState?: Record<string, unknown>,
  ) {
    let state = initialState;
    if (!state) {
      const template = await this.db.entityTemplate.findUnique({
        where: { id: templateId },
        include: { schema: true },
      });
      if (template) {
        const templateData = JSON.parse(template.data) as Record<
          string,
          unknown
        >;
        const schemaDefaults = JSON.parse(template.schema.defaults) as Record<
          string,
          unknown
        >;
        state = { ...schemaDefaults, ...templateData };
      }
    }

    return this.db.entity.create({
      data: {
        templateId,
        ownerId,
        state: state ? JSON.stringify(state) : "{}",
      },
    });
  }

  async getEntity(id: string) {
    return this.db.entity.findUnique({
      where: { id },
      include: { template: { include: { schema: true } } },
    });
  }

  async getEntitiesByOwner(ownerId: string, schemaName?: string) {
    const where: Record<string, unknown> = { ownerId };
    if (schemaName) {
      where.template = { schema: { name: schemaName } };
    }
    return this.db.entity.findMany({
      where,
      include: { template: { include: { schema: true } } },
    });
  }

  async updateEntityState(
    id: string,
    partialState: Record<string, unknown>,
  ) {
    const entity = await this.db.entity.findUnique({ where: { id } });
    if (!entity) throw new Error(`Entity not found: ${id}`);

    const currentState = JSON.parse(entity.state) as Record<string, unknown>;
    const newState = { ...currentState, ...partialState };

    return this.db.entity.update({
      where: { id },
      data: { state: JSON.stringify(newState) },
    });
  }

  async deleteEntity(id: string) {
    return this.db.entity.delete({ where: { id } });
  }

  // ── Extended query operations ──

  async getEntitiesByTemplate(templateId: string) {
    return this.db.entity.findMany({
      where: { templateId },
      include: { template: { include: { schema: true } } },
    });
  }

  async findEntityByOwnerAndTemplate(ownerId: string, templateId: string) {
    return this.db.entity.findFirst({
      where: { ownerId, templateId },
      include: { template: { include: { schema: true } } },
    });
  }

  async getTemplateBySchemaAndName(schemaId: string, name: string) {
    return this.db.entityTemplate.findFirst({
      where: { schemaId, name },
      include: { schema: true },
    });
  }

  async createManyEntities(
    entries: Array<{ templateId: string; ownerId: string; state?: Record<string, unknown> }>,
  ) {
    const results = [];
    for (const entry of entries) {
      results.push(await this.createEntity(entry.templateId, entry.ownerId, entry.state));
    }
    return results;
  }

  async deleteManyEntities(ids: string[]) {
    return this.db.entity.deleteMany({ where: { id: { in: ids } } });
  }

  async queryEntitiesByState(
    ownerId: string,
    schemaName: string,
    stateFilter: Record<string, unknown>,
  ) {
    const entities = await this.getEntitiesByOwner(ownerId, schemaName);
    return entities.filter((entity: { state: string }) => {
      const state = JSON.parse(entity.state) as Record<string, unknown>;
      return Object.entries(stateFilter).every(
        ([key, value]) => state[key] === value,
      );
    });
  }

  // ── Component helpers ──

  async getEntityComponent<K extends ComponentName>(
    entityId: string,
    componentName: K,
  ): Promise<ComponentMap[K] | undefined> {
    const entity = await this.db.entity.findUnique({
      where: { id: entityId },
    });
    if (!entity) return undefined;
    return getComponent(entity.state, componentName);
  }

  async setEntityComponent<K extends ComponentName>(
    entityId: string,
    componentName: K,
    value: ComponentMap[K],
  ) {
    const entity = await this.db.entity.findUnique({
      where: { id: entityId },
    });
    if (!entity) throw new Error(`Entity not found: ${entityId}`);

    const newState = setComponent(entity.state, componentName, value);
    return this.db.entity.update({
      where: { id: entityId },
      data: { state: serializeState(newState) },
    });
  }
}
