"use client";

import { Suspense, useRef, useMemo, useState, useCallback } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import {
  canPlaceBuilding,
  snapToGrid,
  type BuildingForCollision,
  type Territory,
} from "~/shared/building-radius";

// ============================================
// Types
// ============================================
export interface CityBuilding {
  id: string;
  x: number;
  y: number;
  level: number;
  radius: number;
  visualW: number;
  visualH: number;
  height: number;
  templateId: string;
  name: string;
  icon: string;
}

export interface InnerCity3DProps {
  buildings: CityBuilding[];
  territory: Territory;
  onGroundClick?: (x: number, y: number) => void;
  onBuildingClick?: (building: CityBuilding) => void;
  placementMode?: boolean;
  placementPreview?: {
    name: string;
    icon: string;
    radius: number;
    visualW: number;
    visualH: number;
    height: number;
  } | null;
  selectedBuildingId?: string | null;
}

// ============================================
// Main Component
// ============================================
export function InnerCity3D({
  buildings,
  territory,
  onGroundClick,
  onBuildingClick,
  placementMode = false,
  placementPreview,
  selectedBuildingId,
}: InnerCity3DProps) {
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  // Build collision list for placement validation
  const existingColliders = useMemo<BuildingForCollision[]>(
    () => buildings.map((b) => ({ x: b.x, y: b.y, radius: b.radius })),
    [buildings],
  );

  // Check if current hover position is valid for placement
  const canPlace = useMemo(() => {
    if (!placementMode || !placementPreview || !hoverPos) return false;
    return canPlaceBuilding(
      hoverPos.x,
      hoverPos.y,
      placementPreview.radius,
      existingColliders,
      territory,
    );
  }, [placementMode, placementPreview, hoverPos, existingColliders, territory]);

  const handleGroundClick = useCallback(
    (x: number, y: number) => {
      if (placementMode && onGroundClick) {
        onGroundClick(snapToGrid(x), snapToGrid(y));
      }
    },
    [placementMode, onGroundClick],
  );

  const handlePointerMove = useCallback(
    (x: number, y: number) => {
      if (placementMode) {
        setHoverPos({ x: snapToGrid(x), y: snapToGrid(y) });
      }
    },
    [placementMode],
  );

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [8, 8, 8], fov: 50 }}
        shadows
        style={{ background: "linear-gradient(to bottom, #2a3a4e, #1a1a2e)" }}
      >
        <Suspense fallback={null}>
          {/* Scene fog */}
          <fog attach="fog" args={["#1a1a2e", 8, 30]} />

          {/* Lighting */}
          <ambientLight intensity={0.6} />
          <hemisphereLight color="#ffe4c4" groundColor="#4a6a4a" intensity={0.8} />
          <directionalLight
            position={[8, 15, 6]}
            intensity={2.0}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-far={30}
            shadow-camera-left={-12}
            shadow-camera-right={12}
            shadow-camera-top={12}
            shadow-camera-bottom={-12}
            shadow-bias={-0.0001}
            color="#fff5e6"
          />
          <directionalLight position={[-5, 10, -5]} intensity={0.8} color="#aaccff" />
          <directionalLight position={[0, 12, 0]} intensity={0.5} color="#ffffff" />
          <pointLight position={[-3, 4, -3]} intensity={0.8} color="#c9a227" distance={15} />
          <pointLight position={[5, 3, 5]} intensity={0.5} color="#ffaa66" distance={12} />

          {/* Dark outer ground */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
            <planeGeometry args={[40, 40]} />
            <meshStandardMaterial color="#0d1a0d" roughness={1} />
          </mesh>

          {/* Territory ground (rounded rectangle) */}
          <TerritoryGround territory={territory} />

          {/* Territory boundary glow */}
          <TerritoryBoundary territory={territory} />

          {/* Decorations inside territory */}
          <TerritoryDecorations territory={territory} buildings={buildings} />

          {/* Raycast plane for mouse tracking */}
          <RaycastPlane
            onPointerMove={handlePointerMove}
            onClick={handleGroundClick}
            active={placementMode}
          />

          {/* Buildings */}
          {buildings.map((building) => (
            <FreePlacementBuilding
              key={building.id}
              building={building}
              onClick={() => onBuildingClick?.(building)}
              isSelected={selectedBuildingId === building.id}
            />
          ))}

          {/* Ghost preview during placement */}
          {placementMode && placementPreview && hoverPos && (
            <GhostPreview
              x={hoverPos.x}
              y={hoverPos.y}
              preview={placementPreview}
              valid={canPlace}
            />
          )}

          {/* Orbit controls */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={5}
            maxDistance={25}
            maxPolarAngle={Math.PI / 2.5}
            minPolarAngle={Math.PI / 6}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

// ============================================
// Rounded Rectangle Shape Helper
// ============================================
function createRoundedRectShape(halfW: number, halfH: number, cornerR: number): THREE.Shape {
  const r = Math.min(cornerR, halfW, halfH);
  const shape = new THREE.Shape();

  shape.moveTo(-halfW + r, -halfH);
  shape.lineTo(halfW - r, -halfH);
  shape.quadraticCurveTo(halfW, -halfH, halfW, -halfH + r);
  shape.lineTo(halfW, halfH - r);
  shape.quadraticCurveTo(halfW, halfH, halfW - r, halfH);
  shape.lineTo(-halfW + r, halfH);
  shape.quadraticCurveTo(-halfW, halfH, -halfW, halfH - r);
  shape.lineTo(-halfW, -halfH + r);
  shape.quadraticCurveTo(-halfW, -halfH, -halfW + r, -halfH);

  return shape;
}

// ============================================
// Territory Ground (Rounded Rectangle)
// ============================================
function TerritoryGround({ territory }: { territory: Territory }) {
  const geometry = useMemo(() => {
    const shape = createRoundedRectShape(territory.halfW, territory.halfH, territory.cornerR);
    return new THREE.ShapeGeometry(shape, 32);
  }, [territory.halfW, territory.halfH, territory.cornerR]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow geometry={geometry}>
      <meshStandardMaterial color="#3a5a32" roughness={0.9} />
    </mesh>
  );
}

// ============================================
// Territory Boundary (Glowing Outline)
// ============================================
function TerritoryBoundary({ territory }: { territory: Territory }) {
  const lineRef = useRef<THREE.LineLoop>(null);

  const points = useMemo(() => {
    const shape = createRoundedRectShape(territory.halfW, territory.halfH, territory.cornerR);
    const pts2d = shape.getPoints(64);
    // Convert 2D shape points to 3D (XZ plane, slightly above ground)
    return pts2d.map((p) => new THREE.Vector3(p.x, 0.02, p.y));
  }, [territory.halfW, territory.halfH, territory.cornerR]);

  const bufferGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return geo;
  }, [points]);

  useFrame((state) => {
    if (lineRef.current) {
      const mat = lineRef.current.material as THREE.LineBasicMaterial;
      mat.opacity = 0.4 + Math.sin(state.clock.elapsedTime * 1.5) * 0.2;
    }
  });

  return (
    <lineLoop ref={lineRef} geometry={bufferGeometry}>
      <lineBasicMaterial color="#c9a227" transparent opacity={0.6} linewidth={1} />
    </lineLoop>
  );
}

