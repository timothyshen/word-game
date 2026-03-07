import type { GameEngine, GameModule, GameEvent } from "../types";

export class EconomyModule implements GameModule {
  name = "economy";
  dependencies = ["core"];
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

  private handleDailySettlement = async (event: GameEvent): Promise<void> => {
    const { userId, output } = event.payload as {
      userId: string;
      output?: Record<string, number>;
    };
    if (output) {
      await this.engine?.events.emit(
        "economy:output",
        { userId, output },
        "economy",
      );
    }
  };

  private handleBuildingUpgrade = async (event: GameEvent): Promise<void> => {
    const payload = event.payload as {
      userId: string;
      buildingId: string;
      newLevel: number;
    };
    await this.engine?.events.emit("building:upgraded", payload, "economy");
  };
}
