import type { EventHandler, GameEvent, IEventBus } from "../types";

interface HandlerEntry {
  handler: EventHandler;
  priority: number;
}

export class EventBus implements IEventBus {
  private handlers = new Map<string, HandlerEntry[]>();

  on(event: string, handler: EventHandler, priority = 0): void {
    const entries = this.handlers.get(event) ?? [];
    entries.push({ handler, priority });
    this.handlers.set(event, entries);
  }

  off(event: string, handler: EventHandler): void {
    const entries = this.handlers.get(event);
    if (!entries) return;

    const filtered = entries.filter((e) => e.handler !== handler);
    if (filtered.length === 0) {
      this.handlers.delete(event);
    } else {
      this.handlers.set(event, filtered);
    }
  }

  async emit(
    event: string,
    payload: unknown,
    source = "unknown",
  ): Promise<void> {
    const gameEvent: GameEvent = {
      type: event,
      payload,
      timestamp: Date.now(),
      source,
    };

    const matched: HandlerEntry[] = [];

    for (const [pattern, entries] of this.handlers) {
      if (pattern === event) {
        matched.push(...entries);
      } else if (pattern.endsWith("*")) {
        const prefix = pattern.slice(0, -1);
        if (event.startsWith(prefix)) {
          matched.push(...entries);
        }
      }
    }

    matched.sort((a, b) => b.priority - a.priority);

    for (const entry of matched) {
      try {
        await entry.handler(gameEvent);
      } catch (err) {
        console.error(
          `EventBus: handler for "${event}" threw an error:`,
          err,
        );
      }
    }
  }
}
