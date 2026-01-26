import { vi } from "vitest";

// Mock environment variables
vi.mock("~/env", () => ({
  env: {
    DATABASE_URL: "file:./test.db",
    NODE_ENV: "test",
    AUTH_SECRET: "test-secret",
  },
}));

// Mock the database module
vi.mock("~/server/db", () => ({
  db: {},
}));
