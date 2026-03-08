import type { GameEngine, GameModule, GameEvent } from "../types";

export class TerritoryModule implements GameModule {
  name = "territory";
  dependencies = ["core", "economy"];
  private engine: GameEngine | null = null;

  async init(engine: GameEngine): Promise<void> {
    this.engine = engine;
    engine.events.on("building:upgraded", this.handleBuildingUpgraded);
    engine.events.on("territory:unlock", this.handleTerritoryUnlock);
    engine.events.on("territory:build", this.handleTerritoryBuild);
    engine.events.on("territory:expand", this.handleTerritoryExpand);
  }

  async destroy(): Promise<void> {
    if (this.engine) {
      this.engine.events.off("building:upgraded", this.handleBuildingUpgraded);
      this.engine.events.off("territory:unlock", this.handleTerritoryUnlock);
      this.engine.events.off("territory:build", this.handleTerritoryBuild);
      this.engine.events.off("territory:expand", this.handleTerritoryExpand);
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

  private handleTerritoryUnlock = async (event: GameEvent): Promise<void> => {
    const { userId } = event.payload as { userId: string };
    await this.engine?.events.emit(
      "territory:expanded",
      { userId, trigger: "unlock" },
      "territory",
    );
  };

  private handleTerritoryBuild = async (event: GameEvent): Promise<void> => {
    const { userId } = event.payload as { userId: string };
    await this.engine?.events.emit(
      "territory:expanded",
      { userId, trigger: "build" },
      "territory",
    );
  };

  private handleTerritoryExpand = async (event: GameEvent): Promise<void> => {
    const { userId } = event.payload as { userId: string };
    await this.engine?.events.emit(
      "territory:expanded",
      { userId, trigger: "expand" },
      "territory",
    );
  };
}
