import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ReservationClient } from "@/components/reservation-client"
import { Navbar } from "@/components/navbar"
import styles from "@/styles/PageLayout.module.css"

export default async function ReservationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { id } = await params

  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.content}>
        <ReservationClient reservationId={id} />
      </main>
    </div>
  )
}
