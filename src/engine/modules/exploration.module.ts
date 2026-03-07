import type { GameEngine, GameModule, GameEvent } from "../types";

export class ExplorationModule implements GameModule {
  name = "exploration";
  dependencies = ["core"];
  private engine: GameEngine | null = null;

  async init(engine: GameEngine): Promise<void> {
    this.engine = engine;
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
