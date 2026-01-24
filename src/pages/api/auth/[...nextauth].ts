// 开发环境简化版Auth - 绕过NextAuth v5兼容性问题
import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "~/server/db";
import { serialize } from "cookie";

const DEV_SESSION_COOKIE = "dev-session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const action = req.query.nextauth?.[0];

  // GET /api/auth/session - 返回当前session
  if (action === "session") {
    const sessionId = req.cookies[DEV_SESSION_COOKIE];

    if (!sessionId) {
      return res.json({});
    }

    const user = await db.user.findUnique({
      where: { id: sessionId },
    });

    if (!user) {
      return res.json({});
    }

    return res.json({
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
    return res.json({ csrfToken: "dev-csrf-token" });
  }

  // GET /api/auth/providers - 返回可用的providers
  if (action === "providers") {
    return res.json({
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
  if (action === "callback" && req.query.nextauth?.[1] === "dev-login") {
    const username = (req.body?.username as string) ?? "dev";

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

    // 设置session cookie
    res.setHeader(
      "Set-Cookie",
      serialize(DEV_SESSION_COOKIE, user.id, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60, // 30 days
      })
    );

    // 重定向
    const callbackUrl = (req.body?.callbackUrl as string) ?? "/game";
    return res.redirect(302, callbackUrl);
  }

  // GET /api/auth/signin - 显示登录页 (重定向到我们的登录页)
  if (action === "signin") {
    const callbackUrl = req.query.callbackUrl as string ?? "/game";
    return res.redirect(302, `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  // POST/GET /api/auth/signout - 登出
  if (action === "signout") {
    res.setHeader(
      "Set-Cookie",
      serialize(DEV_SESSION_COOKIE, "", {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      })
    );

    if (req.method === "POST") {
      const callbackUrl = (req.body?.callbackUrl as string) ?? "/";
      return res.redirect(302, callbackUrl);
    }
    return res.redirect(302, "/");
  }

  // 其他请求返回空
  return res.json({});
}
