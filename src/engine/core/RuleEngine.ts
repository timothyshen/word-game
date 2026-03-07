import type { Condition, IFormulaEngine, IRuleEngine, WeightedItem } from "../types";

export class RuleEngine implements IRuleEngine {
  constructor(private readonly formulas: IFormulaEngine) {}

  evaluate(condition: Condition, context: Record<string, unknown>): boolean {
    switch (condition.type) {
      case "gte": {
        const val = this.getField(context, condition.field);
        return typeof val === "number" && val >= condition.value;
      }
      case "lte": {
        const val = this.getField(context, condition.field);
        return typeof val === "number" && val <= condition.value;
      }
      case "eq": {
        const val = this.getField(context, condition.field);
        return val === condition.value;
      }
      case "has": {
        const val = this.getField(context, condition.field);
        return val !== undefined && val !== null;
      }
      case "and":
        return condition.conditions.every((c) => this.evaluate(c, context));
      case "or":
        return condition.conditions.some((c) => this.evaluate(c, context));
      case "not":
        return !this.evaluate(condition.condition, context);
      case "formula": {
        const numericVars: Record<string, number> = {};
        for (const [key, val] of Object.entries(context)) {
          if (typeof val === "number") {
            numericVars[key] = val;
          }
        }
        const result = this.formulas.calculate(condition.expression, numericVars);
        return this.compareNumeric(result, condition.operator, condition.value);
      }
      case "weighted_random":
        return true;
    }
  }

  weightedRandom(weights: WeightedItem[]): string {
    if (weights.length === 0) {
      throw new Error("RuleEngine: weights array must not be empty");
    }

    let totalWeight = 0;
    for (const item of weights) {
      totalWeight += item.weight;
    }

    let roll = Math.random() * totalWeight;
    for (const item of weights) {
      roll -= item.weight;
      if (roll <= 0) {
        return item.value;
      }
    }

    // Fallback — should not be reached due to floating point, return last item
    return weights[weights.length - 1]!.value;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private getField(context: Record<string, unknown>, path: string): unknown {
    const parts = path.split(".");
    let current: unknown = context;
    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== "object") {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }

  private compareNumeric(result: number, operator: string, value: number): boolean {
    switch (operator) {
      case "gte":
        return result >= value;
      case "lte":
        return result <= value;
      case "eq":
        return result === value;
      case "gt":
        return result > value;
      case "lt":
        return result < value;
      default:
        throw new Error(`RuleEngine: unknown operator "${operator}"`);
    }
  }
}
