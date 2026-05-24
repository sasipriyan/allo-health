"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/api"
import {
  getCart,
  removeFromCart,
  clearCart,
  setCartItemQuantity,
  CART_UPDATED_EVENT,
  type CartItem,
} from "@/lib/cart"
import { Button } from "@/components/ui/button"
import styles from "@/styles/Store.module.css"

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: Record<string, any>) => { open(): void }
  }
}

function useRazorpayScript() {
  const [ready, setReady] = useState(() => typeof window !== "undefined" && !!window.Razorpay)
  useEffect(() => {
    if (typeof window === "undefined") return
    if (window.Razorpay) return
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.async = true
    script.onload = () => setReady(true)
    document.body.appendChild(script)
    return () => { document.body.removeChild(script) }
  }, [])
  return ready
}

export function CartClient() {
  const router = useRouter()
  const razorpayReady = useRazorpayScript()
  const [items, setItems] = useState<CartItem[]>(() => (typeof window === "undefined" ? [] : getCart()))
  const [checkingOut, setCheckingOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const sync = () => setItems(getCart())
    window.addEventListener(CART_UPDATED_EVENT, sync)
    return () => window.removeEventListener(CART_UPDATED_EVENT, sync)
  }, [])

  function handleRemove(item: CartItem) {
    removeFromCart(item.productId, item.warehouseId)
  }

  function handleDecrease(item: CartItem) {
    if (item.quantity <= 1) {
      removeFromCart(item.productId, item.warehouseId)
      return
    }

    setCartItemQuantity(item.productId, item.warehouseId, item.quantity - 1)
  }

  function handleIncrease(item: CartItem) {
    setCartItemQuantity(item.productId, item.warehouseId, item.quantity + 1)
  }

  async function handleCheckout() {
    if (!razorpayReady || items.length === 0) return
    setCheckingOut(true)
    setError(null)
    setSuccess(null)

    const createdReservationIds: string[] = []
    const outOfStockNames: string[] = []

    for (const item of items) {
      const res = await apiFetch("/api/reservations", {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          productId: item.productId,
          warehouseId: item.warehouseId,
          quantity: item.quantity,
        }),
      })

      if (res.ok || res.status === 200) {
        const data = await res.json()
        createdReservationIds.push(data.id)
      } else {
        outOfStockNames.push(item.product.name)
      }
    }

    if (createdReservationIds.length === 0) {
      setError("All items in your cart are out of stock at the selected warehouses.")
      setCheckingOut(false)
      return
    }

    if (outOfStockNames.length > 0) {
      setError(`Out of stock, removed from this order: ${outOfStockNames.join(", ")}. Proceeding with remaining items.`)
    }

    const orderRes = await apiFetch("/api/payments/create-order", {
      method: "POST",
      body: JSON.stringify({ reservationIds: createdReservationIds }),
    })

    if (!orderRes.ok) {
      await Promise.all(createdReservationIds.map((id) => apiFetch(`/api/reservations/${id}/release`, { method: "POST" })))
      const d = await orderRes.json()
      setError(d.error ?? "Failed to initiate payment. Please try again.")
      setCheckingOut(false)
      return
    }

    const { razorpayOrderId, amount, currency } = await orderRes.json()

    const rzp = new window.Razorpay({
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount,
      currency,
      name: "Allo Health",
      description: "Private care checkout",
      order_id: razorpayOrderId,
      theme: { color: "#10131f" },
      prefill: { name: "Test User", email: "test@allohealth.com", contact: "9999999999" },
      handler: async (response: {
        razorpay_payment_id: string
        razorpay_order_id: string
        razorpay_signature: string
      }) => {
        const verifyRes = await apiFetch("/api/payments/verify", {
          method: "POST",
          body: JSON.stringify({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            reservationIds: createdReservationIds,
          }),
        })

        const data = await verifyRes.json()
        if (!verifyRes.ok) {
          setError(data.error ?? "Payment received but order confirmation failed. Contact support.")
          setCheckingOut(false)
          return
        }

        clearCart()
        setSuccess(`Payment successful. ID: ${response.razorpay_payment_id}`)
        setTimeout(() => router.push("/orders"), 1200)
      },
      modal: {
        ondismiss: async () => {
          await Promise.all(createdReservationIds.map((id) => apiFetch(`/api/reservations/${id}/release`, { method: "POST" })))
          setError("Payment cancelled. Your cart is saved, and reserved stock was released.")
          setCheckingOut(false)
        },
      },
    })

    rzp.open()
  }

  const subtotal = items.reduce((sum, i) => sum + Number(i.product.price) * i.quantity, 0)
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <div className={styles.stack}>
      <section className={styles.cartHeroGrid}>
        <div className={styles.heroPanel}>
          <div className={styles.cartGlow} />
          <div className={styles.heroContent}>
            <div>
            <p className={styles.eyebrow}>Checkout bag</p>
            <h1 className={styles.heroTitle}>Review before the 10-minute hold starts.</h1>
            <p className={styles.heroText}>
              Cart items are flexible until you pay. Stock is reserved only after you start checkout.
            </p>
            </div>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Current bag</p>
          <div className={styles.summarySplit}>
            <div>
              <p className={styles.summaryCount}>{itemCount}</p>
              <p className={styles.smallMuted}>items selected</p>
            </div>
            <p className={styles.summaryAmount}>Rs. {subtotal.toLocaleString("en-IN")}</p>
          </div>
        </div>
      </section>

      {error && <Notice tone="error" icon={<AlertIcon />} text={error} />}
      {success && <Notice tone="success" icon={<CheckCircleIcon />} text={success} />}

      {items.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <CartEmptyIcon />
          </div>
          <p className={styles.emptyTitle}>Your cart is empty</p>
          <p className={styles.smallMuted}>Browse treatments and build your order.</p>
          <Link href="/products">
            <Button className={styles.buttonTop}>Browse products</Button>
          </Link>
        </div>
      ) : (
        <div className={styles.cartLayout}>
          <div className={styles.cartItems}>
            {items.map((item) => (
              <div
                key={`${item.productId}-${item.warehouseId}`}
                className={styles.cartItem}
              >
                <div className={styles.itemMedia}>
                  {item.product.imageUrl ? (
                    <img src={item.product.imageUrl} alt={item.product.name} className={styles.itemImage} loading="lazy" />
                  ) : (
                    <div className={styles.mediaCenter}>
                      <BoxIcon className={`${styles.iconLarge} ${styles.iconMuted}`} />
                    </div>
                  )}
                </div>

                <div className={styles.itemContent}>
                  <div className={styles.itemHeader}>
                    <div>
                      <h3 className={styles.itemTitle}>{item.product.name}</h3>
                      <p className={styles.smallMuted}>{item.warehouse.name} - {item.warehouse.location}</p>
                    </div>
                    <span className={styles.successPill}>Checkout ready</span>
                  </div>
                  <div className={styles.itemActions}>
                    <div className={styles.cartQty}>
                      <button
                        type="button"
                        onClick={() => handleDecrease(item)}
                        disabled={checkingOut}
                        className={styles.qtyButtonLight}
                        aria-label={`Decrease ${item.product.name} quantity`}
                      >
                        -
                      </button>
                      <span className={styles.qtyNumber}>
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleIncrease(item)}
                        disabled={checkingOut}
                        className={styles.qtyButtonLight}
                        aria-label={`Increase ${item.product.name} quantity`}
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => handleRemove(item)}
                      disabled={checkingOut}
                      className={styles.removeButton}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className={styles.itemPrice}>
                  <p className={styles.itemTotal}>Rs. {(Number(item.product.price) * item.quantity).toLocaleString("en-IN")}</p>
                  <p className={styles.smallMuted}>Rs. {Number(item.product.price).toLocaleString("en-IN")} each</p>
                </div>
              </div>
            ))}
          </div>

          <aside className={styles.checkoutAside}>
            <div className={styles.summaryCard}>
              <h2 className={styles.itemTitle}>Payment summary</h2>
              <div className={styles.summaryList}>
                {items.map((i) => (
                  <div key={`${i.productId}-${i.warehouseId}`} className={styles.summaryRow}>
                    <span className={styles.mutedText}>{i.product.name}</span>
                    <span>Rs. {(Number(i.product.price) * i.quantity).toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
              <div className={styles.summaryDivider}>
                <SummaryRow label="Delivery" value="Free" />
                <SummaryRow label="Inventory hold" value="Starts at payment" />
                <div className={styles.summaryTotal}>
                  <span>Total</span>
                  <span className={styles.summaryAmount}>Rs. {subtotal.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <Button className={styles.checkoutButton} disabled={checkingOut || !razorpayReady} onClick={handleCheckout}>
                {checkingOut ? (
                  <span className={styles.summaryRow}><SpinnerIcon className={styles.iconSmall} /> Processing</span>
                ) : !razorpayReady ? (
                  "Loading gateway"
                ) : (
                  <span className={styles.summaryRow}><LockIcon /> Pay Rs. {subtotal.toLocaleString("en-IN")}</span>
                )}
              </Button>
              <Link href="/products">
                <Button variant="outline" className={styles.outlineButton}>Continue shopping</Button>
              </Link>
            </div>

            <div className={styles.testModeCard}>
              <p className={styles.testModeTitle}>Razorpay test mode</p>
              <div className={styles.testModeList}>
                <p><span className={styles.strongText}>UPI success:</span> success@razorpay</p>
                <p><span className={styles.strongText}>UPI failure:</span> failure@razorpay</p>
                <p><span className={styles.strongText}>Card:</span> 5267 3181 8797 5449 / 08-26 / 123 / OTP 1234</p>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}

function Notice({ tone, icon, text }: { tone: "success" | "error"; icon: React.ReactNode; text: string }) {
  const toneClass = tone === "success" ? styles.noticeSuccess : styles.noticeError
  return <div className={`${styles.notice} ${toneClass}`}>{icon}<span>{text}</span></div>
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.summaryRow}>
      <span className={styles.smallMuted}>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={`${styles.spinner} ${className ?? styles.iconMedium}`} fill="none" viewBox="0 0 24 24">
      <circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z" />
    </svg>
  )
}

function BoxIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? styles.iconMedium} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5l8 4.25v8.5l-8 4.25-8-4.25v-8.5l8-4.25z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7.75l8 4.25 8-4.25M12 12v8.5" />
    </svg>
  )
}

function CartEmptyIcon() {
  return (
    <svg className={styles.iconLarge} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.4c.5 0 .95.34 1.08.83l.38 1.44m2.39 8.98h11.22c1.12-2.3 2.1-4.68 2.92-7.14A60.1 60.1 0 005.1 5.27m2.4 8.98L5.1 5.27M6 20.25h.01m12.74 0h.01" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg className={styles.iconSmall} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 4.3L2.6 17.6A2 2 0 004.3 20h15.4a2 2 0 001.7-2.4L13.7 4.3a2 2 0 00-3.4 0z" />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg className={styles.iconSmall} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg className={styles.iconSmall} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5A2.25 2.25 0 0019.5 19.5v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75A2.25 2.25 0 006.75 21.75z" />
    </svg>
  )
}
