"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PlusCircle, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/styles/hooks/use-toast"
import Link from "next/link"
import { AddressBook } from "@/components/checkout/address-book"
import type { Address } from "@/types/address"

export default function AddressesPage() {
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  const handleSelectAddress = (address: Address) => {
    setSelectedAddressId(address.id)
  }

  const handleAddNewAddress = () => {
    router.push("/settings/addresses/add")
  }

  const handleEditAddress = (address: Address) => {
    router.push(`/settings/addresses/edit/${address.id}`)
  }

  return (
    <div className="container max-w-3xl py-8">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.back()} asChild>
        <Link href="/settings" className="flex items-center">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Settings
        </Link>
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl">My Addresses</CardTitle>
          <Button onClick={handleAddNewAddress} className="flex items-center gap-1">
            <PlusCircle className="h-4 w-4" />
            Add New Address
          </Button>
        </CardHeader>
        <CardContent>
          <AddressBook
            selectedAddressId={selectedAddressId}
            onSelectAddress={handleSelectAddress}
            onAddNewAddress={handleAddNewAddress}
            onEditAddress={handleEditAddress}
          />
        </CardContent>
      </Card>
    </div>
  )
}
