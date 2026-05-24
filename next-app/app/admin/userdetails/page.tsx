import { AdminClient } from "@/components/admin-client"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Admin User Details",
  description: "Registered users, reservation activity, purchases, and spend.",
}

export default function AdminUserDetailsPage() {
  return <AdminClient section="users" />
}
