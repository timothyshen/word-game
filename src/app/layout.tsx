import "~/styles/globals.css";

import { Geist, Ma_Shan_Zheng, Noto_Serif_SC } from "next/font/google";
import { type Metadata } from "next";
import { TRPCReactProvider } from "~/trpc/react";

const geist = Geist({
  subsets: ["latin"],
});

const maShanZheng = Ma_Shan_Zheng({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const notoSerifSC = Noto_Serif_SC({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "诸天领域 - 文字策略游戏",
  description: "卡牌、领地、多世界探索的文字策略游戏",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="dark">
      <body className={`${geist.className} ${maShanZheng.variable} ${notoSerifSC.variable}`}>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
