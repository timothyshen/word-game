/**
 * Database client types for Repository layer
 *
 * DbClient works for both regular Prisma calls and inside $transaction callbacks.
 * FullDbClient adds $transaction support for Service layer orchestration.
 */
import type { PrismaClient } from "../../../../generated/prisma";

/** Prisma client usable inside or outside transactions */
export type DbClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/** Full Prisma client with $transaction support (for Service layer) */
export type FullDbClient = PrismaClient;
