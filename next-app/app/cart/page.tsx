import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { CartClient } from "@/components/cart-client"
import { Navbar } from "@/components/navbar"
import type { Metadata } from "next"
import styles from "@/styles/PageLayout.module.css"

export const metadata: Metadata = {
  title: "Cart",
  description: "Review cart quantities and start secure checkout.",
}

export default async function CartPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.content}>
        <CartClient />
      </main>
    </div>
  )
}
