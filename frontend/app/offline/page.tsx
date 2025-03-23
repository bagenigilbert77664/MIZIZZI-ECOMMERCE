import Link from "next/link"

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white p-4 text-center">
      <h1 className="mb-4 text-3xl font-bold">You're offline</h1>
      <p className="mb-6 text-gray-600">
        It looks like you've lost your internet connection. Please check your connection and try again.
      </p>
      <Link href="/" className="rounded bg-cherry-900 px-4 py-2 text-white transition-colors hover:bg-cherry-800">
        Try again
      </Link>
    </div>
  )
}

