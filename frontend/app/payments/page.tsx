import PaymentsPageClient from "./PaymentsPageClient"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Payment History | Mizizzi",
  description: "View and manage your payment transactions",
}

export default function PaymentsPage() {
  return <PaymentsPageClient />
}
