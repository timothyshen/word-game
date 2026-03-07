import { createEngine } from "~/engine";
import { GameRuleService } from "~/engine/rules/GameRuleService";
import { registerAllModules } from "~/engine/modules";
import { db } from "~/server/db";

// Create engine singleton
const engine = createEngine({ db });

// Create rule service with shared state manager
const ruleService = new GameRuleService(db, engine.state);

// Register all game modules
registerAllModules(engine);

// Start engine (initialize modules) — fire and forget
void engine.start();

export { engine, ruleService };
