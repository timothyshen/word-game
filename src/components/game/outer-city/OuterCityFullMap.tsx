"use client";

import React, { useState, useMemo, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { api } from "~/trpc/react";
import type { CombatState, ExplorationEvent } from "~/types/outer-city";
import MapEventModal from "../MapEventModal";
import { TerrainTile } from "./TerrainTile";
import { FogBoundary } from "./MapMarkers";
import HeroSidebar from "./HeroSidebar";
import CombatOverlay from "./CombatOverlay";
import POIInteractionPanel from "./POIInteractionPanel";

export default function OuterCityFullMap() {
  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(null);
  const [combat, setCombat] = useState<CombatState | null>(null);
  const [actionLog, setActionLog] = useState<string | null>(null);
  const [showHeroSidebar, setShowHeroSidebar] = useState(true);
  const [currentEvent, setCurrentEvent] = useState<ExplorationEvent | null>(null);

  const utils = api.useUtils();

  const { data: status } = api.outerCity.getStatus.useQuery();
  const { data: mapData } = api.outerCity.getVisibleMap.useQuery();

  const moveHero = api.outerCity.moveHero.useMutation({
    onSuccess: (data) => {
      void utils.outerCity.getStatus.invalidate();
      void utils.outerCity.getVisibleMap.invalidate();
      if (data.event) {
        setCurrentEvent(data.event as ExplorationEvent);
      }
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

  const selectedHero = status?.heroes.find((h) => h.id === selectedHeroId);
  const centerX = selectedHero?.positionX ?? 0;
  const centerY = selectedHero?.positionY ?? 0;

  const currentPOI = selectedHero
    ? mapData?.pois.find(
        (p) => p.positionX === selectedHero.positionX && p.positionY === selectedHero.positionY
      )
    : null;

  const mapRadius = 5;

  // Optimized lookups: O(1) instead of O(n) per tile
  const areaMap = useMemo(() => {
    const m = new Map<string, NonNullable<typeof mapData>["areas"][number]>();
    mapData?.areas.forEach((a) => m.set(`${a.positionX},${a.positionY}`, a));
    return m;
  }, [mapData?.areas]);

  const poiMap = useMemo(() => {
    const m = new Map<string, NonNullable<typeof mapData>["pois"][number]>();
    mapData?.pois.forEach((p) => m.set(`${p.positionX},${p.positionY}`, p));
    return m;
  }, [mapData?.pois]);

  const heroMap = useMemo(() => {
    const m = new Map<string, NonNullable<typeof status>["heroes"][number]>();
    status?.heroes.forEach((h) => m.set(`${h.positionX},${h.positionY}`, h));
    return m;
  }, [status?.heroes]);

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

  const handleStartCombat = (heroId: string, poiId: string) => {
    startCombat.mutate({ heroId, poiId });
  };

  const showActionLog = (message: string) => {
    setActionLog(message);
    setTimeout(() => setActionLog(null), 3000);
  };

  // Generate tile data
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

      const area = areaMap.get(`${x},${y}`);
      const poi = poiMap.get(`${x},${y}`);
      const hero = heroMap.get(`${x},${y}`);

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
      {/* 3D Map Canvas */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#2a3a4e] to-[#1a1a2e]">
        <Canvas camera={{ position: [8, 8, 8], fov: 45 }} shadows>
          <Suspense fallback={null}>
            <fog attach="fog" args={["#1a2a2e", 6, 18]} />

            <ambientLight intensity={0.4} />
            <hemisphereLight color="#ffeedd" groundColor="#334455" intensity={0.7} />
            <directionalLight
              position={[8, 12, 6]}
              intensity={1.8}
              color="#fff5e0"
              castShadow
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
              shadow-camera-far={30}
              shadow-bias={-0.0001}
            />
            <directionalLight position={[-5, 8, -4]} intensity={0.4} color="#aaccff" />
            <directionalLight position={[0, 5, -10]} intensity={0.3} color="#ffddcc" />

            <FogBoundary radius={mapRadius + 1} />

            {tiles.map((tile) => (
              <TerrainTile
                key={`${tile.x}-${tile.y}`}
                position={[tile.x - centerX, 0, tile.y - centerY]}
                worldX={tile.x}
                worldY={tile.y}
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

      {/* Hero Sidebar */}
      <HeroSidebar
        selectedHeroId={selectedHeroId}
        onSelectHero={setSelectedHeroId}
        showSidebar={showHeroSidebar}
        onToggleSidebar={() => setShowHeroSidebar(!showHeroSidebar)}
      />

      {/* Combat Overlay */}
      {combat?.active && selectedHero && (
        <CombatOverlay
          combat={combat}
          heroName={selectedHero.character.character.name}
          heroPortrait={selectedHero.character.character.portrait}
          onAction={handleCombatAction}
          isActionPending={combatAction.isPending}
        />
      )}

      {/* POI Interaction Panel */}
      {currentPOI && !combat?.active && selectedHero && (
        <POIInteractionPanel
          poi={currentPOI}
          heroId={selectedHero.id}
          onActionLog={showActionLog}
          onStartCombat={handleStartCombat}
          isCombatStarting={startCombat.isPending}
        />
      )}

      {/* Action Log Toast */}
      {actionLog && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-[#c9a227]/90 text-[#08080a] text-sm px-4 py-2 rounded z-20">
          {actionLog}
        </div>
      )}

      {/* Bottom Status */}
      <div className="absolute bottom-20 left-64 z-10">
        {selectedHero ? (
          <span className="px-3 py-1.5 bg-[#0a0a0c]/80 backdrop-blur rounded text-xs text-[#888]">
            {selectedHero.character.character.name} ({selectedHero.positionX}, {selectedHero.positionY}) · 点击相邻格子移动
          </span>
        ) : (
          <span className="px-3 py-1.5 bg-[#0a0a0c]/80 backdrop-blur rounded text-xs text-[#666]">
            {status?.heroes?.length ? "选择英雄开始探索" : "派遣角色探索外城"}
          </span>
        )}
      </div>

      {/* Event Modal */}
      {currentEvent && selectedHero && (
        <MapEventModal
          event={currentEvent}
          heroId={selectedHero.id}
          onClose={() => setCurrentEvent(null)}
          onResult={(message) => {
            showActionLog(message);
            void utils.outerCity.getStatus.invalidate();
          }}
        />
      )}
    </div>
  );
}
