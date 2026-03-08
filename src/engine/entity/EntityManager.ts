import { getComponent, setComponent, serializeState } from "./components";
import type { ComponentName, ComponentMap } from "./components";
import type { IEntityStore } from "./IEntityStore";

export class EntityManager {
  constructor(private store: IEntityStore) {}

  // ── Schema operations ──

  async createSchema(
    gameId: string,
    name: string,
    components: string[],
    defaults?: Record<string, unknown>,
  ) {
    return this.store.createSchema({
      gameId,
      name,
      components: JSON.stringify(components),
      defaults: defaults ? JSON.stringify(defaults) : "{}",
    });
  }

  async getSchema(gameId: string, name: string) {
    return this.store.findSchemaByGameAndName(gameId, name);
  }

  async getSchemasByGame(gameId: string) {
    return this.store.findSchemasByGame(gameId);
  }

  // ── Template operations ──

  async createTemplate(
    schemaId: string,
    name: string,
    data: Record<string, unknown>,
    opts?: { icon?: string; rarity?: string; description?: string },
  ) {
    return this.store.createTemplate({
      schemaId,
      name,
      data: JSON.stringify(data),
      icon: opts?.icon ?? "",
      rarity: opts?.rarity ?? null,
      description: opts?.description ?? "",
    });
  }

  async getTemplate(id: string) {
    return this.store.findTemplateById(id);
  }

  async getTemplatesBySchema(schemaId: string) {
    return this.store.findTemplatesBySchema(schemaId);
  }

  // ── Entity operations ──

  async createEntity(
    templateId: string,
    ownerId: string,
    initialState?: Record<string, unknown>,
  ) {
    let state = initialState;
    if (!state) {
      const template = await this.store.findTemplateById(templateId);
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

    return this.store.createEntity({
      templateId,
      ownerId,
      state: state ? JSON.stringify(state) : "{}",
    });
  }

  async getEntity(id: string) {
    return this.store.findEntityById(id);
  }

  async getEntitiesByOwner(ownerId: string, schemaName?: string) {
    return this.store.findEntitiesByOwner(ownerId, schemaName);
  }

  async updateEntityState(
    id: string,
    partialState: Record<string, unknown>,
  ) {
    const entity = await this.store.findEntityById(id);
    if (!entity) throw new Error(`Entity not found: ${id}`);

    const currentState = JSON.parse(entity.state) as Record<string, unknown>;
    const newState = { ...currentState, ...partialState };

    return this.store.updateEntityState(id, JSON.stringify(newState));
  }

  async deleteEntity(id: string) {
    return this.store.deleteEntity(id);
  }

  // ── Extended query operations ──

  async getEntitiesByTemplate(templateId: string) {
    return this.store.findEntitiesByTemplate(templateId);
  }

  async findEntityByOwnerAndTemplate(ownerId: string, templateId: string) {
    return this.store.findEntityByOwnerAndTemplate(ownerId, templateId);
  }

  async getTemplateBySchemaAndName(schemaId: string, name: string) {
    return this.store.findTemplateBySchemaAndName(schemaId, name);
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
    return this.store.deleteManyEntities(ids);
  }

  async queryEntitiesByState(
    ownerId: string,
    schemaName: string,
    stateFilter: Record<string, unknown>,
  ) {
    const entities = await this.getEntitiesByOwner(ownerId, schemaName);
    return entities.filter((entity) => {
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
    const entity = await this.store.findEntityById(entityId);
    if (!entity) return undefined;
    return getComponent(entity.state, componentName);
  }

  async setEntityComponent<K extends ComponentName>(
    entityId: string,
    componentName: K,
    value: ComponentMap[K],
  ) {
    const entity = await this.store.findEntityById(entityId);
    if (!entity) throw new Error(`Entity not found: ${entityId}`);

    const newState = setComponent(entity.state, componentName, value);
    return this.store.updateEntityState(entityId, serializeState(newState));
  }
}
