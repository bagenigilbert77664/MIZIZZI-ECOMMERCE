import { CheckCircle } from "lucide-react"

export function SuccessScreen() {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 text-center">
      <div className="rounded-full bg-green-100 p-3">
        <CheckCircle className="h-10 w-10 text-green-600" />
      </div>
      <h1 className="text-xl font-semibold">Login Successful!</h1>
      <p className="text-sm text-muted-foreground">
        You have successfully logged in. You are now being redirected to the homepage.
      </p>
      <div className="mt-2 flex items-center justify-center space-x-2">
        <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
        <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
        <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  )
}
