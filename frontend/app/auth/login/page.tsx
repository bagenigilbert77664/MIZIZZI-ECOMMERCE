import { AuthLayout } from "@/components/auth/auth-layout"
import { AuthSteps } from "@/components/auth/auth-steps"

export default function LoginPage() {
  return (
    <AuthLayout>
      <div className="mx-auto w-full max-w-md px-4 py-8">
        <AuthSteps />
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            By continuing, you agree to our{" "}
            <a href="/terms" className="text-cherry-700 hover:text-cherry-800 font-medium">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="text-cherry-700 hover:text-cherry-800 font-medium">
              Privacy Policy
            </a>
            . Experience premium quality shopping with Mizizzi.
          </p>
        </div>
      </div>
    </AuthLayout>
  )
}
