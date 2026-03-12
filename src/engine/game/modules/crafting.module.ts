import type { GameEngine, GamePlugin } from "../../types";
import type { GameEventMap } from "../events";

export class CraftingModule implements GamePlugin {
  name = "crafting";
  dependencies = ["core"];
  manifest = {
    name: "crafting",
    version: "1.0.0",
    description: "Equipment crafting system with material drops and quality upgrades",
    provides: ["crafting:completed", "crafting:qualityUpgrade", "crafting:materialDrop"],
    requires: ["exploration:complete", "combat:victory"],
  };
  private engine: GameEngine | null = null;

  async init(engine: GameEngine): Promise<void> {
    this.engine = engine;
    engine.events.on("crafting:completed", this.handleCraftCompleted);
  }

  async destroy(): Promise<void> {
    if (this.engine) {
      this.engine.events.off("crafting:completed", this.handleCraftCompleted);
      this.engine = null;
    }
  }

  private handleCraftCompleted = async (event: unknown): Promise<void> => {
    const { userId } = (event as { payload: GameEventMap["crafting:completed"] }).payload;
    await this.engine?.events.emit(
      "progression:check",
      { userId, trigger: "crafting_completed" },
      "crafting",
    );
  };
}
