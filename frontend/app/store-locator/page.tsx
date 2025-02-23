import { MapPin } from "lucide-react"

const stores = [
  {
    id: 1,
    name: "Mizizzi Westlands",
    address: "123 Fashion Street, Westlands, Nairobi",
    phone: "+254 700 000 001",
    hours: "9:00 AM - 9:00 PM",
  },
  {
    id: 2,
    name: "Mizizzi Kilimani",
    address: "456 Style Avenue, Kilimani, Nairobi",
    phone: "+254 700 000 002",
    hours: "9:00 AM - 9:00 PM",
  },
  // Add more stores as needed
]

export default function StoreLocatorPage() {
  return (
    <div className="container py-8">
      <h1 className="mb-8 text-2xl font-bold">Store Locations</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {stores.map((store) => (
          <div key={store.id} className="rounded-lg border p-6">
            <div className="mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-cherry-900" />
              <h2 className="text-lg font-semibold">{store.name}</h2>
            </div>
            <div className="space-y-2 text-muted-foreground">
              <p>{store.address}</p>
              <p>{store.phone}</p>
              <p>{store.hours}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

