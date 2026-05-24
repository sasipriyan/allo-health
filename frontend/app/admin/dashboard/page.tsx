import { AdminClient } from "@/components/admin-client"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Admin Overview",
  description: "Purchase analytics, revenue, users, and stock summary.",
}

export default function AdminDashboardPage() {
  return <AdminClient section="overview" />
}