// ============================================
// Decorations (grass, rocks inside territory)
// ============================================
function TerritoryDecorations({
  territory,
  buildings,
}: {
  territory: Territory;
  buildings: CityBuilding[];
}) {
  const items = useMemo(() => {
    const grass: Array<{ x: number; z: number }> = [];
    const rocks: Array<{ x: number; z: number }> = [];

    // Scatter decorations using pseudo-random grid sampling
    const step = 1.0;
    const hw = territory.halfW - 0.5;
    const hh = territory.halfH - 0.5;

    for (let gx = -hw; gx <= hw; gx += step) {
      for (let gz = -hh; gz <= hh; gz += step) {
        // Pseudo-random offset
        const ix = Math.round(gx * 2);
        const iz = Math.round(gz * 2);
        const hash1 = ((ix * 7 + iz * 13 + 37) & 0xffff) % 100;
        const ox = (((ix * 3 + iz * 7 + 11) & 0xffff) % 70) / 70 * 0.6 - 0.3;
        const oz = (((ix * 11 + iz * 3 + 5) & 0xffff) % 70) / 70 * 0.6 - 0.3;
        const px = gx + ox;
        const pz = gz + oz;

        // Skip if too close to any building
        const tooClose = buildings.some((b) => {
          const dx = px - b.x;
          const dz = pz - b.y;
          return dx * dx + dz * dz < (b.radius + 0.3) * (b.radius + 0.3);
        });
        if (tooClose) continue;

        if (hash1 < 15) {
          grass.push({ x: px, z: pz });
        } else if (hash1 >= 92) {
          rocks.push({ x: px, z: pz });
        }
      }
    }

    return { grass, rocks };
  }, [territory.halfW, territory.halfH, buildings]);

  return (
    <group>
      {/* Grass tufts */}
      {items.grass.map((g, i) => (
        <group key={`grass-${i}`} position={[g.x, 0, g.z]}>
          <mesh position={[0, 0.03, 0]} castShadow>
            <coneGeometry args={[0.04, 0.08, 4]} />
            <meshStandardMaterial color="#4a7a3a" roughness={0.9} />
          </mesh>
          <mesh position={[0.05, 0.025, 0.03]} castShadow>
            <coneGeometry args={[0.03, 0.06, 4]} />
            <meshStandardMaterial color="#3a6a2a" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Small rocks */}
      {items.rocks.map((r, i) => (
        <mesh key={`rock-${i}`} position={[r.x, 0.02, r.z]} castShadow>
          <dodecahedronGeometry args={[0.04, 0]} />
          <meshStandardMaterial color="#5a5a52" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

// ============================================
// Raycast Plane (invisible, captures mouse)
// ============================================
function RaycastPlane({
  onPointerMove,
  onClick,
  active,
}: {
  onPointerMove: (x: number, y: number) => void;
  onClick: (x: number, y: number) => void;
  active: boolean;
}) {
  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!active) return;
      e.stopPropagation();
      onPointerMove(e.point.x, e.point.z);
    },
    [active, onPointerMove],
  );

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (!active) return;
      e.stopPropagation();
      onClick(e.point.x, e.point.z);
    },
    [active, onClick],
  );

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.001, 0]}
      onPointerMove={handlePointerMove}
      onClick={handleClick}
      visible={false}
    >
      <planeGeometry args={[40, 40]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}

// ============================================
// Ghost Preview (follows mouse during placement)
// ============================================
function GhostPreview({
  x,
  y,
  preview,
  valid,
}: {
  x: number;
  y: number;
  preview: NonNullable<InnerCity3DProps["placementPreview"]>;
  valid: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const color = valid ? "#4a9" : "#e74c3c";

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.02;
    }
  });

  const scale = Math.max(preview.visualW, preview.visualH);

  return (
    <group position={[x, 0, y]}>
      {/* Collision radius circle on ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <ringGeometry args={[preview.radius - 0.03, preview.radius, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </mesh>

      {/* Filled circle indicator */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <circleGeometry args={[preview.radius, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.12} />
      </mesh>

      {/* Ghost building model */}
      <group ref={groupRef}>
        <mesh position={[0, preview.height / 2 + 0.02, 0]} castShadow>
          <boxGeometry args={[0.4 * scale, preview.height, 0.4 * scale]} />
          <meshStandardMaterial color={color} transparent opacity={0.45} roughness={0.7} />
        </mesh>
        {/* Roof */}
        <mesh position={[0, preview.height + 0.1, 0]} castShadow>
          <coneGeometry args={[0.3 * scale, 0.2, 4]} />
          <meshStandardMaterial color={color} transparent opacity={0.4} roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
}

// ============================================
// Free Placement Building Wrapper
// ============================================
function FreePlacementBuilding({
  building,
  onClick,
  isSelected,
}: {
  building: CityBuilding;
  onClick: () => void;
  isSelected: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);

  // Hover animation for selected building
  useFrame((state) => {
    if (groupRef.current) {
      if (isSelected) {
        groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 3) * 0.03;
      } else {
        groupRef.current.position.y = 0;
      }
    }
  });

  const renderModel = () => {
    const props: BuildingModelProps = {
      height: building.height,
      isSelected,
      level: building.level,
      fw: building.visualW,
      fh: building.visualH,
    };

    switch (building.icon) {
      case "\u{1F3F0}": // 🏰
        return <CastleModel {...props} />;
      case "\u{1F33E}": // 🌾
        return <FarmModel {...props} />;
      case "\u2692\uFE0F": // ⚒️
        return <BlacksmithModel {...props} />;
      case "\u{1F6E1}\uFE0F": // 🛡️
        return <BarracksModel {...props} />;
      case "\u{1F3EA}": // 🏪
        return <MarketModel {...props} />;
      default:
        return <GenericBuildingModel {...props} />;
    }
  };

  // Selection ring sized to collision radius
  const ringInner = building.radius * 0.92;
  const ringOuter = building.radius;

  return (
    <group
      position={[building.x, 0, building.y]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <group ref={groupRef}>{renderModel()}</group>

      {/* Selection highlight ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[ringInner, ringOuter, 48]} />
          <meshBasicMaterial color="#c9a227" transparent opacity={0.7} />
        </mesh>
      )}

      {/* Level indicator dot */}
      <mesh position={[building.visualW * 0.35, 0.1, building.visualH * 0.35]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#4a9eff" emissive="#4a9eff" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

// ============================================
// Building Effects
// ============================================

function SmokeEffect({ position }: { position: [number, number, number] }) {
  const smokeRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (smokeRef.current) {
      smokeRef.current.children.forEach((smoke, i) => {
        const mesh = smoke as THREE.Mesh;
        mesh.position.y = 0.1 + i * 0.06 + Math.sin(state.clock.elapsedTime + i * 0.5) * 0.02;
        mesh.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 0.5 + i) * 0.15);
      });
    }
  });

  return (
    <group ref={smokeRef} position={position}>
      {Array.from({ length: 4 }).map((_, i) => (
        <mesh key={i} position={[0, 0.1 + i * 0.06, 0]}>
          <sphereGeometry args={[0.02 + i * 0.008, 6, 6]} />
          <meshStandardMaterial color="#888" transparent opacity={0.4 - i * 0.08} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function FlagEffect({
  position,
  color = "#c9a227",
}: {
  position: [number, number, number];
  color?: string;
}) {
  const flagRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (flagRef.current) {
      flagRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.2;
      flagRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 3) * 0.05;
    }
  });

  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.008, 0.008, 0.25, 6]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.7} />
      </mesh>
      <mesh ref={flagRef} position={[0.05, 0.08, 0]} castShadow>
        <planeGeometry args={[0.1, 0.07]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function LanternEffect({ position }: { position: [number, number, number] }) {
  const lanternRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (lanternRef.current) {
      lanternRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.5) * 0.15;
    }
  });

  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.003, 0.003, 0.08, 4]} />
        <meshStandardMaterial color="#5a4a3a" />
      </mesh>
      <group ref={lanternRef} position={[0, -0.06, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.025, 0.02, 0.05, 8]} />
          <meshStandardMaterial color="#e74c3c" emissive="#ff6600" emissiveIntensity={0.6} />
        </mesh>
        <pointLight intensity={0.3} color="#ff9900" distance={0.5} />
      </group>
    </group>
  );
}

