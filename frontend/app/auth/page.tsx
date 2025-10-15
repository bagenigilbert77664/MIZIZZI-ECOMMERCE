import { AuthLayout } from "@/components/auth/auth-layout"
import { AuthSteps } from "@/components/auth/auth-steps"

export default function AuthPage() {
  return (
    <AuthLayout>
      <div className="mx-auto w-full max-w-md px-4 py-8">
        <AuthSteps />
      </div>
    </AuthLayout>
  )
}
