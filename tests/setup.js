import { beforeAll, afterAll, afterEach } from "vitest";
import { PrismaClient } from "@prisma/client";

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

let prisma;

beforeAll(async () => {
  // DATABASE_URL is set via vite.config.js test.env
  // Migrations must be applied before running tests (via npm run test:migrate)
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL must be set for tests (see vite.config.js test.env)");
  }

  prisma = new PrismaClient({
    datasources: { db: { url: dbUrl } },
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
});
