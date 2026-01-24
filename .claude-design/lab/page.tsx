// Design Lab - 设计变体预览页面

import React, { useState } from "react";
import VariantF from "./variants/VariantF";
import VariantG from "./variants/VariantG";
import EconomyPanel from "./components/EconomyPanel";
import MilitaryPanel from "./components/MilitaryPanel";
import BreakthroughCardModal, { BreakthroughCardList } from "./components/BreakthroughCardModal";
import CharacterDetailPanel from "./components/CharacterDetailPanel";
import SettlementPanel from "./components/SettlementPanel";
import { breakthroughCardData, charactersData } from "./data/fixtures";

const variants: Array<{
  id: string;
  name: string;
  description: string;
  Component: React.ComponentType;
  featured?: boolean;
}> = [
  {
    id: "G",
    name: "像素地图版（推荐）",
    description: "等距像素地图展示领地，点击建筑查看详情，支持升级动画效果。",
    Component: VariantG,
    featured: true,
  },
  {
    id: "F",
    name: "卡片网格版",
    description: "融合版布局，建筑以卡片网格形式展示，文字进度条风格。",
    Component: VariantF,
  },
];

// 独立组件展示列表
const componentShowcases = [
  {
    id: "settlement",
    name: "每日结算",
    description: "展示当日行动分数、评级、卡牌奖励和连续记录",
    icon: "🏆",
  },
  {
    id: "economy",
    name: "经济面板",
    description: "展示领地经济数据、收支统计、生产设施和趋势图",
    icon: "📊",
  },
  {
    id: "military",
    name: "军事面板",
    description: "展示战斗力、兵力配置、军事设施和威胁情报",
    icon: "⚔️",
  },
  {
    id: "breakthrough",
    name: "突破卡系统",
    description: "角色职业突破选择界面，展示可选职业和技能树",
    icon: "⚡",
  },
  {
    id: "character",
    name: "角色详情（11装备槽）",
    description: "更新后的角色面板，支持11个装备槽位",
    icon: "👤",
  },
];

