import dns from "node:dns"
dns.setDefaultResultOrder("ipv4first")
import "dotenv/config"
import express from "express"
import cors from "cors"
import helmet from "helmet"

import productsRouter from "./routes/products"
import warehousesRouter from "./routes/warehouses"
import reservationsRouter from "./routes/reservations"
import paymentsRouter from "./routes/payments"
import adminRouter from "./routes/admin"

const app = express()
const PORT = process.env.PORT ?? 3001
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000"

// ── Middleware ───────────────────────────────────────────────────
app.use(helmet())
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  }),
)
app.use(express.json())

// ── Health check ─────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() })
})

// ── Routes ───────────────────────────────────────────────────────
app.use("/api/products", productsRouter)
app.use("/api/warehouses", warehousesRouter)
app.use("/api/reservations", reservationsRouter)
app.use("/api/payments", paymentsRouter)
app.use("/api/admin", adminRouter)

// ── 404 handler ──────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" })
})

// ── Global error handler ─────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[UNHANDLED]", err)
  res.status(500).json({ error: "Internal server error" })
})

// ── Start ────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  Allo backend running on http://localhost:${PORT}`)
  console.log(`    Health:   GET  /health`)
  console.log(`    Products: GET  /api/products`)
  console.log(`    Warehouses: GET /api/warehouses`)
  console.log(`    Reserve:  POST /api/reservations`)
  console.log(`    Confirm:  POST /api/reservations/:id/confirm`)
  console.log(`    Release:  POST /api/reservations/:id/release\n`)
})

export default app
