import { Mail, MapPin, Phone } from "lucide-react"

export default function ContactPage() {
  return (
    <div className="container py-8">
      <h1 className="mb-8 text-2xl font-bold">Contact Us</h1>
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border p-6">
          <Phone className="mb-4 h-6 w-6 text-cherry-900" />
          <h2 className="mb-2 text-lg font-semibold">Phone</h2>
          <p className="text-muted-foreground">+254 700 000 000</p>
        </div>
        <div className="rounded-lg border p-6">
          <Mail className="mb-4 h-6 w-6 text-cherry-900" />
          <h2 className="mb-2 text-lg font-semibold">Email</h2>
          <p className="text-muted-foreground">support@mizizzi.com</p>
        </div>
        <div className="rounded-lg border p-6">
          <MapPin className="mb-4 h-6 w-6 text-cherry-900" />
          <h2 className="mb-2 text-lg font-semibold">Address</h2>
          <p className="text-muted-foreground">123 Fashion Street, Nairobi, Kenya</p>
        </div>
      </div>
    </div>
  )
}

