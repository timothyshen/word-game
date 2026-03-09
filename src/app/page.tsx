// 首页 - 游戏入口
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#050810] text-[#e0dcd0] overflow-hidden relative">
      {/* Atmospheric background — radial warm glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(201,162,39,0.06) 0%, transparent 70%), radial-gradient(ellipse 40% 60% at 80% 60%, rgba(139,105,20,0.04) 0%, transparent 60%)",
        }}
      />

      {/* Decorative vertical lines */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
        <div className="absolute left-[20%] top-0 bottom-0 w-px bg-[#c9a227]" />
        <div className="absolute left-[80%] top-0 bottom-0 w-px bg-[#c9a227]" />
      </div>

      {/* Main content — asymmetric layout */}
      <div className="relative min-h-screen flex flex-col justify-between px-6 sm:px-12 lg:px-24">

        {/* Top bar */}
        <header className="flex items-center justify-between py-6">
          <div className="text-xs tracking-[0.3em] uppercase text-[#5a6a7a]">
            诸天领域
          </div>
          <div className="text-xs text-[#3d3529]">v0.1.0</div>
        </header>

        {/* Hero — dramatic left-aligned title */}
        <div className="flex-1 flex items-center">
          <div className="w-full max-w-5xl">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-12 lg:gap-24">
              {/* Title block */}
              <div className="lg:max-w-lg">
                <div
                  className="font-display text-[clamp(4.5rem,12vw,9rem)] leading-[0.9] text-[#c9a227] tracking-tight"
                  style={{ textShadow: "0 0 80px rgba(201,162,39,0.15)" }}
                >
                  诸天
                  <br />
                  领域
                </div>
                <div className="mt-6 h-px w-24 bg-gradient-to-r from-[#c9a227] to-transparent" />
                <p className="mt-6 font-game-serif text-lg sm:text-xl text-[#8a8070] leading-relaxed max-w-sm">
                  身为领主，统御领地，
                  <br className="hidden sm:block" />
                  穿越诸天万界，探索未知。
                </p>
              </div>

              {/* Feature pillars — vertical stack, not cards */}
              <div className="flex flex-col gap-8 lg:pb-4">
                <FeaturePillar
                  number="壹"
                  title="卡牌收集"
                  detail="收集稀有卡牌，解锁技能与角色"
                />
                <FeaturePillar
                  number="贰"
                  title="领地建设"
                  detail="建造发展领地，提升国力"
                />
                <FeaturePillar
                  number="叁"
                  title="诸天探索"
                  detail="穿越万界，征服未知领域"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom — CTA and atmosphere */}
        <div className="pb-8 sm:pb-12 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
          <Link
            href="/login"
            className="group inline-flex items-center gap-4 px-10 py-4 bg-[#c9a227] text-[#050810] font-bold text-lg tracking-wide hover:bg-[#ddb52f] transition-colors"
          >
            开始游戏
            <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
          </Link>
          <div className="text-xs text-[#3d3529] font-game-serif">
            卡牌 · 领地 · 战斗 · 探索
          </div>
        </div>
      </div>
    </main>
  );
}

function FeaturePillar({
  number,
  title,
  detail,
}: {
  number: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-4 group">
      <span className="font-display text-2xl text-[#c9a227]/40 leading-none mt-0.5 shrink-0">
        {number}
      </span>
      <div>
        <div className="text-[#e0dcd0] font-bold tracking-wide">{title}</div>
        <div className="text-sm text-[#5a6a7a] mt-1">{detail}</div>
      </div>
    </div>
  );
}
