import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Navbar } from "@/components/navbar"
import { BillingClient } from "@/components/billing-client"
import type { Metadata } from "next"
import styles from "@/styles/PageLayout.module.css"

export const metadata: Metadata = {
  title: "Billing",
  description: "View successful, failed, and pending billing activity.",
}

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.content}>
        <BillingClient />
      </main>
    </div>
  )
}
