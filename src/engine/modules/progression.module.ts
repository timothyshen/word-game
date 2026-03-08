import type { GameEngine, GameModule, GameEvent } from "../types";

export class ProgressionModule implements GameModule {
  name = "progression";
  dependencies = ["core", "combat", "exploration"];
  private engine: GameEngine | null = null;

  async init(engine: GameEngine): Promise<void> {
    this.engine = engine;
    engine.events.on("combat:victory", this.handleCombatVictory);
    engine.events.on("exploration:complete", this.handleExplorationComplete);
    engine.events.on("boss:challenge", this.handleBossChallenge);
    engine.events.on("card:used", this.handleCardUsed);
    engine.events.on("character:levelUp", this.handleCharacterLevelUp);
    engine.events.on("breakthrough:complete", this.handleBreakthrough);
  }

  async destroy(): Promise<void> {
    if (this.engine) {
      this.engine.events.off("combat:victory", this.handleCombatVictory);
      this.engine.events.off(
        "exploration:complete",
        this.handleExplorationComplete,
      );
      this.engine.events.off("boss:challenge", this.handleBossChallenge);
      this.engine.events.off("card:used", this.handleCardUsed);
      this.engine.events.off("character:levelUp", this.handleCharacterLevelUp);
      this.engine.events.off("breakthrough:complete", this.handleBreakthrough);
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

  private handleBossChallenge = async (event: GameEvent): Promise<void> => {
    const { userId, victory } = event.payload as {
      userId: string;
      bossId: string;
      victory: boolean;
    };
    if (victory) {
      await this.engine?.events.emit(
        "combat:victory",
        { userId, rewards: {} },
        "progression",
      );
    }
    await this.engine?.events.emit(
      "progression:check",
      { userId, trigger: "boss_challenge" },
      "progression",
    );
  };

  private handleCardUsed = async (event: GameEvent): Promise<void> => {
    const { userId } = event.payload as {
      userId: string;
      cardId: string;
      action: string;
    };
    await this.engine?.events.emit(
      "progression:check",
      { userId, trigger: "card_used" },
      "progression",
    );
  };

  private handleCharacterLevelUp = async (
    event: GameEvent,
  ): Promise<void> => {
    const { userId, characterId, newLevel } = event.payload as {
      userId: string;
      characterId: string;
      newLevel: number;
    };
    await this.engine?.events.emit(
      "progression:check",
      { userId, trigger: "character_level_up", characterId, newLevel },
      "progression",
    );
  };

  private handleBreakthrough = async (event: GameEvent): Promise<void> => {
    const { userId, target, newTier } = event.payload as {
      userId: string;
      target: string;
      newTier: number;
    };
    await this.engine?.events.emit(
      "progression:check",
      { userId, trigger: "breakthrough", target, newTier },
      "progression",
    );
  };
}
