import { PrismaClient } from "../generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

let prismaInstance: PrismaClient | null = null

export function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    const isRemote = !process.env.DATABASE_URL?.includes("localhost")
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL!,
      ssl: isRemote ? { rejectUnauthorized: false } : false,
    })
    const adapter = new PrismaPg(pool)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prismaInstance = new PrismaClient({ adapter } as any)
  }
  return prismaInstance
}

export const prisma = getPrisma()
