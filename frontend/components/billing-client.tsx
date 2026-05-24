"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import styles from "@/styles/Store.module.css"

type Reservation = {
  id: string
  quantity: number
  status: "PENDING" | "CONFIRMED" | "RELEASED"
  createdAt: string
  updatedAt: string
  expiresAt: string
  product: { id: string; name: string; price: number; imageUrl: string | null }
  warehouse: { id: string; name: string; location: string }
}

type BillingStatus = "Success" | "Failed" | "Pending"

export function BillingClient() {
  const [items, setItems] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch("/api/reservations")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setItems(d) })
      .finally(() => setLoading(false))
  }, [])

  const bills = useMemo(() => items.map(toBill).sort((a, b) => b.time - a.time), [items])
  const successTotal = bills.filter((b) => b.status === "Success").reduce((sum, b) => sum + b.amount, 0)
  const failedCount = bills.filter((b) => b.status === "Failed").length
  const pendingCount = bills.filter((b) => b.status === "Pending").length

  if (loading) return <BillingSkeleton />

  return (
    <div className={styles.stack}>
      <section className={styles.heroPanel}>
        <div className={styles.radialOverlayLarge} />
        <div className={styles.heroContent}>
          <div>
            <p className={styles.eyebrow}>Billing status</p>
            <h1 className={styles.heroTitle}>Every payment outcome in one place.</h1>
            <p className={styles.heroText}>
              This view turns reservation states into billing records so success, failed, cancelled, and pending checkout attempts are easy to inspect.
            </p>
          </div>
          <div className={styles.billingStatsGrid}>
            <HeroMetric label="Success" value={`Rs. ${successTotal.toLocaleString("en-IN")}`} />
            <HeroMetric label="Failed" value={String(failedCount)} />
            <HeroMetric label="Pending" value={String(pendingCount)} />
          </div>
        </div>
      </section>

      {bills.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <ReceiptIcon />
          </div>
          <p className={styles.emptyTitle}>No billing records yet</p>
          <p className={styles.smallMuted}>Checkout attempts will appear here after reservations are created.</p>
          <Link href="/products"><Button className={styles.buttonTop}>Browse products</Button></Link>
        </div>
      ) : (
        <div className={styles.tableShell}>
          <div className={styles.tableHeader}>
            <span>Billing item</span>
            <span>Status</span>
            <span>Date</span>
            <span className={styles.amountRight}>Amount</span>
          </div>
          <div className={styles.tableRows}>
            {bills.map((bill) => (
              <article
                key={bill.id}
                className={styles.billingRow}
              >
                <div className={styles.billingItem}>
                  <div className={styles.receiptBox}>
                    <ReceiptIcon />
                  </div>
                  <div className={styles.itemContent}>
                    <h3 className={styles.truncateTitle}>{bill.productName}</h3>
                    <p className={styles.smallMuted}>
                      {bill.reason} - {bill.warehouse}
                    </p>
                    <p className={`${styles.smallMuted} ${styles.monoValue}`}>{bill.id}</p>
                  </div>
                </div>

                <div>
                  <StatusPill status={bill.status} />
                </div>

                <div>
                  <p className={styles.itemTitle}>{bill.date}</p>
                  <p className={styles.smallMuted}>{bill.timeLabel}</p>
                </div>

                <div className={`${styles.itemTitle} ${styles.amountRight}`}>
                  Rs. {bill.amount.toLocaleString("en-IN")}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function toBill(item: Reservation) {
  const amount = Number(item.product.price) * item.quantity
  const dateSource = item.status === "PENDING" ? item.createdAt : item.updatedAt
  const date = new Date(dateSource)
  const status: BillingStatus =
    item.status === "CONFIRMED" ? "Success" : item.status === "RELEASED" ? "Failed" : "Pending"
  const reason =
    item.status === "CONFIRMED"
      ? "Payment verified"
      : item.status === "RELEASED"
        ? "Payment cancelled or expired"
        : "Awaiting checkout"

  return {
    id: item.id,
    productName: item.product.name,
    warehouse: `${item.warehouse.name}, ${item.warehouse.location}`,
    amount,
    status,
    reason,
    time: date.getTime(),
    date: date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    timeLabel: date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
  }
}

function BillingSkeleton() {
  return (
    <div className={styles.stack}>
      <div className={styles.skeletonHero} />
      <div className={styles.skeletonTable} />
    </div>
  )
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.heroMetric}>
      <p className={styles.itemTitle}>{value}</p>
      <p className={styles.quantityHint}>{label}</p>
    </div>
  )
}

function StatusPill({ status }: { status: BillingStatus }) {
  const toneClass = {
    Success: styles.statusSuccess,
    Failed: styles.statusFailed,
    Pending: styles.statusPending,
  }[status]

  return (
    <span className={`${styles.statusPill} ${toneClass}`}>
      <span className={styles.statusDot} />
      {status}
    </span>
  )
}

function ReceiptIcon() {
  return (
    <svg className={styles.iconMedium} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 3.75h12v16.5l-2.25-1.5-2.25 1.5-2.25-1.5L9 20.25l-3-2V3.75z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25h6M9 12h6M9 15.75h3" />
    </svg>
  )
}
