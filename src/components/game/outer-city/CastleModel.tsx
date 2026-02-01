"use client";

import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";

// ===== Base Castle (Player Home) 3D Model =====

function TorchLight({ position }: { position: [number, number, number] }) {
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (lightRef.current) {
      lightRef.current.intensity = 0.4 + Math.sin(state.clock.elapsedTime * 10 + position[0] * 5) * 0.15;
    }
  });

  return (
    <group position={position}>
      <mesh position={[0, -0.02, 0]} castShadow>
        <cylinderGeometry args={[0.008, 0.006, 0.04, 6]} />
        <meshStandardMaterial color="#5a4030" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.015, 0]}>
        <sphereGeometry args={[0.012, 6, 6]} />
        <meshStandardMaterial
          color="#ff6600"
          emissive="#ff4400"
          emissiveIntensity={0.8}
          transparent
          opacity={0.9}
        />
      </mesh>
      <pointLight ref={lightRef} intensity={0.4} color="#ff6600" distance={0.5} />
    </group>
  );
}

function SmokeEffect({ position }: { position: [number, number, number] }) {
  const smokeRefs = useRef<THREE.Mesh[]>([]);

  useFrame((state) => {
    smokeRefs.current.forEach((smoke, i) => {
      if (smoke) {
        const offset = i * 0.3;
        const cycle = (state.clock.elapsedTime * 0.5 + offset) % 1;
        smoke.position.y = cycle * 0.15;
        const mat = smoke.material as THREE.MeshStandardMaterial;
        mat.opacity = 0.3 * (1 - cycle);
        smoke.scale.setScalar(0.8 + cycle * 0.5);
      }
    });
  });

  return (
    <group position={position}>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) smokeRefs.current[i] = el; }}
          position={[0, i * 0.05, 0]}
        >
          <sphereGeometry args={[0.015, 6, 6]} />
          <meshStandardMaterial
            color="#888888"
            transparent
            opacity={0.2}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function FlagEffect({ position, color = "#c9a227" }: { position: [number, number, number]; color?: string }) {
  const flagRef = useRef<THREE.Group>(null);
  const clothRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (flagRef.current) {
      const time = state.clock.elapsedTime;
      flagRef.current.rotation.z = Math.sin(time * 3) * 0.15;
    }
    if (clothRef.current) {
      const time = state.clock.elapsedTime;
      clothRef.current.position.x = 0.025 + Math.sin(time * 4) * 0.005;
    }
  });

  return (
    <group ref={flagRef} position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.004, 0.004, 0.12, 6]} />
        <meshStandardMaterial color="#5a4030" roughness={0.9} />
      </mesh>
      <mesh ref={clothRef} position={[0.025, 0.04, 0]} castShadow>
        <planeGeometry args={[0.05, 0.035]} />
        <meshStandardMaterial
          color={color}
          side={THREE.DoubleSide}
          emissive={color}
          emissiveIntensity={0.2}
        />
      </mesh>
    </group>
  );
}

function CornerTower({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.045, 0.24, 8]} />
        <meshStandardMaterial color="#6b6b6b" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.245, 0]} castShadow>
        <cylinderGeometry args={[0.048, 0.04, 0.02, 8]} />
        <meshStandardMaterial color="#5a5a5a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.3, 0]} castShadow>
        <coneGeometry args={[0.05, 0.08, 8]} />
        <meshStandardMaterial color="#8b4513" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.35, 0]} castShadow>
        <sphereGeometry args={[0.012, 8, 8]} />
        <meshStandardMaterial color="#c9a227" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}

