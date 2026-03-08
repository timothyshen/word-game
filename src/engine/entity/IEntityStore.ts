// ---------------------------------------------------------------------------
// IEntityStore — abstract data-access interface for the ECS entity system
// ---------------------------------------------------------------------------

// ---- Row types (plain objects, no Prisma dependency) ----------------------

export interface EntitySchemaRow {
  id: string;
  gameId: string;
  name: string;
  components: string;
  defaults: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EntityTemplateRow {
  id: string;
  schemaId: string;
  name: string;
  data: string;
  icon: string;
  rarity: string | null;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EntityRow {
  id: string;
  templateId: string;
  ownerId: string;
  state: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Template with its parent schema included. */
export interface TemplateWithSchema extends EntityTemplateRow {
  schema: EntitySchemaRow;
}

/** Entity with its template and schema included. */
export interface EntityWithRelations extends EntityRow {
  template: TemplateWithSchema;
}

// ---- Input types ----------------------------------------------------------

export interface SchemaCreateInput {
  gameId: string;
  name: string;
  components: string;
  defaults: string;
}

export interface TemplateCreateInput {
  schemaId: string;
  name: string;
  data: string;
  icon: string;
  rarity: string | null;
  description: string;
}

export interface EntityCreateInput {
  templateId: string;
  ownerId: string;
  state: string;
}

// ---- Store interface ------------------------------------------------------

/**
 * Storage backend for ECS entities, templates, and schemas.
 * Implementations may use Prisma, in-memory maps, or any other persistence.
 */
export interface IEntityStore {
  // Schema
  createSchema(data: SchemaCreateInput): Promise<EntitySchemaRow>;
  findSchemaByGameAndName(gameId: string, name: string): Promise<EntitySchemaRow | null>;
  findSchemasByGame(gameId: string): Promise<EntitySchemaRow[]>;

  // Template
  createTemplate(data: TemplateCreateInput): Promise<EntityTemplateRow>;
  findTemplateById(id: string): Promise<TemplateWithSchema | null>;
  findTemplatesBySchema(schemaId: string): Promise<EntityTemplateRow[]>;
  findTemplateBySchemaAndName(schemaId: string, name: string): Promise<TemplateWithSchema | null>;

  // Entity
  createEntity(data: EntityCreateInput): Promise<EntityRow>;
  findEntityById(id: string): Promise<EntityWithRelations | null>;
  findEntitiesByOwner(ownerId: string, schemaName?: string): Promise<EntityWithRelations[]>;
  findEntitiesByTemplate(templateId: string): Promise<EntityWithRelations[]>;
  findEntityByOwnerAndTemplate(ownerId: string, templateId: string): Promise<EntityWithRelations | null>;
  updateEntityState(id: string, state: string): Promise<EntityRow>;
  deleteEntity(id: string): Promise<EntityRow>;
  deleteManyEntities(ids: string[]): Promise<{ count: number }>;
}
