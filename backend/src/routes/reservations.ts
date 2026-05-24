import { Router, Response, Request } from "express"
import { z } from "zod"
import { prisma } from "../lib/prisma"
import { requireAuth, AuthRequest } from "../middleware/auth"
import { releaseExpiredReservations } from "../lib/reservations"

const router = Router()

const CreateReservationSchema = z.object({
  productId: z.string().min(1),
  warehouseId: z.string().min(1),
  quantity: z.number().int().min(1),
})

interface ReservationResponse {
  id: string
  productId: string
  warehouseId: string
  userId: string
  quantity: number
  status: string
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
  product: { id: string; name: string; price: number; description: string | null; imageUrl: string | null }
  warehouse: { id: string; name: string; location: string }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatReservation(r: any): ReservationResponse {
  return {
    id: r.id,
    productId: r.productId,
    warehouseId: r.warehouseId,
    userId: r.userId,
    quantity: r.quantity,
    status: r.status,
    expiresAt: r.expiresAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    product: {
      id: r.product.id,
      name: r.product.name,
      price: Number(r.product.price),
      description: r.product.description ?? null,
      imageUrl: r.product.imageUrl ?? null,
    },
    warehouse: {
      id: r.warehouse.id,
      name: r.warehouse.name,
      location: r.warehouse.location,
    },
  }
}

router.post("/", requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const idempotencyKey = req.headers["idempotency-key"]
  const iKey = Array.isArray(idempotencyKey) ? idempotencyKey[0] : idempotencyKey

  if (iKey) {
    const existing = await prisma.reservation.findUnique({
      where: { idempotencyKey: iKey },
      include: { product: true, warehouse: true },
    })
    if (existing) {
      res.status(200).json(formatReservation(existing))
      return
    }
  }

  const parsed = CreateReservationSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() })
    return
  }

  const { productId, warehouseId, quantity } = parsed.data
  const userId = req.user!.id
  const userEmail = req.user!.email ?? null
  const userName = req.user!.name ?? userEmail?.split("@")[0] ?? null
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  try {
    await releaseExpiredReservations()

    const reservation = await prisma.$transaction(async (tx) => {
      const updated = await tx.$executeRaw`
        UPDATE "InventoryStock"
        SET "reservedUnits" = "reservedUnits" + ${quantity}
        WHERE "productId" = ${productId}
          AND "warehouseId" = ${warehouseId}
          AND ("totalUnits" - "reservedUnits") >= ${quantity}
      `

      if (updated === 0) return null

      return tx.reservation.create({
        data: { productId, warehouseId, userId, userEmail, userName, quantity, expiresAt, idempotencyKey: iKey ?? undefined },
        include: { product: true, warehouse: true },
      })
    })

    if (!reservation) {
      res.status(409).json({ error: "Not enough stock available at the selected warehouse" })
      return
    }

    res.status(201).json(formatReservation(reservation))
  } catch (err) {
    if (iKey) {
      const existing = await prisma.reservation.findUnique({
        where: { idempotencyKey: iKey },
        include: { product: true, warehouse: true },
      })
      if (existing) {
        res.status(200).json(formatReservation(existing))
        return
      }
    }

    console.error("[POST /reservations]", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

router.get("/", requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id
  const raw = req.query["status"]
  const validStatuses = ["PENDING", "CONFIRMED", "RELEASED"]
  const filterStatus = typeof raw === "string" && validStatuses.includes(raw) ? raw : undefined

  try {
    await releaseExpiredReservations()

    const reservations = await prisma.reservation.findMany({
      where: { userId, ...(filterStatus ? { status: filterStatus as "PENDING" | "CONFIRMED" | "RELEASED" } : {}) },
      include: { product: true, warehouse: true },
      orderBy: { createdAt: "desc" },
    })
    res.json(reservations.map(formatReservation))
  } catch (err) {
    console.error("[GET /reservations]", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

router.get("/cron/expire", async (req: Request, res: Response): Promise<void> => {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ error: "Unauthorized" })
    return
  }

  try {
    const released = await releaseExpiredReservations()
    console.log(`[CRON] Released ${released} expired reservations`)
    res.json({ released })
  } catch (err) {
    console.error("[CRON /expire]", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

router.get("/:id", requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const id = String(req.params["id"])
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { product: true, warehouse: true },
    })

    if (!reservation) { res.status(404).json({ error: "Reservation not found" }); return }
    if (reservation.userId !== req.user!.id) { res.status(403).json({ error: "Forbidden" }); return }

    res.json(formatReservation(reservation))
  } catch (err) {
    console.error("[GET /reservations/:id]", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

router.post("/:id/confirm", requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const id = String(req.params["id"])
  try {
    const reservation = await prisma.reservation.findUnique({ where: { id } })

    if (!reservation) { res.status(404).json({ error: "Reservation not found" }); return }
    if (reservation.userId !== req.user!.id) { res.status(403).json({ error: "Forbidden" }); return }

    if (reservation.status === "CONFIRMED") {
      const full = await prisma.reservation.findUnique({ where: { id }, include: { product: true, warehouse: true } })
      res.json(formatReservation(full!))
      return
    }

    if (reservation.status === "RELEASED") {
      res.status(410).json({ error: "Reservation was already released" })
      return
    }

    if (new Date() > reservation.expiresAt) {
      await releasePendingReservation(id)
      res.status(410).json({ error: "Reservation has expired. Items returned to stock." })
      return
    }

    const confirmed = await confirmPendingReservation(id, req.user!.id)
    if (!confirmed) {
      const latest = await prisma.reservation.findUnique({ where: { id }, include: { product: true, warehouse: true } })
      if (latest?.status === "CONFIRMED") { res.json(formatReservation(latest)); return }
      res.status(410).json({ error: "Reservation could not be confirmed" })
      return
    }

    res.json(formatReservation(confirmed))
  } catch (err) {
    console.error("[POST /reservations/:id/confirm]", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

router.post("/:id/release", requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const id = String(req.params["id"])
  try {
    const reservation = await prisma.reservation.findUnique({ where: { id } })

    if (!reservation) { res.status(404).json({ error: "Reservation not found" }); return }
    if (reservation.userId !== req.user!.id) { res.status(403).json({ error: "Forbidden" }); return }
    if (reservation.status !== "PENDING") {
      res.status(400).json({ error: `Cannot release a reservation with status: ${reservation.status}` })
      return
    }

    const released = await releasePendingReservation(id)
    if (!released) {
      const latest = await prisma.reservation.findUnique({ where: { id }, include: { product: true, warehouse: true } })
      if (latest) { res.json(formatReservation(latest)); return }
      res.status(404).json({ error: "Reservation not found" })
      return
    }

    res.json(formatReservation(released))
  } catch (err) {
    console.error("[POST /reservations/:id/release]", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

async function confirmPendingReservation(id: string, userId: string) {
  const reservation = await prisma.reservation.findUnique({ where: { id } })
  if (!reservation || reservation.userId !== userId) return null

  return prisma.$transaction(async (tx) => {
    const updated = await tx.reservation.updateMany({
      where: { id, userId, status: "PENDING", expiresAt: { gt: new Date() } },
      data: { status: "CONFIRMED" },
    })

    if (updated.count === 0) return null

    await tx.$executeRaw`
      UPDATE "InventoryStock"
      SET "totalUnits" = "totalUnits" - ${reservation.quantity},
          "reservedUnits" = "reservedUnits" - ${reservation.quantity}
      WHERE "productId" = ${reservation.productId} AND "warehouseId" = ${reservation.warehouseId}
    `

    return tx.reservation.findUnique({
      where: { id },
      include: { product: true, warehouse: true },
    })
  })
}

async function releasePendingReservation(id: string) {
  const reservation = await prisma.reservation.findUnique({ where: { id } })
  if (!reservation) return null

  return prisma.$transaction(async (tx) => {
    const updated = await tx.reservation.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "RELEASED" },
    })

    if (updated.count === 0) return null

    await tx.$executeRaw`
      UPDATE "InventoryStock"
      SET "reservedUnits" = GREATEST("reservedUnits" - ${reservation.quantity}, 0)
      WHERE "productId" = ${reservation.productId} AND "warehouseId" = ${reservation.warehouseId}
    `

    return tx.reservation.findUnique({
      where: { id },
      include: { product: true, warehouse: true },
    })
  })
}

export default router
