import type { GameEngine, GameModule, GameEvent } from "../types";

export class CoreModule implements GameModule {
  name = "core";
  private engine: GameEngine | null = null;

  async init(engine: GameEngine): Promise<void> {
    this.engine = engine;
    engine.events.on("player:expGain", this.handleExpGain, 10);
  }

  async destroy(): Promise<void> {
    if (this.engine) {
      this.engine.events.off("player:expGain", this.handleExpGain);
      this.engine = null;
    }
  }

  private handleExpGain = async (event: GameEvent): Promise<void> => {
    // For now, just emit a status changed event.
    // Actual level-up logic still runs through the router -> service path.
    // This module enables cross-module communication when exp is gained.
    const { userId } = event.payload as { userId: string; amount: number };
    await this.engine?.events.emit("player:statusChanged", { userId }, "core");
  };
}
