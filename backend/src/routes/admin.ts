import { Router, Response, NextFunction, Request } from "express"
import { createClient } from "@supabase/supabase-js"
import { prisma } from "../lib/prisma"
import { releaseExpiredReservations } from "../lib/reservations"

const router = Router()

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const username = String(req.headers["x-admin-username"] ?? "")
  const password = String(req.headers["x-admin-password"] ?? "")
  const expectedUsername = process.env.ADMIN_USERNAME ?? "admin"
  const expectedPassword = process.env.ADMIN_PASSWORD ?? "admin"

  if (username !== expectedUsername || password !== expectedPassword) {
    res.status(401).json({ error: "Invalid admin credentials" })
    return
  }

  next()
}

router.get("/dashboard", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    await releaseExpiredReservations()

    const [reservations, products, stocks, userRows] = await Promise.all([
      prisma.reservation.findMany({
        include: { product: true, warehouse: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.findMany({ include: { stock: true } }),
      prisma.inventoryStock.findMany({
        include: { product: true, warehouse: true },
        orderBy: [{ product: { name: "asc" } }, { warehouse: { name: "asc" } }],
      }),
      prisma.reservation.findMany({
        distinct: ["userId"],
        select: { userId: true },
      }),
    ])

    const purchases = reservations.filter((r) => r.status === "CONFIRMED")
    const pending = reservations.filter((r) => r.status === "PENDING")
    const failed = reservations.filter((r) => r.status === "RELEASED")
    const revenue = purchases.reduce((sum, r) => sum + Number(r.product.price) * r.quantity, 0)
    const reservedUnits = stocks.reduce((sum, s) => sum + s.reservedUnits, 0)
    const totalUnits = stocks.reduce((sum, s) => sum + s.totalUnits, 0)
    const availableUnits = stocks.reduce((sum, s) => sum + (s.totalUnits - s.reservedUnits), 0)
    const userProfiles = await getUserProfiles(userRows.map((user) => user.userId))
    const knownReservationProfiles = getKnownReservationProfiles(reservations)

    const billing = reservations.map((r) => {
      const amount = Number(r.product.price) * r.quantity
      const dateSource = r.status === "PENDING" ? r.createdAt : r.updatedAt
      const status = r.status === "CONFIRMED" ? "SUCCESS" : r.status === "RELEASED" ? "FAILED" : "PENDING"
      const knownProfile = knownReservationProfiles.get(r.userId)
      const serviceProfile = userProfiles.get(r.userId)
      const customerEmail = r.userEmail ?? knownProfile?.email ?? serviceProfile?.email ?? null
      const customerName = knownProfile?.name ?? serviceProfile?.name ?? r.userName ?? customerNameFallback(r.userId)
      const customerUsername =
        customerEmail?.split("@")[0] ??
        knownProfile?.username ??
        serviceProfile?.username ??
        r.userName ??
        customerUsernameFallback(r.userId)

      return {
        id: r.id,
        userId: r.userId,
        customerName,
        customerUsername,
        customerEmail,
        productName: r.product.name,
        warehouseName: r.warehouse.name,
        warehouseLocation: r.warehouse.location,
        quantity: r.quantity,
        amount,
        status,
        date: dateSource,
        reason:
          r.status === "CONFIRMED"
            ? "Payment verified and reservation confirmed"
            : r.status === "RELEASED"
              ? "Payment failed, cancelled, or reservation expired"
              : "Reservation is awaiting payment",
      }
    })

    const users = userRows.map((user) => {
      const userReservations = reservations.filter((r) => r.userId === user.userId)
      const userPurchases = userReservations.filter((r) => r.status === "CONFIRMED")
      const knownProfile = knownReservationProfiles.get(user.userId)
      const serviceProfile = userProfiles.get(user.userId)
      const email = userReservations.find((r) => r.userEmail)?.userEmail ?? knownProfile?.email ?? serviceProfile?.email
      const name = knownProfile?.name ?? serviceProfile?.name ?? userReservations.find((r) => r.userName)?.userName
      return {
        userId: user.userId,
        name: name ?? customerNameFallback(user.userId),
        username: email?.split("@")[0] ?? name ?? knownProfile?.username ?? serviceProfile?.username ?? customerUsernameFallback(user.userId),
        email: email ?? "Email will appear after this user signs in again",
        reservations: userReservations.length,
        purchases: userPurchases.length,
        failedBillings: userReservations.filter((r) => r.status === "RELEASED").length,
        pendingBillings: userReservations.filter((r) => r.status === "PENDING").length,
        totalSpent: userPurchases.reduce((sum, r) => sum + Number(r.product.price) * r.quantity, 0),
        lastActivity: userReservations[0]?.updatedAt ?? userReservations[0]?.createdAt ?? null,
        firstSeen: userReservations[userReservations.length - 1]?.createdAt ?? null,
      }
    })

    const stockDetails = stocks.map((s) => ({
      id: s.id,
      productId: s.productId,
      productName: s.product.name,
      warehouseId: s.warehouseId,
      warehouseName: s.warehouse.name,
      warehouseLocation: s.warehouse.location,
      totalUnits: s.totalUnits,
      reservedUnits: s.reservedUnits,
      availableUnits: s.totalUnits - s.reservedUnits,
    }))

    res.json({
      summary: {
        usersRegistered: userRows.length,
        totalProducts: products.length,
        totalPurchases: purchases.length,
        successfulBillings: purchases.length,
        failedBillings: failed.length,
        pendingBillings: pending.length,
        revenue,
        totalUnits,
        reservedUnits,
        availableUnits,
      },
      analytics: {
        purchases: purchases.length,
        failedPayments: failed.length,
        pendingReservations: pending.length,
        revenue,
        averageOrderValue: purchases.length > 0 ? revenue / purchases.length : 0,
        conversionFromReservation:
          reservations.length > 0 ? Math.round((purchases.length / reservations.length) * 100) : 0,
      },
      users,
      billing,
      stock: stockDetails,
    })
  } catch (err) {
    console.error("[GET /admin/dashboard]", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

export default router

type UserProfile = {
  name: string | null
  username: string | null
  email: string | null
}

async function getUserProfiles(userIds: string[]): Promise<Map<string, UserProfile>> {
  const profiles = new Map<string, UserProfile>()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!serviceRoleKey || !supabaseUrl || userIds.length === 0) return profiles

  try {
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (error) return profiles

    for (const user of data.users) {
      if (!userIds.includes(user.id)) continue
      const metadataName =
        typeof user.user_metadata?.["name"] === "string"
          ? user.user_metadata["name"]
          : typeof user.user_metadata?.["full_name"] === "string"
            ? user.user_metadata["full_name"]
            : null
      profiles.set(user.id, {
        name: metadataName ?? user.email?.split("@")[0] ?? null,
        username: user.email?.split("@")[0] ?? null,
        email: user.email ?? null,
      })
    }
  } catch {
    return profiles
  }

  return profiles
}

function customerNameFallback(userId: string): string {
  return `Customer ${userId.slice(0, 6)}`
}

function customerUsernameFallback(userId: string): string {
  return `user_${userId.slice(0, 8)}`
}

function getKnownReservationProfiles(reservations: Array<{ userId: string; userEmail: string | null; userName: string | null }>): Map<string, UserProfile> {
  const profiles = new Map<string, UserProfile>()

  for (const reservation of reservations) {
    const existing = profiles.get(reservation.userId)
    const email = existing?.email ?? reservation.userEmail ?? null
    const name = existing?.name ?? reservation.userName ?? reservation.userEmail?.split("@")[0] ?? null
    const username = existing?.username ?? reservation.userEmail?.split("@")[0] ?? reservation.userName ?? null

    if (email || name || username) {
      profiles.set(reservation.userId, { email, name, username })
    }
  }

  return profiles
}
