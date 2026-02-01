// Terrain utility functions for outer city map

export function getTerrainHeight(x: number, y: number, biome: string): number {
  const seed = x * 73856093 + y * 19349663;
  const noise = ((Math.abs(seed) % 1000) / 1000);

  const baseHeight: Record<string, number> = {
    mountain: 0.25,
    forest: 0.08,
    grassland: 0.02,
    swamp: -0.02,
    desert: 0.05,
  };

  const variation: Record<string, number> = {
    mountain: 0.15,
    forest: 0.05,
    grassland: 0.02,
    swamp: 0.02,
    desert: 0.08,
  };

  return (baseHeight[biome] ?? 0.05) + noise * (variation[biome] ?? 0.03);
}

export function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}
