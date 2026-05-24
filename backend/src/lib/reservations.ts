import { prisma } from "./prisma"

export async function releaseExpiredReservations(): Promise<number> {
  const expired = await prisma.reservation.findMany({
    where: { status: "PENDING", expiresAt: { lt: new Date() } },
  })

  let released = 0

  for (const reservation of expired) {
    const didRelease = await prisma.$transaction(async (tx) => {
      const updated = await tx.reservation.updateMany({
        where: { id: reservation.id, status: "PENDING" },
        data: { status: "RELEASED" },
      })

      if (updated.count === 0) return false

      await tx.$executeRaw`
        UPDATE "InventoryStock"
        SET "reservedUnits" = GREATEST("reservedUnits" - ${reservation.quantity}, 0)
        WHERE "productId" = ${reservation.productId} AND "warehouseId" = ${reservation.warehouseId}
      `

      return true
    })

    if (didRelease) released += 1
  }

  return released
}

export async function syncReservationUserProfile(user: { id: string; email?: string; name?: string | null }): Promise<void> {
  const email = user.email ?? null
  const name = user.name ?? email?.split("@")[0] ?? null

  if (!email && !name) return

  await prisma.reservation.updateMany({
    where: {
      userId: user.id,
      OR: [{ userEmail: null }, { userName: null }],
    },
    data: {
      ...(email ? { userEmail: email } : {}),
      ...(name ? { userName: name } : {}),
    },
  })
}
