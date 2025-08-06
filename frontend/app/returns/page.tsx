export default function ReturnsPage() {
  return (
    <div className="container py-8">
      <h1 className="mb-8 text-2xl font-bold">Returns & Exchanges</h1>
      <div className="prose max-w-none">
        <p>
          Our return policy lasts 30 days. If 30 days have passed since your purchase, we cannot offer you a refund or
          exchange.
        </p>
        <h2 className="text-xl font-semibold mt-6">Return Process</h2>
        <ol className="list-decimal pl-4 space-y-2">
          <li>Initiate a return through your account or contact customer service</li>
          <li>Package your item securely with all original tags and packaging</li>
          <li>Ship the item back using our provided return label</li>
          <li>Receive your refund within 5-7 business days of us receiving the return</li>
        </ol>
      </div>
    </div>
  )
}