// ============================================
// Building Models (adapted for visualW/visualH)
// ============================================

interface BuildingModelProps {
  height: number;
  isSelected: boolean;
  level: number;
  fw: number; // visualW
  fh: number; // visualH
}

function CastleModel({ height, isSelected, level, fw, fh }: BuildingModelProps) {
  const scale = Math.max(fw, fh);
  const bodyW = 0.4 * scale;
  const bodyH = 0.4 * scale;
  const towerHeight = height * 1.3;
  const towerRadius = 0.08 * scale;
  const offset = 0.22 * scale;

  return (
    <group>
      <mesh position={[0, height / 2 + 0.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[bodyW, height, bodyH]} />
        <meshStandardMaterial
          color="#b8956a"
          roughness={0.7}
          emissive={isSelected ? "#c9a227" : "#000"}
          emissiveIntensity={isSelected ? 0.15 : 0}
        />
      </mesh>

      {(
        [
          [-offset, -offset],
          [-offset, offset],
          [offset, -offset],
          [offset, offset],
        ] as [number, number][]
      ).map(([tx, tz], i) => (
        <group key={i} position={[tx, 0, tz]}>
          <mesh position={[0, towerHeight / 2 + 0.02, 0]} castShadow>
            <cylinderGeometry args={[towerRadius, towerRadius * 1.1, towerHeight, 12]} />
            <meshStandardMaterial color="#8a7545" roughness={0.65} />
          </mesh>
          <mesh position={[0, towerHeight + 0.1, 0]} castShadow>
            <coneGeometry args={[towerRadius * 1.3, 0.2, 12]} />
            <meshStandardMaterial color="#c9a227" roughness={0.4} metalness={0.3} />
          </mesh>
        </group>
      ))}

      <FlagEffect position={[0, height + 0.2, 0]} color="#c9a227" />

      {level >= 3 && (
        <group>
          <mesh position={[0, height + 0.02, offset + 0.05]} castShadow>
            <boxGeometry args={[bodyW * 0.8, 0.06, 0.04]} />
            <meshStandardMaterial color="#8a7545" roughness={0.7} />
          </mesh>
          <mesh position={[0, height + 0.02, -(offset + 0.05)]} castShadow>
            <boxGeometry args={[bodyW * 0.8, 0.06, 0.04]} />
            <meshStandardMaterial color="#8a7545" roughness={0.7} />
          </mesh>
        </group>
      )}

      {level >= 5 && (
        <group>
          <FlagEffect position={[-offset, towerHeight + 0.2, -offset]} color="#e74c3c" />
          <FlagEffect position={[offset, towerHeight + 0.2, offset]} color="#e74c3c" />
          <LanternEffect position={[offset + 0.08, height * 0.6, 0]} />
          <LanternEffect position={[-(offset + 0.08), height * 0.6, 0]} />
        </group>
      )}
    </group>
  );
}

function FarmModel({ height, isSelected, level, fw, fh }: BuildingModelProps) {
  const scale = Math.max(fw, fh);
  const windmillRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (windmillRef.current) {
      windmillRef.current.rotation.z = state.clock.elapsedTime * 0.5;
    }
  });

  const fieldSize = 0.8 * scale;
  const cropCount = 4 + (level >= 3 ? 4 : 0);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[fieldSize, fieldSize]} />
        <meshStandardMaterial color="#4a6830" roughness={0.95} />
      </mesh>

      <group position={[0.2 * scale, 0, 0.2 * scale]}>
        <mesh position={[0, height / 2 + 0.02, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.2, height, 0.16]} />
          <meshStandardMaterial
            color="#8b5530"
            roughness={0.75}
            emissive={isSelected ? "#c9a227" : "#000"}
            emissiveIntensity={isSelected ? 0.15 : 0}
          />
        </mesh>
        <mesh position={[0, height + 0.02, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <capsuleGeometry args={[0.08, 0.18, 8, 12]} />
          <meshStandardMaterial color="#a05a28" roughness={0.7} />
        </mesh>
      </group>

      {Array.from({ length: cropCount }).map((_, i) => {
        const row = Math.floor(i / 4);
        const col = i % 4;
        return (
          <group key={i} position={[-0.25 * scale + col * 0.15, 0, -0.15 * scale + row * 0.2]}>
            <mesh position={[0, 0.05, 0]} castShadow>
              <cylinderGeometry args={[0.008, 0.012, 0.08, 6]} />
              <meshStandardMaterial color="#5a7030" roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.1, 0]} castShadow>
              <sphereGeometry args={[0.02, 6, 6]} />
              <meshStandardMaterial color="#c9a227" roughness={0.7} />
            </mesh>
          </group>
        );
      })}

      {level >= 2 && (
        <group position={[-0.25 * scale, 0, 0.25 * scale]}>
          <mesh position={[0, 0.15, 0]} castShadow>
            <cylinderGeometry args={[0.03, 0.05, 0.3, 8]} />
            <meshStandardMaterial color="#d4c4a8" roughness={0.7} />
          </mesh>
          <group ref={windmillRef} position={[0, 0.25, 0.04]}>
            {[0, 1, 2, 3].map((i) => (
              <mesh key={i} rotation={[0, 0, (i * Math.PI) / 2]} castShadow>
                <boxGeometry args={[0.015, 0.1, 0.008]} />
                <meshStandardMaterial color="#c9b896" roughness={0.6} />
              </mesh>
            ))}
          </group>
        </group>
      )}
    </group>
  );
}

