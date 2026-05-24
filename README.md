# Allo Health — Inventory & Reservation Platform

A full-stack take-home implementation for the Allo Engineering exercise. The core problem is protecting inventory while multiple users may be trying to buy the same item at the same time. This app solves it by separating browsing from reservation, using atomic database updates for stock, verifying payment server-side, and cleaning up expired holds automatically.

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

The project is two services that run side by side locally.

```
next-app/    — Next.js 16 frontend (App Router, React 19, Tailwind, shadcn/ui)
backend/     — Express API (TypeScript, Prisma 7, PostgreSQL via Supabase/Neon)
```

The frontend calls the backend over HTTP. `NEXT_PUBLIC_BACKEND_URL` in the frontend `.env.local` controls the target. The backend verifies every request using the Supabase JWT passed in the `Authorization: Bearer <token>` header.

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
3. If no match exists, the reservation is created normally and the key is stored on the new row (`idempotencyKey` column, `@unique` in the schema).
4. A race condition where two requests with the same key arrive simultaneously is handled: if the `INSERT` throws a unique constraint violation, the handler catches it, re-reads the existing reservation by key, and returns it with `200`.

The frontend uses `crypto.randomUUID()` to generate a fresh key per checkout attempt and sends it as `Idempotency-Key` on each reservation request. This means retrying a failed checkout does not double-reserve stock.

---

## Reservation Expiry

Reservations expire after **10 minutes** (`expiresAt = now + 10m`).

Cleanup happens in three ways so the demo stays accurate with or without a cron job running:

1. **Lazy cleanup on reads** — `GET /api/products`, `GET /api/reservations`, `POST /api/reservations`, `GET /api/admin/dashboard`, and both payment endpoints call `releaseExpiredReservations()` before returning data. This ensures stock numbers shown to users are always current.

2. **Cron endpoint** — `GET /api/reservations/cron/expire` releases all expired reservations in one pass. Protected by `Authorization: Bearer <CRON_SECRET>`. Can be triggered by any scheduler (Vercel Cron, GitHub Actions, Railway cron, etc.) on a regular interval.

3. **Confirm / release paths** — Both endpoints check `expiresAt` before acting and return `410` if the hold has lapsed.

`releaseExpiredReservations` uses a per-reservation transaction: it updates `status` to RELEASED only if it is still PENDING, then decrements `reservedUnits` (with `GREATEST(..., 0)` to guard against underflow). Concurrent cron calls are safe because the conditional update acts as a lock.

---

## Razorpay Integration

The payment flow:

1. Cart calls `POST /api/reservations` for each item (with idempotency key). Failed items (409) are reported but checkout continues with the ones that succeeded.
2. Cart calls `POST /api/payments/create-order` with the reservation IDs. The backend creates a Razorpay order for the combined total in paise and stores the reservation IDs in the order notes.
3. The Razorpay JS SDK opens the checkout modal.
4. On payment success, the frontend sends `razorpay_payment_id`, `razorpay_order_id`, and `razorpay_signature` to `POST /api/payments/verify`.
5. The backend recomputes the expected HMAC-SHA256 signature:
   ```
   HMAC-SHA256(RAZORPAY_KEY_SECRET, razorpayOrderId + "|" + razorpayPaymentId)
   ```
   If it does not match, the request is rejected with `400`.
6. The backend re-fetches the Razorpay order to confirm the amount and reservation IDs match what it stored earlier.
7. Each PENDING reservation is confirmed in a transaction: `status` → CONFIRMED, `totalUnits` and `reservedUnits` both decremented by the reserved quantity.
8. On cancel (modal dismissed), the frontend immediately releases all reservations it created.

---

## Frontend Pages

### Customer

| Route | Description |
|-------|-------------|
| `/` | Home page — product categories, featured items, stats |
| `/products` | Product grid with live stock, per-warehouse breakdown, quantity controls |
| `/cart` | Editable cart, payment summary, Razorpay checkout button |
| `/reservations/[id]` | Reservation detail with countdown, Confirm and Cancel |
| `/orders` | Confirmed purchase history |
| `/billing` | All reservation records with status (success / failed / pending) |
| `/profile` | Account summary and quick links |
| `/auth/login` | Supabase email/password login |
| `/auth/register` | Account registration |

### Admin

