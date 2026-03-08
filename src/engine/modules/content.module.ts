import type { GameEngine, GamePlugin } from "../types";
import type { TypedGameEvent } from "../events";

export class ContentModule implements GamePlugin {
  name = "content";
  dependencies = ["core"];
  manifest = {
    name: "content",
    version: "1.0.0",
    description: "Content unlock management",
    provides: ["content:checkUnlocks"],
    requires: ["player:levelUp", "character:levelUp", "breakthrough:complete"],
  };
  private engine: GameEngine | null = null;

  async init(engine: GameEngine): Promise<void> {
    this.engine = engine;
    engine.events.on("player:levelUp", this.handleLevelUp);
    engine.events.on("character:levelUp", this.handleCharacterLevelUp);
    engine.events.on("breakthrough:complete", this.handleBreakthrough);
  }

  async destroy(): Promise<void> {
    if (this.engine) {
      this.engine.events.off("player:levelUp", this.handleLevelUp);
      this.engine.events.off("character:levelUp", this.handleCharacterLevelUp);
      this.engine.events.off("breakthrough:complete", this.handleBreakthrough);
      this.engine = null;
    }
  }

  private handleLevelUp = async (
    event: TypedGameEvent<"player:levelUp">,
  ): Promise<void> => {
    const { userId, newLevel } = event.payload;
    await this.engine?.events.emit(
      "content:checkUnlocks",
      { userId, newLevel },
      "content",
    );
  };

  private handleCharacterLevelUp = async (
    event: TypedGameEvent<"character:levelUp">,
  ): Promise<void> => {
    const { userId, newLevel } = event.payload;
    await this.engine?.events.emit(
      "content:checkUnlocks",
      { userId, newLevel },
      "content",
    );
  };

  private handleBreakthrough = async (
    event: TypedGameEvent<"breakthrough:complete">,
  ): Promise<void> => {
    const { userId, newTier } = event.payload;
    await this.engine?.events.emit(
      "content:checkUnlocks",
      { userId, newTier },
      "content",
    );
  };
}