export default function DesignLab() {
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [activeBreakthroughCard, setActiveBreakthroughCard] = useState<typeof breakthroughCardData.availableCards[0] | null>(null);

  // 组件展示渲染
  if (selectedComponent) {
    return (
      <div className="min-h-screen bg-[#0a0a08] text-[#e0dcd0] font-mono">
        {/* 返回按钮 */}
        <button
          onClick={() => {
            setSelectedComponent(null);
            setActiveBreakthroughCard(null);
          }}
          className="fixed top-4 left-4 z-[60] px-4 py-2 bg-[#c9a227] text-black font-mono text-sm hover:bg-[#ddb52f]"
        >
          ← 返回列表
        </button>
        {/* 组件标签 */}
        <div className="fixed top-4 right-4 z-[60] px-3 py-1 bg-black/80 text-[#c9a227] font-mono text-sm">
          组件: {componentShowcases.find(c => c.id === selectedComponent)?.name}
        </div>

        {/* 组件展示区 */}
        <div className="pt-16 p-6">
          {selectedComponent === "settlement" && (
            <SettlementPanel
              onClose={() => setSelectedComponent(null)}
              onCollectRewards={() => {
                alert("奖励已领取！");
                setSelectedComponent(null);
              }}
            />
          )}

          {selectedComponent === "economy" && (
            <EconomyPanel
              onClose={() => setSelectedComponent(null)}
              onBuildFacility={() => alert("建造设施")}
              onAssignWorker={() => alert("分配工人")}
              onViewHistory={() => alert("查看交易记录")}
            />
          )}

          {selectedComponent === "military" && (
            <MilitaryPanel
              onClose={() => setSelectedComponent(null)}
              onFormation={() => alert("编队")}
              onTrainSoldiers={() => alert("训练士兵")}
              onExpedition={() => alert("出征")}
              onDefense={() => alert("防御部署")}
            />
          )}

          {selectedComponent === "breakthrough" && !activeBreakthroughCard && (
            <div className="max-w-2xl mx-auto">
              <h2 className="text-xl text-[#c9a227] mb-4">突破卡系统</h2>
              <BreakthroughCardList
                onSelectCard={(card) => setActiveBreakthroughCard(card)}
              />
            </div>
          )}

          {selectedComponent === "breakthrough" && activeBreakthroughCard && (
            <BreakthroughCardModal
              card={activeBreakthroughCard}
              onClose={() => setActiveBreakthroughCard(null)}
              onSelectProfession={(professionId) => {
                alert(`已选择职业: ${professionId}`);
                setActiveBreakthroughCard(null);
              }}
            />
          )}

          {selectedComponent === "character" && (
            <CharacterDetailPanel
              character={charactersData[0]!}
              onClose={() => setSelectedComponent(null)}
              onAssign={() => alert("分配工作")}
              onUnassign={() => alert("取消工作")}
            />
          )}
        </div>
      </div>
    );
  }

  if (selectedVariant) {
    const variant = variants.find((v) => v.id === selectedVariant);
    if (variant) {
      return (
        <div className="relative">
          {/* 返回按钮 */}
          <button
            onClick={() => setSelectedVariant(null)}
            className="fixed top-4 left-4 z-50 px-4 py-2 bg-[#c9a227] text-black font-mono text-sm hover:bg-[#ddb52f]"
          >
            ← 返回列表
          </button>
          {/* 变体标签 */}
          <div className="fixed top-4 right-4 z-50 px-3 py-1 bg-black/80 text-[#c9a227] font-mono text-sm">
            变体 {variant.id}: {variant.name}
          </div>
          <variant.Component />
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a08] text-[#e0dcd0] font-mono p-6">
      <div className="max-w-6xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl text-[#c9a227] mb-2">Design Lab</h1>
          <p className="text-[#888]">诸天领域 - 领地界面设计变体</p>
        </div>

        {/* 设计简报 */}
        <div className="mb-8 p-4 border border-[#3d3529] bg-[#12110d]">
          <h2 className="text-[#c9a227] mb-3">设计简报</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-[#666]">风格:</span>
              <span className="ml-2">像素/复古风</span>
            </div>
            <div>
              <span className="text-[#666]">配色:</span>
              <span className="ml-2">黑灰金</span>
            </div>
            <div>
              <span className="text-[#666]">密度:</span>
              <span className="ml-2">紧凑型</span>
            </div>
            <div>
              <span className="text-[#666]">设备:</span>
              <span className="ml-2">桌面/移动同等</span>
            </div>
          </div>
        </div>

        {/* 推荐变体 - F */}
        {variants.filter(v => v.featured).map((variant) => (
          <div
            key={variant.id}
            onClick={() => setSelectedVariant(variant.id)}
            className="mb-6 group cursor-pointer border-2 border-[#c9a227] bg-[#12110d] transition-colors hover:bg-[#1a1814]"
          >
            <div className="h-64 overflow-hidden relative">
              <div className="absolute inset-0 scale-[0.4] origin-top-left w-[250%] h-[250%]">
                <variant.Component />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#12110d] to-transparent" />
              <div className="absolute top-3 right-3 px-2 py-1 bg-[#c9a227] text-[#0a0a08] text-xs font-bold">
                推荐
              </div>
            </div>
            <div className="p-4 border-t border-[#c9a227]">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-10 h-10 flex items-center justify-center bg-[#c9a227] text-[#0a0a08] font-bold text-xl">
                  {variant.id}
                </span>
                <h3 className="text-xl text-[#c9a227]">{variant.name}</h3>
              </div>
              <p className="text-sm text-[#888]">{variant.description}</p>
            </div>
          </div>
        ))}

        {/* 对比变体 - D & E */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {variants.filter(v => !v.featured).map((variant) => (
            <div
              key={variant.id}
              onClick={() => setSelectedVariant(variant.id)}
              className="group cursor-pointer border-2 border-[#3d3529] hover:border-[#c9a227] bg-[#12110d] transition-colors"
            >
              <div className="h-48 overflow-hidden relative">
                <div className="absolute inset-0 scale-[0.3] origin-top-left w-[333%] h-[333%]">
                  <variant.Component />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#12110d] to-transparent" />
              </div>
              <div className="p-4 border-t border-[#3d3529]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-8 h-8 flex items-center justify-center bg-[#3d3529] text-[#c9a227] font-bold">
                    {variant.id}
                  </span>
                  <h3 className="text-lg group-hover:text-[#c9a227] transition-colors">
                    {variant.name}
                  </h3>
                </div>
                <p className="text-sm text-[#888]">{variant.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 组件展示区 */}
        <div className="mt-12 mb-8">
          <h2 className="text-2xl text-[#c9a227] mb-4">独立组件</h2>
          <p className="text-[#888] mb-6">新增的面板和功能组件</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {componentShowcases.map((component) => (
              <div
                key={component.id}
                onClick={() => setSelectedComponent(component.id)}
                className="group cursor-pointer border-2 border-[#3d3529] hover:border-[#c9a227] bg-[#12110d] transition-colors p-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 flex items-center justify-center bg-[#1a1a20] border border-[#3d3529] group-hover:border-[#c9a227] text-2xl">
                    {component.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg group-hover:text-[#c9a227] transition-colors">
                      {component.name}
                    </h3>
                    <p className="text-sm text-[#888] mt-1">{component.description}</p>
                  </div>
                  <div className="text-[#3d3529] group-hover:text-[#c9a227] transition-colors">
                    →
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 说明 */}
        <div className="mt-8 text-center text-sm text-[#666]">
          点击任意变体或组件查看完整预览 · 按 ESC 或点击返回按钮退出预览
        </div>
      </div>
    </div>
  );
}
