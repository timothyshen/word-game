import type { GameEngine, GameModule, GameEvent } from "../types";

export class SettlementModule implements GameModule {
  name = "settlement";
  dependencies = ["core", "economy"];
  private engine: GameEngine | null = null;

  async init(engine: GameEngine): Promise<void> {
    this.engine = engine;
    engine.events.on("system:dailyReset", this.handleDailyReset);
  }

  async destroy(): Promise<void> {
    if (this.engine) {
      this.engine.events.off("system:dailyReset", this.handleDailyReset);
      this.engine = null;
    }
  }

  private handleDailyReset = async (event: GameEvent): Promise<void> => {
    const { userId } = event.payload as { userId: string };
    await this.engine?.events.emit(
      "settlement:daily",
      { userId },
      "settlement",
    );
  };
}
