import type { GameEngine, GamePlugin } from "../types";
import type { TypedGameEvent } from "../events";

export class CoreModule implements GamePlugin {
  name = "core";
  manifest = {
    name: "core",
    version: "1.0.0",
    description: "Core player and achievement events",
    provides: ["player:statusChanged"],
    requires: ["player:expGain", "achievement:claimed"],
  };
  private engine: GameEngine | null = null;

  async init(engine: GameEngine): Promise<void> {
    this.engine = engine;
    engine.events.on("player:expGain", this.handleExpGain, 10);
    engine.events.on("achievement:claimed", this.handleAchievementClaimed);
  }

  async destroy(): Promise<void> {
    if (this.engine) {
      this.engine.events.off("player:expGain", this.handleExpGain);
      this.engine.events.off(
        "achievement:claimed",
        this.handleAchievementClaimed,
      );
      this.engine = null;
    }
  }

  private handleExpGain = async (
    event: TypedGameEvent<"player:expGain">,
  ): Promise<void> => {
    // For now, just emit a status changed event.
    // Actual level-up logic still runs through the router -> service path.
    // This module enables cross-module communication when exp is gained.
    const { userId } = event.payload;
    await this.engine?.events.emit("player:statusChanged", { userId }, "core");
  };

  private handleAchievementClaimed = async (
    event: TypedGameEvent<"achievement:claimed">,
  ): Promise<void> => {
    const { userId } = event.payload;
    await this.engine?.events.emit(
      "player:statusChanged",
      { userId, trigger: "achievement" },
      "core",
    );
  };
}
