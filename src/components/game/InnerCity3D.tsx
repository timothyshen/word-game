"use client";

import { Suspense, useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Box } from "@react-three/drei";
import * as THREE from "three";

// ============================================
// 类型定义
// ============================================
interface InnerCityTile {
  id: string;
  positionX: number;
  positionY: number;
  unlocked: boolean;
}

interface InnerCityBuilding {
  id: string;
  templateId: string;
  positionX: number;
  positionY: number;
  level: number;
  template: {
    id: string;
    name: string;
    icon: string;
  };
}

interface InnerCity3DProps {
  tiles: InnerCityTile[];
  buildings: InnerCityBuilding[];
  gridRadius: number;
  onTileClick?: (x: number, y: number) => void;
  onBuildingClick?: (building: InnerCityBuilding) => void;
  placementMode?: boolean;
  previewBuilding?: { height: number; icon?: string };
  selectedPosition?: { x: number; y: number } | null;
  expandablePositions?: { x: number; y: number }[];
}

// ============================================
// 主组件
// ============================================
export function InnerCity3D({
  tiles,
  buildings,
  gridRadius,
  onTileClick,
  onBuildingClick,
  placementMode = false,
  previewBuilding,
  selectedPosition,
  expandablePositions = [],
}: InnerCity3DProps) {
  // 创建格子位置集合用于快速查找
  const tileMap = useMemo(() => {
    const map = new Map<string, InnerCityTile>();
    tiles.forEach((tile) => {
      map.set(`${tile.positionX},${tile.positionY}`, tile);
    });
    return map;
  }, [tiles]);

  // 创建建筑位置集合
  const buildingMap = useMemo(() => {
    const map = new Map<string, InnerCityBuilding>();
    buildings.forEach((building) => {
      map.set(`${building.positionX},${building.positionY}`, building);
    });
    return map;
  }, [buildings]);

  // 创建可扩张位置集合
  const expandableSet = useMemo(() => {
    return new Set(expandablePositions.map((p) => `${p.x},${p.y}`));
  }, [expandablePositions]);

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [8, 8, 8], fov: 50 }}
        shadows
        style={{ background: "linear-gradient(to bottom, #2a3a4e, #1a1a2e)" }}
      >
        <Suspense fallback={null}>
          {/* 场景雾效 */}
          <fog attach="fog" args={["#1a1a2e", 8, 25]} />

          {/* 光照 */}
          <ambientLight intensity={0.6} />
          <hemisphereLight color="#ffe4c4" groundColor="#4a6a4a" intensity={0.8} />
          <directionalLight
            position={[8, 15, 6]}
            intensity={2.0}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-far={30}
            shadow-camera-left={-10}
            shadow-camera-right={10}
            shadow-camera-top={10}
            shadow-camera-bottom={-10}
            shadow-bias={-0.0001}
            color="#fff5e6"
          />
          <directionalLight position={[-5, 10, -5]} intensity={0.8} color="#aaccff" />
          <directionalLight position={[0, 12, 0]} intensity={0.5} color="#ffffff" />
          <pointLight position={[-3, 4, -3]} intensity={0.8} color="#c9a227" distance={15} />
          <pointLight position={[5, 3, 5]} intensity={0.5} color="#ffaa66" distance={12} />

          {/* 地面 */}
          <InnerCityGround
            gridRadius={gridRadius}
            tileMap={tileMap}
            buildingMap={buildingMap}
            expandableSet={expandableSet}
            placementMode={placementMode}
            selectedPosition={selectedPosition}
            onTileClick={onTileClick}
          />

          {/* 建筑物 */}
          {buildings.map((building) => (
            <InnerCityBuildingModel
              key={building.id}
              building={building}
              onClick={() => onBuildingClick?.(building)}
              isSelected={
                selectedPosition?.x === building.positionX &&
                selectedPosition?.y === building.positionY
              }
            />
          ))}

          {/* 放置预览 */}
          {placementMode && selectedPosition && previewBuilding && !buildingMap.has(`${selectedPosition.x},${selectedPosition.y}`) && (
            <BuildingPreview
              x={selectedPosition.x}
              y={selectedPosition.y}
              height={previewBuilding.height}
              icon={previewBuilding.icon}
            />
          )}

          {/* 轨道控制 */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={5}
            maxDistance={20}
            maxPolarAngle={Math.PI / 2.5}
            minPolarAngle={Math.PI / 6}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

// ============================================
// 内城地面网格
// ============================================
function InnerCityGround({
  gridRadius,
  tileMap,
  buildingMap,
  expandableSet,
  placementMode,
  selectedPosition,
  onTileClick,
}: {
  gridRadius: number;
  tileMap: Map<string, InnerCityTile>;
  buildingMap: Map<string, InnerCityBuilding>;
  expandableSet: Set<string>;
  placementMode: boolean;
  selectedPosition?: { x: number; y: number } | null;
  onTileClick?: (x: number, y: number) => void;
}) {
  const gridSize = gridRadius * 2 + 1;
  const totalSize = gridSize + 2; // 额外的边缘显示

  return (
    <group>
      {/* 主地面 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[totalSize + 2, totalSize + 2]} />
        <meshStandardMaterial color="#1a2a1a" roughness={0.9} />
      </mesh>

      {/* 网格格子 */}
      {Array.from({ length: totalSize * totalSize }).map((_, i) => {
        const gx = (i % totalSize) - gridRadius - 1;
        const gz = Math.floor(i / totalSize) - gridRadius - 1;
        const key = `${gx},${gz}`;
        const tile = tileMap.get(key);
        const hasBuilding = buildingMap.has(key);
        const isExpandable = expandableSet.has(key);
        const isSelected = selectedPosition?.x === gx && selectedPosition?.y === gz;
        const isUnlocked = tile?.unlocked ?? false;

        // 确定格子状态和颜色
        let tileColor = "#1a1a1a"; // 默认暗色（未解锁区域外）
        let tileOpacity = 0.3;
        let isClickable = false;

        if (isUnlocked) {
          tileColor = hasBuilding ? "#2a4a2a" : "#3a5a3a"; // 已解锁格子
          tileOpacity = 1;
          isClickable = placementMode && !hasBuilding;
        } else if (isExpandable) {
          tileColor = "#2a3a4a"; // 可扩张格子
          tileOpacity = 0.7;
          isClickable = true;
        }

        return (
          <group key={`tile-${i}`} position={[gx, 0, gz]}>
            {/* 格子地面 */}
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, 0.01, 0]}
              receiveShadow
              onClick={(e) => {
                e.stopPropagation();
                if (isClickable || isUnlocked) {
                  onTileClick?.(gx, gz);
                }
              }}
            >
              <planeGeometry args={[0.92, 0.92]} />
              <meshStandardMaterial
                color={tileColor}
                roughness={0.85}
                transparent={tileOpacity < 1}
                opacity={tileOpacity}
              />
            </mesh>

            {/* 选中高亮 */}
            {isSelected && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
                <planeGeometry args={[0.95, 0.95]} />
                <meshBasicMaterial color="#c9a227" transparent opacity={0.4} />
              </mesh>
            )}

            {/* 可放置提示 */}
            {placementMode && isUnlocked && !hasBuilding && !isSelected && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
                <ringGeometry args={[0.35, 0.4, 32]} />
                <meshBasicMaterial color="#4a9" transparent opacity={0.5} />
              </mesh>
            )}

            {/* 可扩张提示 */}
            {isExpandable && (
              <ExpandableGlow />
            )}

            {/* 未探索迷雾 */}
            {!isUnlocked && !isExpandable && (
              <mesh position={[0, 0.2, 0]}>
                <sphereGeometry args={[0.3, 8, 8]} />
                <meshStandardMaterial color="#1a1a2e" transparent opacity={0.6} />
              </mesh>
            )}
          </group>
        );
      })}

      {/* 网格线 */}
      {Array.from({ length: gridSize + 1 }).map((_, i) => (
        <group key={`grid-line-${i}`}>
          {/* X方向 */}
          <Box
            args={[gridSize, 0.02, 0.02]}
            position={[0, 0.005, i - gridRadius - 0.5]}
          >
            <meshStandardMaterial color="#3a5a3a" roughness={0.8} />
          </Box>
          {/* Z方向 */}
          <Box
            args={[0.02, 0.02, gridSize]}
            position={[i - gridRadius - 0.5, 0.005, 0]}
          >
            <meshStandardMaterial color="#3a5a3a" roughness={0.8} />
          </Box>
        </group>
      ))}
    </group>
  );
}

