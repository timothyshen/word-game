import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StateManager } from "../StateManager";

describe("StateManager", () => {
  let state: StateManager;

  beforeEach(() => {
    vi.useFakeTimers();
    state = new StateManager();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should set and get a value", () => {
    state.set("hp", 100);
    expect(state.get<number>("hp")).toBe(100);
  });

  it("should return undefined for a missing key", () => {
    expect(state.get("nonexistent")).toBeUndefined();
  });

  it("should delete an entry", () => {
    state.set("hp", 100);
    state.delete("hp");
    expect(state.get("hp")).toBeUndefined();
  });

  it("should clear all entries", () => {
    state.set("a", 1);
    state.set("b", 2);
    state.set("c", 3);
    state.clear();
    expect(state.get("a")).toBeUndefined();
    expect(state.get("b")).toBeUndefined();
    expect(state.get("c")).toBeUndefined();
  });

  it("should expire entries after TTL elapses", () => {
    state.set("buff", "shield", 5000);
    expect(state.get<string>("buff")).toBe("shield");

    vi.advanceTimersByTime(4999);
    expect(state.get<string>("buff")).toBe("shield");

    vi.advanceTimersByTime(1);
    expect(state.get("buff")).toBeUndefined();
  });

  it("should persist entries without TTL indefinitely", () => {
    state.set("permanent", "data");

    vi.advanceTimersByTime(999_999_999);
    expect(state.get<string>("permanent")).toBe("data");
  });

  it("should overwrite an existing key", () => {
    state.set("hp", 100);
    state.set("hp", 50);
    expect(state.get<number>("hp")).toBe(50);
  });

  it("should overwrite TTL when re-setting a key", () => {
    state.set("buff", "shield", 5000);
    vi.advanceTimersByTime(3000);

    // Re-set with new TTL; timer resets
    state.set("buff", "barrier", 5000);
    vi.advanceTimersByTime(3000);
    expect(state.get<string>("buff")).toBe("barrier");

    vi.advanceTimersByTime(2000);
    expect(state.get("buff")).toBeUndefined();
  });
});
