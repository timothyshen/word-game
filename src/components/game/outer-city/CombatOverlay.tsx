"use client";

import React from "react";
import type { CombatState } from "~/types/outer-city";

interface CombatOverlayProps {
  combat: CombatState;
  heroName: string;
  heroPortrait: string;
  onAction: (action: "attack" | "defend" | "skill" | "flee") => void;
  isActionPending: boolean;
}

export default function CombatOverlay({
  combat,
  heroName,
  heroPortrait,
  onAction,
  isActionPending,
}: CombatOverlayProps) {
  return (
    <div className="absolute inset-0 bg-[#0a0a0c]/95 backdrop-blur flex items-center justify-center z-40">
      <div className="w-full max-w-md p-6">
        <div className="text-lg text-[#c9a227] font-bold mb-4 text-center">战斗中</div>

        <div className="flex justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm mb-1">
              <span className="text-xl">{heroPortrait}</span>
              <span className="text-[#4a9]">{heroName}</span>
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

        <div className="bg-[#1a1a20] rounded p-3 mb-4 h-24 overflow-y-auto text-sm text-[#888]">
          {combat.logs.slice(-4).map((log, i) => (
            <div key={i} className="mb-1">{log}</div>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => onAction("attack")}
            disabled={isActionPending}
            className="py-2 text-sm bg-[#e74c3c] hover:bg-[#c0392b] disabled:opacity-50 rounded"
          >
            攻击
          </button>
          <button
            onClick={() => onAction("skill")}
            disabled={isActionPending}
            className="py-2 text-sm bg-[#9b59b6] hover:bg-[#8e44ad] disabled:opacity-50 rounded"
          >
            技能
          </button>
          <button
            onClick={() => onAction("defend")}
            disabled={isActionPending}
            className="py-2 text-sm bg-[#3498db] hover:bg-[#2980b9] disabled:opacity-50 rounded"
          >
            防御
          </button>
          <button
            onClick={() => onAction("flee")}
            disabled={isActionPending}
            className="py-2 text-sm bg-[#7f8c8d] hover:bg-[#95a5a6] disabled:opacity-50 rounded"
          >
            逃跑
          </button>
        </div>
      </div>
    </div>
  );
}
