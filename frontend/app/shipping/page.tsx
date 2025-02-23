export default function ShippingPage() {
  return (
    <div className="container py-8">
      <h1 className="mb-8 text-2xl font-bold">Shipping Information</h1>
      <div className="prose max-w-none">
        <p>We offer various shipping options to meet your needs:</p>
        <ul className="list-disc pl-4 space-y-2">
          <li>Standard Shipping (3-5 business days)</li>
          <li>Express Shipping (1-2 business days)</li>
          <li>International Shipping (7-14 business days)</li>
        </ul>
        <p className="mt-4">Free shipping on orders over KSh 10,000 within Kenya.</p>
      </div>
    </div>
  )
}