Admin login credentials are set via `ADMIN_USERNAME` / `ADMIN_PASSWORD` env vars (default `admin` / `admin`).

| Route | Description |
|-------|-------------|
| `/admin` | Admin login |
| `/admin/dashboard` | Analytics overview: revenue, conversions, reservation counts |
| `/admin/userdetails` | All registered users with reservation count, purchase count, failed payments, and total spend |
| `/admin/billingdetails` | All billing records with customer, product, warehouse, amount, status |
| `/admin/stockdetails` | Live warehouse stock table with search and filters |

---

## Local Setup

### 1. Install dependencies

```bash
cd backend && npm install
cd ../next-app && npm install
```

### 2. Backend environment — `backend/.env`

```env
PORT=3001
FRONTEND_URL=http://localhost:3000

DATABASE_URL="postgresql://..."

NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"   # optional, for admin user lookups

ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin

CRON_SECRET="change-this-to-a-long-random-string"

RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="your-razorpay-test-secret"
```

### 3. Frontend environment — `next-app/.env.local`

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001

NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-supabase-publishable-key"

NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_test_..."

DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
```

### 4. Push schema and seed

```bash
cd backend
npm run db:push    # pushes schema to Postgres
npm run db:seed    # creates 3 warehouses, 6 products, 18 stock entries
```

### 5. Start both services

```bash
# terminal 1
cd backend && npm run dev

# terminal 2
cd next-app && npm run dev
```

Open `http://localhost:3000`.

---

## Seeded Data

The seed creates:

- **3 warehouses** — Delhi Central, Mumbai West, Bangalore Tech Park
- **6 products** — Minoxidil 5%, Finasteride 1mg, Hair Fall Kit, Biotin Gummies, Ashwagandha KSM-66, Vitamin D3+K2 Drops
- **18 stock entries** — each product stocked across all three warehouses (10–80 units per entry)

---

## Razorpay Test Credentials

The cart page displays these inline.

| Method | Credentials |
|--------|-------------|
| UPI success | `success@razorpay` |
| UPI failure | `failure@razorpay` |
| Card | `5267 3181 8797 5449` / exp `08/26` / CVV `123` / OTP `1234` |

---

## Tech Stack

**Frontend**
- Next.js 16 (App Router)
- React 19, TypeScript
- Tailwind CSS v4, shadcn/ui
- Supabase SSR (auth)
- Razorpay JS SDK

**Backend**
- Express 5, TypeScript
- Prisma 7 + PostgreSQL (hosted on Supabase or Neon)
- Supabase JS SDK (JWT verification)
- Razorpay Node SDK
- Zod (request validation), Helmet, CORS

---

## Useful Commands

**Backend**

```bash
npm run dev          # dev server with hot reload
npm run build        # compile TypeScript
npm run db:push      # push schema without migrations
npm run db:seed      # seed demo data
npm run db:studio    # open Prisma Studio
```

**Frontend**

```bash
npm run dev          # Next.js dev server (Turbopack)
npm run build        # production build
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
```

---

## Trade-offs and Notes

**Cart does not reserve stock.** The cart lives in `localStorage`. Adding items does not start the 10-minute hold. Reservations are created only when the user clicks Pay. This is intentional — penalising browsers with a countdown timer would kill conversion.

**Two-service architecture.** The spec described "a Next.js application with an API", which most naturally means Next.js API routes. This project uses a separate Express backend instead. The reason is Prisma 7's new Postgres adapter works cleanly in a Node process but requires more configuration in Next.js's edge-compatible serverless environment. The trade-off is a second deployment target but a simpler, more conventional backend that is easier to reason about and extend.

**Simple admin auth.** Admin access uses a username/password check via HTTP headers. For production this should be role-based and tied to Supabase users. It is intentionally minimal for the demo.

**No dedicated Payment table.** Billing status is derived from reservation status. A production system would have a separate `Payment` or `Order` table and use Razorpay webhooks as the source of truth rather than the client-side callback.

**Zod on the backend only.** Zod validates all API request bodies on the backend. Frontend forms use minimal client-side checks. Sharing schemas across the monorepo would be the next step with more time.

**Redis not used.** The spec mentioned Redis for distributed locking. PostgreSQL row-level locking inside transactions achieves the same guarantee without an additional dependency. For a multi-region deployment Redis would be the right choice.
