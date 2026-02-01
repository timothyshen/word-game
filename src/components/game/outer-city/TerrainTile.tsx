"use client";

import React, { useState, useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BIOME_COLORS } from "~/constants";
import { getTerrainHeight, seededRandom } from "./terrain";
import {
  TreeModel,
  RockModel,
  CactusModel,
  ReedModel,
  GrassModel,
  MushroomModel,
  BushModel,
  FlowerModel,
  DeadTreeModel,
  LilyPadModel,
  WaterPuddle,
} from "./decorations";
import { BaseCastleModel } from "./CastleModel";
import { POIMarker, HeroMarker } from "./MapMarkers";

function TerrainDecorations({ biome, seed }: { biome: string; seed: number }) {
  const decorations = useMemo(() => {
    const rand = seededRandom(seed);
    const items: React.ReactElement[] = [];

    if (biome === "forest") {
      const treeCount = 2 + Math.floor(rand() * 2);
      for (let i = 0; i < treeCount; i++) {
        items.push(
          <TreeModel
            key={`tree-${i}`}
            position={[rand() * 0.6 - 0.3, 0, rand() * 0.6 - 0.3]}
            scale={0.6 + rand() * 0.5}
            variant={Math.floor(rand() * 3)}
          />
        );
      }
      if (rand() > 0.3) {
        items.push(
          <BushModel
            key="bush-1"
            position={[rand() * 0.4 - 0.2, 0, rand() * 0.4 - 0.2]}
            scale={0.8 + rand() * 0.4}
          />
        );
      }
      if (rand() > 0.5) {
        items.push(
          <BushModel
            key="bush-2"
            position={[rand() * 0.4 + 0.1, 0, rand() * 0.4 - 0.3]}
            scale={0.6 + rand() * 0.3}
          />
        );
      }
      const mushroomCount = Math.floor(rand() * 3);
      for (let i = 0; i < mushroomCount; i++) {
        items.push(
          <MushroomModel
            key={`mushroom-${i}`}
            position={[rand() * 0.5 - 0.25, 0, rand() * 0.5 - 0.25]}
            scale={0.8 + rand() * 0.6}
          />
        );
      }
    }

    if (biome === "mountain") {
      const rockCount = 3 + Math.floor(rand() * 3);
      for (let i = 0; i < rockCount; i++) {
        items.push(
          <RockModel
            key={`rock-${i}`}
            position={[rand() * 0.5 - 0.25, 0.03 + rand() * 0.05, rand() * 0.5 - 0.25]}
            scale={0.4 + rand() * 0.8}
          />
        );
      }
    }

    if (biome === "desert") {
      if (rand() > 0.3) {
        items.push(
          <CactusModel
            key="cactus-1"
            position={[rand() * 0.4 - 0.2, 0, rand() * 0.4 - 0.2]}
            scale={0.8 + rand() * 0.5}
          />
        );
      }
      if (rand() > 0.5) {
        items.push(
          <CactusModel
            key="cactus-2"
            position={[rand() * 0.3 + 0.1, 0, rand() * 0.3 - 0.2]}
            scale={0.5 + rand() * 0.4}
          />
        );
      }
      if (rand() > 0.6) {
        items.push(
          <DeadTreeModel
            key="deadtree"
            position={[rand() * 0.4 - 0.2, 0, rand() * 0.4 - 0.2]}
            scale={0.7 + rand() * 0.4}
          />
        );
      }
      const smallRockCount = Math.floor(rand() * 3);
      for (let i = 0; i < smallRockCount; i++) {
        items.push(
          <RockModel
            key={`rock-${i}`}
            position={[rand() * 0.5 - 0.25, 0.02, rand() * 0.5 - 0.25]}
            scale={0.3 + rand() * 0.3}
          />
        );
      }
    }

    if (biome === "swamp") {
      items.push(
        <WaterPuddle
          key="water"
          position={[rand() * 0.3 - 0.15, 0.05, rand() * 0.3 - 0.15]}
        />
      );
      const reedCount = 2 + Math.floor(rand() * 3);
      for (let i = 0; i < reedCount; i++) {
        items.push(
          <ReedModel
            key={`reed-${i}`}
            position={[rand() * 0.5 - 0.25, 0, rand() * 0.5 - 0.25]}
            scale={0.7 + rand() * 0.4}
          />
        );
      }
      if (rand() > 0.4) {
        items.push(
          <LilyPadModel
            key="lily-1"
            position={[rand() * 0.2 - 0.1, 0.06, rand() * 0.2 - 0.1]}
          />
        );
      }
      if (rand() > 0.6) {
        items.push(
          <LilyPadModel
            key="lily-2"
            position={[rand() * 0.2 + 0.05, 0.06, rand() * 0.2 - 0.15]}
          />
        );
      }
    }

    if (biome === "grassland") {
      const grassCount = 3 + Math.floor(rand() * 2);
      for (let i = 0; i < grassCount; i++) {
        items.push(
          <GrassModel
            key={`grass-${i}`}
            position={[rand() * 0.6 - 0.3, 0, rand() * 0.6 - 0.3]}
            scale={0.8 + rand() * 0.4}
          />
        );
      }
      const flowerColors = ["#ff6b9d", "#ffaa55", "#aa88ff", "#77ccff", "#ffff77"];
      const flowerCount = Math.floor(rand() * 3);
      for (let i = 0; i < flowerCount; i++) {
        items.push(
          <FlowerModel
            key={`flower-${i}`}
            position={[rand() * 0.5 - 0.25, 0, rand() * 0.5 - 0.25]}
            scale={0.8 + rand() * 0.4}
            color={flowerColors[Math.floor(rand() * flowerColors.length)]}
          />
        );
      }
      if (rand() > 0.7) {
        items.push(
          <BushModel
            key="bush"
            position={[rand() * 0.4 - 0.2, 0, rand() * 0.4 - 0.2]}
            scale={0.5 + rand() * 0.3}
          />
        );
      }
    }

    return items;
  }, [biome, seed]);

  return <>{decorations}</>;
}

