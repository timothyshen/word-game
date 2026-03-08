import type { GameEngine, GameModule, GamePlugin, IModuleRegistry } from "../types";

interface ModuleEntry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  module: GameModule<any>;
  config: unknown;
}

export class ModuleRegistry implements IModuleRegistry {
  private modules = new Map<string, ModuleEntry>();
  private initOrder: string[] = [];

  register<TConfig>(module: GameModule<TConfig>, config?: TConfig): void {
    if (this.modules.has(module.name)) {
      throw new Error(`Module "${module.name}" is already registered`);
    }
    const mergedConfig =
      module.defaultConfig !== undefined || config !== undefined
        ? { ...module.defaultConfig, ...config }
        : undefined;
    this.modules.set(module.name, { module, config: mergedConfig });
  }

  get(name: string): GameModule | undefined {
    return this.modules.get(name)?.module;
  }

  getAll(): GameModule[] {
    return Array.from(this.modules.values()).map((e) => e.module);
  }

  async initAll(engine: GameEngine): Promise<void> {
    const sorted = this.topologicalSort();
    this.initOrder = sorted;

    this.validateManifests();

    for (const name of sorted) {
      const entry = this.modules.get(name)!;
      await entry.module.init(engine, entry.config);
    }
  }

  /**
   * Validate plugin manifests: warn if any required events are not provided
   * by any registered plugin. Only checks modules that have a `manifest`.
   */
  private validateManifests(): void {
    const allProvided = new Set<string>();
    const requirements: Array<{ pluginName: string; event: string }> = [];

    for (const entry of this.modules.values()) {
      const plugin = entry.module as Partial<GamePlugin>;
      if (plugin.manifest) {
        for (const event of plugin.manifest.provides ?? []) {
          allProvided.add(event);
        }
        for (const event of plugin.manifest.requires ?? []) {
          requirements.push({ pluginName: plugin.manifest.name, event });
        }
      }
    }

    for (const { pluginName, event } of requirements) {
      if (!allProvided.has(event)) {
        console.warn(
          `[ModuleRegistry] Plugin "${pluginName}" requires event "${event}", ` +
          `but no registered plugin provides it`,
        );
      }
    }
  }

  async destroyAll(): Promise<void> {
    const reversed = [...this.initOrder].reverse();

    for (const name of reversed) {
      const entry = this.modules.get(name);
      if (entry?.module.destroy) {
        await entry.module.destroy();
      }
    }
  }

  /**
   * Kahn's algorithm for topological sort.
   * Throws on circular or missing dependencies.
   */
  private topologicalSort(): string[] {
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    // Initialize
    for (const name of this.modules.keys()) {
      inDegree.set(name, 0);
      adjacency.set(name, []);
    }

    // Build graph: edge from dependency -> dependent
    for (const [name, entry] of this.modules) {
      for (const dep of entry.module.dependencies ?? []) {
        if (!this.modules.has(dep)) {
          throw new Error(
            `Module "${name}" depends on "${dep}", which is not registered`,
          );
        }
        adjacency.get(dep)!.push(name);
        inDegree.set(name, (inDegree.get(name) ?? 0) + 1);
      }
    }

    // Collect nodes with no incoming edges
    const queue: string[] = [];
    for (const [name, degree] of inDegree) {
      if (degree === 0) {
        queue.push(name);
      }
    }

    const sorted: string[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      sorted.push(current);

      for (const neighbor of adjacency.get(current) ?? []) {
        const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    if (sorted.length !== this.modules.size) {
      throw new Error("Circular dependency detected among modules");
    }

    return sorted;
  }
}
