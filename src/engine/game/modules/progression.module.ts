import type { GameEngine, GamePlugin } from "../../types";
import type { GameEventMap } from "../events";

export class ProgressionModule implements GamePlugin {
  name = "progression";
  dependencies = ["core", "combat", "exploration"];
  manifest = {
    name: "progression",
    version: "1.0.0",
    description: "Progression tracking and card acquisition",
    provides: ["card:acquired", "progression:check"],
    requires: [
      "combat:victory",
      "exploration:complete",
      "boss:challenge",
      "card:used",
      "character:levelUp",
      "breakthrough:complete",
    ],
  };
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

  private handleCombatVictory = async (event: unknown): Promise<void> => {
    const { userId, rewards } = (event as { payload: GameEventMap["combat:victory"] }).payload;
    const rewardsObj = rewards as
      | { cards?: Array<{ id: string; name: string }> }
      | undefined;
    if (rewardsObj?.cards) {
      for (const card of rewardsObj.cards) {
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

  private handleExplorationComplete = async (event: unknown): Promise<void> => {
    const { userId, result } = (event as { payload: GameEventMap["exploration:complete"] }).payload;
    const resultObj = result as
      | { cards?: Array<{ id: string; name: string }> }
      | undefined;
    if (resultObj?.cards) {
      for (const card of resultObj.cards) {
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

  private handleBossChallenge = async (event: unknown): Promise<void> => {
    const { userId, victory } = (event as { payload: GameEventMap["boss:challenge"] }).payload;
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

  private handleCardUsed = async (event: unknown): Promise<void> => {
    const { userId } = (event as { payload: GameEventMap["card:used"] }).payload;
    await this.engine?.events.emit(
      "progression:check",
      { userId, trigger: "card_used" },
      "progression",
    );
  };

  private handleCharacterLevelUp = async (event: unknown): Promise<void> => {
    const { userId, characterId, newLevel } = (event as { payload: GameEventMap["character:levelUp"] }).payload;
    await this.engine?.events.emit(
      "progression:check",
      { userId, trigger: "character_level_up", characterId, newLevel },
      "progression",
    );
  };

  private handleBreakthrough = async (event: unknown): Promise<void> => {
    const { userId, target, newTier } = (event as { payload: GameEventMap["breakthrough:complete"] }).payload;
    await this.engine?.events.emit(
      "progression:check",
      { userId, trigger: "breakthrough", target, newTier },
      "progression",
    );
  };
}
