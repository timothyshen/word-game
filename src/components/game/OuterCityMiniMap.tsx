"use client";

import { useState, useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { api } from "~/trpc/react";

// 地形颜色映射
const biomeColors: Record<string, string> = {
  grassland: "#4a7c59",
  forest: "#2d5a27",
  mountain: "#6b6b6b",
  desert: "#c9a227",
  swamp: "#3d5a47",
};

// ===== 地形装饰组件 =====

// 树木（森林）
function TreeModel({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      {/* 树干 */}
      <mesh position={[0, 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.03, 0.2, 6]} />
        <meshStandardMaterial color="#5a4030" roughness={0.9} />
      </mesh>
      {/* 树冠 */}
      <mesh position={[0, 0.25, 0]} castShadow>
        <coneGeometry args={[0.1, 0.2, 6]} />
        <meshStandardMaterial color="#2d5a27" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.35, 0]} castShadow>
        <coneGeometry args={[0.07, 0.15, 6]} />
        <meshStandardMaterial color="#3a6a37" roughness={0.8} />
      </mesh>
    </group>
  );
}

// 岩石（山地）
function RockModel({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow>
        <dodecahedronGeometry args={[0.08, 0]} />
        <meshStandardMaterial color="#6b6b6b" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0.05, -0.02, 0.03]} castShadow>
        <dodecahedronGeometry args={[0.05, 0]} />
        <meshStandardMaterial color="#7a7a7a" roughness={0.9} flatShading />
      </mesh>
    </group>
  );
}

// 仙人掌（沙漠）
function CactusModel({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      {/* 主干 */}
      <mesh position={[0, 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.04, 0.2, 8]} />
        <meshStandardMaterial color="#4a8050" roughness={0.7} />
      </mesh>
      {/* 侧枝 */}
      <mesh position={[0.05, 0.12, 0]} rotation={[0, 0, -0.5]} castShadow>
        <cylinderGeometry args={[0.015, 0.02, 0.08, 6]} />
        <meshStandardMaterial color="#4a8050" roughness={0.7} />
      </mesh>
    </group>
  );
}

