export default function Loading() {
  return (
    <div className="container max-w-4xl mx-auto py-10 px-4 text-center">
      <div className="flex flex-col items-center justify-center py-16">
        <div className="relative h-12 w-12 animate-spin rounded-full border-4 border-green-600 border-t-transparent"></div>
        <p className="mt-6 text-gray-600 font-medium">Loading your order details...</p>
        <p className="mt-2 text-sm text-gray-500">Please wait a moment...</p>
      </div>
    </div>
  )
}
