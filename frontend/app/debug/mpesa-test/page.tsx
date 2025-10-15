import type { Metadata } from "next"
import MpesaTestClient from "./mpesa-test-client"

export const metadata: Metadata = {
  title: "M-PESA Backend Test | Mizizzi",
  description: "Test and debug M-PESA integration with the backend",
}

export default function MpesaTestPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">M-PESA Backend Test Tool</h1>
      <MpesaTestClient />
    </div>
  )
}
