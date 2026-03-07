import type { IStateManager } from "../types";

interface StateEntry {
  value: unknown;
  expiresAt?: number;
}

export class StateManager implements IStateManager {
  private store = new Map<string, StateEntry>();

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (entry.expiresAt !== undefined && Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttl?: number): void {
    const entry: StateEntry = { value };
    if (ttl !== undefined) {
      entry.expiresAt = Date.now() + ttl;
    }
    this.store.set(key, entry);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}
