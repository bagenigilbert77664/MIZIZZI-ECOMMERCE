"use client"

import TokenTester from "./token-tester"

export default function AuthTestPage() {
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Authentication Test Page</h1>
      <TokenTester />
    </div>
  )
}

