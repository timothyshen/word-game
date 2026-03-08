// ---------------------------------------------------------------------------
// Game Engine — central event type registry
// ---------------------------------------------------------------------------

import type { GameEvent } from "./types";

/**
 * Central event type registry.
 * Add new events here to get compile-time type checking on event names
 * and payloads across all emit() and on() call sites.
 */
export interface GameEventMap {
  // Core / Player
  "player:expGain": { userId: string; amount: number };
  "player:statusChanged": { userId: string; trigger?: string };
  "player:levelUp": { userId: string; newLevel: number };
  "achievement:claimed": { userId: string; achievementId: string };

  // Combat
  "combat:start": {
    userId: string;
    combatId?: string;
    monsterLevel: number;
    monsterType?: string;
  };
  "combat:started": { userId: string; combatId?: string };
  "combat:action": {
    userId: string;
    combatId: string;
    actionId: string;
    result?: unknown;
  };
  "combat:victory": { userId: string; rewards?: unknown };
  "combat:defeat": { userId: string };

  // Exploration
  "exploration:start": {
    userId: string;
    result?: unknown;
    encounter?: { monsterType: string; monsterLevel: number };
  };
  "exploration:complete": { userId: string; result?: unknown };
  "exploration:encounter": {
    userId: string;
    monsterType: string;
    monsterLevel: number;
  };

  // Economy / Settlement / Building
  "settlement:daily": { userId: string; output?: Record<string, number> };
  "building:upgrade": {
    userId: string;
    buildingId: string;
    newLevel: number;
  };
  "building:upgraded": {
    userId: string;
    buildingId: string;
    newLevel: number;
  };
  "economy:output": { userId: string; output: Record<string, number> };

  // Progression
  "boss:challenge": { userId: string; bossId: string; victory: boolean };
  "card:used": { userId: string; cardId: string; action: string };
  "card:acquired": { userId: string; cardId: string; cardName: string };
  "character:levelUp": {
    userId: string;
    characterId: string;
    newLevel: number;
  };
  "character:expGain": {
    userId: string;
    characterId: string;
    amount: number;
  };
  "breakthrough:complete": { userId: string; target: string; newTier: number };
  "progression:check": {
    userId: string;
    trigger: string;
    characterId?: string;
    newLevel?: number;
    target?: string;
    newTier?: number;
  };

  // Content
  "content:checkUnlocks": { userId: string; newLevel?: number; newTier?: number };

  // Territory
  "territory:unlock": { userId: string };
  "territory:build": { userId: string };
  "territory:expand": { userId: string };
  "territory:expanded": { userId: string; trigger?: string; buildingId?: string };

  // System
  "system:dailyReset": { userId: string };
}

/** A typed event — carries the correct payload type based on event key */
export interface TypedGameEvent<K extends keyof GameEventMap>
  extends Omit<GameEvent, "payload"> {
  type: K;
  payload: GameEventMap[K];
}