// ============================================
// 可扩张格子发光效果
// ============================================
function ExpandableGlow() {
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (glowRef.current) {
      const material = glowRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.3 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
    }
  });

  return (
    <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
      <ringGeometry args={[0.4, 0.46, 32]} />
      <meshBasicMaterial color="#9b59b6" transparent opacity={0.5} />
    </mesh>
  );
}

// ============================================
// 建筑模型
// ============================================
function InnerCityBuildingModel({
  building,
  onClick,
  isSelected,
}: {
  building: InnerCityBuilding;
  onClick: () => void;
  isSelected: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const x = building.positionX;
  const z = building.positionY;

  // 建筑高度公式：baseHeight + (level - 1) * 0.15
  const baseHeight = 0.4;
  const height = baseHeight + (building.level - 1) * 0.15;

  // 悬浮动画
  useFrame((state) => {
    if (groupRef.current) {
      if (isSelected) {
        groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 3) * 0.03;
      } else {
        groupRef.current.position.y = 0;
      }
    }
  });

  // 根据图标选择模型
  const renderBuildingModel = () => {
    switch (building.template.icon) {
      case "🏰":
        return <CastleModel height={height} isSelected={isSelected} />;
      case "🌾":
        return <FarmModel height={height} isSelected={isSelected} level={building.level} />;
      case "⚒️":
        return <BlacksmithModel height={height} isSelected={isSelected} />;
      case "🛡️":
        return <BarracksModel height={height} isSelected={isSelected} />;
      case "🏪":
        return <MarketModel height={height} isSelected={isSelected} />;
      default:
        return <GenericBuildingModel height={height} isSelected={isSelected} />;
    }
  };

  return (
    <group position={[x, 0, z]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <group ref={groupRef}>
        {renderBuildingModel()}
      </group>

      {/* 选中高亮环 */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.45, 0.55, 32]} />
          <meshBasicMaterial color="#c9a227" transparent opacity={0.7} />
        </mesh>
      )}

      {/* 等级指示 */}
      <mesh position={[0.4, 0.1, 0.4]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial
          color="#4a9eff"
          emissive="#4a9eff"
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
}

