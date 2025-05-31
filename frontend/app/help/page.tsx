export default function HelpPage() {
  return (
    <div className="container py-8">
      <h1 className="mb-8 text-2xl font-bold">Help Center</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Shipping & Delivery</h2>
          <ul className="space-y-2">
            <li>
              <a href="/shipping" className="text-cherry-600 hover:underline">
                Shipping Information
              </a>
            </li>
            <li>
              <a href="/track-order" className="text-cherry-600 hover:underline">
                Track Your Order
              </a>
            </li>
          </ul>
        </div>
        <div className="rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Returns & Refunds</h2>
          <ul className="space-y-2">
            <li>
              <a href="/returns" className="text-cherry-600 hover:underline">
                Return Policy
              </a>
            </li>
            <li>
              <a href="/faq" className="text-cherry-600 hover:underline">
                FAQs
              </a>
            </li>
          </ul>
        </div>
        <div className="rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Contact Us</h2>
          <ul className="space-y-2">
            <li>Email: support@mizizzi.com</li>
            <li>Phone: +254 700 000 000</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

