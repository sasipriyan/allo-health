# Allo Health — Inventory & Reservation Platform

Hi, I've completed the Allo Health engineering take-home exercise. All core requirements have been implemented and the application is fully live.

**Live URL:** https://allohealthproject.vercel.app

---

## Hosting & Stack

| Layer | Technology | Hosted On |
|-------|-----------|-----------|
| Frontend | Next.js 16 | Vercel |
| Backend API | Express + TypeScript | Railway |
| Authentication | Supabase Auth | Supabase |
| Database | PostgreSQL + Prisma | Railway |

---

## Test Credentials

You can register a new account or use these directly:

**Account 1**
**Email:** sasipriyan.a2025@vitstudent.ac.in
**Password:** sasi11

**Account 2**
**Email:** test@gmail.com
**Password:** test11

You can log in with both accounts on different devices or browsers simultaneously to test the concurrency flow — add the same product from both sessions within the 10-minute reservation window and see which one wins.

> **Note on registration:** Email verification is turned off due to Supabase free tier limitations — new accounts are active immediately after registration.

---

## Testing Concurrency (the core requirement)

Open the site in two separate browser sessions (or two different browsers) at the same time using the two test accounts above. Add the same product in both sessions and proceed to checkout — you'll see how the system handles competing reservations for the same inventory in real time. One will succeed, the other will get a clear error.

---

## Test Payment Details

The app uses Razorpay in test mode:

| Method | Details |
|--------|---------|
| Card | `5267 3181 8797 5449` / Expiry `08/26` / CVV `123` / OTP `1234` |
| UPI success | `success@razorpay` |
| UPI failure | `failure@razorpay` |

For Net Banking, Razorpay test mode lets you simulate success or failure — try both to see how the reservation and billing states update.

---

## Admin Dashboard

Built beyond the spec — an operations panel with analytics, user activity, billing records, and live warehouse stock.

**URL:** https://allohealthproject.vercel.app/admin
**Username:** admin
**Password:** admin

---

## What Is Implemented

### Required

- **Data model** — Products, Warehouses, InventoryStock (total vs reserved units), Reservations (PENDING / CONFIRMED / RELEASED, expiry time)
- **API** — All five required endpoints plus GET by ID and a cron cleanup endpoint
- **Concurrency-safe reservation** — Atomic SQL update inside a transaction; two simultaneous requests for the last unit will see exactly one succeed and one get a 409
- **Frontend product listing** — Live stock per warehouse, expandable warehouse breakdown, quantity controls
- **Checkout / reservation page** — Live countdown timer, Confirm and Cancel buttons, state updates without a page refresh
- **409 / 410 error visibility** — Both errors are surfaced to the user with clear inline messages
- **Reservation expiry** — Expired holds are released automatically (see Expiry section below)

### Bonus

- **Idempotency** — `POST /api/reservations` supports the `Idempotency-Key` header (see Idempotency section below)

### Beyond the Spec

- **Razorpay checkout** — Full test-mode payment flow with HMAC-SHA256 signature verification
- **Admin dashboard** — Operations view with analytics, user list, billing records, and per-warehouse stock table
- **Supabase Auth** — Email/password registration and login; JWT passed as Bearer token to the backend on every request
- **Orders and billing pages** — Customer-facing purchase history and reservation status

---

## Architecture

```
frontend/    — Next.js 16 (App Router, React 19, Tailwind) → deployed on Vercel
backend/     — Express API (TypeScript, Prisma 7, PostgreSQL) → deployed on Railway
```

The frontend calls the backend over HTTP. `NEXT_PUBLIC_BACKEND_URL` controls the target. The backend verifies every request using the Supabase JWT passed as `Authorization: Bearer <token>`.

---

## Data Model

