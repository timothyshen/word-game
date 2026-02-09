"use client";

import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { POI_COLORS } from "~/constants";
import { ShrineModel } from "./ShrineModel";

export function POIMarker({ type }: { type: string }) {
  const color = POI_COLORS[type] ?? "#888";
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
  });

  if (type === "shrine") {
    return <ShrineModel shrineType="wind" />;
  }

  return (
    <Float speed={2} rotationIntensity={0.1} floatIntensity={0.3}>
      <group ref={groupRef} position={[0, 0.25, 0]}>
        <mesh castShadow>
          <octahedronGeometry args={[0.1, 0]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.5}
            roughness={0.2}
            metalness={0.5}
          />
        </mesh>
        <mesh position={[0, -0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.08, 0.14, 24]} />
          <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
        <Sparkles count={12} scale={0.4} size={2} speed={0.4} color={color} />
        <pointLight intensity={0.5} color={color} distance={2} />
      </group>
    </Float>
  );
}

export function HeroMarker({ isSelected }: { isSelected?: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ref.current) {
      ref.current.position.y = 0.3 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * 1.5;
    }
  });

  return (
    <group ref={ref} position={[0, 0.3, 0]}>
      <mesh castShadow>
        <capsuleGeometry args={[0.1, 0.2, 4, 8]} />
        <meshStandardMaterial
          color={isSelected ? "#ffd700" : "#c9a227"}
          emissive={isSelected ? "#ffd700" : "#c9a227"}
          emissiveIntensity={isSelected ? 0.8 : 0.4}
        />
      </mesh>
      {isSelected && (
        <mesh ref={ringRef} position={[0, -0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.18, 0.24, 24]} />
          <meshBasicMaterial color="#ffd700" transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      )}
      <pointLight intensity={isSelected ? 0.8 : 0.5} color="#c9a227" distance={2} />
    </group>
  );
}

export function FogBoundary({ radius }: { radius: number }) {
  return (
    <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius, radius + 4, 32]} />
      <meshStandardMaterial color="#2a3a4e" transparent opacity={0.6} side={THREE.DoubleSide} />
    </mesh>
  );
}
