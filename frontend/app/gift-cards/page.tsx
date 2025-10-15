export default function GiftCardsPage() {
  return (
    <div className="container py-8">
      <h1 className="mb-8 text-2xl font-bold">Gift Cards</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Buy Gift Card</h2>
          <p className="text-sm text-muted-foreground mb-4">Give the gift of choice with a Mizizzi gift card.</p>
          <button className="rounded-md bg-cherry-600 px-4 py-2 text-white hover:bg-cherry-700">Purchase</button>
        </div>
        <div className="rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Check Balance</h2>
          <p className="text-sm text-muted-foreground mb-4">Check your gift card balance.</p>
          <button className="rounded-md bg-cherry-600 px-4 py-2 text-white hover:bg-cherry-700">Check Balance</button>
        </div>
      </div>
    </div>
  )
}

