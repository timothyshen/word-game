// ---------------------------------------------------------------------------
// Adapters: convert existing Prisma model instances into entity-like objects
// ---------------------------------------------------------------------------

import type { StatsComponent, ProductionComponent } from "./components";

/**
 * Represents an existing model adapted to the entity interface.
 * Not a real Entity from the database — just a compatible shape.
 */
export interface AdaptedEntity {
  id: string;
  templateName: string;
  ownerId: string;
  schemaName: string;
  state: Record<string, unknown>;
}

/**
 * Adapt a PlayerCharacter (with its Character template) to entity format.
 */
export function characterToEntity(pc: {
  id: string;
  playerId: string;
  level: number;
  exp: number;
  attack: number;
  defense: number;
  speed: number;
  hp: number;
  maxHp: number;
  status: string;
  character: { name: string };
}): AdaptedEntity {
  return {
    id: pc.id,
    templateName: pc.character.name,
    ownerId: pc.playerId,
    schemaName: "character",
    state: {
      stats: {
        hp: pc.hp,
        maxHp: pc.maxHp,
        mp: 0,
        maxMp: 0,
        atk: pc.attack,
        def: pc.defense,
        spd: pc.speed,
        luck: 0,
      } satisfies StatsComponent,
      level: pc.level,
      exp: pc.exp,
      status: pc.status,
    },
  };
}

/**
 * Adapt a PlayerBuilding (with its Building template) to entity format.
 */
export function buildingToEntity(pb: {
  id: string;
  playerId: string;
  level: number;
  status: string;
  assignedCharId: string | null;
  building: { name: string; baseEffects: string };
}): AdaptedEntity {
  let output: Record<string, number> = {};
  try {
    const effects = JSON.parse(pb.building.baseEffects) as Record<
      string,
      unknown
    >;
    if (effects.production && typeof effects.production === "object") {
      output = effects.production as Record<string, number>;
    }
  } catch {
    /* ignore parse errors */
  }

  return {
    id: pb.id,
    templateName: pb.building.name,
    ownerId: pb.playerId,
    schemaName: "building",
    state: {
      production: {
        output,
        interval: 86400,
      } satisfies ProductionComponent,
      level: pb.level,
      status: pb.status,
      assignedCharId: pb.assignedCharId,
    },
  };
}

/**
 * Adapt a PlayerCard (with its Card template) to entity format.
 */
export function cardToEntity(pc: {
  id: string;
  playerId: string;
  quantity: number;
  card: {
    name: string;
    type: string;
    rarity: string;
    icon: string;
    description: string;
  };
}): AdaptedEntity {
  return {
    id: pc.id,
    templateName: pc.card.name,
    ownerId: pc.playerId,
    schemaName: "card",
    state: {
      quantity: pc.quantity,
      type: pc.card.type,
      rarity: pc.card.rarity,
      icon: pc.card.icon,
      description: pc.card.description,
    },
  };
}
