import type { GameEngine, GameModule, GameEvent } from "../types";

export class ContentModule implements GameModule {
  name = "content";
  dependencies = ["core"];
  private engine: GameEngine | null = null;

  async init(engine: GameEngine): Promise<void> {
    this.engine = engine;
    engine.events.on("player:levelUp", this.handleLevelUp);
  }

  async destroy(): Promise<void> {
    if (this.engine) {
      this.engine.events.off("player:levelUp", this.handleLevelUp);
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
}
