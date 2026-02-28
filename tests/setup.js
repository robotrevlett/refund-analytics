import { beforeAll, afterAll, afterEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";
import { existsSync, unlinkSync } from "fs";
import { resolve } from "path";

// Mock window.matchMedia for Polaris (called at module load time)
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// Mock localStorage for jsdom (unavailable for opaque origins)
if (typeof globalThis !== "undefined") {
  const store = new Map();
  const localStorageMock = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
    get length() { return store.size; },
    key: (i) => [...store.keys()][i] ?? null,
  };
  if (typeof window !== "undefined") {
    Object.defineProperty(window, "localStorage", { value: localStorageMock, writable: true });
  }
  globalThis.localStorage = localStorageMock;
}

const TEST_DB_PATH = resolve("prisma/test.db");
const TEST_DB_URL = `file:${TEST_DB_PATH}`;

let prisma;

beforeAll(async () => {
  // Set test DB URL
  process.env.DATABASE_URL = TEST_DB_URL;

  // Clean up any existing test DB
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    const path = TEST_DB_PATH + suffix;
    if (existsSync(path)) {
      try { unlinkSync(path); } catch {}
    }
  }

  // Run migrations on test DB
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: "pipe",
  });

  prisma = new PrismaClient({
    datasources: { db: { url: TEST_DB_URL } },
  });

  await prisma.$connect();

  // Make prisma available globally for tests and for db.server.js
  global.__testPrisma = prisma;
  global.prismaClient = prisma;
});

afterEach(async () => {
  // Clean all tables between tests
  if (prisma) {
    await prisma.returnReasonRecord.deleteMany();
    await prisma.refundRecord.deleteMany();
    await prisma.orderRecord.deleteMany();
    await prisma.shop.deleteMany();
    await prisma.session.deleteMany();
  }
});

afterAll(async () => {
  if (prisma) {
    await prisma.$disconnect();
  }

  // Clean up test DB
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    const path = TEST_DB_PATH + suffix;
    if (existsSync(path)) {
      try { unlinkSync(path); } catch {}
    }
  }
});
