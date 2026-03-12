import type { GameEngine } from "../../types";
import { CoreModule } from "./core.module";
import { CombatModule } from "./combat.module";
import { ExplorationModule } from "./exploration.module";
import { EconomyModule } from "./economy.module";
import { ProgressionModule } from "./progression.module";
import { ContentModule } from "./content.module";
import { TerritoryModule } from "./territory.module";
import { SettlementModule } from "./settlement.module";
import { CraftingModule } from "./crafting.module";

export function registerAllModules(engine: GameEngine): void {
  engine
    .use(new CoreModule())
    .use(new CombatModule())
    .use(new ExplorationModule())
    .use(new EconomyModule())
    .use(new ProgressionModule())
    .use(new ContentModule())
    .use(new TerritoryModule())
    .use(new SettlementModule())
    .use(new CraftingModule());
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
  CraftingModule,
};
