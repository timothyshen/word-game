import { describe, expect, it, vi } from "vitest";

import type { GameEvent } from "../../types";
import { EventBus } from "../EventBus";

describe("EventBus", () => {
  it("should call handler on emit", async () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.on("test", handler);
    await bus.emit("test", { foo: 1 }, "test-source");

    expect(handler).toHaveBeenCalledOnce();
    const event: GameEvent = handler.mock.calls[0]![0] as GameEvent;
    expect(event.type).toBe("test");
    expect(event.payload).toEqual({ foo: 1 });
    expect(event.source).toBe("test-source");
    expect(event.timestamp).toBeTypeOf("number");
  });

  it("should default source to 'unknown'", async () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.on("test", handler);
    await bus.emit("test", null);

    const event: GameEvent = handler.mock.calls[0]![0] as GameEvent;
    expect(event.source).toBe("unknown");
  });

  it("should call multiple handlers for the same event", async () => {
    const bus = new EventBus();
    const calls: number[] = [];
    const h1 = vi.fn(() => calls.push(1));
    const h2 = vi.fn(() => calls.push(2));

    bus.on("test", h1);
    bus.on("test", h2);
    await bus.emit("test", null);

    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });

  it("should not call handlers for unrelated events", async () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.on("other", handler);
    await bus.emit("test", null);

    expect(handler).not.toHaveBeenCalled();
  });

  // -- Wildcard matching --

  it("should match wildcard patterns", async () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.on("combat:*", handler);
    await bus.emit("combat:victory", { xp: 100 });

    expect(handler).toHaveBeenCalledOnce();
    const event: GameEvent = handler.mock.calls[0]![0] as GameEvent;
    expect(event.type).toBe("combat:victory");
  });

  it("should fire both exact and wildcard handlers", async () => {
    const bus = new EventBus();
    const exact = vi.fn();
    const wildcard = vi.fn();

    bus.on("combat:victory", exact);
    bus.on("combat:*", wildcard);
    await bus.emit("combat:victory", null);

    expect(exact).toHaveBeenCalledOnce();
    expect(wildcard).toHaveBeenCalledOnce();
  });

  it("should not match wildcard for unrelated prefix", async () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.on("combat:*", handler);
    await bus.emit("exploration:complete", null);

    expect(handler).not.toHaveBeenCalled();
  });

  // -- Priority ordering --

  it("should execute higher priority handlers first", async () => {
    const bus = new EventBus();
    const order: number[] = [];

    bus.on("test", () => { order.push(1); }, 1);
    bus.on("test", () => { order.push(3); }, 3);
    bus.on("test", () => { order.push(2); }, 2);
    await bus.emit("test", null);

    expect(order).toEqual([3, 2, 1]);
  });

  it("should sort by priority across exact and wildcard handlers", async () => {
    const bus = new EventBus();
    const order: string[] = [];

    bus.on("combat:*", () => { order.push("wildcard-high"); }, 10);
    bus.on("combat:hit", () => { order.push("exact-low"); }, 1);
    bus.on("combat:hit", () => { order.push("exact-mid"); }, 5);
    await bus.emit("combat:hit", null);

    expect(order).toEqual(["wildcard-high", "exact-mid", "exact-low"]);
  });

  it("should default priority to 0", async () => {
    const bus = new EventBus();
    const order: string[] = [];

    bus.on("test", () => { order.push("default"); });
    bus.on("test", () => { order.push("high"); }, 1);
    await bus.emit("test", null);

    expect(order).toEqual(["high", "default"]);
  });

  // -- off --

  it("should remove handler with off", async () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.on("test", handler);
    bus.off("test", handler);
    await bus.emit("test", null);

    expect(handler).not.toHaveBeenCalled();
  });

  it("should only remove the specified handler", async () => {
    const bus = new EventBus();
    const h1 = vi.fn();
    const h2 = vi.fn();

    bus.on("test", h1);
    bus.on("test", h2);
    bus.off("test", h1);
    await bus.emit("test", null);

    expect(h1).not.toHaveBeenCalled();
    expect(h2).toHaveBeenCalledOnce();
  });

  it("should handle off for non-existent event gracefully", () => {
    const bus = new EventBus();
    expect(() => bus.off("nope", vi.fn())).not.toThrow();
  });

  // -- Error handling --

  it("should not stop other handlers when one throws", async () => {
    const bus = new EventBus();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const h1 = vi.fn(() => { throw new Error("boom"); });
    const h2 = vi.fn();

    bus.on("test", h1, 2);
    bus.on("test", h2, 1);
    await bus.emit("test", null);

    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it("should handle async handler errors", async () => {
    const bus = new EventBus();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const h1 = vi.fn(async () => { throw new Error("async boom"); });
    const h2 = vi.fn();

    bus.on("test", h1, 2);
    bus.on("test", h2, 1);
    await bus.emit("test", null);

    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
