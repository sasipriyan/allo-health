import { Router, Response } from "express"
import Razorpay from "razorpay"
import crypto from "crypto"
import { z } from "zod"
import { prisma } from "../lib/prisma"
import { requireAuth, AuthRequest } from "../middleware/auth"
import { releaseExpiredReservations } from "../lib/reservations"

const router = Router()

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

const CreateOrderSchema = z.object({
  reservationIds: z.array(z.string().min(1)).min(1),
})

const VerifySchema = z.object({
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
  reservationIds: z.array(z.string().min(1)).min(1),
})

// POST /api/payments/create-order
// Creates a Razorpay order for one or more PENDING reservations
router.post("/create-order", requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = CreateOrderSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() })
    return
  }

  const { reservationIds } = parsed.data
  const userId = req.user!.id

  try {
    await releaseExpiredReservations()

    const reservations = await prisma.reservation.findMany({
      where: { id: { in: reservationIds }, userId },
      include: { product: true },
    })

    if (reservations.length !== reservationIds.length) {
      res.status(404).json({ error: "One or more reservations not found" })
      return
    }

    const now = new Date()
    const expired = reservations.filter((r) => r.status !== "PENDING" || r.expiresAt <= now)
    if (expired.length > 0) {
      res.status(410).json({ error: "One or more reservations have expired. Please add items to cart again." })
      return
    }

    // Amount in paise (1 INR = 100 paise)
    const totalPaise = reservations.reduce(
      (sum, r) => sum + Math.round(Number(r.product.price) * r.quantity * 100),
      0,
    )

    const order = await razorpay.orders.create({
      amount: totalPaise,
      currency: "INR",
      receipt: `allo_${reservationIds[0].slice(0, 16)}_${Date.now()}`,
      notes: {
        reservationIds: reservationIds.join(","),
        userId,
      },
    })

    res.json({ razorpayOrderId: order.id, amount: totalPaise, currency: "INR" })
  } catch (err) {
    console.error("[POST /payments/create-order]", err)
    res.status(500).json({ error: "Failed to create payment order" })
  }
})

// POST /api/payments/verify
// Verifies Razorpay HMAC signature, then confirms all reservations
router.post("/verify", requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = VerifySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() })
    return
  }

  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, reservationIds } = parsed.data
  const userId = req.user!.id

  // Verify HMAC-SHA256 signature
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex")

  if (expectedSignature !== razorpaySignature) {
    res.status(400).json({ error: "Payment verification failed: invalid signature" })
    return
  }

  try {
    const reservations = await prisma.reservation.findMany({
      where: { id: { in: reservationIds }, userId },
      include: { product: true },
    })

    if (reservations.length !== reservationIds.length) {
      res.status(404).json({ error: "One or more reservations not found" })
      return
    }

    const order = await razorpay.orders.fetch(razorpayOrderId)
    const orderReservationIds = String(order.notes?.reservationIds ?? "")
      .split(",")
      .filter(Boolean)
      .sort()
    const requestReservationIds = [...reservationIds].sort()
    const expectedPaise = reservations.reduce(
      (sum, r) => sum + Math.round(Number(r.product.price) * r.quantity * 100),
      0,
    )

    if (
      Number(order.amount) !== expectedPaise ||
      orderReservationIds.join(",") !== requestReservationIds.join(",")
    ) {
      res.status(400).json({ error: "Payment order does not match these reservations" })
      return
    }

    const confirmedIds: string[] = []
    const expiredIds: string[] = []

    for (const reservation of reservations) {
      const id = reservation.id
      if (reservation.status === "CONFIRMED") { confirmedIds.push(id); continue }
      if (reservation.status === "RELEASED") { expiredIds.push(id); continue }

      if (new Date() > reservation.expiresAt) {
        const released = await prisma.$transaction(async (tx) => {
          const updated = await tx.reservation.updateMany({
            where: { id, userId, status: "PENDING" },
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

        if (released) expiredIds.push(id)
        continue
      }

      const confirmed = await prisma.$transaction(async (tx) => {
        const updated = await tx.reservation.updateMany({
          where: { id, userId, status: "PENDING", expiresAt: { gt: new Date() } },
          data: { status: "CONFIRMED" },
        })

        if (updated.count === 0) return false

        await tx.$executeRaw`
          UPDATE "InventoryStock"
          SET "totalUnits" = "totalUnits" - ${reservation.quantity},
              "reservedUnits" = "reservedUnits" - ${reservation.quantity}
          WHERE "productId" = ${reservation.productId} AND "warehouseId" = ${reservation.warehouseId}
        `
        return true
      })

      const latest = confirmed
        ? { status: "CONFIRMED" }
        : await prisma.reservation.findUnique({ where: { id }, select: { status: true } })

      if (latest?.status === "CONFIRMED") confirmedIds.push(id)
      if (latest?.status === "RELEASED") expiredIds.push(id)
    }

    if (confirmedIds.length === 0) {
      res.status(410).json({
        error: "All reservations had expired before payment could be confirmed. Your payment will be refunded.",
        expiredIds,
      })
      return
    }

    res.json({ success: true, confirmedIds, expiredIds, paymentId: razorpayPaymentId })
  } catch (err) {
    console.error("[POST /payments/verify]", err)
    res.status(500).json({
      error: "Payment verified but order confirmation failed. Please contact support with your payment ID.",
      paymentId: razorpayPaymentId,
    })
  }
})

export default router