```prisma
model Product {
  id           String
  name         String
  description  String?
  price        Decimal
  imageUrl     String?
  stock        InventoryStock[]
  reservations Reservation[]
}

model Warehouse {
  id       String
  name     String
  location String
  stock    InventoryStock[]
  reservations Reservation[]
}

model InventoryStock {
  productId     String
  warehouseId   String
  totalUnits    Int
  reservedUnits Int   @default(0)
  // available = totalUnits - reservedUnits
  @@unique([productId, warehouseId])
}

model Reservation {
  id             String
  productId      String
  warehouseId    String
  userId         String
  quantity       Int
  status         ReservationStatus  // PENDING | CONFIRMED | RELEASED
  expiresAt      DateTime
  idempotencyKey String?  @unique
}
```

`totalUnits` is decremented permanently only on confirm. While a reservation is PENDING, `reservedUnits` is incremented so available stock (`totalUnits - reservedUnits`) is accurate for other shoppers.

---

## API Endpoints

All endpoints require `Authorization: Bearer <supabase-access-token>` unless noted.

### Products

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/products` | List all products with available stock per warehouse |
| GET | `/api/products/:id` | Single product with stock breakdown |

### Warehouses

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/warehouses` | List all warehouses |
| GET | `/api/warehouses/:id` | Single warehouse with stock details |

### Reservations

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/reservations` | Reserve units — 409 if not enough stock |
| GET | `/api/reservations` | List the current user's reservations |
| GET | `/api/reservations/:id` | Single reservation |
| POST | `/api/reservations/:id/confirm` | Confirm — 410 if expired |
| POST | `/api/reservations/:id/release` | Release early (payment failed or user cancelled) |
| GET | `/api/reservations/cron/expire` | Release all expired reservations (cron / no auth, uses `CRON_SECRET`) |

### Payments

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/payments/create-order` | Create a Razorpay order for one or more PENDING reservations |
| POST | `/api/payments/verify` | Verify HMAC signature, confirm reservations, decrement stock |

### Admin

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/dashboard` | Full operations view: analytics, users, billing, stock (uses `x-admin-username` / `x-admin-password` headers) |

---

## Concurrency Safety

Reservation creation uses a single database transaction with a conditional stock update:

```sql
UPDATE "InventoryStock"
SET "reservedUnits" = "reservedUnits" + quantity
WHERE "productId"   = productId
  AND "warehouseId" = warehouseId
  AND ("totalUnits" - "reservedUnits") >= quantity;
