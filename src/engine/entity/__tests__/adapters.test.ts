import { describe, it, expect } from "vitest";
import {
  characterToEntity,
  buildingToEntity,
  cardToEntity,
} from "../adapters";
import type { StatsComponent, ProductionComponent } from "../components";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockPlayerCharacter = {
  id: "pc-1",
  playerId: "player-1",
  level: 10,
  exp: 500,
  attack: 25,
  defense: 15,
  speed: 12,
  hp: 80,
  maxHp: 100,
  status: "idle",
  character: { name: "Warrior" },
};

const mockPlayerBuilding = {
  id: "pb-1",
  playerId: "player-1",
  level: 3,
  status: "active",
  assignedCharId: "pc-1",
  building: {
    name: "Gold Mine",
    baseEffects: JSON.stringify({ production: { gold: 10, ore: 2 } }),
  },
};

const mockPlayerCard = {
  id: "card-1",
  playerId: "player-1",
  quantity: 3,
  card: {
    name: "Fireball",
    type: "skill",
    rarity: "rare",
    icon: "fireball.png",
    description: "Deals fire damage",
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("characterToEntity", () => {
  it("maps all fields correctly", () => {
    const entity = characterToEntity(mockPlayerCharacter);

    expect(entity.id).toBe("pc-1");
    expect(entity.templateName).toBe("Warrior");
    expect(entity.ownerId).toBe("player-1");
    expect(entity.schemaName).toBe("character");
    expect(entity.state.level).toBe(10);
    expect(entity.state.exp).toBe(500);
    expect(entity.state.status).toBe("idle");
  });

  it("stats component has correct shape", () => {
    const entity = characterToEntity(mockPlayerCharacter);
    const stats = entity.state.stats as StatsComponent;

    expect(stats).toEqual({
      hp: 80,
      maxHp: 100,
      mp: 0,
      maxMp: 0,
      atk: 25,
      def: 15,
      spd: 12,
      luck: 0,
    });
  });
});

describe("buildingToEntity", () => {
  it("maps production from baseEffects", () => {
    const entity = buildingToEntity(mockPlayerBuilding);
    const production = entity.state.production as ProductionComponent;

    expect(production.output).toEqual({ gold: 10, ore: 2 });
    expect(production.interval).toBe(86400);
    expect(entity.state.level).toBe(3);
    expect(entity.state.status).toBe("active");
    expect(entity.state.assignedCharId).toBe("pc-1");
  });

  it("handles empty baseEffects", () => {
    const pb = {
      ...mockPlayerBuilding,
      building: { name: "Empty", baseEffects: "{}" },
    };
    const entity = buildingToEntity(pb);
    const production = entity.state.production as ProductionComponent;

    expect(production.output).toEqual({});
  });

  it("handles invalid baseEffects JSON", () => {
    const pb = {
      ...mockPlayerBuilding,
      building: { name: "Broken", baseEffects: "not-json" },
    };
    const entity = buildingToEntity(pb);
    const production = entity.state.production as ProductionComponent;

    expect(production.output).toEqual({});
  });

  it("handles baseEffects without production key", () => {
    const pb = {
      ...mockPlayerBuilding,
      building: {
        name: "NoProduction",
        baseEffects: JSON.stringify({ buff: "shield" }),
      },
    };
    const entity = buildingToEntity(pb);
    const production = entity.state.production as ProductionComponent;

    expect(production.output).toEqual({});
  });
});

describe("cardToEntity", () => {
  it("maps card metadata", () => {
    const entity = cardToEntity(mockPlayerCard);

    expect(entity.id).toBe("card-1");
    expect(entity.templateName).toBe("Fireball");
    expect(entity.state.quantity).toBe(3);
    expect(entity.state.type).toBe("skill");
    expect(entity.state.rarity).toBe("rare");
    expect(entity.state.icon).toBe("fireball.png");
    expect(entity.state.description).toBe("Deals fire damage");
  });
});

describe("all adapters", () => {
  it("set correct schemaName", () => {
    expect(characterToEntity(mockPlayerCharacter).schemaName).toBe("character");
    expect(buildingToEntity(mockPlayerBuilding).schemaName).toBe("building");
    expect(cardToEntity(mockPlayerCard).schemaName).toBe("card");
  });

  it("set correct ownerId", () => {
    expect(characterToEntity(mockPlayerCharacter).ownerId).toBe("player-1");
    expect(buildingToEntity(mockPlayerBuilding).ownerId).toBe("player-1");
    expect(cardToEntity(mockPlayerCard).ownerId).toBe("player-1");
  });
});
