import { createEngine } from "~/engine";
import { GameRuleService } from "~/engine/rules/GameRuleService";
import { db } from "~/server/db";

// Create engine singleton
const engine = createEngine({ db });

// Create rule service with shared state manager
const ruleService = new GameRuleService(db, engine.state);

export { engine, ruleService };