// ============================================
// 建筑预览（半透明）
// ============================================
function BuildingPreview({
  x,
  y,
  height,
  icon,
}: {
  x: number;
  y: number;
  height: number;
  icon?: string;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.02;
    }
  });

  return (
    <group position={[x, 0, y]}>
      <group ref={groupRef}>
        <mesh position={[0, height / 2 + 0.02, 0]} castShadow>
          <boxGeometry args={[0.4, height, 0.4]} />
          <meshStandardMaterial
            color="#4a9"
            transparent
            opacity={0.5}
            roughness={0.7}
          />
        </mesh>
        {/* 屋顶 */}
        <mesh position={[0, height + 0.1, 0]} castShadow>
          <coneGeometry args={[0.3, 0.2, 4]} />
          <meshStandardMaterial
            color="#8b6914"
            transparent
            opacity={0.5}
            roughness={0.6}
          />
        </mesh>
      </group>
    </group>
  );
}

// ============================================
// 建筑特效组件
// ============================================

// 烟雾粒子效果
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
          <meshStandardMaterial
            color="#888"
            transparent
            opacity={0.4 - i * 0.08}
            roughness={1}
          />
        </mesh>
      ))}
    </group>
  );
}

// 旗帜飘动效果
function FlagEffect({ position, color = "#c9a227" }: { position: [number, number, number]; color?: string }) {
  const flagRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (flagRef.current) {
      flagRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.2;
      flagRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 3) * 0.05;
    }
  });

  return (
    <group position={position}>
      {/* 旗杆 */}
      <mesh castShadow>
        <cylinderGeometry args={[0.008, 0.008, 0.25, 6]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.7} />
      </mesh>
      {/* 旗帜 */}
      <mesh ref={flagRef} position={[0.05, 0.08, 0]} castShadow>
        <planeGeometry args={[0.1, 0.07]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// 灯笼摇摆效果
function LanternEffect({ position }: { position: [number, number, number] }) {
  const lanternRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (lanternRef.current) {
      lanternRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.5) * 0.15;
    }
  });

  return (
    <group position={position}>
      {/* 吊绳 */}
      <mesh>
        <cylinderGeometry args={[0.003, 0.003, 0.08, 4]} />
        <meshStandardMaterial color="#5a4a3a" />
      </mesh>
      {/* 灯笼 */}
      <group ref={lanternRef} position={[0, -0.06, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.025, 0.02, 0.05, 8]} />
          <meshStandardMaterial
            color="#e74c3c"
            emissive="#ff6600"
            emissiveIntensity={0.6}
          />
        </mesh>
        <pointLight intensity={0.3} color="#ff9900" distance={0.5} />
      </group>
    </group>
  );
}

