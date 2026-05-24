import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0])

async function main() {
  console.log("Seeding database…")

  const delhi = await prisma.warehouse.upsert({
    where: { id: "wh-delhi" },
    update: {},
    create: { id: "wh-delhi", name: "Delhi Central", location: "New Delhi, India" },
  })

  const mumbai = await prisma.warehouse.upsert({
    where: { id: "wh-mumbai" },
    update: {},
    create: { id: "wh-mumbai", name: "Mumbai West", location: "Mumbai, India" },
  })

  const bangalore = await prisma.warehouse.upsert({
    where: { id: "wh-bangalore" },
    update: {},
    create: { id: "wh-bangalore", name: "Bangalore Tech Park", location: "Bengaluru, India" },
  })

  const products = [
    {
      id: "prod-1",
      name: "Minoxidil 5% Topical Solution",
      description: "Clinically proven hair regrowth treatment. Apply twice daily. FDA-approved for male pattern baldness.",
      price: 849,
      imageUrl: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=600&h=400&fit=crop&auto=format&q=80",
    },
    {
      id: "prod-2",
      name: "Finasteride 1mg Tablets",
      description: "Oral DHT blocker that stops hair loss at the root. Prescription-grade with 90% success rate in clinical trials.",
      price: 1299,
      imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&h=400&fit=crop&auto=format&q=80",
    },
    {
      id: "prod-3",
      name: "Hair Fall Control Kit",
      description: "Our bestselling complete kit — Minoxidil 5% + Finasteride 1mg. Clinically proven combination therapy for faster results.",
      price: 1999,
      imageUrl: "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=600&h=400&fit=crop&auto=format&q=80",
    },
    {
      id: "prod-4",
      name: "Biotin 10000mcg Gummies",
      description: "High-potency biotin gummies for hair, nail and skin health. Berry-flavoured, 30-day supply per bottle.",
      price: 599,
      imageUrl: "https://images.unsplash.com/photo-1550572017-edd951b55104?w=600&h=400&fit=crop&auto=format&q=80",
    },
    {
      id: "prod-5",
      name: "Ashwagandha KSM-66 Capsules",
      description: "India's most clinically studied ashwagandha extract. Reduces cortisol, supports testosterone and energy levels.",
      price: 799,
      imageUrl: "https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=600&h=400&fit=crop&auto=format&q=80",
    },
    {
      id: "prod-6",
      name: "Vitamin D3 + K2 Drops",
      description: "High-absorption liquid formula. Supports immunity, bone density, hormonal balance and energy metabolism.",
      price: 649,
      imageUrl: "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=600&h=400&fit=crop&auto=format&q=80",
    },
  ]

  for (const p of products) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: { name: p.name, description: p.description, price: p.price, imageUrl: p.imageUrl },
      create: p,
    })
  }

  const stockEntries = [
    { productId: "prod-1", warehouseId: delhi.id, totalUnits: 50 },
    { productId: "prod-1", warehouseId: mumbai.id, totalUnits: 30 },
    { productId: "prod-1", warehouseId: bangalore.id, totalUnits: 20 },
    { productId: "prod-2", warehouseId: delhi.id, totalUnits: 40 },
    { productId: "prod-2", warehouseId: mumbai.id, totalUnits: 15 },
    { productId: "prod-2", warehouseId: bangalore.id, totalUnits: 25 },
    { productId: "prod-3", warehouseId: delhi.id, totalUnits: 35 },
    { productId: "prod-3", warehouseId: mumbai.id, totalUnits: 20 },
    { productId: "prod-3", warehouseId: bangalore.id, totalUnits: 10 },
    { productId: "prod-4", warehouseId: delhi.id, totalUnits: 80 },
    { productId: "prod-4", warehouseId: mumbai.id, totalUnits: 60 },
    { productId: "prod-4", warehouseId: bangalore.id, totalUnits: 45 },
    { productId: "prod-5", warehouseId: delhi.id, totalUnits: 55 },
    { productId: "prod-5", warehouseId: mumbai.id, totalUnits: 40 },
    { productId: "prod-5", warehouseId: bangalore.id, totalUnits: 30 },
    { productId: "prod-6", warehouseId: delhi.id, totalUnits: 70 },
    { productId: "prod-6", warehouseId: mumbai.id, totalUnits: 50 },
    { productId: "prod-6", warehouseId: bangalore.id, totalUnits: 35 },
  ]

  for (const s of stockEntries) {
    await prisma.inventoryStock.upsert({
      where: { productId_warehouseId: { productId: s.productId, warehouseId: s.warehouseId } },
      update: {},
      create: { ...s, reservedUnits: 0 },
    })
  }

  console.log("Seed complete! 3 warehouses, 6 health products.")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
