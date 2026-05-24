import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Navbar } from "@/components/navbar"
import type { Metadata } from "next"
import styles from "@/styles/Profile.module.css"

export const metadata: Metadata = {
  title: "Profile",
  description: "Manage your Allo Health account and billing links.",
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const initials = user.email ? user.email.slice(0, 2).toUpperCase() : "AL"
  const name = (user.user_metadata?.name as string | undefined) ?? user.email?.split("@")[0] ?? "Member"
  const joined = new Date(user.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>
        <div className={styles.grid}>
          <aside className={styles.side}>
            <section className={styles.profileCard}>
              <div className={styles.profileGlow} />
              <div className={styles.profileInner}>
                <div className={styles.avatar}>{initials}</div>
                <h1 className={styles.name}>{name}</h1>
                <p className={styles.email}>{user.email}</p>
                <p className={styles.joined}>Member since {joined}</p>
              </div>
            </section>

            <section className={styles.quickPanel}>
              <p className={styles.quickTitle}>Quick actions</p>
              <div className={styles.quickList}>
                <ActionLink href="/orders" label="Order history" />
                <ActionLink href="/billing" label="Billing status" />
                <ActionLink href="/cart" label="Checkout bag" />
              </div>
            </section>
          </aside>

          <section className={styles.contentStack}>
            <div className={styles.heroPanel}>
              <p className={styles.eyebrow}>Account details</p>
              <h2 className={styles.heading}>Profile overview</h2>
              <p className={styles.copy}>
                Your account powers authenticated reservations, checkout, and order history.
              </p>
            </div>

            <div className={styles.statGrid}>
              <ProfileTile label="Full name" value={name} />
              <ProfileTile label="Email address" value={user.email ?? "Not available"} />
              <ProfileTile label="Email verified" value={user.email_confirmed_at ? "Verified" : "Not verified"} tone={user.email_confirmed_at ? "success" : "warning"} />
              <ProfileTile label="Member since" value={joined} />
            </div>

            <div className={styles.dataPanel}>
              <div className={styles.dataHeader}>
                <h3 className={styles.dataTitle}>Technical account data</h3>
                <p className={styles.dataCopy}>Useful during the debrief if auth or ownership comes up.</p>
              </div>
              <ProfileRow label="Account ID" value={user.id} mono />
              <ProfileRow label="Auth provider" value="Supabase" />
              <ProfileRow label="Delivery privacy" value="Discreet packaging enabled" />
            </div>

            <div className={styles.billingPanel}>
              <div className={styles.billingInner}>
                <div>
                  <p className={styles.billingEyebrow}>Billing center</p>
                  <h3 className={styles.billingTitle}>Review successful and failed checkout attempts.</h3>
                  <p className={styles.copy}>
                    Billing is generated from reservation states so you can demo success, pending, and failed payment outcomes.
                  </p>
                </div>
                <Link href="/billing" className={styles.billingLink}>
                  Open billing
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

function ActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className={styles.quickLink}>
      <span>{label}</span>
      <span className={styles.quickArrow}>-&gt;</span>
    </Link>
  )
}

function ProfileTile({ label, value, tone }: { label: string; value: string; tone?: "success" | "warning" }) {
  const toneClass = tone === "success" ? styles.statPrimary : tone === "warning" ? styles.statWarning : styles.statDefault

  return (
    <div className={styles.stat}>
      <p className={styles.statLabel}>{label}</p>
      <p className={`${styles.statValue} ${toneClass}`}>{value}</p>
    </div>
  )
}

function ProfileRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className={styles.dataRow}>
      <span className={styles.dataLabel}>{label}</span>
      <span className={`${styles.dataValue} ${mono ? styles.mono : ""}`}>{value}</span>
    </div>
  )
}
