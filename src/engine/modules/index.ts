import type { GameEngine } from "../types";
import { CoreModule } from "./core.module";
import { CombatModule } from "./combat.module";
import { ExplorationModule } from "./exploration.module";
import { EconomyModule } from "./economy.module";
import { ProgressionModule } from "./progression.module";
import { ContentModule } from "./content.module";
import { TerritoryModule } from "./territory.module";
import { SettlementModule } from "./settlement.module";

export function registerAllModules(engine: GameEngine): void {
  engine.modules.register(new CoreModule());
  engine.modules.register(new CombatModule());
  engine.modules.register(new ExplorationModule());
  engine.modules.register(new EconomyModule());
  engine.modules.register(new ProgressionModule());
  engine.modules.register(new ContentModule());
  engine.modules.register(new TerritoryModule());
  engine.modules.register(new SettlementModule());
}

export {
  CoreModule,
  CombatModule,
  ExplorationModule,
  EconomyModule,
  ProgressionModule,
  ContentModule,
  TerritoryModule,
  SettlementModule,
};
