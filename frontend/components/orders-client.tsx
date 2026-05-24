"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import styles from "@/styles/Store.module.css"

type Order = {
  id: string
  quantity: number
  status: string
  createdAt: string
  updatedAt: string
  product: { id: string; name: string; price: number; description: string | null; imageUrl: string | null }
  warehouse: { id: string; name: string; location: string }
}

export function OrdersClient() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch("/api/reservations?status=CONFIRMED")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setOrders(d) })
      .finally(() => setLoading(false))
  }, [])

  const totalSpent = orders.reduce((sum, order) => sum + Number(order.product.price) * order.quantity, 0)

  if (loading) return <OrdersSkeleton />

  return (
    <div className={styles.stack}>
      <section className={styles.heroPanel}>
        <div className={styles.radialOverlay} />
        <div className={styles.heroContent}>
          <div>
            <p className={styles.eyebrow}>Order history</p>
            <h1 className={styles.heroTitle}>Confirmed purchases, neatly tracked.</h1>
            <p className={styles.heroText}>
              Every row here was confirmed after payment verification and inventory deduction.
            </p>
          </div>
          <div className={styles.heroStatsGrid}>
            <MiniStat label="Orders" value={String(orders.length)} />
            <MiniStat label="Spent" value={`Rs. ${totalSpent.toLocaleString("en-IN")}`} />
          </div>
        </div>
      </section>

      {orders.length === 0 ? (
        <EmptyOrders />
      ) : (
        <div className={styles.orderList}>
          {orders.map((order) => {
            const date = new Date(order.createdAt)
            const total = Number(order.product.price) * order.quantity

            return (
              <article
                key={order.id}
                className={styles.orderCard}
              >
                <div className={styles.orderGrid}>
                  <div className={styles.orderMedia}>
                    {order.product.imageUrl ? (
                      <img src={order.product.imageUrl} alt={order.product.name} className={styles.itemImage} loading="lazy" />
                    ) : (
                      <div className={styles.mediaCenter}>
                        <BoxIcon className={`${styles.iconLarge} ${styles.iconMuted}`} />
                      </div>
                    )}
                  </div>

                  <div className={styles.itemContent}>
                    <div className={styles.itemHeader}>
                      <h3 className={styles.itemTitle}>{order.product.name}</h3>
                      <span className={styles.successPill}>
                        Confirmed
                      </span>
                    </div>
                    <p className={styles.smallMuted}>
                      {order.warehouse.name} - {order.warehouse.location} - Qty {order.quantity}
                    </p>
                    <div className={styles.orderInfoGrid}>
                      <InfoPill label="Order date" value={date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} />
                      <InfoPill label="Reservation" value={order.id.slice(0, 10)} mono />
                      <InfoPill label="Status" value="Delivered" />
                    </div>
                  </div>

                  <div className={styles.orderAmountWrap}>
                    <p className={styles.orderAmount}>Rs. {total.toLocaleString("en-IN")}</p>
                    <p className={styles.smallMuted}>paid successfully</p>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {orders.length > 0 && (
        <div className={styles.pageActions}>
          <Link href="/billing"><Button variant="outline" className={styles.actionButton}>View billing</Button></Link>
          <Link href="/products"><Button className={styles.actionButton}>Continue shopping</Button></Link>
        </div>
      )}
    </div>
  )
}

function OrdersSkeleton() {
  return (
    <div className={styles.stack}>
      <div className={styles.skeletonHero} />
      {[1, 2, 3].map((item) => <div key={item} className={styles.skeletonTable} />)}
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.heroMetric}>
      <p className={styles.itemTitle}>{value}</p>
      <p className={styles.quantityHint}>{label}</p>
    </div>
  )
}

function InfoPill({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className={styles.infoPill}>
      <p className={styles.infoLabel}>{label}</p>
      <p className={`${styles.infoValue} ${mono ? styles.monoValue : ""}`}>{value}</p>
    </div>
  )
}

function EmptyOrders() {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>
        <ClipboardIcon />
      </div>
      <p className={styles.emptyTitle}>No orders yet</p>
      <p className={styles.smallMuted}>Confirmed orders will appear here after checkout.</p>
      <Link href="/products">
        <Button className={styles.buttonTop}>Browse products</Button>
      </Link>
    </div>
  )
}

function BoxIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5l8 4.25v8.5l-8 4.25-8-4.25v-8.5l8-4.25z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7.75l8 4.25 8-4.25M12 12v8.5" />
    </svg>
  )
}

function ClipboardIcon() {
  return (
    <svg className={styles.iconLarge} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5h6m-6 0a2 2 0 012-2h2a2 2 0 012 2m-6 0H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2m-6 9l2 2 4-4" />
    </svg>
  )
}
