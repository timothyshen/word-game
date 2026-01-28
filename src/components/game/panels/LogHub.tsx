// 记录Hub - Split Panel 布局

import { useState } from "react";
import {
  Dialog,
  DialogContent,
} from "~/components/ui/dialog";
import { api } from "~/trpc/react";
import {
  SettlementTab,
  ActionHistoryTab,
  CombatHistoryTab,
} from "./log";

interface LogHubProps {
  onClose: () => void;
  initialTab?: string;
  onResumeCombat?: (combatId: string) => void;
}

const GRADE_COLORS: Record<string, string> = {
  S: "#c9a227", A: "#4a9", B: "#59b", C: "#888", D: "#666",
};

function getScoreGrade(score: number) {
  if (score >= 500) return { grade: "S", color: GRADE_COLORS.S };
  if (score >= 400) return { grade: "A", color: GRADE_COLORS.A };
  if (score >= 300) return { grade: "B", color: GRADE_COLORS.B };
  if (score >= 200) return { grade: "C", color: GRADE_COLORS.C };
  return { grade: "D", color: GRADE_COLORS.D };
}

export default function LogHub({
  onClose,
  initialTab = "settlement",
  onResumeCombat,
}: LogHubProps) {
  const [activeTab, setActiveTab] = useState(initialTab);

  // Fetch data for sidebar stats
  const { data: preview } = api.settlement.getSettlementPreview.useQuery();
  const { data: todayActions } = api.player.getTodayActions.useQuery();

  const todayResult = preview?.dailyResults[preview.dailyResults.length - 1];
  const totalScore = todayResult?.totalScore ?? todayActions?.totalScore ?? 0;
  const grade = getScoreGrade(totalScore);
  const streakDays = preview?.currentStreakDays ?? 0;
  const currentDay = todayActions?.day ?? preview?.dailyResults[0]?.day ?? 1;

  const tabs = [
    { id: "settlement", label: "今日结算", icon: "🎴", badge: preview?.pendingDays ? "+" : null },
    { id: "action", label: "行动记录", icon: "📋", badge: todayActions?.actions?.length ? String(todayActions.actions.length) : null },
    { id: "combat", label: "战斗历史", icon: "📖", badge: null },
  ];

  const currentTabInfo = tabs.find(t => t.id === activeTab);

  const renderTabContent = () => {
    switch (activeTab) {
      case "settlement":
        return <SettlementTab />;
      case "action":
        return <ActionHistoryTab />;
      case "combat":
        return <CombatHistoryTab onResumeCombat={onResumeCombat} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="bg-[#101014] border-2 border-[#c9a227] p-0 max-w-6xl h-[85vh] flex gap-0 overflow-hidden rounded-lg"
        showCloseButton={false}
      >
        {/* Left Sidebar */}
        <div className="w-56 flex-shrink-0 bg-[#0a0a0c] border-r border-[#2a2a30] flex flex-col">
          {/* Logo/Header */}
          <div className="p-4 border-b border-[#2a2a30]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#c9a227] to-[#8b6914] flex items-center justify-center text-xl rounded-lg">
                📜
              </div>
              <div>
                <div className="text-[#e0dcd0] font-bold">记录系统</div>
                <div className="text-xs text-[#c9a227]">第 {currentDay} 日</div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                  activeTab === tab.id
                    ? "bg-[#1a1810] text-[#c9a227] border-r-2 border-[#c9a227]"
                    : "text-[#888] hover:bg-[#151518] hover:text-[#e0dcd0]"
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="flex-1 text-sm font-medium">{tab.label}</span>
                {tab.badge && (
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    tab.badge === "+" ? "bg-[#4a9]/20 text-[#4a9]" : "bg-[#2a2a30] text-[#888]"
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Bottom Stats */}
          <div className="p-4 border-t border-[#2a2a30]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[#666]">连续达标</span>
              <span className="text-sm font-bold text-[#e67e22]">{streakDays} 天 🔥</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[#666]">今日评级</span>
              <span className="text-sm font-bold" style={{ color: grade.color }}>
                {grade.grade} 级
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#666]">今日得分</span>
              <span className="text-sm font-bold text-[#c9a227]">{totalScore} 分</span>
            </div>
          </div>
        </div>

        {/* Right Content Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-[#2a2a30]">
            <h2 className="text-lg font-bold text-[#e0dcd0]">
              {currentTabInfo?.label}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-[#1a1a20] text-[#666] hover:text-[#c9a227] hover:bg-[#2a2a30] flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {renderTabContent()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
