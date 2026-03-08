import type { GameEngine, GamePlugin } from "../types";
import type { TypedGameEvent } from "../events";

export class TerritoryModule implements GamePlugin {
  name = "territory";
  dependencies = ["core", "economy"];
  manifest = {
    name: "territory",
    version: "1.0.0",
    description: "Territory management and expansion",
    provides: ["territory:expanded"],
    requires: [
      "building:upgraded",
      "territory:unlock",
      "territory:build",
      "territory:expand",
    ],
  };
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

  private handleBuildingUpgraded = async (
    event: TypedGameEvent<"building:upgraded">,
  ): Promise<void> => {
    const { userId, buildingId } = event.payload;
    await this.engine?.events.emit(
      "territory:expanded",
      { userId, buildingId },
      "territory",
    );
  };

  private handleTerritoryUnlock = async (
    event: TypedGameEvent<"territory:unlock">,
  ): Promise<void> => {
    const { userId } = event.payload;
    await this.engine?.events.emit(
      "territory:expanded",
      { userId, trigger: "unlock" },
      "territory",
    );
  };

  private handleTerritoryBuild = async (
    event: TypedGameEvent<"territory:build">,
  ): Promise<void> => {
    const { userId } = event.payload;
    await this.engine?.events.emit(
      "territory:expanded",
      { userId, trigger: "build" },
      "territory",
    );
  };

  private handleTerritoryExpand = async (
    event: TypedGameEvent<"territory:expand">,
  ): Promise<void> => {
    const { userId } = event.payload;
    await this.engine?.events.emit(
      "territory:expanded",
      { userId, trigger: "expand" },
      "territory",
    );
  };
}
