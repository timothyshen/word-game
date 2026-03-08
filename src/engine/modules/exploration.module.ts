import type { GameEngine, GameModule, GameEvent } from "../types";

export interface ExplorationConfig {
  maxEncountersPerDay?: number;
  encounterChance?: number;
}

export class ExplorationModule implements GameModule<ExplorationConfig> {
  name = "exploration";
  dependencies = ["core"];
  defaultConfig: ExplorationConfig = {
    maxEncountersPerDay: 10,
    encounterChance: 0.3,
  };
  private engine: GameEngine | null = null;
  private config: ExplorationConfig = this.defaultConfig;

  async init(engine: GameEngine, config?: ExplorationConfig): Promise<void> {
    this.engine = engine;
    if (config) this.config = config;
    engine.events.on("exploration:start", this.handleStart);
  }

  async destroy(): Promise<void> {
    if (this.engine) {
      this.engine.events.off("exploration:start", this.handleStart);
      this.engine = null;
    }
  }

  private handleStart = async (event: GameEvent): Promise<void> => {
    const payload = event.payload as {
      userId: string;
      result?: unknown;
      encounter?: { monsterType: string; monsterLevel: number };
    };
    await this.engine?.events.emit(
      "exploration:complete",
      { userId: payload.userId, result: payload.result },
      "exploration",
    );
    if (payload.encounter) {
      await this.engine?.events.emit(
        "exploration:encounter",
        { userId: payload.userId, ...payload.encounter },
        "exploration",
      );
    }
  };
}
