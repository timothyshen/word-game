import type { GameEngine, GameModule, GameEvent } from "../types";

export class CombatModule implements GameModule {
  name = "combat";
  dependencies = ["core"];
  private engine: GameEngine | null = null;

  async init(engine: GameEngine): Promise<void> {
    this.engine = engine;
    engine.events.on("combat:start", this.handleStart);
    engine.events.on("combat:action", this.handleAction);
  }

  async destroy(): Promise<void> {
    if (this.engine) {
      this.engine.events.off("combat:start", this.handleStart);
      this.engine.events.off("combat:action", this.handleAction);
      this.engine = null;
    }
  }

  private handleStart = async (event: GameEvent): Promise<void> => {
    const { userId, combatId } = event.payload as {
      userId: string;
      combatId?: string;
      monsterLevel: number;
      monsterType?: string;
    };
    await this.engine?.events.emit(
      "combat:started",
      { userId, combatId },
      "combat",
    );
  };

  private handleAction = async (event: GameEvent): Promise<void> => {
    const payload = event.payload as {
      userId: string;
      combatId: string;
      actionId: string;
      result?: { status: string; rewards?: unknown };
    };

    if (payload.result?.status === "victory") {
      await this.engine?.events.emit(
        "combat:victory",
        { userId: payload.userId, rewards: payload.result.rewards },
        "combat",
      );
    } else if (payload.result?.status === "defeat") {
      await this.engine?.events.emit(
        "combat:defeat",
        { userId: payload.userId },
        "combat",
      );
    }
  };
}
