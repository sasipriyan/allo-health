"use client"

import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"
import {
  addToCart,
  getCart,
  removeFromCart,
  setCartItemQuantity,
  CART_UPDATED_EVENT,
  type CartItem,
} from "@/lib/cart"
import { Button } from "@/components/ui/button"
import styles from "@/styles/Store.module.css"

type StockEntry = {
  warehouseId: string
  warehouseName: string
  location: string
  totalUnits: number
  reservedUnits: number
  availableUnits: number
}

type Product = {
  id: string
  name: string
  description: string | null
  price: number
  imageUrl: string | null
  stock: StockEntry[]
}

export function ProductsClient() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [addedId, setAddedId] = useState<string | null>(null)
  const [expandedStockId, setExpandedStockId] = useState<string | null>(null)
  const [cartItems, setCartItems] = useState<CartItem[]>(() => (typeof window === "undefined" ? [] : getCart()))

  useEffect(() => {
    void fetchProducts()
  }, [])

  useEffect(() => {
    const sync = () => setCartItems(getCart())
    window.addEventListener(CART_UPDATED_EVENT, sync)
    return () => window.removeEventListener(CART_UPDATED_EVENT, sync)
  }, [])

  async function fetchProducts() {
    setLoading(true)
    const res = await apiFetch("/api/products")
    if (res.ok) setProducts(await res.json())
    setLoading(false)
  }

  function handleAddToCart(product: Product) {
    const best = product.stock.reduce(
      (b, s) => (s.availableUnits > b.availableUnits ? s : b),
      product.stock[0],
    )
    if (!best || best.availableUnits === 0) return

    addToCart({
      productId: product.id,
      warehouseId: best.warehouseId,
      quantity: 1,
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
        description: product.description,
      },
      warehouse: {
        id: best.warehouseId,
        name: best.warehouseName,
        location: best.location,
      },
    })

    setAddedId(product.id)
    setTimeout(() => setAddedId(null), 1800)
  }

  function handleDecrease(item: CartItem) {
    if (item.quantity <= 1) {
      removeFromCart(item.productId, item.warehouseId)
      return
    }

    setCartItemQuantity(item.productId, item.warehouseId, item.quantity - 1)
  }

  function handleIncrease(item: CartItem, product: Product) {
    const warehouseStock = product.stock.find((s) => s.warehouseId === item.warehouseId)
    const maxQuantity = warehouseStock?.availableUnits ?? item.quantity
    if (item.quantity >= maxQuantity) return

    setCartItemQuantity(item.productId, item.warehouseId, item.quantity + 1)
  }

  const totalAvailable = products.reduce((s, p) => s + p.stock.reduce((a, w) => a + w.availableUnits, 0), 0)
  const lowStock = products.filter((p) => {
    const total = p.stock.reduce((s, w) => s + w.availableUnits, 0)
    return total > 0 && total <= 10
  }).length

  if (loading) return <ProductsSkeleton />

  return (
    <div className={styles.stack}>
      <section className={styles.heroPanel}>
        <img
          src="https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=1500&h=600&fit=crop&auto=format&q=82"
          alt="Treatment inventory"
          className={styles.heroImage}
        />
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <div>
            <p className={styles.eyebrow}>Live inventory</p>
            <h1 className={styles.heroTitle}>Choose treatment stock by warehouse.</h1>
            <p className={styles.heroText}>
              Add freely to cart. Inventory is reserved only at checkout, so the browsing experience stays relaxed.
            </p>
          </div>
          <button
            onClick={fetchProducts}
            className={styles.refreshButton}
          >
            <RefreshIcon />
            Refresh stock
          </button>
        </div>
      </section>

      <div className={styles.statsGrid}>
        <StatCard label="Treatments" value={String(products.length)} tone="dark" />
        <StatCard label="Units available" value={String(totalAvailable)} tone="green" />
        <StatCard label="Low-stock items" value={String(lowStock)} tone="amber" />
      </div>

      {products.length === 0 ? (
        <EmptyState />
      ) : (
        <div className={styles.productGrid}>
          {products.map((product) => {
            const totalStock = product.stock.reduce((s, w) => s + w.availableUnits, 0)
            const warehouseCount = product.stock.length
            const isLowStock = totalStock > 0 && totalStock <= 10
            const outOfStock = totalStock === 0
            const isAdded = addedId === product.id
            const stockExpanded = expandedStockId === product.id
            const cartItem = cartItems.find((item) => item.productId === product.id)
            const selectedWarehouseStock = cartItem
              ? product.stock.find((s) => s.warehouseId === cartItem.warehouseId)
              : null
            const selectedMaxQuantity = selectedWarehouseStock?.availableUnits ?? 0

            return (
              <article
                key={product.id}
                className={styles.productCard}
              >
                <div className={styles.productMedia}>
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className={styles.productImage}
                      loading="lazy"
                    />
                  ) : (
                    <div className={styles.mediaCenter}>
                      <BoxIcon className={`${styles.iconLarge} ${styles.iconMuted}`} />
                    </div>
                  )}
                  <div className={styles.mediaShade} />
                  <span className={styles.pricePill}>
                    Rs. {product.price.toLocaleString("en-IN")}
                  </span>
                  <span className={`${styles.stockPill} ${outOfStock ? styles.stockOut : isLowStock ? styles.stockLow : styles.stockGood}`}>
                    {outOfStock ? "Out of stock" : isLowStock ? `Only ${totalStock} left` : `${totalStock} available`}
                  </span>
                </div>

                <div className={styles.productBody}>
                  <div>
                    <h3 className={styles.productTitle}>{product.name}</h3>
                    {product.description && (
                      <p className={styles.mutedText}>{product.description}</p>
                    )}
                  </div>

                  <div className={styles.stockBox}>
                    <div className={styles.stockSummary}>
                      <div>
                        <p className={styles.stockTitle}>
                          {outOfStock
                            ? "Currently unavailable"
                            : `Available: ${totalStock} units across ${warehouseCount} warehouses`}
                        </p>
                        <p className={styles.smallMuted}>
                          Stock is reserved only when checkout begins.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandedStockId(stockExpanded ? null : product.id)}
                        className={styles.ghostTinyButton}
                        aria-expanded={stockExpanded}
                      >
                        {stockExpanded ? "Hide" : "View stock"}
                      </button>
                    </div>

                    {stockExpanded && (
                      <div className={styles.warehouseList}>
                        {product.stock.map((s) => (
                          <div key={s.warehouseId} className={styles.warehouseRow}>
                            <div>
                              <p className={styles.stockTitle}>{s.warehouseName}</p>
                              <p className={styles.smallMuted}>{s.location}</p>
                            </div>
                            <span className={`${styles.unitBadge} ${s.availableUnits === 0 ? styles.unitNone : s.availableUnits <= 5 ? styles.unitLow : styles.unitGood}`}>
                              {s.availableUnits === 0 ? "None" : s.availableUnits}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {cartItem ? (
                    <div className={styles.quantityPanel}>
                      <div className={styles.quantityGrid}>
                        <button
                          type="button"
                          onClick={() => handleDecrease(cartItem)}
                          className={styles.qtyButton}
                          aria-label={`Decrease ${product.name} quantity`}
                        >
                          -
                        </button>
                        <div className={styles.quantityText}>
                          <p className={styles.quantityMain}>{cartItem.quantity} selected</p>
                          <p className={styles.quantityHint}>
                            {cartItem.quantity >= selectedMaxQuantity ? "Max available" : "In your cart"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleIncrease(cartItem, product)}
                          disabled={cartItem.quantity >= selectedMaxQuantity}
                          className={`${styles.qtyButton} ${styles.qtyButtonAdd}`}
                          aria-label={`Increase ${product.name} quantity`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      className={styles.productButton}
                      disabled={outOfStock}
                      onClick={() => handleAddToCart(product)}
                    >
                      {isAdded ? (
                        <span className={styles.summaryRow}>
                          <CheckIcon />
                          Added
                        </span>
                      ) : outOfStock ? (
                        "Out of stock"
                      ) : (
                        <span className={styles.summaryRow}>
                          <CartIcon />
                          Add to cart
                        </span>
                      )}
                    </Button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ProductsSkeleton() {
  return (
    <div className={styles.stack}>
      <div className={styles.skeletonHero} />
      <div className={styles.productGrid}>
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <div key={item} className={styles.skeletonCard} />
        ))}
      </div>
    </div>
  )
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: "dark" | "green" | "amber" }) {
  const toneClass = {
    dark: styles.statDark,
    green: styles.statGreen,
    amber: styles.statAmber,
  }[tone]

  return (
    <div className={`${styles.statCard} ${toneClass}`}>
      <p className={styles.statValue}>{value}</p>
      <p className={styles.statLabel}>{label}</p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>
        <BoxIcon className={styles.iconLarge} />
      </div>
      <p className={styles.emptyTitle}>No products found</p>
      <p className={styles.smallMuted}>Run the backend seed first.</p>
    </div>
  )
}

function BoxIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5l8 4.25v8.5l-8 4.25-8-4.25v-8.5l8-4.25z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7.75l8 4.25 8-4.25M12 12v8.5" />
    </svg>
  )
}

function CartIcon() {
  return (
    <svg className={styles.iconSmall} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.4c.5 0 .95.34 1.08.83l.38 1.44m2.39 8.98h11.22c1.12-2.3 2.1-4.68 2.92-7.14A60.1 60.1 0 005.1 5.27m2.4 8.98L5.1 5.27M6 20.25h.01m12.74 0h.01" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className={styles.iconSmall} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg className={styles.iconSmall} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.02 9.35h5v-5m-.01 5l-3.18-3.18a8.25 8.25 0 00-13.8 3.7M7.98 14.65h-5v5m.01-5l3.18 3.18a8.25 8.25 0 0013.8-3.7" />
    </svg>
  )
}