function BlacksmithModel({ height, isSelected, level, fw, fh }: BuildingModelProps) {
  const scale = Math.max(fw, fh);
  const fireRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (fireRef.current) {
      fireRef.current.intensity = 0.4 + Math.sin(state.clock.elapsedTime * 8) * 0.15;
    }
  });

  return (
    <group>
      <mesh position={[0, height / 2 + 0.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.4 * scale, height, 0.35 * scale]} />
        <meshStandardMaterial
          color="#4a4a4a"
          roughness={0.8}
          emissive={isSelected ? "#c9a227" : "#000"}
          emissiveIntensity={isSelected ? 0.15 : 0}
        />
      </mesh>

      <mesh position={[0.12 * scale, height + 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.05, 0.2, 8]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.9} />
      </mesh>

      <SmokeEffect position={[0.12 * scale, height + 0.2, 0]} />

      <mesh position={[0, 0.06, 0.2 * scale]} castShadow>
        <boxGeometry args={[0.08, 0.06, 0.05]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.6} metalness={0.4} />
      </mesh>

      <pointLight
        ref={fireRef}
        position={[0, 0.15, 0.15 * scale]}
        intensity={0.5}
        color="#ff6600"
        distance={1}
      />

      <mesh position={[0, 0.12, 0.16 * scale]}>
        <planeGeometry args={[0.06, 0.08]} />
        <meshStandardMaterial
          color="#ff4400"
          emissive="#ff6600"
          emissiveIntensity={1.2}
          transparent
          opacity={0.8}
        />
      </mesh>

      {level >= 3 && (
        <mesh position={[-0.15 * scale, 0.06, 0.15 * scale]} castShadow>
          <boxGeometry args={[0.06, 0.05, 0.04]} />
          <meshStandardMaterial color="#333" roughness={0.5} metalness={0.5} />
        </mesh>
      )}
    </group>
  );
}

