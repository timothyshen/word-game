// 游戏主导航标签
import { useState } from "react";

export type GameTab = "territory" | "cards" | "skills" | "characters" | "wilderness";

interface GameTabsProps {
  activeTab: GameTab;
  onTabChange: (tab: GameTab) => void;
}

const tabs: Array<{ id: GameTab; label: string; icon: string }> = [
  { id: "territory", label: "领地", icon: "🏰" },
  { id: "cards", label: "卡牌", icon: "🎴" },
  { id: "skills", label: "技能", icon: "⚔️" },
  { id: "characters", label: "角色", icon: "👥" },
  { id: "wilderness", label: "野外", icon: "🌲" },
];

export default function GameTabs({ activeTab, onTabChange }: GameTabsProps) {
  return (
    <div className="bg-[#0f0e0a] border-b border-[#3d3529]">
      <div className="max-w-6xl mx-auto flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors
              border-b-2 -mb-[1px]
              ${
                activeTab === tab.id
                  ? "border-[#c9a227] text-[#c9a227] bg-[#12110d]"
                  : "border-transparent text-[#888] hover:text-[#e0dcd0] hover:bg-[#12110d]/50"
              }
            `}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
