"use client";

// 地图事件弹窗组件

import { useState } from "react";
import { api } from "~/trpc/react";
import type { ExplorationEvent } from "~/types/outer-city";

interface MapEventModalProps {
  event: ExplorationEvent;
  heroId: string;
  onClose: () => void;
  onResult: (message: string) => void;
}

// 事件类型颜色
const EVENT_COLORS: Record<string, string> = {
  resource: "#4a9",
  monster: "#e74c3c",
  treasure: "#c9a227",
  merchant: "#9b59b6",
  trap: "#e67e22",
  nothing: "#888",
};

// 事件类型图标
const EVENT_ICONS: Record<string, string> = {
  resource: "🎁",
  monster: "⚔️",
  treasure: "💎",
  merchant: "🧙",
  trap: "⚠️",
  nothing: "🌿",
};

export default function MapEventModal({
  event,
  heroId,
  onClose,
  onResult,
}: MapEventModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    rewards?: Record<string, number>;
  } | null>(null);

  const handleChoice = api.outerCity.handleEventChoice.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setIsProcessing(false);
      // 3秒后关闭
      setTimeout(() => {
        onResult(data.message);
        onClose();
      }, 2000);
    },
    onError: (error) => {
      setResult({ success: false, message: error.message });
      setIsProcessing(false);
    },
  });

  const handleOptionClick = (action: string) => {
    if (isProcessing || result) return;
    setIsProcessing(true);
    handleChoice.mutate({
      heroId,
      eventType: event.type,
      action,
      eventData: JSON.stringify(event),
    });
  };

  const eventColor = EVENT_COLORS[event.type] ?? "#888";
  const eventIcon = EVENT_ICONS[event.type] ?? "❓";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div
        className="w-full max-w-md bg-[#101014] border-2 rounded-lg overflow-hidden"
        style={{ borderColor: eventColor }}
      >
        {/* 头部 */}
        <div
          className="p-4 border-b"
          style={{ borderColor: eventColor, backgroundColor: `${eventColor}20` }}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">{eventIcon}</span>
            <div>
              <div className="text-xs uppercase tracking-wider" style={{ color: eventColor }}>
                {event.type === "monster" ? "战斗遭遇" : "探索事件"}
              </div>
              <h3 className="text-lg font-bold text-[#e0dcd0]">{event.title}</h3>
            </div>
          </div>
        </div>

        {/* 内容 */}
        <div className="p-4">
          <p className="text-sm text-[#aaa] mb-4">{event.description}</p>

          {/* 怪物信息 */}
          {event.monster && (
            <div className="mb-4 p-3 bg-[#1a1a20] rounded border border-[#e74c3c]/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{event.monster.icon}</span>
                  <div>
                    <div className="font-bold text-[#e74c3c]">{event.monster.name}</div>
                    <div className="text-xs text-[#888]">Lv.{event.monster.level}</div>
                  </div>
                </div>
                <div className="text-right text-xs text-[#888]">
                  <div>HP: {event.monster.hp}</div>
                  <div>攻击: {event.monster.attack}</div>
                  <div>防御: {event.monster.defense}</div>
                </div>
              </div>
              <div className="mt-2 text-xs text-[#4a9]">
                奖励: {event.monster.rewards.gold}金币 + {event.monster.rewards.exp}经验
              </div>
            </div>
          )}

          {/* 资源奖励预览 */}
          {event.rewards && !event.monster && (
            <div className="mb-4 p-3 bg-[#1a1a20] rounded border border-[#4a9]/30">
              <div className="text-xs text-[#888] mb-1">可获得:</div>
              <div className="flex gap-3 text-sm">
                {event.rewards.gold && (
                  <span className="text-[#c9a227]">🪙 {event.rewards.gold}</span>
                )}
                {event.rewards.wood && (
                  <span className="text-[#8b6914]">🪵 {event.rewards.wood}</span>
                )}
                {event.rewards.stone && (
                  <span className="text-[#6a7a8a]">🪨 {event.rewards.stone}</span>
                )}
                {event.rewards.food && (
                  <span className="text-[#a67c52]">🍎 {event.rewards.food}</span>
                )}
              </div>
            </div>
          )}

          {/* 结果显示 */}
          {result && (
            <div
              className={`mb-4 p-3 rounded text-center ${
                result.success ? "bg-[#4a9]/20 text-[#4a9]" : "bg-[#e74c3c]/20 text-[#e74c3c]"
              }`}
            >
              <div className="font-bold">{result.message}</div>
              {result.rewards && (
                <div className="mt-2 flex justify-center gap-3 text-sm">
                  {result.rewards.gold && (
                    <span className="text-[#c9a227]">+{result.rewards.gold} 金币</span>
                  )}
                  {result.rewards.wood && (
                    <span className="text-[#8b6914]">+{result.rewards.wood} 木材</span>
                  )}
                  {result.rewards.stone && (
                    <span className="text-[#6a7a8a]">+{result.rewards.stone} 石头</span>
                  )}
                  {result.rewards.food && (
                    <span className="text-[#a67c52]">+{result.rewards.food} 食物</span>
                  )}
                  {result.rewards.exp && (
                    <span className="text-[#9b59b6]">+{result.rewards.exp} 经验</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 选项按钮 */}
          {!result && (
            <div className="flex flex-col gap-2">
              {event.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleOptionClick(option.action)}
                  disabled={isProcessing}
                  className={`w-full py-3 rounded text-sm font-medium transition-all disabled:opacity-50 ${
                    option.action === "fight" || option.action === "take_damage"
                      ? "bg-[#e74c3c] hover:bg-[#c0392b] text-white"
                      : option.action === "collect" || option.action === "open"
                      ? "bg-[#4a9] hover:bg-[#5ba] text-white"
                      : "bg-[#2a2a30] hover:bg-[#3a3a42] text-[#e0dcd0]"
                  }`}
                >
                  {isProcessing ? "处理中..." : option.text}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