function BarracksModel({ height, isSelected, level, fw, fh }: BuildingModelProps) {
  const scale = Math.max(fw, fh);

  return (
    <group>
      <mesh position={[0, height / 2 + 0.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.45 * scale, height, 0.35 * scale]} />
        <meshStandardMaterial
          color="#5a4a3a"
          roughness={0.75}
          emissive={isSelected ? "#c9a227" : "#000"}
          emissiveIntensity={isSelected ? 0.15 : 0}
        />
      </mesh>

      <mesh position={[0, height + 0.1, 0]} castShadow>
        <coneGeometry args={[0.28 * scale, 0.2, 4]} />
        <meshStandardMaterial color="#8b6040" roughness={0.7} />
      </mesh>

      <FlagEffect position={[-0.15 * scale, height + 0.2, 0]} color="#e74c3c" />

      {level >= 3 && (
        <group position={[0.2 * scale, 0, -0.2 * scale]}>
          <mesh position={[0, 0.12, 0]} castShadow>
            <cylinderGeometry args={[0.015, 0.015, 0.2, 6]} />
            <meshStandardMaterial color="#5a4a3a" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.22, 0]} castShadow>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshStandardMaterial color="#8b7355" roughness={0.7} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function MarketModel({ height, isSelected, level, fw, fh }: BuildingModelProps) {
  const scale = Math.max(fw, fh);
  const pillarOffset = 0.15 * scale;

  return (
    <group>
      {(
        [
          [-pillarOffset, -pillarOffset],
          [-pillarOffset, pillarOffset],
          [pillarOffset, -pillarOffset],
          [pillarOffset, pillarOffset],
        ] as [number, number][]
      ).map(([px, pz], i) => (
        <mesh key={i} position={[px, height / 2 + 0.02, pz]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, height, 8]} />
          <meshStandardMaterial color="#8b7355" roughness={0.7} />
        </mesh>
      ))}

      <mesh position={[0, height + 0.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.45 * scale, 0.06, 0.45 * scale]} />
        <meshStandardMaterial
          color="#c9a227"
          roughness={0.5}
          emissive={isSelected ? "#c9a227" : "#000"}
          emissiveIntensity={isSelected ? 0.2 : 0}
        />
      </mesh>

      <mesh position={[0, 0.08, 0]} castShadow>
        <boxGeometry args={[0.25 * scale, 0.08, 0.2 * scale]} />
        <meshStandardMaterial color="#8b5530" roughness={0.8} />
      </mesh>

      <LanternEffect position={[-pillarOffset, height - 0.05, -pillarOffset - 0.05]} />
      <LanternEffect position={[pillarOffset, height - 0.05, -pillarOffset - 0.05]} />

      {level >= 3 && (
        <group>
          <mesh position={[-0.1 * scale, 0.14, 0]} castShadow>
            <boxGeometry args={[0.05, 0.04, 0.05]} />
            <meshStandardMaterial color="#e67e22" roughness={0.7} />
          </mesh>
          <mesh position={[0.1 * scale, 0.14, 0]} castShadow>
            <boxGeometry args={[0.04, 0.05, 0.04]} />
            <meshStandardMaterial color="#9b59b6" roughness={0.7} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function GenericBuildingModel({ height, isSelected, level, fw, fh }: BuildingModelProps) {
  const scale = Math.max(fw, fh);

  return (
    <group>
      <mesh position={[0, height / 2 + 0.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.35 * scale, height, 0.35 * scale]} />
        <meshStandardMaterial
          color="#6a5a4a"
          roughness={0.75}
          emissive={isSelected ? "#c9a227" : "#000"}
          emissiveIntensity={isSelected ? 0.15 : 0}
        />
      </mesh>

      <mesh position={[0, height + 0.08, 0]} castShadow>
        <coneGeometry args={[0.25 * scale, 0.15, 4]} />
        <meshStandardMaterial color="#8b6914" roughness={0.6} />
      </mesh>

      <mesh position={[0, 0.08, 0.18 * scale]} castShadow>
        <boxGeometry args={[0.08, 0.12, 0.02]} />
        <meshStandardMaterial color="#3a2515" roughness={0.9} />
      </mesh>

      <mesh position={[0, height * 0.6, 0.18 * scale]} castShadow>
        <boxGeometry args={[0.06, 0.06, 0.02]} />
        <meshStandardMaterial color="#ffd070" emissive="#ffa500" emissiveIntensity={0.3} />
      </mesh>

      {level >= 3 && (
        <group>
          <mesh position={[0.1 * scale, height + 0.12, 0]} castShadow>
            <cylinderGeometry args={[0.025, 0.03, 0.12, 6]} />
            <meshStandardMaterial color="#555" roughness={0.8} />
          </mesh>
          <SmokeEffect position={[0.1 * scale, height + 0.18, 0]} />
        </group>
      )}
    </group>
  );
}

export default InnerCity3D;
