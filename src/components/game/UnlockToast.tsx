"use client";

import { useState, useEffect, useRef } from "react";

const SYSTEM_LABELS: Record<string, { name: string; icon: string }> = {
  combat_system: { name: "战斗系统", icon: "⚔️" },
  building_system: { name: "建筑管理", icon: "🏗️" },
  recruit_system: { name: "角色详情", icon: "👥" },
  shop_system: { name: "商店", icon: "🛒" },
  altar_system: { name: "祭坛", icon: "⛩️" },
  portal_system: { name: "传送门", icon: "🌀" },
  equipment_system: { name: "装备系统", icon: "🛡️" },
  card_system: { name: "背包", icon: "🎒" },
  progression_system: { name: "进阶系统", icon: "⬆️" },
  boss_system: { name: "Boss挑战", icon: "👹" },
};

interface UnlockToastProps {
  unlockedSystems: string[];
}

export function UnlockToast({ unlockedSystems }: UnlockToastProps) {
  const [toasts, setToasts] = useState<Array<{ id: string; flag: string }>>([]);
  const prevFlags = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentFlags = new Set(unlockedSystems);
    const newFlags: string[] = [];

    for (const flag of currentFlags) {
      if (!prevFlags.current.has(flag) && SYSTEM_LABELS[flag]) {
        newFlags.push(flag);
      }
    }

    if (newFlags.length > 0) {
      const newToasts = newFlags.map(flag => ({
        id: `${flag}_${Date.now()}`,
        flag,
      }));
      setToasts(prev => [...prev, ...newToasts]);

      setTimeout(() => {
        setToasts(prev => prev.filter(t => !newToasts.some(nt => nt.id === t.id)));
      }, 4000);
    }

    prevFlags.current = currentFlags;
  }, [unlockedSystems]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2">
      {toasts.map(toast => {
        const label = SYSTEM_LABELS[toast.flag];
        if (!label) return null;
        return (
          <div
            key={toast.id}
            className="px-6 py-3 bg-[#0a0a15]/95 border border-[#c9a227] rounded-lg shadow-lg shadow-[#c9a227]/20 animate-in fade-in slide-in-from-top-4 duration-500"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{label.icon}</span>
              <div>
                <div className="text-xs text-[#c9a227] font-medium tracking-wider uppercase">新系统已解锁</div>
                <div className="text-[#e0dcd0] font-bold">{label.name}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
