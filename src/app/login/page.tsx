"use client";

// 开发环境登录页面 - 使用表单提交
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

function LoginForm() {
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("dev");

  const callbackUrl = searchParams.get("callbackUrl") || "/game";

  return (
    <div className="w-full max-w-sm p-6 border border-[#3d3529] bg-[#12110d]">
      {/* Logo */}
      <div className="text-center mb-6">
        <div className="text-5xl mb-2">🏰</div>
        <h1 className="text-xl text-[#c9a227]">诸天领域</h1>
        <p className="text-xs text-[#888] mt-1">开发环境</p>
      </div>

      {/* 快速登录表单 */}
      <form
        action="/api/auth/callback/dev-login"
        method="POST"
        className="space-y-3 mb-6"
      >
        <input type="hidden" name="username" value="dev" />
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <button
          type="submit"
          className="w-full py-3 bg-[#c9a227] text-[#0a0a08] font-medium hover:bg-[#ddb52f] transition-colors"
        >
          快速登录 (dev)
        </button>
      </form>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#3d3529]" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-2 bg-[#12110d] text-[#666]">或使用其他用户名</span>
        </div>
      </div>

      {/* 自定义用户名表单 */}
      <form
        action="/api/auth/callback/dev-login"
        method="POST"
        className="space-y-3"
      >
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <input
          type="text"
          name="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="输入用户名"
          className="w-full px-4 py-2 bg-[#0a0a08] border border-[#3d3529] text-[#e0dcd0] placeholder-[#666] focus:border-[#c9a227] focus:outline-none"
        />

        <button
          type="submit"
          disabled={!username.trim()}
          className="w-full py-2 border border-[#3d3529] text-[#888] hover:border-[#c9a227] hover:text-[#c9a227] disabled:opacity-50 transition-colors"
        >
          使用该用户名登录
        </button>
      </form>

      {/* 提示 */}
      <div className="mt-6 p-3 bg-[#0a0a08] border border-[#3d3529] text-xs text-[#666]">
        <strong className="text-[#888]">开发模式:</strong> 无需密码，输入任意用户名即可登录。
        如用户不存在会自动创建。
      </div>
    </div>
  );
}

function LoginSkeleton() {
  return (
    <div className="w-full max-w-sm p-6 border border-[#3d3529] bg-[#12110d]">
      <div className="text-center mb-6">
        <div className="text-5xl mb-2">🏰</div>
        <h1 className="text-xl text-[#c9a227]">诸天领域</h1>
        <p className="text-xs text-[#888] mt-1">加载中...</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#0a0a08] text-[#e0dcd0] font-mono flex items-center justify-center">
      <Suspense fallback={<LoginSkeleton />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
