"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import styles from "@/styles/Store.module.css"

type Reservation = {
  id: string
  quantity: number
  status: "PENDING" | "CONFIRMED" | "RELEASED"
  expiresAt: string
  createdAt: string
  product: { id: string; name: string; price: number }
  warehouse: { id: string; name: string; location: string }
}

function useCountdown(expiresAt: string | null) {
  const [secondsLeft, setSecondsLeft] = useState(0)

  useEffect(() => {
    if (!expiresAt) return
    const tick = () =>
      setSecondsLeft(Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, "0")
  const secs = String(secondsLeft % 60).padStart(2, "0")
  return { secondsLeft, display: `${mins}:${secs}` }
}

export function ReservationClient({ reservationId }: { reservationId: string }) {
  const router = useRouter()
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const { secondsLeft, display: countdown } = useCountdown(
    reservation?.status === "PENDING" ? reservation.expiresAt : null,
  )

  const fetchReservation = useCallback(async () => {
    const res = await apiFetch(`/api/reservations/${reservationId}`)
    if (res.ok) setReservation(await res.json())
    setLoading(false)
  }, [reservationId])

  useEffect(() => {
    queueMicrotask(() => {
      void fetchReservation()
    })
  }, [fetchReservation])

  async function handleConfirm() {
    setActionLoading(true)
    setError(null)

    const res = await apiFetch(`/api/reservations/${reservationId}/confirm`, { method: "POST" })
    const data = await res.json()

    if (res.status === 410) {
      setError("Your reservation has expired. Items have been released back to stock.")
      fetchReservation()
      setActionLoading(false)
      return
    }
    if (!res.ok) {
      setError(data.error ?? "Failed to confirm. Please try again.")
      setActionLoading(false)
      return
    }

    setReservation(data)
    setMessage("Purchase confirmed! Thank you for your order.")
    setActionLoading(false)
  }

  async function handleCancel() {
    setActionLoading(true)
    setError(null)

    const res = await apiFetch(`/api/reservations/${reservationId}/release`, { method: "POST" })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? "Failed to cancel. Please try again.")
      setActionLoading(false)
      return
    }

    setReservation(data)
    setMessage("Reservation cancelled. Items returned to stock.")
    setActionLoading(false)
  }

  if (loading) {
    return (
      <div className={styles.centerState}>
        <SpinnerIcon />
        <span className={styles.smallMuted}>Loading reservation...</span>
      </div>
    )
  }

  if (!reservation) {
    return (
      <div className={styles.centerState}>
        <div className={styles.emptyIcon}>
          <BoxIcon className={styles.iconLarge} />
        </div>
        <div>
          <p className={styles.emptyTitle}>Reservation not found</p>
          <p className={styles.smallMuted}>It may have been deleted or the link is invalid.</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/products")}>
          Back to products
        </Button>
      </div>
    )
  }

  const isExpired = reservation.status === "PENDING" && secondsLeft === 0
  const isPending = reservation.status === "PENDING" && !isExpired
  const total = Number(reservation.product.price) * reservation.quantity
  const pctLeft = secondsLeft / 600
  const progressClass =
    secondsLeft < 60 ? styles.progressDanger : secondsLeft < 180 ? styles.progressWarn : styles.progressOk

  return (
    <div className={styles.reservationWrap}>
      <button onClick={() => router.push("/products")} className={styles.backButton}>
        <svg className={styles.iconSmall} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to products
      </button>

      {error && (
        <div className={`${styles.notice} ${styles.noticeError}`}>
          <AlertIcon />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div className={`${styles.notice} ${styles.noticeSuccess}`}>
          <CheckCircleIcon />
          <span>{message}</span>
        </div>
      )}

      <div className={styles.reservationCard}>
        <div className={styles.reservationHeader}>
          <div>
            <p className={styles.summaryLabel}>Reservation</p>
            <h2 className={styles.itemTitle}>{reservation.product.name}</h2>
          </div>
          <StatusPill status={reservation.status} expired={isExpired} />
        </div>

        <div className={styles.reservationBody}>
          <div className={styles.detailGrid}>
            <Detail label="Warehouse" value={reservation.warehouse.name} sub={reservation.warehouse.location} />
            <Detail label="Quantity" value={`${reservation.quantity} unit${reservation.quantity !== 1 ? "s" : ""}`} />
            <Detail label="Unit price" value={`Rs. ${Number(reservation.product.price).toLocaleString("en-IN")}`} />
            <Detail label="Total" value={`Rs. ${total.toLocaleString("en-IN")}`} emphasis />
          </div>

          {isPending && (
            <div className={styles.countdownBox}>
              <div className={styles.countdownHeader}>
                <span className={styles.smallMuted}>Hold expires in</span>
                <span>{countdown}</span>
              </div>
              <div className={styles.progressTrack}>
                <div className={`${styles.progressBar} ${progressClass}`} style={{ width: `${Math.min(100, pctLeft * 100)}%` }} />
              </div>
              <p className={styles.smallMuted}>
                Complete your purchase before the hold expires. Items will be automatically released.
              </p>
            </div>
          )}

          {isExpired && (
            <div className={`${styles.stateBox} ${styles.noticeError}`}>
              <p className={styles.itemTitle}>Hold expired</p>
              <p className={styles.smallMuted}>The 10-minute hold has ended. Items have been returned to available stock.</p>
            </div>
          )}

          {reservation.status === "CONFIRMED" && !message && (
            <div className={`${styles.stateBox} ${styles.noticeSuccess}`}>
              <p className={styles.itemTitle}>Order confirmed</p>
              <p className={styles.smallMuted}>Your purchase was successful.</p>
            </div>
          )}

          {isPending && (
            <div className={styles.reservationActions}>
              <Button className={styles.buttonGrow} onClick={handleConfirm} disabled={actionLoading}>
                {actionLoading ? (
                  <span className={styles.summaryRow}>
                    <SpinnerIcon className={styles.iconSmall} />
                    Processing...
                  </span>
                ) : (
                  "Confirm purchase"
                )}
              </Button>
              <Button variant="outline" className={styles.buttonGrow} onClick={handleCancel} disabled={actionLoading}>
                Cancel
              </Button>
            </div>
          )}

          {reservation.status === "CONFIRMED" && (
            <Button className={styles.fullButton} onClick={() => router.push("/products")}>
              Continue shopping
            </Button>
          )}

          {(reservation.status === "RELEASED" || isExpired) && (
            <Button variant="outline" className={styles.fullButton} onClick={() => router.push("/products")}>
              Back to products
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function Detail({
  label,
  value,
  sub,
  emphasis,
}: {
  label: string
  value: string
  sub?: string
  emphasis?: boolean
}) {
  return (
    <div>
      <p className={styles.smallMuted}>{label}</p>
      <p className={`${styles.detailValue} ${emphasis ? styles.detailValueLarge : ""}`}>{value}</p>
      {sub && <p className={styles.smallMuted}>{sub}</p>}
    </div>
  )
}

function StatusPill({ status, expired }: { status: string; expired: boolean }) {
  if (expired) return <span className={`${styles.statusPill} ${styles.statusFailed}`}>Expired</span>
  if (status === "PENDING") return <span className={`${styles.statusPill} ${styles.statusPending}`}>Pending</span>
  if (status === "CONFIRMED") return <span className={`${styles.statusPill} ${styles.statusSuccess}`}>Confirmed</span>
  return <span className={styles.statusPill}>Released</span>
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={`${styles.spinner} ${className ?? styles.iconMedium}`} fill="none" viewBox="0 0 24 24">
      <circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function BoxIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? styles.iconMedium} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg className={styles.iconSmall} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
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
