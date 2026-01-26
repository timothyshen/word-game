"use client";

import Link from "next/link";
import { api } from "~/trpc/react";

export default function AdminDashboard() {
  const { data: stats, isLoading } = api.admin.getStats.useQuery();

  const statCards = [
    {
      label: "卡牌总数",
      value: stats?.cards ?? 0,
      icon: "🃏",
      href: "/admin/cards",
      color: "#c9a227",
    },
    {
      label: "剧情章节",
      value: stats?.chapters ?? 0,
      icon: "📜",
      href: "/admin/stories",
      color: "#4a9",
    },
    {
      label: "奇遇事件",
      value: stats?.adventures ?? 0,
      icon: "🎲",
      href: "/admin/adventures",
      color: "#9b59b6",
    },
    {
      label: "玩家数量",
      value: stats?.players ?? 0,
      icon: "👥",
      href: "#",
      color: "#4a9eff",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#888]">加载中...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">管理后台概览</h1>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="p-6 bg-[#101014] border border-[#2a2a30] hover:border-[#3a3a40] transition-colors"
          >
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 flex items-center justify-center text-2xl rounded"
                style={{ backgroundColor: `${card.color}20` }}
              >
                {card.icon}
              </div>
              <div>
                <div className="text-3xl font-bold" style={{ color: card.color }}>
                  {card.value}
                </div>
                <div className="text-sm text-[#888]">{card.label}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* 快速操作 */}
      <h2 className="text-lg font-bold mb-4">快速操作</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/admin/cards?action=create"
          className="p-4 bg-[#101014] border border-[#2a2a30] hover:border-[#c9a227] transition-colors flex items-center gap-3"
        >
          <span className="text-2xl">➕</span>
          <div>
            <div className="font-bold">添加新卡牌</div>
            <div className="text-sm text-[#888]">创建建筑、招募、技能等卡牌</div>
          </div>
        </Link>

        <Link
          href="/admin/stories?action=create"
          className="p-4 bg-[#101014] border border-[#2a2a30] hover:border-[#4a9] transition-colors flex items-center gap-3"
        >
          <span className="text-2xl">📝</span>
          <div>
            <div className="font-bold">添加新剧情</div>
            <div className="text-sm text-[#888]">创建主线或支线剧情章节</div>
          </div>
        </Link>

        <Link
          href="/admin/adventures?action=create"
          className="p-4 bg-[#101014] border border-[#2a2a30] hover:border-[#9b59b6] transition-colors flex items-center gap-3"
        >
          <span className="text-2xl">🎯</span>
          <div>
            <div className="font-bold">添加新奇遇</div>
            <div className="text-sm text-[#888]">创建探索时的随机事件</div>
          </div>
        </Link>
      </div>

      {/* 使用说明 */}
      <div className="mt-8 p-4 bg-[#1a1a20] border border-[#2a2a30] rounded">
        <h3 className="font-bold text-[#c9a227] mb-2">📖 使用说明</h3>
        <ul className="text-sm text-[#888] space-y-1">
          <li>• <strong>卡牌管理</strong>：创建和编辑游戏中的卡牌，包括建筑卡、招募卡、技能卡等</li>
          <li>• <strong>剧情管理</strong>：编写主线剧情章节和对话节点，支持分支选择</li>
          <li>• <strong>奇遇管理</strong>：配置探索时的随机事件，如资源点、怪物遭遇、宝箱等</li>
        </ul>
      </div>
    </div>
  );
}
