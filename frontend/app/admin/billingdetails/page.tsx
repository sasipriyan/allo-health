import { AdminClient } from "@/components/admin-client"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Admin Billing Details",
  description: "Billing records with payment status, customer, date, and amount.",
}

export default function AdminBillingDetailsPage() {
  return <AdminClient section="billing" />
}
