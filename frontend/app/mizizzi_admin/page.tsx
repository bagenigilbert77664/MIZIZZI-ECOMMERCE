import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function DashboardPage() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Heads up!</AlertTitle>
        <AlertDescription>You are on the admin dashboard. Be careful what you click.</AlertDescription>
      </Alert>
      <Button>Click me</Button>
    </div>
  )
}

