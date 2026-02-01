"use client";

import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ===== Nature/Terrain Decoration 3D Models =====

export function TreeModel({ position, scale = 1, variant = 0 }: { position: [number, number, number]; scale?: number; variant?: number }) {
  const treeRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (treeRef.current) {
      const wind = Math.sin(state.clock.elapsedTime * 1.5 + position[0] * 2 + position[2]) * 0.02;
      treeRef.current.rotation.z = wind;
      treeRef.current.rotation.x = wind * 0.5;
    }
  });

  const treeColors = [
    { trunk: "#4a3520", foliage: ["#2d5a27", "#3a6a37", "#4a7a47"] },
    { trunk: "#5a4030", foliage: ["#3a7035", "#4a8045", "#5a9055"] },
    { trunk: "#8a7a6a", foliage: ["#5a8a4a", "#6a9a5a", "#7aaa6a"] },
  ];
  const colors = treeColors[variant % 3]!;

  return (
    <group ref={treeRef} position={position} scale={scale}>
      <mesh position={[0, 0.06, 0]} castShadow>
        <cylinderGeometry args={[0.015, 0.025, 0.12, 6]} />
        <meshStandardMaterial color={colors.trunk} roughness={0.95} />
      </mesh>
      <mesh position={[0.005, 0.14, 0.003]} rotation={[0.05, 0, 0.03]} castShadow>
        <cylinderGeometry args={[0.012, 0.018, 0.1, 6]} />
        <meshStandardMaterial color={colors.trunk} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.22, 0]} castShadow>
        <sphereGeometry args={[0.09, 8, 6]} />
        <meshStandardMaterial color={colors.foliage[0]} roughness={0.85} />
      </mesh>
      <mesh position={[0.02, 0.28, 0.01]} castShadow>
        <sphereGeometry args={[0.07, 8, 6]} />
        <meshStandardMaterial color={colors.foliage[1]} roughness={0.85} />
      </mesh>
      <mesh position={[-0.01, 0.33, -0.01]} castShadow>
        <sphereGeometry args={[0.05, 8, 6]} />
        <meshStandardMaterial color={colors.foliage[2]} roughness={0.85} />
      </mesh>
    </group>
  );
}

export function RockModel({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
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

export function CactusModel({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
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

export function ReedModel({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
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

export function GrassModel({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const grassRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (grassRef.current) {
      const wind = Math.sin(state.clock.elapsedTime * 2.5 + position[0] * 3 + position[2] * 2) * 0.15;
      grassRef.current.rotation.z = wind;
    }
  });

  return (
    <group ref={grassRef} position={position} scale={scale}>
      {[-0.03, 0, 0.03].map((x, i) => (
        <mesh key={i} position={[x, 0.03, (i - 1) * 0.02]} castShadow>
          <coneGeometry args={[0.01, 0.06, 4]} />
          <meshStandardMaterial color={i === 1 ? "#5a8a59" : "#4a7a49"} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

export function MushroomModel({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.008, 0.012, 0.04, 6]} />
        <meshStandardMaterial color="#e8dcc8" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.045, 0]} castShadow>
        <sphereGeometry args={[0.025, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#8b4513" roughness={0.7} />
      </mesh>
    </group>
  );
}

export function BushModel({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const bushRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (bushRef.current) {
      const wind = Math.sin(state.clock.elapsedTime * 1.2 + position[0] * 2) * 0.01;
      bushRef.current.rotation.z = wind;
    }
  });

  return (
    <group ref={bushRef} position={position} scale={scale}>
      <mesh position={[0, 0.04, 0]} castShadow>
        <sphereGeometry args={[0.05, 8, 6]} />
        <meshStandardMaterial color="#3a5a35" roughness={0.9} />
      </mesh>
      <mesh position={[0.03, 0.03, 0.02]} castShadow>
        <sphereGeometry args={[0.035, 6, 5]} />
        <meshStandardMaterial color="#4a6a45" roughness={0.9} />
      </mesh>
      <mesh position={[-0.025, 0.025, -0.02]} castShadow>
        <sphereGeometry args={[0.03, 6, 5]} />
        <meshStandardMaterial color="#3a5a35" roughness={0.9} />
      </mesh>
    </group>
  );
}

export function FlowerModel({ position, scale = 1, color = "#ff6b9d" }: { position: [number, number, number]; scale?: number; color?: string }) {
  const flowerRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (flowerRef.current) {
      const sway = Math.sin(state.clock.elapsedTime * 2 + position[0] * 5) * 0.1;
      flowerRef.current.rotation.z = sway;
    }
  });

  return (
    <group ref={flowerRef} position={position} scale={scale}>
      <mesh position={[0, 0.025, 0]} castShadow>
        <cylinderGeometry args={[0.003, 0.004, 0.05, 4]} />
        <meshStandardMaterial color="#4a7a45" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.055, 0]} castShadow>
        <sphereGeometry args={[0.012, 6, 6]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
    </group>
  );
}

export function DeadTreeModel({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.1, 0]} rotation={[0.1, 0, 0.05]} castShadow>
        <cylinderGeometry args={[0.015, 0.025, 0.2, 5]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.95} />
      </mesh>
      <mesh position={[0.04, 0.15, 0]} rotation={[0, 0, -0.8]} castShadow>
        <cylinderGeometry args={[0.005, 0.01, 0.08, 4]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.95} />
      </mesh>
      <mesh position={[-0.03, 0.18, 0.02]} rotation={[0.2, 0, 0.6]} castShadow>
        <cylinderGeometry args={[0.004, 0.008, 0.06, 4]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.95} />
      </mesh>
    </group>
  );
}

export function LilyPadModel({ position }: { position: [number, number, number] }) {
  const lilyRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (lilyRef.current) {
      lilyRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.8 + position[0]) * 0.003;
    }
  });

  return (
    <group ref={lilyRef} position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <circleGeometry args={[0.04, 12]} />
        <meshStandardMaterial color="#2a6a35" roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.01, 0]}>
        <sphereGeometry args={[0.008, 6, 6]} />
        <meshStandardMaterial color="#ffaacc" roughness={0.6} />
      </mesh>
    </group>
  );
}

export function WaterPuddle({ position }: { position: [number, number, number] }) {
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
