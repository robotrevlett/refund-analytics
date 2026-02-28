import { beforeAll, afterAll, afterEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";
import { existsSync, unlinkSync } from "fs";
import { resolve } from "path";

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

  // Make prisma available globally for tests
  global.__testPrisma = prisma;
});

afterEach(async () => {
  // Clean all tables between tests
  if (prisma) {
    await prisma.returnReasonRecord.deleteMany();
    await prisma.refundRecord.deleteMany();
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