function WallSegment({ position, rotation = 0, length = 0.2 }: { position: [number, number, number]; rotation?: number; length?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.06, 0]} castShadow>
        <boxGeometry args={[length, 0.12, 0.03]} />
        <meshStandardMaterial color="#6b6b6b" roughness={0.9} />
      </mesh>
      {[-0.06, -0.02, 0.02, 0.06].map((x, i) => (
        <mesh key={i} position={[x, 0.14, 0]} castShadow>
          <boxGeometry args={[0.025, 0.04, 0.035]} />
          <meshStandardMaterial color="#5a5a5a" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function GateStructure({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[-0.04, 0.08, 0]} castShadow>
        <boxGeometry args={[0.025, 0.16, 0.04]} />
        <meshStandardMaterial color="#5a5a5a" roughness={0.9} />
      </mesh>
      <mesh position={[0.04, 0.08, 0]} castShadow>
        <boxGeometry args={[0.025, 0.16, 0.04]} />
        <meshStandardMaterial color="#5a5a5a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.17, 0]} castShadow>
        <boxGeometry args={[0.1, 0.025, 0.045]} />
        <meshStandardMaterial color="#5a5a5a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.06, -0.01]}>
        <boxGeometry args={[0.05, 0.12, 0.02]} />
        <meshStandardMaterial color="#1a1a1a" roughness={1} />
      </mesh>
      <mesh position={[0, 0.14, 0.025]} castShadow>
        <circleGeometry args={[0.015, 8]} />
        <meshStandardMaterial color="#c9a227" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}

function CentralKeep() {
  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 0.1, 0]} castShadow>
        <boxGeometry args={[0.16, 0.2, 0.16]} />
        <meshStandardMaterial color="#7a6a5a" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.24, 0]} castShadow>
        <boxGeometry args={[0.12, 0.12, 0.12]} />
        <meshStandardMaterial color="#8b7355" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.36, 0]} castShadow>
        <coneGeometry args={[0.1, 0.1, 4]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.43, 0]} castShadow>
        <coneGeometry args={[0.02, 0.04, 4]} />
        <meshStandardMaterial color="#c9a227" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.24, 0.065]}>
        <boxGeometry args={[0.025, 0.04, 0.01]} />
        <meshStandardMaterial color="#ffd070" emissive="#ffd070" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0.065, 0.24, 0]}>
        <boxGeometry args={[0.01, 0.04, 0.025]} />
        <meshStandardMaterial color="#ffd070" emissive="#ffd070" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[-0.065, 0.24, 0]}>
        <boxGeometry args={[0.01, 0.04, 0.025]} />
        <meshStandardMaterial color="#ffd070" emissive="#ffd070" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0.04, 0.1, 0.085]}>
        <boxGeometry args={[0.02, 0.03, 0.01]} />
        <meshStandardMaterial color="#ffd070" emissive="#ffd070" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[-0.04, 0.1, 0.085]}>
        <boxGeometry args={[0.02, 0.03, 0.01]} />
        <meshStandardMaterial color="#ffd070" emissive="#ffd070" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

export function BaseCastleModel() {
  return (
    <group>
      <mesh position={[0, 0.015, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.32, 0.35, 0.03, 8]} />
        <meshStandardMaterial color="#5a5a5a" roughness={0.95} />
      </mesh>

      <WallSegment position={[0, 0, 0.18]} rotation={0} />
      <WallSegment position={[0, 0, -0.18]} rotation={Math.PI} />
      <WallSegment position={[0.18, 0, 0]} rotation={Math.PI / 2} />
      <WallSegment position={[-0.18, 0, 0]} rotation={-Math.PI / 2} />

      <CornerTower position={[-0.15, 0, -0.15]} />
      <CornerTower position={[0.15, 0, -0.15]} />
      <CornerTower position={[-0.15, 0, 0.15]} />
      <CornerTower position={[0.15, 0, 0.15]} />

      <CentralKeep />

      <GateStructure position={[0, 0, 0.18]} />

      <FlagEffect position={[0, 0.47, 0]} color="#c9a227" />
      <FlagEffect position={[-0.15, 0.38, -0.15]} color="#e74c3c" />
      <FlagEffect position={[0.15, 0.38, -0.15]} color="#3498db" />

      <TorchLight position={[-0.07, 0.12, 0.2]} />
      <TorchLight position={[0.07, 0.12, 0.2]} />

      <SmokeEffect position={[0.05, 0.42, -0.03]} />

      <Sparkles count={20} scale={0.8} size={1.5} speed={0.2} color="#c9a227" position={[0, 0.3, 0]} />

      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.36, 32]} />
        <meshBasicMaterial color="#c9a227" transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
