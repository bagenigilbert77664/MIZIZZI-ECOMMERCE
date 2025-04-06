import type React from "react"
import type { Metadata } from "next"
import AdminLayoutClient from "./AdminLayoutClient"

// Metadata is handled by the parent layout
export const metadata: Metadata = {
  title: "Mizizzi Admin Dashboard",
  description: "Admin dashboard for Mizizzi E-commerce platform",
}

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>
}
