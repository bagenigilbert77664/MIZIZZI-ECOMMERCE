import Image from "next/image"
import Link from "next/link"

const officialStores = [
  {
    name: "Pandora",
    logo: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=100&h=100&fit=crop",
    href: "/store/pandora",
  },
  {
    name: "Swarovski",
    logo: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=100&h=100&fit=crop",
    href: "/store/swarovski",
  },
  {
    name: "Zara",
    logo: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=100&h=100&fit=crop",
    href: "/store/zara",
  },
  {
    name: "H&M",
    logo: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=100&h=100&fit=crop",
    href: "/store/hm",
  },
  {
    name: "Cartier",
    logo: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=100&h=100&fit=crop",
    href: "/store/cartier",
  },
  {
    name: "Tiffany & Co",
    logo: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=100&h=100&fit=crop",
    href: "/store/tiffany",
  },
]

export function OfficialStores() {
  return (
    <div className="rounded-lg bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Official Stores</h2>
        <a href="/official-stores" className="text-sm font-medium text-primary hover:underline">
          SEE ALL
        </a>
      </div>
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
        {officialStores.map((store) => (
          <Link
            key={store.name}
            href={store.href}
            className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-gray-50"
          >
            <div className="relative h-16 w-16 overflow-hidden rounded-full border">
              <Image src={store.logo || "/placeholder.svg"} alt={store.name} fill className="object-cover" />
            </div>
            <span className="text-center text-sm font-medium">{store.name}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

