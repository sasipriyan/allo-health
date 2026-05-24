import { OrdersClient } from "@/components/orders-client"
import { Navbar } from "@/components/navbar"
import type { Metadata } from "next"
import styles from "@/styles/PageLayout.module.css"

export const metadata: Metadata = {
  title: "Orders",
  description: "View confirmed orders and reservation history.",
}

export default async function OrdersPage() {
  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.content}>
        <OrdersClient />
      </main>
    </div>
  )
}
