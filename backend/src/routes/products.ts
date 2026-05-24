import { Router, Response } from "express"
import { prisma } from "../lib/prisma"
import { requireAuth, AuthRequest } from "../middleware/auth"
import { releaseExpiredReservations } from "../lib/reservations"

const router = Router()

function formatStock(
  stock: Array<{
    warehouseId: string
    totalUnits: number
    reservedUnits: number
    warehouse: { name: string; location: string }
  }>,
) {
  return stock.map((s) => ({
    warehouseId: s.warehouseId,
    warehouseName: s.warehouse.name,
    location: s.warehouse.location,
    totalUnits: s.totalUnits,
    reservedUnits: s.reservedUnits,
    availableUnits: s.totalUnits - s.reservedUnits,
  }))
}

// GET /api/products
router.get("/", requireAuth, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    await releaseExpiredReservations()

    const products = await prisma.product.findMany({
      include: { stock: { include: { warehouse: true } } },
      orderBy: { createdAt: "desc" },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res.json((products as any[]).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: Number(p.price),
      imageUrl: p.imageUrl,
      createdAt: p.createdAt,
      stock: formatStock(p.stock),
    })))
  } catch (err) {
    console.error("[GET /products]", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// GET /api/products/:id
router.get("/:id", requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const id = String(req.params["id"])
  try {
    await releaseExpiredReservations()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const product = await prisma.product.findUnique({
      where: { id },
      include: { stock: { include: { warehouse: true } } },
    }) as any

    if (!product) {
      res.status(404).json({ error: "Product not found" })
      return
    }

    res.json({
      id: product.id,
      name: product.name,
      description: product.description,
      price: Number(product.price),
      imageUrl: product.imageUrl,
      stock: formatStock(product.stock),
    })
  } catch (err) {
    console.error("[GET /products/:id]", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

export default router
