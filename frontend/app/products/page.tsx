import { ProductsClient } from "@/components/products-client"
import { Navbar } from "@/components/navbar"
import type { Metadata } from "next"
import styles from "@/styles/PageLayout.module.css"

export const metadata: Metadata = {
  title: "Products",
  description: "Browse products with live stock across warehouses.",
}

export default async function ProductsPage() {
  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.content}>
        <ProductsClient />
      </main>
    </div>
  )
}
