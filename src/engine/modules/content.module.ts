import type { GameEngine, GameModule, GameEvent } from "../types";

export class ContentModule implements GameModule {
  name = "content";
  dependencies = ["core"];
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

  private handleLevelUp = async (event: GameEvent): Promise<void> => {
    const { userId, newLevel } = event.payload as {
      userId: string;
      newLevel: number;
    };
    await this.engine?.events.emit(
      "content:checkUnlocks",
      { userId, newLevel },
      "content",
    );
  };

  private handleCharacterLevelUp = async (
    event: GameEvent,
  ): Promise<void> => {
    const { userId, newLevel } = event.payload as {
      userId: string;
      characterId: string;
      newLevel: number;
    };
    await this.engine?.events.emit(
      "content:checkUnlocks",
      { userId, newLevel },
      "content",
    );
  };

  private handleBreakthrough = async (event: GameEvent): Promise<void> => {
    const { userId, newTier } = event.payload as {
      userId: string;
      target: string;
      newTier: number;
    };
    await this.engine?.events.emit(
      "content:checkUnlocks",
      { userId, newTier },
      "content",
    );
  };
}
