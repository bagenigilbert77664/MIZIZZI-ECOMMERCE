export default function PrivacyPage() {
  return (
    <div className="container py-8">
      <h1 className="mb-8 text-2xl font-bold">Privacy Policy</h1>
      <div className="prose max-w-none">
        <p>
          Your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your personal
          information.
        </p>
        <h2 className="text-xl font-semibold mt-6">Information We Collect</h2>
        <ul className="list-disc pl-4 space-y-2">
          <li>Personal information (name, email, phone number)</li>
          <li>Payment information</li>
          <li>Shipping address</li>
          <li>Order history</li>
        </ul>
      </div>
    </div>
  )
}

