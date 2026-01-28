"use client";

import { useState, useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { api } from "~/trpc/react";
import { BIOME_COLORS, POI_COLORS } from "~/constants";

// ===== 3D地形装饰组件 =====

function TreeModel({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.03, 0.2, 6]} />
        <meshStandardMaterial color="#5a4030" roughness={0.9} />
      </mesh>
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

function CactusModel({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.04, 0.2, 8]} />
        <meshStandardMaterial color="#4a8050" roughness={0.7} />
      </mesh>
      <mesh position={[0.05, 0.12, 0]} rotation={[0, 0, -0.5]} castShadow>
        <cylinderGeometry args={[0.015, 0.02, 0.08, 6]} />
        <meshStandardMaterial color="#4a8050" roughness={0.7} />
      </mesh>
    </group>
  );
}

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

function TerrainDecorations({ biome, seed }: { biome: string; seed: number }) {
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

  const color = BIOME_COLORS[biome] ?? "#333";
  const opacity = explorationLevel === 2 ? 1 : explorationLevel === 1 ? 0.4 : 0.1;

  useFrame((state) => {
    if (meshRef.current && canMove) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.2 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
    }
  });

  return (
    <group position={position}>
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

      {explorationLevel === 1 && (
        <mesh position={[0, 0.15, 0]}>
          <boxGeometry args={[0.9, 0.2, 0.9]} />
          <meshStandardMaterial color="#1a1a2e" transparent opacity={0.6} />
        </mesh>
      )}

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

      {explorationLevel === 2 && !hasPOI && !hasHero && !isCenter && (
        <TerrainDecorations biome={biome} seed={position[0] * 100 + position[2]} />
      )}

      {hasPOI && !hasHero && explorationLevel === 2 && (
        <POIMarker type={poiType ?? "resource"} />
      )}

      {hasHero && <HeroMarker />}
    </group>
  );
}

