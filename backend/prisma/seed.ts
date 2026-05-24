import "dotenv/config"
import { Pool } from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
})

async function main() {
  console.log("Seeding database…")
  const client = await pool.connect()

  try {
    await client.query(`
      INSERT INTO "Warehouse" (id, name, location) VALUES
        ('wh-delhi',     'Delhi Central',        'New Delhi, India'),
        ('wh-mumbai',    'Mumbai West',           'Mumbai, India'),
        ('wh-bangalore', 'Bangalore Tech Park',   'Bengaluru, India')
      ON CONFLICT (id) DO NOTHING
    `)
    console.log("✓ Warehouses")

    await client.query(`
      INSERT INTO "Product" (id, name, description, price, "imageUrl", "createdAt", "updatedAt") VALUES
        ('prod-1','Minoxidil 5% Topical Solution','Clinically proven hair regrowth treatment. Apply twice daily. FDA-approved for male pattern baldness.',849,'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=600&h=400&fit=crop&auto=format&q=80',NOW(),NOW()),
        ('prod-2','Finasteride 1mg Tablets','Oral DHT blocker that stops hair loss at the root. Prescription-grade with 90% success rate in clinical trials.',1299,'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&h=400&fit=crop&auto=format&q=80',NOW(),NOW()),
        ('prod-3','Hair Fall Control Kit','Our bestselling complete kit — Minoxidil 5% + Finasteride 1mg. Clinically proven combination therapy for faster results.',1999,'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=600&h=400&fit=crop&auto=format&q=80',NOW(),NOW()),
        ('prod-4','Biotin 10000mcg Gummies','High-potency biotin gummies for hair, nail and skin health. Berry-flavoured, 30-day supply per bottle.',599,'https://images.unsplash.com/photo-1550572017-edd951b55104?w=600&h=400&fit=crop&auto=format&q=80',NOW(),NOW()),
        ('prod-5','Ashwagandha KSM-66 Capsules','India''s most clinically studied ashwagandha extract. Reduces cortisol, supports testosterone and energy levels.',799,'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=600&h=400&fit=crop&auto=format&q=80',NOW(),NOW()),
        ('prod-6','Vitamin D3 + K2 Drops','High-absorption liquid formula. Supports immunity, bone density, hormonal balance and energy metabolism.',649,'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=600&h=400&fit=crop&auto=format&q=80',NOW(),NOW())
      ON CONFLICT (id) DO NOTHING
    `)
    console.log("✓ Products")

    await client.query(`
      INSERT INTO "InventoryStock" (id, "productId", "warehouseId", "totalUnits", "reservedUnits") VALUES
        (gen_random_uuid()::text,'prod-1','wh-delhi',50,0),
        (gen_random_uuid()::text,'prod-1','wh-mumbai',30,0),
        (gen_random_uuid()::text,'prod-1','wh-bangalore',20,0),
        (gen_random_uuid()::text,'prod-2','wh-delhi',40,0),
        (gen_random_uuid()::text,'prod-2','wh-mumbai',15,0),
        (gen_random_uuid()::text,'prod-2','wh-bangalore',25,0),
        (gen_random_uuid()::text,'prod-3','wh-delhi',35,0),
        (gen_random_uuid()::text,'prod-3','wh-mumbai',20,0),
        (gen_random_uuid()::text,'prod-3','wh-bangalore',10,0),
        (gen_random_uuid()::text,'prod-4','wh-delhi',80,0),
        (gen_random_uuid()::text,'prod-4','wh-mumbai',60,0),
        (gen_random_uuid()::text,'prod-4','wh-bangalore',45,0),
        (gen_random_uuid()::text,'prod-5','wh-delhi',55,0),
        (gen_random_uuid()::text,'prod-5','wh-mumbai',40,0),
        (gen_random_uuid()::text,'prod-5','wh-bangalore',30,0),
        (gen_random_uuid()::text,'prod-6','wh-delhi',70,0),
        (gen_random_uuid()::text,'prod-6','wh-mumbai',50,0),
        (gen_random_uuid()::text,'prod-6','wh-bangalore',35,0)
      ON CONFLICT ("productId","warehouseId") DO NOTHING
    `)
    console.log("✓ Stock")

    console.log("Seed complete! 3 warehouses, 6 products, 18 stock entries.")
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