```

If the `UPDATE` touches 0 rows, stock is insufficient and the API returns `409`. The reservation row is created in the same transaction, so stock cannot be incremented without a matching reservation record. PostgreSQL row-level locking on the `UPDATE` means two simultaneous requests for the last unit will serialize — exactly one will see the condition pass.

Confirm and release also use conditional `updateMany` calls (`WHERE status = 'PENDING'`) inside transactions so duplicate requests cannot double-confirm or corrupt stock counts.

---

## Idempotency (Bonus)

`POST /api/reservations` accepts an optional `Idempotency-Key` header.

**How it works:**

1. If the header is present, the backend checks `Reservation.idempotencyKey` for a match before doing anything else.
2. If a matching record exists, the original reservation is returned immediately with `200` — no stock update, no new row.
3. If no match exists, the reservation is created normally and the key is stored on the new row.
4. A race where two requests with the same key arrive simultaneously is handled: if the `INSERT` throws a unique constraint violation, the handler catches it, re-reads the existing reservation by key, and returns it with `200`.

The frontend uses `crypto.randomUUID()` to generate a fresh key per checkout attempt. Retrying a failed checkout does not double-reserve stock.

---

## Reservation Expiry

Reservations expire after **10 minutes** (`expiresAt = now + 10m`).

Cleanup happens in three ways:

1. **Lazy cleanup on reads** — `GET /api/products`, `GET /api/reservations`, `POST /api/reservations` and both payment endpoints call `releaseExpiredReservations()` before returning data.
2. **Cron endpoint** — `GET /api/reservations/cron/expire` releases all expired reservations in one pass, protected by `Authorization: Bearer <CRON_SECRET>`.
3. **Confirm / release paths** — Both check `expiresAt` before acting and return `410` if the hold has lapsed.

---

## Razorpay Integration

1. Cart calls `POST /api/reservations` for each item (with idempotency key). Failed items (409) are reported but checkout continues with the ones that succeeded.
2. Cart calls `POST /api/payments/create-order` with the reservation IDs.
3. The Razorpay JS SDK opens the checkout modal.
4. On payment success, the frontend sends payment details to `POST /api/payments/verify`.
5. The backend recomputes the expected HMAC-SHA256 signature and rejects mismatches with `400`.
6. Each PENDING reservation is confirmed in a transaction: `status` → CONFIRMED, stock decremented.
7. On cancel, the frontend immediately releases all reservations it created.

---

## Frontend Pages

### Customer

| Route | Description |
|-------|-------------|
| `/` | Home — product categories, featured items, stats |
| `/products` | Product grid with live stock and warehouse breakdown |
| `/cart` | Editable cart, payment summary, Razorpay checkout |
| `/reservations/[id]` | Reservation detail with countdown, Confirm and Cancel |
| `/orders` | Confirmed purchase history |
| `/billing` | All reservation records with status |
| `/profile` | Account summary and quick links |
| `/auth/login` | Supabase email/password login |
| `/auth/register` | Account registration |

### Admin

| Route | Description |
|-------|-------------|
| `/admin` | Admin login |
| `/admin/dashboard` | Revenue analytics and reservation counts |
| `/admin/userdetails` | All users with spend, reservation and failure counts |
| `/admin/billingdetails` | All billing records with customer, product, status |
| `/admin/stockdetails` | Live warehouse stock with search and filters |

---

## Local Setup

### 1. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Backend environment — `backend/.env`

```env
PORT=3001
FRONTEND_URL=http://localhost:3000

DATABASE_URL="postgresql://..."

NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin

CRON_SECRET="change-this-to-a-long-random-string"

RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="your-razorpay-test-secret"
```

### 3. Frontend environment — `frontend/.env.local`

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001

NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"

NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_test_..."
```

### 4. Push schema and seed

```bash
cd backend
npm run db:push
npm run db:seed
```

### 5. Start both services

```bash
# terminal 1
cd backend && npm run dev

# terminal 2
cd frontend && npm run dev
```

Open `http://localhost:3000`.

---

## Seeded Data

- **3 warehouses** — Delhi Central, Mumbai West, Bangalore Tech Park
- **6 products** — Minoxidil 5%, Finasteride 1mg, Hair Fall Kit, Biotin Gummies, Ashwagandha KSM-66, Vitamin D3+K2 Drops
- **18 stock entries** — each product stocked across all three warehouses

---

## Tech Stack

**Frontend**
- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS v4, shadcn/ui
- Supabase SSR (auth), Razorpay JS SDK
- Deployed on **Vercel**

**Backend**
- Express 5, TypeScript
- Prisma 7 + PostgreSQL
- Supabase JS SDK (JWT verification), Razorpay Node SDK
- Zod (validation), Helmet, CORS
- Deployed on **Railway** with **Railway PostgreSQL**

---

## Trade-offs and Notes

**Cart does not reserve stock.** Cart lives in `localStorage`. Reservations are created only when the user clicks Pay — penalising browsers with a countdown timer before payment would hurt conversion.

**Separate Express backend.** Prisma 7's Postgres adapter works cleanly in a Node process but needs more configuration in Next.js's serverless environment. The trade-off is a second deployment but a simpler, easier-to-extend backend.

**Simple admin auth.** Admin access uses username/password via HTTP headers. For production this should be role-based and tied to Supabase users.

**No dedicated Payment table.** Billing status is derived from reservation status. A production system would have a separate `Payment` table and use Razorpay webhooks as the source of truth.

**Redis not used.** PostgreSQL row-level locking inside transactions achieves the same guarantee without an extra dependency. For a multi-region deployment Redis would be the right choice.
