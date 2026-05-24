import { PrismaClient } from "../generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

let prismaInstance: PrismaClient | null = null

export function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prismaInstance = new PrismaClient({ adapter } as any)
  }
  return prismaInstance
}

export const prisma = getPrisma()
