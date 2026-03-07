import { evaluate } from "mathjs";

import type { IFormulaEngine } from "../types";

export class FormulaEngine implements IFormulaEngine {
  calculate(formula: string, variables: Record<string, number>): number {
    if (!formula || typeof formula !== "string") {
      throw new Error("FormulaEngine: formula must be a non-empty string");
    }

    try {
      const result = evaluate(formula, { ...variables }) as unknown;

      if (typeof result !== "number") {
        throw new Error(
          `FormulaEngine: formula "${formula}" did not evaluate to a number (got ${typeof result})`,
        );
      }

      return result;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("FormulaEngine:")) {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : String(error);
      throw new Error(`FormulaEngine: failed to evaluate "${formula}" — ${message}`);
    }
  }
}
