import type { GameEngine, GamePlugin } from "../types";
import type { TypedGameEvent } from "../events";

export interface ExplorationConfig {
  maxEncountersPerDay?: number;
  encounterChance?: number;
}

export class ExplorationModule implements GamePlugin<ExplorationConfig> {
  name = "exploration";
  dependencies = ["core"];
  manifest = {
    name: "exploration",
    version: "1.0.0",
    description: "Exploration and encounter system",
    provides: ["exploration:complete", "exploration:encounter"],
    requires: ["exploration:start"],
  };
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

  private handleStart = async (
    event: TypedGameEvent<"exploration:start">,
  ): Promise<void> => {
    const { userId, result, encounter } = event.payload;
    await this.engine?.events.emit(
      "exploration:complete",
      { userId, result },
      "exploration",
    );
    if (encounter) {
      await this.engine?.events.emit(
        "exploration:encounter",
        { userId, ...encounter },
        "exploration",
      );
    }
  };
}
