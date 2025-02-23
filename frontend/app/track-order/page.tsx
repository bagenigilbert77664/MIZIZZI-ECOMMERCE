export default function TrackOrderPage() {
  return (
    <div className="container py-8">
      <h1 className="mb-8 text-2xl font-bold">Track Order</h1>
      <div className="max-w-md mx-auto">
        <form className="space-y-4">
          <div>
            <label htmlFor="order-number" className="block text-sm font-medium mb-1">
              Order Number
            </label>
            <input
              type="text"
              id="order-number"
              className="w-full rounded-md border border-input px-3 py-2"
              placeholder="Enter your order number"
            />
          </div>
          <button type="submit" className="w-full rounded-md bg-cherry-600 px-4 py-2 text-white hover:bg-cherry-700">
            Track Order
          </button>
        </form>
      </div>
    </div>
  )
}

