import type { GameEngine, GamePlugin } from "../../types";
import type { GameEventMap } from "../events";

export class EconomyModule implements GamePlugin {
  name = "economy";
  dependencies = ["core"];
  manifest = {
    name: "economy",
    version: "1.0.0",
    description: "Economy and resource management",
    provides: ["economy:output", "building:upgraded"],
    requires: ["settlement:daily", "building:upgrade"],
  };
  private engine: GameEngine | null = null;

  async init(engine: GameEngine): Promise<void> {
    this.engine = engine;
    engine.events.on("settlement:daily", this.handleDailySettlement);
    engine.events.on("building:upgrade", this.handleBuildingUpgrade);
  }

  async destroy(): Promise<void> {
    if (this.engine) {
      this.engine.events.off("settlement:daily", this.handleDailySettlement);
      this.engine.events.off("building:upgrade", this.handleBuildingUpgrade);
      this.engine = null;
    }
  }

  private handleDailySettlement = async (event: unknown): Promise<void> => {
    const { userId, output } = (event as { payload: GameEventMap["settlement:daily"] }).payload;
    if (output) {
      await this.engine?.events.emit(
        "economy:output",
        { userId, output },
        "economy",
      );
    }
  };

  private handleBuildingUpgrade = async (event: unknown): Promise<void> => {
    const { userId, buildingId, newLevel } = (event as { payload: GameEventMap["building:upgrade"] }).payload;
    await this.engine?.events.emit(
      "building:upgraded",
      { userId, buildingId, newLevel },
      "economy",
    );
  };
}
