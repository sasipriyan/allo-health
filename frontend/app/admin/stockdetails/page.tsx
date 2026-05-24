import { AdminClient } from "@/components/admin-client"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Admin Stock Details",
  description: "Warehouse-level stock totals, reserved units, and available inventory.",
}

export default function AdminStockDetailsPage() {
  return <AdminClient section="stock" />
}
