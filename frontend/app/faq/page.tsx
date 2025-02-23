export default function FAQPage() {
  return (
    <div className="container py-8">
      <h1 className="mb-8 text-2xl font-bold">Frequently Asked Questions</h1>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">How do I track my order?</h2>
          <p className="mt-2 text-gray-600">
            You can track your order by logging into your account and viewing your order history.
          </p>
        </div>
        <div>
          <h2 className="text-lg font-semibold">What payment methods do you accept?</h2>
          <p className="mt-2 text-gray-600">We accept M-PESA, credit cards, and bank transfers.</p>
        </div>
      </div>
    </div>
  )
}

