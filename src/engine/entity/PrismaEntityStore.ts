// ---------------------------------------------------------------------------
// PrismaEntityStore — Prisma-backed implementation of IEntityStore
// ---------------------------------------------------------------------------

import type { PrismaClient } from "@prisma/client";
import type {
  EntityCreateInput,
  EntityRow,
  EntitySchemaRow,
  EntityTemplateRow,
  EntityWithRelations,
  IEntityStore,
  SchemaCreateInput,
  TemplateCreateInput,
  TemplateWithSchema,
} from "./IEntityStore";

export class PrismaEntityStore implements IEntityStore {
  constructor(private readonly db: PrismaClient) {}

  // ── Schema ──────────────────────────────────────────────────────────────

  async createSchema(data: SchemaCreateInput): Promise<EntitySchemaRow> {
    return this.db.entitySchema.create({ data }) as Promise<EntitySchemaRow>;
  }

  async findSchemaByGameAndName(gameId: string, name: string): Promise<EntitySchemaRow | null> {
    return this.db.entitySchema.findUnique({
      where: { gameId_name: { gameId, name } },
    }) as Promise<EntitySchemaRow | null>;
  }

  async findSchemasByGame(gameId: string): Promise<EntitySchemaRow[]> {
    return this.db.entitySchema.findMany({ where: { gameId } }) as Promise<EntitySchemaRow[]>;
  }

  // ── Template ────────────────────────────────────────────────────────────

  async createTemplate(data: TemplateCreateInput): Promise<EntityTemplateRow> {
    return this.db.entityTemplate.create({ data }) as Promise<EntityTemplateRow>;
  }

  async findTemplateById(id: string): Promise<TemplateWithSchema | null> {
    return this.db.entityTemplate.findUnique({
      where: { id },
      include: { schema: true },
    }) as Promise<TemplateWithSchema | null>;
  }

  async findTemplatesBySchema(schemaId: string): Promise<EntityTemplateRow[]> {
    return this.db.entityTemplate.findMany({ where: { schemaId } }) as Promise<EntityTemplateRow[]>;
  }

  async findTemplateBySchemaAndName(schemaId: string, name: string): Promise<TemplateWithSchema | null> {
    return this.db.entityTemplate.findFirst({
      where: { schemaId, name },
      include: { schema: true },
    }) as Promise<TemplateWithSchema | null>;
  }

  // ── Entity ──────────────────────────────────────────────────────────────

  async createEntity(data: EntityCreateInput): Promise<EntityRow> {
    return this.db.entity.create({ data }) as Promise<EntityRow>;
  }

  async findEntityById(id: string): Promise<EntityWithRelations | null> {
    return this.db.entity.findUnique({
      where: { id },
      include: { template: { include: { schema: true } } },
    }) as Promise<EntityWithRelations | null>;
  }

  async findEntitiesByOwner(ownerId: string, schemaName?: string): Promise<EntityWithRelations[]> {
    const where: Record<string, unknown> = { ownerId };
    if (schemaName) {
      where.template = { schema: { name: schemaName } };
    }
    return this.db.entity.findMany({
      where,
      include: { template: { include: { schema: true } } },
    }) as Promise<EntityWithRelations[]>;
  }

  async findEntitiesByTemplate(templateId: string): Promise<EntityWithRelations[]> {
    return this.db.entity.findMany({
      where: { templateId },
      include: { template: { include: { schema: true } } },
    }) as Promise<EntityWithRelations[]>;
  }

  async findEntityByOwnerAndTemplate(ownerId: string, templateId: string): Promise<EntityWithRelations | null> {
    return this.db.entity.findFirst({
      where: { ownerId, templateId },
      include: { template: { include: { schema: true } } },
    }) as Promise<EntityWithRelations | null>;
  }

  async updateEntityState(id: string, state: string): Promise<EntityRow> {
    return this.db.entity.update({
      where: { id },
      data: { state },
    }) as Promise<EntityRow>;
  }

  async deleteEntity(id: string): Promise<EntityRow> {
    return this.db.entity.delete({ where: { id } }) as Promise<EntityRow>;
  }

  async deleteManyEntities(ids: string[]): Promise<{ count: number }> {
    return this.db.entity.deleteMany({ where: { id: { in: ids } } });
  }
}
