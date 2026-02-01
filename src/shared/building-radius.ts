/**
 * Building collision and territory logic for the free-placement inner city.
 * Shared by server router (validation) and client 3D (preview + rendering).
 */

// ============================================
// Types
// ============================================

export interface BuildingSize {
  radius: number; // collision circle radius (world units)
  visualW: number; // visual width for 3D model scaling
  visualH: number; // visual depth for 3D model scaling
  height: number; // visual height for 3D model
}

export interface BuildingForCollision {
  x: number;
  y: number;
  radius: number;
}

export interface Territory {
  halfW: number;
  halfH: number;
  cornerR: number;
}

// ============================================
// Building Size Table
// ============================================

const BUILDING_SIZES: Record<string, (level: number) => BuildingSize> = {
  主城堡: (level) => {
    if (level <= 2) return { radius: 1.0, visualW: 1.4, visualH: 1.4, height: 0.6 };
    if (level <= 4) return { radius: 1.5, visualW: 2.0, visualH: 2.0, height: 0.8 };
    if (level <= 7) return { radius: 2.0, visualW: 2.8, visualH: 2.8, height: 1.0 };
    return { radius: 2.5, visualW: 3.4, visualH: 3.4, height: 1.2 };
  },
  农田: (level) => {
    if (level <= 2) return { radius: 0.7, visualW: 1.2, visualH: 1.2, height: 0.35 };
    return { radius: 1.0, visualW: 1.6, visualH: 1.6, height: 0.45 };
  },
  矿场: (level) => {
    if (level <= 2) return { radius: 0.6, visualW: 1.0, visualH: 1.0, height: 0.4 };
    return { radius: 0.9, visualW: 1.4, visualH: 1.4, height: 0.5 };
  },
  伐木场: (level) => {
    if (level <= 2) return { radius: 0.6, visualW: 1.0, visualH: 1.0, height: 0.4 };
    return { radius: 0.9, visualW: 1.4, visualH: 1.4, height: 0.5 };
  },
  铁匠铺: (level) => {
    if (level <= 2) return { radius: 0.6, visualW: 1.0, visualH: 1.0, height: 0.45 };
    return { radius: 0.9, visualW: 1.4, visualH: 1.4, height: 0.55 };
  },
  兵营: (level) => {
    if (level <= 2) return { radius: 0.7, visualW: 1.2, visualH: 1.0, height: 0.45 };
    return { radius: 1.0, visualW: 1.6, visualH: 1.4, height: 0.55 };
  },
  市场: (level) => {
    if (level <= 2) return { radius: 0.7, visualW: 1.2, visualH: 1.2, height: 0.4 };
    return { radius: 1.0, visualW: 1.6, visualH: 1.6, height: 0.5 };
  },
};

const DEFAULT_SIZE = (level: number): BuildingSize => {
  if (level <= 2) return { radius: 0.6, visualW: 1.0, visualH: 1.0, height: 0.4 };
  return { radius: 0.9, visualW: 1.4, visualH: 1.4, height: 0.5 };
};

/** Get full size info for a building at a given level. */
export function getBuildingSize(buildingName: string, level: number): BuildingSize {
  const fn = BUILDING_SIZES[buildingName] ?? DEFAULT_SIZE;
  return fn(level);
}

/** Shorthand: just the collision radius. */
export function getBuildingRadius(buildingName: string, level: number): number {
  return getBuildingSize(buildingName, level).radius;
}

/** Check if upgrading would increase the collision radius. */
export function wouldRadiusGrow(
  buildingName: string,
  currentLevel: number,
): boolean {
  return (
    getBuildingRadius(buildingName, currentLevel + 1) >
    getBuildingRadius(buildingName, currentLevel)
  );
}

// ============================================
// Territory Bounds (Rounded Rectangle)
// ============================================

/**
 * Check if a building circle (center x,y + radius) fits entirely inside
 * the rounded-rectangle territory centered at (0, 0).
 *
 * halfW, halfH = half-extents of the outer rectangle.
 * cornerR = corner rounding radius of the territory.
 */
export function isWithinTerritory(
  x: number,
  y: number,
  buildingRadius: number,
  halfW: number,
  halfH: number,
  cornerR: number,
): boolean {
  // Shrink territory by building radius — the center must lie within
  const eW = halfW - buildingRadius;
  const eH = halfH - buildingRadius;
  const eR = Math.max(0, cornerR);

  if (eW <= 0 || eH <= 0) return false;

  const ax = Math.abs(x);
  const ay = Math.abs(y);

  // Inside the non-corner region
  if (ax <= eW - eR && ay <= eH) return true;
  if (ay <= eH - eR && ax <= eW) return true;

  // Corner test
  const cx = eW - eR;
  const cy = eH - eR;
  if (ax > cx && ay > cy) {
    const dx = ax - cx;
    const dy = ay - cy;
    return dx * dx + dy * dy <= eR * eR;
  }

  return false;
}

// ============================================
// Collision Detection (Circle vs Circle)
// ============================================

const MIN_GAP = 0.1;

/** Check if two building circles overlap (including minimum gap). */
export function buildingsCollide(
  a: BuildingForCollision,
  b: BuildingForCollision,
  minGap: number = MIN_GAP,
): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const minDist = a.radius + b.radius + minGap;
  return dx * dx + dy * dy < minDist * minDist;
}

/**
 * Check if a new building can be placed at (x, y).
 * Returns true if within territory AND no collisions.
 */
export function canPlaceBuilding(
  x: number,
  y: number,
  buildingRadius: number,
  existingBuildings: BuildingForCollision[],
  territory: Territory,
): boolean {
  if (
    !isWithinTerritory(
      x,
      y,
      buildingRadius,
      territory.halfW,
      territory.halfH,
      territory.cornerR,
    )
  ) {
    return false;
  }
  const candidate: BuildingForCollision = { x, y, radius: buildingRadius };
  return !existingBuildings.some((b) => buildingsCollide(candidate, b));
}

/**
 * Check if an existing building can be upgraded (radius may grow).
 * Excludes the building itself from collision checks.
 */
export function canUpgradeBuilding(
  buildingId: string,
  x: number,
  y: number,
  newRadius: number,
  allBuildings: Array<BuildingForCollision & { id: string }>,
  territory: Territory,
): boolean {
  if (
    !isWithinTerritory(
      x,
      y,
      newRadius,
      territory.halfW,
      territory.halfH,
      territory.cornerR,
    )
  ) {
    return false;
  }
  const others = allBuildings.filter((b) => b.id !== buildingId);
  const upgraded: BuildingForCollision = { x, y, radius: newRadius };
  return !others.some((b) => buildingsCollide(upgraded, b));
}

// ============================================
// Snap
// ============================================

/** Snap a coordinate to the nearest 0.5 increment. */
export function snapToGrid(value: number): number {
  return Math.round(value * 2) / 2;
}
