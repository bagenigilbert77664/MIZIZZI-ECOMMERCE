export default function PaymentsPage() {
  return (
    <div className="container py-8">
      <h1 className="mb-8 text-2xl font-bold">Payment Methods</h1>
      <div className="max-w-2xl">
        <div className="rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Saved Payment Methods</h2>
          <div className="text-center py-4">
            <p className="text-muted-foreground">No payment methods saved</p>
          </div>
          <button className="mt-4 rounded-md bg-cherry-600 px-4 py-2 text-white hover:bg-cherry-700">
            Add Payment Method
          </button>
        </div>
      </div>
    </div>
  )
}

