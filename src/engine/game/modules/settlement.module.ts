import type { GameEngine, GamePlugin } from "../../types";
import type { GameEventMap } from "../events";

export class SettlementModule implements GamePlugin {
  name = "settlement";
  dependencies = ["core", "economy"];
  manifest = {
    name: "settlement",
    version: "1.0.0",
    description: "Daily settlement and reset system",
    provides: ["settlement:daily"],
    requires: ["system:dailyReset"],
  };
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

  private handleDailyReset = async (event: unknown): Promise<void> => {
    const { userId } = (event as { payload: GameEventMap["system:dailyReset"] }).payload;
    await this.engine?.events.emit(
      "settlement:daily",
      { userId },
      "settlement",
    );
  };
}
