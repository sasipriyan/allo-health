"use client"

import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import styles from "@/styles/Profile.module.css"

export function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <button type="button" onClick={handleSignOut} className={styles.signOutButton}>
      Sign out
    </button>
  )
}
