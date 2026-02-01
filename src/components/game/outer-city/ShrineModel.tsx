"use client";

import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";

// ===== Shrine POI 3D Model =====

function ShrineBase() {
  return (
    <group>
      <mesh position={[0, 0.01, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.22, 0.02, 0.22]} />
        <meshStandardMaterial color="#7a7a7a" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.03, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.18, 0.02, 0.18]} />
        <meshStandardMaterial color="#8a8a8a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.14, 0.02, 0.14]} />
        <meshStandardMaterial color="#9a9a9a" roughness={0.85} />
      </mesh>
    </group>
  );
}

function ShrinePillar({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.01, 0]} castShadow>
        <boxGeometry args={[0.025, 0.02, 0.025]} />
        <meshStandardMaterial color="#7a7a7a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.015, 0.16, 8]} />
        <meshStandardMaterial color="#8b4513" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.185, 0]} castShadow>
        <boxGeometry args={[0.028, 0.015, 0.028]} />
        <meshStandardMaterial color="#8b4513" roughness={0.8} />
      </mesh>
    </group>
  );
}

function ShrineRoof() {
  return (
    <group position={[0, 0.22, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.18, 0.015, 0.18]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.025, 0]} castShadow>
        <coneGeometry args={[0.1, 0.06, 4]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.065, 0]} castShadow>
        <sphereGeometry args={[0.012, 8, 8]} />
        <meshStandardMaterial color="#c9a227" metalness={0.6} roughness={0.3} />
      </mesh>
      {[
        [0.09, 0, 0.09],
        [-0.09, 0, 0.09],
        [0.09, 0, -0.09],
        [-0.09, 0, -0.09],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow>
          <sphereGeometry args={[0.008, 6, 6]} />
          <meshStandardMaterial color="#c9a227" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function ShrineAltar({ shrineType = "wind" }: { shrineType?: string }) {
  const altarRef = useRef<THREE.Mesh>(null);

  const defaultColor = { main: "#3498db", glow: "#5dade2" };
  const colors: Record<string, { main: string; glow: string }> = {
    wind: defaultColor,
    attack: { main: "#e74c3c", glow: "#ec7063" },
    defense: { main: "#27ae60", glow: "#58d68d" },
    stamina: { main: "#f1c40f", glow: "#f7dc6f" },
  };
  const altarColor = colors[shrineType] ?? defaultColor;

  useFrame((state) => {
    if (altarRef.current) {
      const mat = altarRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
    }
  });

  return (
    <group position={[0, 0.08, 0]}>
      <mesh position={[0, 0.015, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.035, 0.03, 8]} />
        <meshStandardMaterial color="#5a5a5a" roughness={0.9} />
      </mesh>
      <mesh ref={altarRef} position={[0, 0.055, 0]} castShadow>
        <octahedronGeometry args={[0.025, 0]} />
        <meshStandardMaterial
          color={altarColor.main}
          emissive={altarColor.glow}
          emissiveIntensity={0.6}
          roughness={0.2}
          metalness={0.3}
          transparent
          opacity={0.9}
        />
      </mesh>
      <pointLight intensity={0.4} color={altarColor.glow} distance={0.8} position={[0, 0.06, 0]} />
    </group>
  );
}

function WindChimes({ position }: { position: [number, number, number] }) {
  const chimeRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (chimeRef.current) {
      chimeRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 3) * 0.1;
      chimeRef.current.rotation.x = Math.cos(state.clock.elapsedTime * 2.5) * 0.05;
    }
  });

  return (
    <group ref={chimeRef} position={position}>
      <mesh position={[0, -0.01, 0]} castShadow>
        <cylinderGeometry args={[0.002, 0.002, 0.02, 4]} />
        <meshStandardMaterial color="#8b4513" roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.03, 0]} castShadow>
        <coneGeometry args={[0.012, 0.025, 6]} />
        <meshStandardMaterial color="#c9a227" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.05, 0]} castShadow>
        <cylinderGeometry args={[0.003, 0.003, 0.015, 4]} />
        <meshStandardMaterial color="#c9a227" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}

function ShrineCloth({ position, color = "#c9a227" }: { position: [number, number, number]; color?: string }) {
  const clothRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (clothRef.current) {
      clothRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 2) * 0.15;
      clothRef.current.position.x = position[0] + Math.sin(state.clock.elapsedTime * 2.5) * 0.003;
    }
  });

  return (
    <group position={position}>
      <mesh position={[0, 0.02, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.003, 0.003, 0.04, 4]} />
        <meshStandardMaterial color="#8b4513" roughness={0.9} />
      </mesh>
      <mesh ref={clothRef} position={[0, -0.02, 0]} castShadow>
        <planeGeometry args={[0.035, 0.06]} />
        <meshStandardMaterial
          color={color}
          side={THREE.DoubleSide}
          transparent
          opacity={0.9}
        />
      </mesh>
    </group>
  );
}

export function ShrineModel({ shrineType = "wind" }: { shrineType?: string }) {
  const clothColors: Record<string, string> = {
    wind: "#3498db",
    attack: "#e74c3c",
    defense: "#27ae60",
    stamina: "#f1c40f",
  };
  const clothColor = clothColors[shrineType] ?? "#c9a227";

  return (
    <group>
      <ShrineBase />

      <ShrinePillar position={[-0.055, 0.06, -0.055]} />
      <ShrinePillar position={[0.055, 0.06, -0.055]} />
      <ShrinePillar position={[-0.055, 0.06, 0.055]} />
      <ShrinePillar position={[0.055, 0.06, 0.055]} />

      <ShrineRoof />

      <ShrineAltar shrineType={shrineType} />

      <WindChimes position={[0.09, 0.22, 0.09]} />
      <WindChimes position={[-0.09, 0.22, 0.09]} />
      <WindChimes position={[0.09, 0.22, -0.09]} />
      <WindChimes position={[-0.09, 0.22, -0.09]} />

      <ShrineCloth position={[0.08, 0.15, 0]} color={clothColor} />
      <ShrineCloth position={[-0.08, 0.15, 0]} color={clothColor} />

      <Sparkles
        count={15}
        scale={0.35}
        size={1.5}
        speed={0.3}
        color={clothColor}
        position={[0, 0.15, 0]}
      />

      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.1, 0.16, 24]} />
        <meshBasicMaterial color={clothColor} transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
