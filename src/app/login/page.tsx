"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "~/trpc/react";
import { setSessionCookie } from "./actions";

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const callbackUrl = searchParams.get("callbackUrl") || "/game";

  // Clear any stale queries that might interfere with login
  const queryClient = useQueryClient();
  useEffect(() => {
    // Cancel and remove all queries to prevent 401 errors on login page
    queryClient.cancelQueries();
    queryClient.clear();
  }, [queryClient]);

  const loginMutation = api.auth.login.useMutation({
    onSuccess: async (data) => {
      await setSessionCookie(data.userId);
      router.push(callbackUrl);
    },
    onError: (err) => {
      setError(err.message);
      setLoading(false);
    },
  });

  const registerMutation = api.auth.register.useMutation({
    onSuccess: async (data) => {
      await setSessionCookie(data.userId);
      router.push(callbackUrl);
    },
    onError: (err) => {
      setError(err.message);
      setLoading(false);
    },
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    loginMutation.mutate({ email });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    registerMutation.mutate({ email, name, playerName });
  };

  const handleTestLogin = () => {
    setError("");
    setLoading(true);
    loginMutation.mutate({ email: "test@test.com" });
  };

  return (
    <div className="w-full max-w-sm p-6 border border-[#3d3529] bg-[#12110d]">
      {/* Logo */}
      <div className="text-center mb-6">
        <div className="text-5xl mb-2">🏰</div>
        <h1 className="text-xl text-[#c9a227]">诸天领域</h1>
        <p className="text-xs text-[#888] mt-1">
          {mode === "login" ? "登录" : "注册"}
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div role="alert" className="mb-4 p-3 bg-red-900/30 border border-red-800 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Test account quick login */}
      <button
        onClick={handleTestLogin}
        disabled={loading}
        className="w-full py-3 mb-4 bg-[#c9a227] text-[#0a0a08] font-medium hover:bg-[#ddb52f] transition-colors disabled:opacity-50"
      >
        {loading ? "登录中..." : "测试账号登录 (test@test.com)"}
      </button>

      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#3d3529]" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-2 bg-[#12110d] text-[#666]">
            {mode === "login" ? "或使用邮箱登录" : "或注册新账号"}
          </span>
        </div>
      </div>

      {mode === "login" ? (
        /* Login form */
        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label htmlFor="login-email" className="sr-only">邮箱地址</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="邮箱地址"
              required
              autoComplete="email"
              className="w-full px-4 py-2 bg-[#0a0a08] border border-[#3d3529] text-[#e0dcd0] placeholder-[#888] focus:border-[#c9a227] focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full py-2 border border-[#3d3529] text-[#888] hover:border-[#c9a227] hover:text-[#c9a227] disabled:opacity-50 transition-colors"
          >
            {loading ? "登录中..." : "登录"}
          </button>
        </form>
      ) : (
        /* Register form */
        <form onSubmit={handleRegister} className="space-y-3">
          <div>
            <label htmlFor="register-email" className="sr-only">邮箱地址</label>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="邮箱地址"
              required
              autoComplete="email"
              className="w-full px-4 py-2 bg-[#0a0a08] border border-[#3d3529] text-[#e0dcd0] placeholder-[#888] focus:border-[#c9a227] focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="register-name" className="sr-only">用户名</label>
            <input
              id="register-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="用户名 (2-20字符)"
              required
              minLength={2}
              maxLength={20}
              autoComplete="username"
              className="w-full px-4 py-2 bg-[#0a0a08] border border-[#3d3529] text-[#e0dcd0] placeholder-[#888] focus:border-[#c9a227] focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="register-player" className="sr-only">角色名</label>
            <input
              id="register-player"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="角色名 (2-20字符)"
              required
              minLength={2}
              maxLength={20}
              className="w-full px-4 py-2 bg-[#0a0a08] border border-[#3d3529] text-[#e0dcd0] placeholder-[#888] focus:border-[#c9a227] focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !email.trim() || !name.trim() || !playerName.trim()}
            className="w-full py-2 border border-[#3d3529] text-[#888] hover:border-[#c9a227] hover:text-[#c9a227] disabled:opacity-50 transition-colors"
          >
            {loading ? "注册中..." : "注册"}
          </button>
        </form>
      )}

      {/* Toggle mode */}
      <div className="mt-4 text-center">
        <button
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
          }}
          className="text-sm text-[#888] hover:text-[#c9a227] transition-colors"
        >
          {mode === "login" ? "没有账号？点击注册" : "已有账号？点击登录"}
        </button>
      </div>

      {/* Info */}
      <div className="mt-6 p-3 bg-[#0a0a08] border border-[#3d3529] text-xs text-[#666]">
        <strong className="text-[#888]">提示:</strong> 测试账号可直接登录体验游戏。
        注册账号后可保存游戏进度。
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
