import type { PrismaClient } from "@prisma/client";

import type { Condition, IStateManager, WeightedItem } from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GameRuleRecord {
  id: string;
  name: string;
  category: string;
  ruleType: string;
  definition: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CACHE_TTL = 300_000; // 5 minutes

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class GameRuleService {
  constructor(
    private readonly db: PrismaClient,
    private readonly state: IStateManager,
  ) {}

  // ---- Core methods -------------------------------------------------------

  async getRule(name: string): Promise<GameRuleRecord> {
    const cacheKey = `rule:${name}`;
    const cached = this.state.get<GameRuleRecord>(cacheKey);
    if (cached) return cached;

    const rule = await this.db.gameRule.findUnique({ where: { name } });
    if (!rule) {
      throw new Error(`Game rule not found: ${name}`);
    }

    const record: GameRuleRecord = {
      id: rule.id,
      name: rule.name,
      category: rule.category,
      ruleType: rule.ruleType,
      definition: rule.definition,
      description: rule.description,
    };

    this.state.set(cacheKey, record, CACHE_TTL);
    return record;
  }

  async getRulesByCategory(category: string): Promise<GameRuleRecord[]> {
    const cacheKey = `rules:cat:${category}`;
    const cached = this.state.get<GameRuleRecord[]>(cacheKey);
    if (cached) return cached;

    const rules = await this.db.gameRule.findMany({ where: { category } });

    const records: GameRuleRecord[] = rules.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      ruleType: r.ruleType,
      definition: r.definition,
      description: r.description,
    }));

    this.state.set(cacheKey, records, CACHE_TTL);
    return records;
  }

  invalidateCache(): void {
    this.state.clear();
  }

  // ---- Typed helper methods -----------------------------------------------

  async getFormula(name: string): Promise<string> {
    const rule = await this.getRule(name);
    const definition = rule.definition.trim();

    // Try parsing as JSON first
    try {
      const parsed: unknown = JSON.parse(definition);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "expression" in parsed
      ) {
        return (parsed as { expression: string }).expression;
      }
    } catch {
      // Not JSON — treat as raw expression string
    }

    return definition;
  }

  async getConfig<T>(name: string): Promise<T> {
    const rule = await this.getRule(name);
    return JSON.parse(rule.definition) as T;
  }

  async getWeights(name: string): Promise<WeightedItem[]> {
    const rule = await this.getRule(name);
    return JSON.parse(rule.definition) as WeightedItem[];
  }

  async getCondition(name: string): Promise<Condition> {
    const rule = await this.getRule(name);
    return JSON.parse(rule.definition) as Condition;
  }
}
