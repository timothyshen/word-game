"use server";

import { cookies } from "next/headers";

export async function setSessionCookie(userId: string) {
  (await cookies()).set("dev-session", userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}
