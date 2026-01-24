// 首页 - 游戏入口
import Head from "next/head";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <Head>
        <title>诸天领域 - 文字策略游戏</title>
        <meta name="description" content="卡牌、领地、多世界探索的文字策略游戏" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-[#0a0a08] text-[#e0dcd0] font-mono">
        {/* 主内容 */}
        <div className="min-h-screen flex flex-col items-center justify-center px-4">
          {/* Logo 区域 */}
          <div className="text-center mb-12">
            <div className="text-8xl mb-6">🏰</div>
            <h1 className="text-4xl md:text-5xl text-[#c9a227] font-bold mb-4">
              诸天领域
            </h1>
            <p className="text-lg text-[#888] max-w-md">
              卡牌 · 领地 · 多世界探索
            </p>
          </div>

          {/* 特性介绍 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mb-12">
            <FeatureCard
              icon="🎴"
              title="卡牌收集"
              description="收集稀有卡牌，解锁技能、建筑、角色"
            />
            <FeatureCard
              icon="🏗️"
              title="领地建设"
              description="建造发展你的领地，提升生产力"
            />
            <FeatureCard
              icon="🌍"
              title="多世界探索"
              description="穿越诸天万界，探索未知领域"
            />
          </div>

          {/* 行动按钮 */}
          <div className="text-center space-y-3">
            <Link
              href="/login"
              className="inline-block px-12 py-4 bg-[#c9a227] text-[#0a0a08] text-lg font-bold hover:bg-[#ddb52f] transition-colors"
            >
              开始游戏
            </Link>
            <div className="text-xs text-[#666]">
              开发模式 · 无需注册
            </div>
          </div>

          {/* 底部链接 */}
          <div className="mt-12 flex gap-6 text-sm text-[#666]">
            <Link href="/__design_lab" className="hover:text-[#c9a227]">
              设计Lab
            </Link>
            <span>·</span>
            <span>v0.1.0</span>
          </div>
        </div>
      </main>
    </>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="border border-[#3d3529] bg-[#12110d] p-6 text-center hover:border-[#c9a227] transition-colors">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-[#c9a227] font-medium mb-2">{title}</h3>
      <p className="text-sm text-[#888]">{description}</p>
    </div>
  );
}
