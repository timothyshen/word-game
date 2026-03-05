// 开发环境简化版Auth - App Router 版本
import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { cookies } from "next/headers";

const DEV_SESSION_COOKIE = "dev-session";

function safeCallbackUrl(url: string | null | undefined, fallback = "/game"): string {
  if (!url || url.startsWith("http") || url.startsWith("//") || !url.startsWith("/")) return fallback;
  return url;
}

async function handler(req: NextRequest, { params }: { params: Promise<{ nextauth: string[] }> }) {
  const { nextauth } = await params;
  const action = nextauth[0];

  // GET /api/auth/session - 返回当前session
  if (action === "session") {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(DEV_SESSION_COOKIE)?.value;

    if (!sessionId) {
      return NextResponse.json({});
    }

    const user = await db.user.findUnique({
      where: { id: sessionId },
    });

    if (!user) {
      return NextResponse.json({});
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  // GET /api/auth/csrf - 返回CSRF token (dev不需要)
  if (action === "csrf") {
    return NextResponse.json({ csrfToken: "dev-csrf-token" });
  }

  // GET /api/auth/providers - 返回可用的providers
  if (action === "providers") {
    return NextResponse.json({
      "dev-login": {
        id: "dev-login",
        name: "开发登录",
        type: "credentials",
        signinUrl: "/api/auth/signin/dev-login",
        callbackUrl: "/api/auth/callback/dev-login",
      },
    });
  }

  // POST /api/auth/callback/dev-login - 处理登录
  if (action === "callback" && nextauth[1] === "dev-login" && req.method === "POST") {
    const formData = await req.formData();
    const username = (formData.get("username") as string) ?? "dev";
    const callbackUrl = safeCallbackUrl(formData.get("callbackUrl") as string);

    // 查找或创建用户
    let user = await db.user.findFirst({
      where: { name: username },
    });

    if (!user) {
      user = await db.user.create({
        data: {
          name: username,
          email: `${username}@game.local`,
        },
      });
    }

    // 设置session cookie并重定向
    const response = NextResponse.redirect(new URL(callbackUrl, req.url));
    response.cookies.set(DEV_SESSION_COOKIE, user.id, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  }

  // GET /api/auth/signin - 显示登录页 (重定向到我们的登录页)
  if (action === "signin") {
    const callbackUrl = safeCallbackUrl(req.nextUrl.searchParams.get("callbackUrl"));
    return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`, req.url));
  }

  // POST/GET /api/auth/signout - 登出
  if (action === "signout") {
    const callbackUrl = req.method === "POST"
      ? safeCallbackUrl((await req.formData()).get("callbackUrl") as string, "/")
      : "/";

    const response = NextResponse.redirect(new URL(callbackUrl, req.url));
    response.cookies.set(DEV_SESSION_COOKIE, "", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  }

  // 其他请求返回空
  return NextResponse.json({});
}

export { handler as GET, handler as POST };
