import NextAuth from "next-auth";
import type { NextApiRequest, NextApiResponse } from "next";
import { authConfig } from "./config";

const { auth: originalAuth, handlers, signIn, signOut } = NextAuth(authConfig);

/**
 * Auth wrapper for Pages Router
 * NextAuth v5 expects GetServerSidePropsContext
 */
const auth = async (
  req?: NextApiRequest,
  res?: NextApiResponse,
) => {
  if (!req || !res) {
    return originalAuth();
  }

  // Pass as GetServerSidePropsContext-like object
  return originalAuth({
    req,
    res,
    query: req.query as Record<string, string>,
    resolvedUrl: req.url ?? "/",
  });
};

export { auth, handlers, signIn, signOut };
