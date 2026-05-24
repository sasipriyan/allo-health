import { AdminClient } from "@/components/admin-client"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Admin overview for users, purchases, billing, and stock.",
}

export default function AdminPage() {
  return <AdminClient section="overview" />
}
