import type { GameEngine, GameModule, GameEvent } from "../types";

export class ProgressionModule implements GameModule {
  name = "progression";
  dependencies = ["core", "combat", "exploration"];
  private engine: GameEngine | null = null;

  async init(engine: GameEngine): Promise<void> {
    this.engine = engine;
    engine.events.on("combat:victory", this.handleCombatVictory);
    engine.events.on("exploration:complete", this.handleExplorationComplete);
  }

  async destroy(): Promise<void> {
    if (this.engine) {
      this.engine.events.off("combat:victory", this.handleCombatVictory);
      this.engine.events.off(
        "exploration:complete",
        this.handleExplorationComplete,
      );
      this.engine = null;
    }
  }

  private handleCombatVictory = async (event: GameEvent): Promise<void> => {
    const { userId, rewards } = event.payload as {
      userId: string;
      rewards?: { cards?: Array<{ id: string; name: string }> };
    };
    if (rewards?.cards) {
      for (const card of rewards.cards) {
        await this.engine?.events.emit(
          "card:acquired",
          { userId, cardId: card.id, cardName: card.name },
          "progression",
        );
      }
    }
    // Signal achievement system to check for new unlocks
    await this.engine?.events.emit(
      "progression:check",
      { userId, trigger: "combat_victory" },
      "progression",
    );
  };

  private handleExplorationComplete = async (
    event: GameEvent,
  ): Promise<void> => {
    const { userId, result } = event.payload as {
      userId: string;
      result?: { cards?: Array<{ id: string; name: string }> };
    };
    if (result?.cards) {
      for (const card of result.cards) {
        await this.engine?.events.emit(
          "card:acquired",
          { userId, cardId: card.id, cardName: card.name },
          "progression",
        );
      }
    }
    await this.engine?.events.emit(
      "progression:check",
      { userId, trigger: "exploration_complete" },
      "progression",
    );
  };
}