export function TerrainTile({
  position,
  worldX,
  worldY,
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
  worldX: number;
  worldY: number;
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

  const height = explorationLevel === 2 ? getTerrainHeight(worldX, worldY, biome) : 0;
  const tileThickness = biome === "mountain" ? 0.15 + height * 0.3 : 0.1;

  useFrame((state) => {
    if (meshRef.current && canMove) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.2 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
    }
  });

  return (
    <group position={[position[0], height, position[2]]}>
      <mesh
        ref={meshRef}
        receiveShadow
        castShadow
        onClick={onClick}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <boxGeometry args={[0.95, tileThickness, 0.95]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          emissive={canMove ? "#c9a227" : hovered ? "#4a9" : "#000"}
          emissiveIntensity={canMove ? 0.3 : hovered ? 0.1 : 0}
        />
      </mesh>

      {biome === "swamp" && explorationLevel === 2 && (
        <mesh position={[0, tileThickness / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.9, 0.9]} />
          <meshStandardMaterial
            color="#2a4a5a"
            transparent
            opacity={0.4}
            roughness={0.1}
            metalness={0.3}
          />
        </mesh>
      )}

      {explorationLevel === 1 && (
        <mesh position={[0, 0.15, 0]}>
          <boxGeometry args={[0.9, 0.2, 0.9]} />
          <meshStandardMaterial color="#1a1a2e" transparent opacity={0.6} />
        </mesh>
      )}

      {isCenter && !hasHero && explorationLevel === 2 && (
        <group position={[0, tileThickness / 2, 0]}>
          <BaseCastleModel />
        </group>
      )}

      {explorationLevel === 2 && !hasPOI && !hasHero && !isCenter && (
        <group position={[0, tileThickness / 2, 0]}>
          <TerrainDecorations biome={biome} seed={worldX * 100 + worldY} />
        </group>
      )}

      {hasPOI && !hasHero && explorationLevel === 2 && (
        <group position={[0, tileThickness / 2, 0]}>
          <POIMarker type={poiType ?? "resource"} />
        </group>
      )}

      {hasHero && (
        <group position={[0, tileThickness / 2, 0]}>
          <HeroMarker />
        </group>
      )}
    </group>
  );
}
