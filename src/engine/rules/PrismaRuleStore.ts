// ---------------------------------------------------------------------------
// PrismaRuleStore — Prisma-backed implementation of IRuleStore
// ---------------------------------------------------------------------------

import type { PrismaClient } from "@prisma/client";
import type { GameRuleRecord } from "./GameRuleService";
import type { IRuleStore } from "./IRuleStore";

export class PrismaRuleStore implements IRuleStore {
  constructor(private readonly db: PrismaClient) {}

  async findRuleByName(name: string): Promise<GameRuleRecord | null> {
    const rule = await this.db.gameRule.findUnique({ where: { name } });
    if (!rule) return null;
    return {
      id: rule.id,
      name: rule.name,
      category: rule.category,
      ruleType: rule.ruleType,
      definition: rule.definition,
      description: rule.description,
    };
  }

  async findRulesByCategory(category: string): Promise<GameRuleRecord[]> {
    const rules = await this.db.gameRule.findMany({ where: { category } });
    return rules.map((r: { id: string; name: string; category: string; ruleType: string; definition: string; description: string }) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      ruleType: r.ruleType,
      definition: r.definition,
      description: r.description,
    }));
  }
}
