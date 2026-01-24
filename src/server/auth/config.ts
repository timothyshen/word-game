import { type DefaultSession, type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { db } from "~/server/db";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

const isDev = process.env.NODE_ENV === "development";

export const authConfig = {
  providers: [
    CredentialsProvider({
      id: "dev-login",
      name: "开发登录",
      credentials: {
        username: { label: "用户名", type: "text", placeholder: "dev" },
      },
      async authorize(credentials) {
        // 开发环境：只需要用户名，不需要密码
        if (!isDev) {
          return null;
        }

        const username = (credentials?.username as string) || "dev";

        const user = await db.user.findFirst({
          where: { name: username },
        });

        if (user) {
          return { id: user.id, name: user.name, email: user.email };
        }

        // 自动创建用户
        const newUser = await db.user.create({
          data: {
            name: username,
            email: `${username}@game.local`,
          },
        });

        return { id: newUser.id, name: newUser.name, email: newUser.email };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.id as string,
      },
    }),
  },
  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig;