function POIMarker({ type }: { type: string }) {
  const color = POI_COLORS[type] ?? "#888";

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

function FogBoundary({ radius }: { radius: number }) {
  return (
    <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius, radius + 4, 32]} />
      <meshStandardMaterial color="#1a1a2e" transparent opacity={0.8} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ===== 战斗状态类型 =====
interface CombatState {
  active: boolean;
  poiId: string;
  heroHp: number;
  heroMaxHp: number;
  enemyHp: number;
  enemyMaxHp: number;
  enemyName: string;
  enemyIcon: string;
  turn: number;
  logs: string[];
}

// ===== 主组件 =====
export default function OuterCityFullMap() {
  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(null);
  const [combat, setCombat] = useState<CombatState | null>(null);
  const [actionLog, setActionLog] = useState<string | null>(null);
  const [showHeroSidebar, setShowHeroSidebar] = useState(true);

  const utils = api.useUtils();

  const { data: status } = api.outerCity.getStatus.useQuery();
  const { data: mapData } = api.outerCity.getVisibleMap.useQuery();

  const deployHero = api.outerCity.deployHero.useMutation({
    onSuccess: () => {
      void utils.outerCity.getStatus.invalidate();
      void utils.outerCity.getVisibleMap.invalidate();
    },
  });

  const recallHero = api.outerCity.recallHero.useMutation({
    onSuccess: () => {
      void utils.outerCity.getStatus.invalidate();
    },
  });

  const restHero = api.outerCity.restHero.useMutation({
    onSuccess: () => {
      void utils.outerCity.getStatus.invalidate();
    },
  });

  const moveHero = api.outerCity.moveHero.useMutation({
    onSuccess: () => {
      void utils.outerCity.getStatus.invalidate();
      void utils.outerCity.getVisibleMap.invalidate();
    },
  });

  const startCombat = api.outerCity.startCombat.useMutation({
    onSuccess: (data) => {
      if (data.success && data.combat) {
        setCombat({
          active: true,
          poiId: data.combat.poiId,
          heroHp: data.combat.hero.hp,
          heroMaxHp: data.combat.hero.maxHp,
          enemyHp: data.combat.enemy.hp,
          enemyMaxHp: data.combat.enemy.maxHp,
          enemyName: data.combat.enemy.name,
          enemyIcon: data.combat.enemy.icon,
          turn: data.combat.turn,
          logs: data.combat.logs,
        });
      }
    },
  });

  const combatAction = api.outerCity.combatAction.useMutation({
    onSuccess: (data) => {
      if (data.result === "victory" || data.result === "defeat" || data.result === "fled") {
        setCombat(null);
        setActionLog(data.logs.join(" "));
        setTimeout(() => setActionLog(null), 3000);
        void utils.outerCity.getStatus.invalidate();
        void utils.outerCity.getVisibleMap.invalidate();
      } else if (combat) {
        setCombat({
          ...combat,
          heroHp: data.heroHp,
          enemyHp: data.enemyHp,
          turn: data.turn,
          logs: [...combat.logs.slice(-2), ...data.logs],
        });
      }
    },
  });

  const harvestResource = api.outerCity.harvestResource.useMutation({
    onSuccess: (data) => {
      setActionLog(data.message);
      setTimeout(() => setActionLog(null), 3000);
      void utils.outerCity.getStatus.invalidate();
      void utils.outerCity.getVisibleMap.invalidate();
    },
    onError: (err) => {
      setActionLog(err.message);
      setTimeout(() => setActionLog(null), 3000);
    },
  });

  const selectedHero = status?.heroes.find((h) => h.id === selectedHeroId);
  const centerX = selectedHero?.positionX ?? 0;
  const centerY = selectedHero?.positionY ?? 0;

  const currentPOI = selectedHero
    ? mapData?.pois.find(
        (p) => p.positionX === selectedHero.positionX && p.positionY === selectedHero.positionY
      )
    : null;

  // 扩大可视范围
  const mapRadius = 5;

  const handleTileClick = (x: number, y: number) => {
    if (!selectedHero || combat?.active) return;

    const dx = Math.abs(x - selectedHero.positionX);
    const dy = Math.abs(y - selectedHero.positionY);

    if (dx + dy === 1) {
      moveHero.mutate({ heroId: selectedHero.id, targetX: x, targetY: y });
    }
  };

  const handleCombatAction = (action: "attack" | "defend" | "skill" | "flee") => {
    if (!combat || !selectedHero) return;
    combatAction.mutate({
      heroId: selectedHero.id,
      poiId: combat.poiId,
      action,
      heroHp: combat.heroHp,
      enemyHp: combat.enemyHp,
      turn: combat.turn,
    });
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
    <div className="relative w-full h-full">
      {/* 全屏3D地图 */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#2a3a4e] to-[#1a1a2e]">
        <Canvas camera={{ position: [8, 8, 8], fov: 45 }} shadows>
          <Suspense fallback={null}>
            <fog attach="fog" args={["#1a1a2e", 8, 20]} />
            <ambientLight intensity={0.5} />
            <hemisphereLight color="#ffe4c4" groundColor="#4a6a4a" intensity={0.6} />
            <directionalLight
              position={[5, 10, 5]}
              intensity={1.5}
              castShadow
              shadow-mapSize-width={1024}
              shadow-mapSize-height={1024}
            />

            <FogBoundary radius={mapRadius + 1} />

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
              minDistance={5}
              maxDistance={15}
              maxPolarAngle={Math.PI / 2.5}
              minPolarAngle={Math.PI / 6}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* 左侧英雄侧边栏 */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-56 bg-[#0a0a0c]/90 backdrop-blur border-r border-[#2a3a4a] transition-transform duration-300 z-20 ${
          showHeroSidebar ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-3 h-full overflow-y-auto">
          <h3 className="text-sm font-bold text-[#c9a227] mb-3">派遣英雄</h3>

          {/* 已派遣的英雄 */}
          {status?.heroes && status.heroes.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-[#888] mb-2">已派遣</p>
              {status.heroes.map((hero) => (
                <div
                  key={hero.id}
                  onClick={() => setSelectedHeroId(hero.id)}
                  className={`mb-2 cursor-pointer rounded p-2 transition-all ${
                    selectedHeroId === hero.id
                      ? "bg-[#c9a227]/20 border border-[#c9a227]"
                      : "bg-[#1a1a20] hover:bg-[#2a2a30] border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{hero.character.character.portrait}</span>
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-sm text-[#e0dcd0]">
                        {hero.character.character.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-[#888]">
                        <span>⚡{hero.stamina}/100</span>
                        <span>({hero.positionX}, {hero.positionY})</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        restHero.mutate({ heroId: hero.id });
                      }}
                      className="flex-1 rounded bg-[#4a7c59] px-2 py-1 text-xs hover:bg-[#5a8c69] disabled:opacity-50"
                      disabled={restHero.isPending}
                    >
                      休息
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        recallHero.mutate({ heroId: hero.id });
                      }}
                      className="flex-1 rounded bg-[#7c4a4a] px-2 py-1 text-xs hover:bg-[#8c5a5a] disabled:opacity-50"
                      disabled={recallHero.isPending}
                    >
                      召回
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 可派遣的角色 */}
          {status?.availableCharacters && status.availableCharacters.length > 0 && (
            <div>
              <p className="text-xs text-[#888] mb-2">可派遣</p>
              {status.availableCharacters.map((char) => (
                <div
                  key={char.id}
                  className="mb-2 flex items-center gap-2 rounded bg-[#1a1a20] p-2"
                >
                  <span className="text-xl">{char.character.portrait}</span>
                  <p className="flex-1 truncate text-sm text-[#e0dcd0]">
                    {char.character.name}
                  </p>
                  <button
                    onClick={() => deployHero.mutate({ characterId: char.id })}
                    className="rounded bg-[#4a7c59] px-2 py-1 text-xs hover:bg-[#5a8c69] disabled:opacity-50"
                    disabled={deployHero.isPending}
                  >
                    派遣
                  </button>
                </div>
              ))}
            </div>
          )}

          {!status?.heroes?.length && !status?.availableCharacters?.length && (
            <p className="text-center text-sm text-[#888]">暂无可派遣角色</p>
          )}
        </div>
      </div>

      {/* 侧边栏切换按钮 */}
      <button
        onClick={() => setShowHeroSidebar(!showHeroSidebar)}
        className={`absolute top-1/2 -translate-y-1/2 w-6 h-16 bg-[#0a0a0c]/80 backdrop-blur border border-[#2a3a4a] flex items-center justify-center text-[#888] hover:text-[#c9a227] transition-all z-30 ${
          showHeroSidebar ? "left-56" : "left-0"
        }`}
      >
        {showHeroSidebar ? "◀" : "▶"}
      </button>

      {/* 战斗面板 */}
      {combat?.active && selectedHero && (
        <div className="absolute inset-0 bg-[#0a0a0c]/95 backdrop-blur flex items-center justify-center z-40">
          <div className="w-full max-w-md p-6">
            <div className="text-lg text-[#c9a227] font-bold mb-4 text-center">战斗中</div>

            {/* 双方血条 */}
            <div className="flex justify-between gap-4 mb-4">
              {/* 英雄 */}
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm mb-1">
                  <span className="text-xl">{selectedHero.character.character.portrait}</span>
                  <span className="text-[#4a9]">{selectedHero.character.character.name}</span>
                </div>
                <div className="h-3 bg-[#1a1a20] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#4a9] to-[#5ba] transition-all"
                    style={{ width: `${(combat.heroHp / combat.heroMaxHp) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-[#888] mt-1">{combat.heroHp}/{combat.heroMaxHp}</div>
              </div>

              <div className="text-2xl text-[#c9a227]">⚔️</div>

              {/* 敌人 */}
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm mb-1 justify-end">
                  <span className="text-[#e74c3c]">{combat.enemyName}</span>
                  <span className="text-xl">{combat.enemyIcon}</span>
                </div>
                <div className="h-3 bg-[#1a1a20] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#e74c3c] to-[#c0392b] transition-all"
                    style={{ width: `${(combat.enemyHp / combat.enemyMaxHp) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-[#888] text-right mt-1">{combat.enemyHp}/{combat.enemyMaxHp}</div>
              </div>
            </div>

            {/* 战斗日志 */}
            <div className="bg-[#1a1a20] rounded p-3 mb-4 h-24 overflow-y-auto text-sm text-[#888]">
              {combat.logs.slice(-4).map((log, i) => (
                <div key={i} className="mb-1">{log}</div>
              ))}
            </div>

            {/* 行动按钮 */}
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => handleCombatAction("attack")}
                disabled={combatAction.isPending}
                className="py-2 text-sm bg-[#e74c3c] hover:bg-[#c0392b] disabled:opacity-50 rounded"
              >
                攻击
              </button>
              <button
                onClick={() => handleCombatAction("skill")}
                disabled={combatAction.isPending}
                className="py-2 text-sm bg-[#9b59b6] hover:bg-[#8e44ad] disabled:opacity-50 rounded"
              >
                技能
              </button>
              <button
                onClick={() => handleCombatAction("defend")}
                disabled={combatAction.isPending}
                className="py-2 text-sm bg-[#3498db] hover:bg-[#2980b9] disabled:opacity-50 rounded"
              >
                防御
              </button>
              <button
                onClick={() => handleCombatAction("flee")}
                disabled={combatAction.isPending}
                className="py-2 text-sm bg-[#7f8c8d] hover:bg-[#95a5a6] disabled:opacity-50 rounded"
              >
                逃跑
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POI交互面板 */}
      {currentPOI && !combat?.active && selectedHero && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-[#0a0a0c]/95 backdrop-blur border border-[#3a3a42] rounded-lg p-4 z-20 min-w-[280px]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{currentPOI.icon}</span>
              <div>
                <div className="text-sm font-bold text-[#e0dcd0]">{currentPOI.name}</div>
                <div className="text-xs text-[#888]">
                  {currentPOI.type === "resource" && `${currentPOI.resourceType}: ${currentPOI.resourceAmount}`}
                  {currentPOI.type === "garrison" && `难度: ${currentPOI.difficulty}`}
                  {currentPOI.type === "lair" && `难度: ${currentPOI.difficulty}`}
                  {currentPOI.type === "settlement" && "友好定居点"}
                  {currentPOI.type === "shrine" && `祈祷恢复 ${currentPOI.resourceType}`}
                  {currentPOI.type === "ruin" && `探索难度: ${currentPOI.difficulty}`}
                  {currentPOI.type === "caravan" && "交易商品"}
                </div>
              </div>
            </div>

            {currentPOI.type === "resource" && (
              <button
                onClick={() => harvestResource.mutate({ heroId: selectedHero.id, poiId: currentPOI.id })}
                disabled={harvestResource.isPending || currentPOI.resourceAmount <= 0}
                className="px-4 py-2 text-sm bg-[#4a9] hover:bg-[#5ba] disabled:opacity-50 disabled:cursor-not-allowed rounded"
              >
                {harvestResource.isPending ? "..." : "采集"}
              </button>
            )}
            {(currentPOI.type === "garrison" || currentPOI.type === "lair") && !currentPOI.isDefeated && (
              <button
                onClick={() => startCombat.mutate({ heroId: selectedHero.id, poiId: currentPOI.id })}
                disabled={startCombat.isPending}
                className="px-4 py-2 text-sm bg-[#e74c3c] hover:bg-[#c0392b] disabled:opacity-50 rounded"
              >
                {startCombat.isPending ? "..." : "战斗"}
              </button>
            )}
            {(currentPOI.type === "garrison" || currentPOI.type === "lair") && currentPOI.isDefeated && (
              <span className="text-sm text-[#4a9]">已征服</span>
            )}
            {currentPOI.type === "settlement" && (
              <span className="text-sm text-[#3498db]">交易中...</span>
            )}
            {currentPOI.type === "shrine" && (
              <button
                onClick={() => harvestResource.mutate({ heroId: selectedHero.id, poiId: currentPOI.id })}
                disabled={harvestResource.isPending}
                className="px-4 py-2 text-sm bg-[#f1c40f] hover:bg-[#f39c12] text-[#08080a] disabled:opacity-50 rounded"
              >
                {harvestResource.isPending ? "..." : "祈祷"}
              </button>
            )}
            {currentPOI.type === "ruin" && !currentPOI.isDefeated && (
              <button
                onClick={() => startCombat.mutate({ heroId: selectedHero.id, poiId: currentPOI.id })}
                disabled={startCombat.isPending}
                className="px-4 py-2 text-sm bg-[#95a5a6] hover:bg-[#7f8c8d] disabled:opacity-50 rounded"
              >
                {startCombat.isPending ? "..." : "探索"}
              </button>
            )}
            {currentPOI.type === "ruin" && currentPOI.isDefeated && (
              <span className="text-sm text-[#4a9]">已探索</span>
            )}
            {currentPOI.type === "caravan" && (
              <button
                onClick={() => harvestResource.mutate({ heroId: selectedHero.id, poiId: currentPOI.id })}
                disabled={harvestResource.isPending}
                className="px-4 py-2 text-sm bg-[#e67e22] hover:bg-[#d35400] disabled:opacity-50 rounded"
              >
                {harvestResource.isPending ? "..." : "交易"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 行动日志提示 */}
      {actionLog && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-[#c9a227]/90 text-[#08080a] text-sm px-4 py-2 rounded z-20">
          {actionLog}
        </div>
      )}

      {/* 底部状态提示 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        {selectedHero ? (
          <span className="px-4 py-2 bg-[#0a0a0c]/80 backdrop-blur rounded text-sm text-[#888]">
            {selectedHero.character.character.name} ({selectedHero.positionX}, {selectedHero.positionY}) · 点击相邻格子移动
          </span>
        ) : (
          <span className="px-4 py-2 bg-[#0a0a0c]/80 backdrop-blur rounded text-sm text-[#666]">
            {status?.heroes?.length ? "选择英雄开始探索" : "派遣角色探索外城"}
          </span>
        )}
      </div>
    </div>
  );
}
