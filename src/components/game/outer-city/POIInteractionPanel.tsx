"use client";

import React from "react";
import { api, type RouterOutputs } from "~/trpc/react";

type POIData = NonNullable<RouterOutputs["outerCity"]["getVisibleMap"]>["pois"][number];

interface POIInteractionPanelProps {
  poi: POIData;
  heroId: string;
  onActionLog: (message: string) => void;
  onStartCombat: (heroId: string, poiId: string) => void;
  isCombatStarting: boolean;
}

export default function POIInteractionPanel({
  poi,
  heroId,
  onActionLog,
  onStartCombat,
  isCombatStarting,
}: POIInteractionPanelProps) {
  const utils = api.useUtils();

  const harvestResource = api.outerCity.harvestResource.useMutation({
    onSuccess: (data) => {
      onActionLog(data.message);
      void utils.outerCity.getStatus.invalidate();
      void utils.outerCity.getVisibleMap.invalidate();
    },
    onError: (err) => {
      onActionLog(err.message);
    },
  });

  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-[#0a0a0c]/95 backdrop-blur border border-[#3a3a42] rounded-lg p-4 z-20 w-64">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{poi.icon}</span>
          <div>
            <div className="text-sm font-bold text-[#e0dcd0]">{poi.name}</div>
            <div className="text-xs text-[#888]">
              {poi.type === "resource" && `${poi.resourceType}: ${poi.resourceAmount}`}
              {poi.type === "garrison" && `难度: ${poi.difficulty}`}
              {poi.type === "lair" && `难度: ${poi.difficulty}`}
              {poi.type === "settlement" && "友好定居点"}
              {poi.type === "shrine" && `祈祷恢复 ${poi.resourceType}`}
              {poi.type === "ruin" && `探索难度: ${poi.difficulty}`}
              {poi.type === "caravan" && "交易商品"}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          {poi.type === "resource" && (
            <button
              onClick={() => harvestResource.mutate({ heroId, poiId: poi.id })}
              disabled={harvestResource.isPending || poi.resourceAmount <= 0}
              className="px-4 py-2 text-sm bg-[#4a9] hover:bg-[#5ba] disabled:opacity-50 disabled:cursor-not-allowed rounded w-full"
            >
              {harvestResource.isPending ? "..." : "采集"}
            </button>
          )}
          {(poi.type === "garrison" || poi.type === "lair") && !poi.isDefeated && (
            <button
              onClick={() => onStartCombat(heroId, poi.id)}
              disabled={isCombatStarting}
              className="px-4 py-2 text-sm bg-[#e74c3c] hover:bg-[#c0392b] disabled:opacity-50 rounded w-full"
            >
              {isCombatStarting ? "..." : "战斗"}
            </button>
          )}
          {(poi.type === "garrison" || poi.type === "lair") && poi.isDefeated && (
            <span className="text-sm text-[#4a9] py-2">已征服</span>
          )}
          {poi.type === "settlement" && (
            <span className="text-sm text-[#3498db] py-2">交易中...</span>
          )}
          {poi.type === "shrine" && (
            <button
              onClick={() => harvestResource.mutate({ heroId, poiId: poi.id })}
              disabled={harvestResource.isPending}
              className="px-4 py-2 text-sm bg-[#f1c40f] hover:bg-[#f39c12] text-[#08080a] disabled:opacity-50 rounded w-full"
            >
              {harvestResource.isPending ? "..." : "祈祷"}
            </button>
          )}
          {poi.type === "ruin" && !poi.isDefeated && (
            <button
              onClick={() => onStartCombat(heroId, poi.id)}
              disabled={isCombatStarting}
              className="px-4 py-2 text-sm bg-[#95a5a6] hover:bg-[#7f8c8d] disabled:opacity-50 rounded w-full"
            >
              {isCombatStarting ? "..." : "探索"}
            </button>
          )}
          {poi.type === "ruin" && poi.isDefeated && (
            <span className="text-sm text-[#4a9] py-2">已探索</span>
          )}
          {poi.type === "caravan" && (
            <button
              onClick={() => harvestResource.mutate({ heroId, poiId: poi.id })}
              disabled={harvestResource.isPending}
              className="px-4 py-2 text-sm bg-[#e67e22] hover:bg-[#d35400] disabled:opacity-50 rounded w-full"
            >
              {harvestResource.isPending ? "..." : "交易"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
