import type { GameEngine, GamePlugin } from "../types";
import type { TypedGameEvent } from "../events";

export class CombatModule implements GamePlugin {
  name = "combat";
  dependencies = ["core"];
  manifest = {
    name: "combat",
    version: "1.0.0",
    description: "Turn-based combat system",
    provides: ["combat:started", "combat:victory", "combat:defeat"],
    requires: ["combat:start", "combat:action"],
  };
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

  private handleStart = async (
    event: TypedGameEvent<"combat:start">,
  ): Promise<void> => {
    const { userId, combatId } = event.payload;
    await this.engine?.events.emit(
      "combat:started",
      { userId, combatId },
      "combat",
    );
  };

  private handleAction = async (
    event: TypedGameEvent<"combat:action">,
  ): Promise<void> => {
    const { userId, result } = event.payload;
    const resultObj = result as
      | { status: string; rewards?: unknown }
      | undefined;
    if (resultObj?.status === "victory") {
      await this.engine?.events.emit(
        "combat:victory",
        { userId, rewards: resultObj.rewards },
        "combat",
      );
    } else if (resultObj?.status === "defeat") {
      await this.engine?.events.emit(
        "combat:defeat",
        { userId },
        "combat",
      );
    }
  };
}
