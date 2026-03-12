import { createEngine } from "~/engine";
import { GameRuleService } from "~/engine/rules/GameRuleService";
import { PrismaRuleStore } from "~/engine/rules/PrismaRuleStore";
import { PrismaEntityStore } from "~/engine/entity/PrismaEntityStore";
import { registerAllModules } from "~/engine/game/modules";
import { db } from "~/server/db";

// Create store implementations
const entityStore = new PrismaEntityStore(db);
const ruleStore = new PrismaRuleStore(db);

// Create engine singleton
const engine = createEngine({ entityStore });

// Create rule service with shared state manager
const ruleService = new GameRuleService(ruleStore, engine.state);

// Register all game modules
registerAllModules(engine);

// Start engine (initialize modules) — fire and forget
void engine.start();

export { engine, ruleService };
