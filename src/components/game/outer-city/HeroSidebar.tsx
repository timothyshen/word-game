"use client";

import React from "react";
import { api } from "~/trpc/react";

interface HeroSidebarProps {
  selectedHeroId: string | null;
  onSelectHero: (id: string) => void;
  showSidebar: boolean;
  onToggleSidebar: () => void;
}

export default function HeroSidebar({
  selectedHeroId,
  onSelectHero,
  showSidebar,
  onToggleSidebar,
}: HeroSidebarProps) {
  const { data: status } = api.outerCity.getStatus.useQuery();
  const utils = api.useUtils();

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

  return (
    <>
      <div
        className={`absolute left-0 top-0 bottom-0 w-56 bg-[#0a0a0c]/90 backdrop-blur border-r border-[#2a3a4a] transition-transform duration-300 z-20 ${
          showSidebar ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-3 h-full overflow-y-auto">
          <h3 className="text-sm font-bold text-[#c9a227] mb-3">派遣英雄</h3>

          {status?.heroes && status.heroes.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-[#888] mb-2">已派遣</p>
              {status.heroes.map((hero) => (
                <div
                  key={hero.id}
                  onClick={() => onSelectHero(hero.id)}
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

          {status?.availableCharacters && status.availableCharacters.length > 0 && (
            <div>
              <p className="text-xs text-[#888] mb-2">可派遣</p>
              {status.availableCharacters.map((char) => (
                <div
                  key={char.id}
                  className="mb-2 flex items-center gap-2 rounded bg-[#1a1a20] p-2"
                >
                  <span className="text-xl">{char.portrait}</span>
                  <p className="flex-1 truncate text-sm text-[#e0dcd0]">
                    {char.name}
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

      <button
        onClick={onToggleSidebar}
        className={`absolute top-1/2 -translate-y-1/2 w-6 h-16 bg-[#0a0a0c]/80 backdrop-blur border border-[#2a3a4a] flex items-center justify-center text-[#888] hover:text-[#c9a227] transition-all z-30 ${
          showSidebar ? "left-56" : "left-0"
        }`}
      >
        {showSidebar ? "◀" : "▶"}
      </button>
    </>
  );
}
