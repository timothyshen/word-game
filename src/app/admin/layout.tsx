"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "概览", icon: "📊" },
  { href: "/admin/cards", label: "卡牌管理", icon: "🃏" },
  { href: "/admin/buildings", label: "建筑管理", icon: "🏗️" },
  { href: "/admin/characters", label: "角色管理", icon: "👥" },
  { href: "/admin/skills", label: "技能管理", icon: "⚡" },
  { href: "/admin/equipment", label: "装备管理", icon: "🗡️" },
  { href: "/admin/professions", label: "职业管理", icon: "📋" },
  { href: "/admin/pois", label: "兴趣点管理", icon: "📍" },
  { href: "/admin/stories", label: "剧情管理", icon: "📜" },
  { href: "/admin/adventures", label: "奇遇管理", icon: "🎲" },
  { href: "/admin/rules", label: "规则管理", icon: "📐" },
  { href: "/admin/entities", label: "实体管理", icon: "🧩" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#08080a] text-[#e0dcd0]">
      {/* 顶部导航 */}
      <header className="bg-[#101014] border-b border-[#2a2a30]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-xl font-bold text-[#c9a227]">
              🛠️ Admin Dashboard
            </Link>
          </div>
          <Link
            href="/game"
            className="text-sm text-[#888] hover:text-[#c9a227]"
          >
            返回游戏 →
          </Link>
        </div>
      </header>

      <div className="flex">
        {/* 侧边栏 */}
        <nav className="w-56 bg-[#101014] border-r border-[#2a2a30] min-h-[calc(100vh-57px)]">
          <ul className="p-4 space-y-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded transition-colors ${
                      isActive
                        ? "bg-[#c9a227]/20 text-[#c9a227]"
                        : "text-[#888] hover:bg-[#1a1a20] hover:text-[#e0dcd0]"
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* 主内容 */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
