// Shared types for outer city components

// Re-export the canonical ExplorationEvent from server
export type { ExplorationEvent, EventType } from "~/server/api/routers/world/events";

// Combat state used by both OuterCityFullMap and OuterCityMiniMap
export interface CombatState {
  active: boolean;
  poiId: string;
  heroHp: number;
  heroMaxHp: number;
  enemyHp: number;
  enemyMaxHp: number;
  enemyName: string;
  enemyIcon: string;
  turn: number;
  logs: string[];
}