// 芦苇（沼泽）
function ReedModel({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const reedRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (reedRef.current) {
      reedRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.1;
    }
  });

  return (
    <group ref={reedRef} position={position} scale={scale}>
      {[0, 0.3, -0.3].map((offset, i) => (
        <mesh key={i} position={[offset * 0.1, 0.08, offset * 0.05]} castShadow>
          <cylinderGeometry args={[0.005, 0.01, 0.16, 4]} />
          <meshStandardMaterial color="#5a6a47" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

// 草丛（草原）
function GrassModel({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      {[-0.03, 0, 0.03].map((x, i) => (
        <mesh key={i} position={[x, 0.03, (i - 1) * 0.02]} castShadow>
          <coneGeometry args={[0.01, 0.06, 4]} />
          <meshStandardMaterial color="#5a8a59" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// 水面效果（沼泽用）
function WaterPuddle({ position }: { position: [number, number, number] }) {
  const waterRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (waterRef.current) {
      const mat = waterRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.5 + Math.sin(state.clock.elapsedTime) * 0.1;
    }
  });

  return (
    <mesh ref={waterRef} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.15, 16]} />
      <meshStandardMaterial
        color="#3a5a6a"
        transparent
        opacity={0.6}
        roughness={0.2}
        metalness={0.3}
      />
    </mesh>
  );
}

// 地形装饰组合
function TerrainDecorations({ biome, seed }: { biome: string; seed: number }) {
  // 使用seed生成伪随机位置
  const random = (n: number) => ((seed * 9301 + 49297) % 233280) / 233280 * n;

  if (biome === "forest") {
    return (
      <>
        <TreeModel position={[random(0.3) - 0.15, 0, random(0.3) - 0.15]} scale={0.8 + random(0.4)} />
        {random(1) > 0.5 && (
          <TreeModel position={[random(0.2) + 0.1, 0, random(0.2) - 0.3]} scale={0.6 + random(0.3)} />
        )}
      </>
    );
  }

  if (biome === "mountain") {
    return (
      <>
        <RockModel position={[random(0.2) - 0.1, 0.05, random(0.2) - 0.1]} scale={1 + random(0.5)} />
        <RockModel position={[random(0.2) + 0.1, 0.03, random(0.2) - 0.2]} scale={0.6 + random(0.3)} />
      </>
    );
  }

  if (biome === "desert") {
    return random(1) > 0.4 ? (
      <CactusModel position={[random(0.3) - 0.15, 0, random(0.3) - 0.15]} scale={0.8 + random(0.4)} />
    ) : null;
  }

  if (biome === "swamp") {
    return (
      <>
        <WaterPuddle position={[random(0.2) - 0.1, 0.06, random(0.2) - 0.1]} />
        <ReedModel position={[random(0.2) + 0.1, 0, random(0.2) - 0.2]} scale={0.8 + random(0.3)} />
      </>
    );
  }

  if (biome === "grassland") {
    return random(1) > 0.5 ? (
      <>
        <GrassModel position={[random(0.3) - 0.15, 0, random(0.3) - 0.15]} />
        <GrassModel position={[random(0.2) + 0.1, 0, random(0.2) - 0.2]} />
      </>
    ) : null;
  }

  return null;
}

// 3D 地形瓦片
function TerrainTile({
  position,
  biome,
  explorationLevel,
  hasHero,
  hasPOI,
  poiType,
  isCenter,
  canMove,
  onClick,
}: {
  position: [number, number, number];
  biome: string;
  explorationLevel: number;
  hasHero: boolean;
  hasPOI: boolean;
  poiType?: string;
  isCenter: boolean;
  canMove: boolean;
  onClick?: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const color = biomeColors[biome] ?? "#333";
  const opacity = explorationLevel === 2 ? 1 : explorationLevel === 1 ? 0.4 : 0.1;

  // 高亮动画
  useFrame((state) => {
    if (meshRef.current && canMove) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.2 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
    }
  });

  return (
    <group position={position}>
      {/* 地面 */}
      <mesh
        ref={meshRef}
        receiveShadow
        onClick={onClick}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <boxGeometry args={[0.95, 0.1, 0.95]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          emissive={canMove ? "#c9a227" : hovered ? "#4a9" : "#000"}
          emissiveIntensity={canMove ? 0.3 : hovered ? 0.1 : 0}
        />
      </mesh>

      {/* 迷雾效果 */}
      {explorationLevel === 1 && (
        <mesh position={[0, 0.15, 0]}>
          <boxGeometry args={[0.9, 0.2, 0.9]} />
          <meshStandardMaterial color="#1a1a2e" transparent opacity={0.6} />
        </mesh>
      )}

      {/* 城门标记 */}
      {isCenter && !hasHero && explorationLevel === 2 && (
        <group position={[0, 0.2, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.3, 0.4, 0.3]} />
            <meshStandardMaterial color="#8b7355" />
          </mesh>
          <mesh position={[0, 0.25, 0]} castShadow>
            <coneGeometry args={[0.25, 0.2, 4]} />
            <meshStandardMaterial color="#c9a227" />
          </mesh>
        </group>
      )}

      {/* 地形装饰 */}
      {explorationLevel === 2 && !hasPOI && !hasHero && !isCenter && (
        <TerrainDecorations biome={biome} seed={position[0] * 100 + position[2]} />
      )}

      {/* POI标记 */}
      {hasPOI && !hasHero && explorationLevel === 2 && (
        <POIMarker type={poiType ?? "resource"} />
      )}

      {/* 英雄标记 */}
      {hasHero && <HeroMarker />}
    </group>
  );
}

// POI 标记
function POIMarker({ type }: { type: string }) {
  const colors: Record<string, string> = {
    resource: "#4a9",
    garrison: "#e74c3c",
    lair: "#9b59b6",
    settlement: "#3498db",
  };
  const color = colors[type] ?? "#888";

  return (
    <group position={[0, 0.2, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.3, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
      </mesh>
      <pointLight intensity={0.3} color={color} distance={1.5} />
    </group>
  );
}

// 英雄标记
function HeroMarker() {
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (ref.current) {
      ref.current.position.y = 0.3 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
    }
  });

  return (
    <group ref={ref} position={[0, 0.3, 0]}>
      <mesh castShadow>
        <capsuleGeometry args={[0.1, 0.2, 4, 8]} />
        <meshStandardMaterial color="#c9a227" emissive="#c9a227" emissiveIntensity={0.4} />
      </mesh>
      <pointLight intensity={0.5} color="#c9a227" distance={2} />
    </group>
  );
}

// 战争迷雾边缘
function FogBoundary() {
  return (
    <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[4, 8, 32]} />
      <meshStandardMaterial color="#1a1a2e" transparent opacity={0.8} side={THREE.DoubleSide} />
    </mesh>
  );
}

interface OuterCityMiniMapProps {
  onOpenFull?: () => void;
}

export default function OuterCityMiniMap({ onOpenFull }: OuterCityMiniMapProps) {
  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(null);

  const utils = api.useUtils();

  const { data: status } = api.outerCity.getStatus.useQuery();
  const { data: mapData } = api.outerCity.getVisibleMap.useQuery();

  const deployHero = api.outerCity.deployHero.useMutation({
    onSuccess: () => {
      void utils.outerCity.getStatus.invalidate();
      void utils.outerCity.getVisibleMap.invalidate();
    },
  });

  const moveHero = api.outerCity.moveHero.useMutation({
    onSuccess: () => {
      void utils.outerCity.getStatus.invalidate();
      void utils.outerCity.getVisibleMap.invalidate();
    },
  });

  const selectedHero = status?.heroes.find((h) => h.id === selectedHeroId);
  const centerX = selectedHero?.positionX ?? 0;
  const centerY = selectedHero?.positionY ?? 0;

  const mapRadius = 3;

  const handleTileClick = (x: number, y: number) => {
    if (!selectedHero) return;

    const dx = Math.abs(x - selectedHero.positionX);
    const dy = Math.abs(y - selectedHero.positionY);

    if (dx + dy === 1) {
      moveHero.mutate({ heroId: selectedHero.id, targetX: x, targetY: y });
    }
  };

  // 生成地图瓦片数据
  const tiles: Array<{
    x: number;
    y: number;
    biome: string;
    explorationLevel: number;
    hasHero: boolean;
    hasPOI: boolean;
    poiType?: string;
    isCenter: boolean;
    canMove: boolean;
  }> = [];

  for (let dy = -mapRadius; dy <= mapRadius; dy++) {
    for (let dx = -mapRadius; dx <= mapRadius; dx++) {
      const x = centerX + dx;
      const y = centerY + dy;

      const area = mapData?.areas.find((a) => a.positionX === x && a.positionY === y);
      const poi = mapData?.pois.find((p) => p.positionX === x && p.positionY === y);
      const hero = status?.heroes.find((h) => h.positionX === x && h.positionY === y);

      const canMove =
        selectedHero &&
        Math.abs(x - selectedHero.positionX) + Math.abs(y - selectedHero.positionY) === 1;

      tiles.push({
        x,
        y,
        biome: area?.biome ?? "grassland",
        explorationLevel: area?.explorationLevel ?? 0,
        hasHero: !!hero,
        hasPOI: !!poi,
        poiType: poi?.type,
        isCenter: x === 0 && y === 0,
        canMove: !!canMove,
      });
    }
  }

  return (
    <div className="relative">
      {/* 3D地图 */}
      <div className="h-[200px] bg-gradient-to-b from-[#2a3a4e] to-[#1a1a2e] rounded-sm overflow-hidden">
        <Canvas camera={{ position: [5, 5, 5], fov: 45 }} shadows>
          <Suspense fallback={null}>
            <fog attach="fog" args={["#1a1a2e", 5, 15]} />
            <ambientLight intensity={0.5} />
            <hemisphereLight color="#ffe4c4" groundColor="#4a6a4a" intensity={0.6} />
            <directionalLight
              position={[5, 10, 5]}
              intensity={1.5}
              castShadow
              shadow-mapSize-width={1024}
              shadow-mapSize-height={1024}
            />

            <FogBoundary />

            {tiles.map((tile) => (
              <TerrainTile
                key={`${tile.x}-${tile.y}`}
                position={[tile.x - centerX, 0, tile.y - centerY]}
                biome={tile.biome}
                explorationLevel={tile.explorationLevel}
                hasHero={tile.hasHero}
                hasPOI={tile.hasPOI}
                poiType={tile.poiType}
                isCenter={tile.isCenter}
                canMove={tile.canMove}
                onClick={() => handleTileClick(tile.x, tile.y)}
              />
            ))}

            <OrbitControls
              enablePan={false}
              enableZoom={true}
              enableRotate={true}
              minDistance={4}
              maxDistance={10}
              maxPolarAngle={Math.PI / 2.5}
              minPolarAngle={Math.PI / 6}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* 浮动英雄选择 - SimCity风格 */}
      <div className="absolute top-2 left-2 right-2 flex gap-1 overflow-x-auto">
        {status?.heroes.map((hero) => (
          <button
            key={hero.id}
            onClick={() => setSelectedHeroId(hero.id)}
            className={`flex items-center gap-1 px-2 py-1 text-[10px] whitespace-nowrap backdrop-blur rounded-sm border transition-all ${
              selectedHeroId === hero.id
                ? "bg-[#c9a227]/90 text-[#08080a] border-[#c9a227]"
                : "bg-[#0a0a0c]/80 text-[#e0dcd0] border-[#2a2a30] hover:border-[#c9a227]/50"
            }`}
          >
            <span>{hero.character.character.portrait}</span>
            <span className="hidden sm:inline">{hero.character.character.name}</span>
            <span className="text-[8px] opacity-70">⚡{hero.stamina}</span>
          </button>
        ))}

        {status?.availableCharacters && status.availableCharacters.length > 0 && (
          <div className="relative group">
            <button className="px-2 py-1 bg-[#4a7c59]/90 backdrop-blur text-[10px] rounded-sm border border-[#4a7c59] hover:bg-[#5a8c69]">
              +
            </button>
            <div className="absolute top-full left-0 mt-1 bg-[#0a0a0c]/95 backdrop-blur border border-[#3a3a42] hidden group-hover:block z-20 min-w-[100px] rounded-sm">
              {status.availableCharacters.slice(0, 3).map((char) => (
                <button
                  key={char.id}
                  onClick={() => deployHero.mutate({ characterId: char.id })}
                  className="w-full px-2 py-1 text-left text-[10px] hover:bg-[#2a2a30] flex items-center gap-1"
                >
                  <span>{char.character.portrait}</span>
                  <span>{char.character.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 底部状态 */}
      <div className="absolute bottom-2 left-2 right-2">
        <div className="flex items-center justify-between text-[10px]">
          {selectedHero ? (
            <span className="px-2 py-0.5 bg-[#0a0a0c]/80 backdrop-blur rounded-sm text-[#888]">
              ({selectedHero.positionX}, {selectedHero.positionY}) · 点击移动
            </span>
          ) : (
            <span className="px-2 py-0.5 bg-[#0a0a0c]/80 backdrop-blur rounded-sm text-[#666]">
              {status?.heroes.length ? "选择英雄" : "派遣角色探索"}
            </span>
          )}

          {onOpenFull && (
            <button
              onClick={onOpenFull}
              className="px-2 py-0.5 bg-[#0a0a0c]/80 backdrop-blur rounded-sm text-[#888] hover:text-[#c9a227] border border-transparent hover:border-[#c9a227]/50"
            >
              展开 →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
