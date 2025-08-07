// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: ["query"], // opcional para debugar suas consultas
  });

if (process.env.NODE_ENV === "development") global.prisma = prisma;
