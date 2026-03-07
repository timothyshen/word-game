import type { GameEngine, GameModule, GameEvent } from "../types";

export class TerritoryModule implements GameModule {
  name = "territory";
  dependencies = ["core", "economy"];
  private engine: GameEngine | null = null;

  async init(engine: GameEngine): Promise<void> {
    this.engine = engine;
    engine.events.on("building:upgraded", this.handleBuildingUpgraded);
  }

  async destroy(): Promise<void> {
    if (this.engine) {
      this.engine.events.off("building:upgraded", this.handleBuildingUpgraded);
      this.engine = null;
    }
  }

  private handleBuildingUpgraded = async (event: GameEvent): Promise<void> => {
    const { userId, buildingId } = event.payload as {
      userId: string;
      buildingId: string;
    };
    await this.engine?.events.emit(
      "territory:expanded",
      { userId, buildingId },
      "territory",
    );
  };
}