// ============================================
// 具体建筑模型
// ============================================

// 城堡模型
function CastleModel({ height, isSelected }: { height: number; isSelected: boolean }) {
  const towerHeight = height * 1.3;
  const towerRadius = 0.08;

  return (
    <group>
      {/* 主体 */}
      <mesh position={[0, height / 2 + 0.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.4, height, 0.4]} />
        <meshStandardMaterial
          color="#b8956a"
          roughness={0.7}
          emissive={isSelected ? "#c9a227" : "#000"}
          emissiveIntensity={isSelected ? 0.15 : 0}
        />
      </mesh>

      {/* 四角塔楼 */}
      {([[-0.22, -0.22], [-0.22, 0.22], [0.22, -0.22], [0.22, 0.22]] as [number, number][]).map(
        ([tx, tz], i) => (
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
        )
      )}

      {/* 飘动旗帜 */}
      <FlagEffect position={[0, height + 0.2, 0]} color="#c9a227" />
    </group>
  );
}

// 农田模型
function FarmModel({ height, isSelected, level }: { height: number; isSelected: boolean; level: number }) {
  const windmillRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (windmillRef.current) {
      windmillRef.current.rotation.z = state.clock.elapsedTime * 0.5;
    }
  });

  return (
    <group>
      {/* 田地 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[0.8, 0.8]} />
        <meshStandardMaterial color="#4a6830" roughness={0.95} />
      </mesh>

      {/* 谷仓 */}
      <group position={[0.2, 0, 0.2]}>
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

      {/* 作物 */}
      {Array.from({ length: 4 }).map((_, i) => (
        <group key={i} position={[-0.25 + i * 0.15, 0, -0.15]}>
          <mesh position={[0, 0.05, 0]} castShadow>
            <cylinderGeometry args={[0.008, 0.012, 0.08, 6]} />
            <meshStandardMaterial color="#5a7030" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.1, 0]} castShadow>
            <sphereGeometry args={[0.02, 6, 6]} />
            <meshStandardMaterial color="#c9a227" roughness={0.7} />
          </mesh>
        </group>
      ))}

      {/* 风车 (level >= 2) */}
      {level >= 2 && (
        <group position={[-0.25, 0, 0.25]}>
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

// 铁匠铺模型
function BlacksmithModel({ height, isSelected }: { height: number; isSelected: boolean }) {
  const fireRef = useRef<THREE.PointLight>(null);

  // 火焰闪烁效果
  useFrame((state) => {
    if (fireRef.current) {
      fireRef.current.intensity = 0.4 + Math.sin(state.clock.elapsedTime * 8) * 0.15;
    }
  });

  return (
    <group>
      {/* 主体 */}
      <mesh position={[0, height / 2 + 0.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.4, height, 0.35]} />
        <meshStandardMaterial
          color="#4a4a4a"
          roughness={0.8}
          emissive={isSelected ? "#c9a227" : "#000"}
          emissiveIntensity={isSelected ? 0.15 : 0}
        />
      </mesh>

      {/* 烟囱 */}
      <mesh position={[0.12, height + 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.05, 0.2, 8]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.9} />
      </mesh>

      {/* 烟雾效果 */}
      <SmokeEffect position={[0.12, height + 0.2, 0]} />

      {/* 铁砧装饰 */}
      <mesh position={[0, 0.06, 0.2]} castShadow>
        <boxGeometry args={[0.08, 0.06, 0.05]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.6} metalness={0.4} />
      </mesh>

      {/* 炉火（动态闪烁） */}
      <pointLight ref={fireRef} position={[0, 0.15, 0.15]} intensity={0.5} color="#ff6600" distance={1} />

      {/* 火焰视觉效果 */}
      <mesh position={[0, 0.12, 0.16]}>
        <planeGeometry args={[0.06, 0.08]} />
        <meshStandardMaterial
          color="#ff4400"
          emissive="#ff6600"
          emissiveIntensity={1.2}
          transparent
          opacity={0.8}
        />
      </mesh>
    </group>
  );
}

// 兵营模型
function BarracksModel({ height, isSelected }: { height: number; isSelected: boolean }) {
  return (
    <group>
      {/* 主体 */}
      <mesh position={[0, height / 2 + 0.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.45, height, 0.35]} />
        <meshStandardMaterial
          color="#5a4a3a"
          roughness={0.75}
          emissive={isSelected ? "#c9a227" : "#000"}
          emissiveIntensity={isSelected ? 0.15 : 0}
        />
      </mesh>

      {/* 尖顶 */}
      <mesh position={[0, height + 0.1, 0]} castShadow>
        <coneGeometry args={[0.28, 0.2, 4]} />
        <meshStandardMaterial color="#8b6040" roughness={0.7} />
      </mesh>

      {/* 飘动旗帜 */}
      <FlagEffect position={[-0.15, height + 0.2, 0]} color="#e74c3c" />
    </group>
  );
}

// 市场模型
function MarketModel({ height, isSelected }: { height: number; isSelected: boolean }) {
  return (
    <group>
      {/* 柱子 */}
      {([[-0.15, -0.15], [-0.15, 0.15], [0.15, -0.15], [0.15, 0.15]] as [number, number][]).map(
        ([px, pz], i) => (
          <mesh key={i} position={[px, height / 2 + 0.02, pz]} castShadow>
            <cylinderGeometry args={[0.03, 0.03, height, 8]} />
            <meshStandardMaterial color="#8b7355" roughness={0.7} />
          </mesh>
        )
      )}

      {/* 顶棚 */}
      <mesh position={[0, height + 0.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.45, 0.06, 0.45]} />
        <meshStandardMaterial
          color="#c9a227"
          roughness={0.5}
          emissive={isSelected ? "#c9a227" : "#000"}
          emissiveIntensity={isSelected ? 0.2 : 0}
        />
      </mesh>

      {/* 摊位 */}
      <mesh position={[0, 0.08, 0]} castShadow>
        <boxGeometry args={[0.25, 0.08, 0.2]} />
        <meshStandardMaterial color="#8b5530" roughness={0.8} />
      </mesh>

      {/* 灯笼 - 挂在两侧柱子上 */}
      <LanternEffect position={[-0.15, height - 0.05, -0.2]} />
      <LanternEffect position={[0.15, height - 0.05, -0.2]} />
    </group>
  );
}

// 通用建筑模型
function GenericBuildingModel({ height, isSelected }: { height: number; isSelected: boolean }) {
  return (
    <group>
      {/* 主体 */}
      <mesh position={[0, height / 2 + 0.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.35, height, 0.35]} />
        <meshStandardMaterial
          color="#6a5a4a"
          roughness={0.75}
          emissive={isSelected ? "#c9a227" : "#000"}
          emissiveIntensity={isSelected ? 0.15 : 0}
        />
      </mesh>

      {/* 屋顶 */}
      <mesh position={[0, height + 0.08, 0]} castShadow>
        <coneGeometry args={[0.25, 0.15, 4]} />
        <meshStandardMaterial color="#8b6914" roughness={0.6} />
      </mesh>

      {/* 门 */}
      <mesh position={[0, 0.08, 0.18]} castShadow>
        <boxGeometry args={[0.08, 0.12, 0.02]} />
        <meshStandardMaterial color="#3a2515" roughness={0.9} />
      </mesh>

      {/* 窗户 */}
      <mesh position={[0, height * 0.6, 0.18]} castShadow>
        <boxGeometry args={[0.06, 0.06, 0.02]} />
        <meshStandardMaterial color="#ffd070" emissive="#ffa500" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

export default InnerCity3D;
