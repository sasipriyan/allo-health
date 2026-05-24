import { Router, Response } from "express"
import { prisma } from "../lib/prisma"
import { requireAuth, AuthRequest } from "../middleware/auth"

const router = Router()

// GET /api/warehouses
router.get("/", requireAuth, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const warehouses = await prisma.warehouse.findMany({ orderBy: { name: "asc" } })
    res.json(warehouses)
  } catch (err) {
    console.error("[GET /warehouses]", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// GET /api/warehouses/:id
router.get("/:id", requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const id = String(req.params["id"])
  try {
    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: { stock: { include: { product: true } } },
    })
    if (!warehouse) { res.status(404).json({ error: "Warehouse not found" }); return }
    res.json(warehouse)
  } catch (err) {
    console.error("[GET /warehouses/:id]", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

export default router
