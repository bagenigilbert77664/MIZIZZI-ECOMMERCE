// app/auth/register/page.tsx
import type { Metadata } from "next";
import Image from "next/image";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Register | Mizizzi",
  description: "Create a new Mizizzi account to start shopping for premium fashion and jewelry.",
};

export default function RegisterPage() {
  return (
    <div className="container relative flex min-h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      {/* Left Side - Promotional Content */}
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-cherry-900">
          <Image
            src="https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=1374&auto=format&fit=crop"
            alt="Luxury Jewelry Background"
            fill
            className="object-cover opacity-30 mix-blend-overlay"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-cherry-950/90 via-cherry-900/80 to-cherry-800/70" />
        </div>
        <div className="relative z-20 flex items-center text-lg font-medium">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md bg-white p-1 mr-2">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png"
              alt="Mizizzi Logo"
              width={40}
              height={40}
              className="h-full w-full object-contain"
            />
          </div>
          <span className="text-xl font-bold tracking-tight">Mizizzi</span>
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">
              "Join the Mizizzi family and discover a world of premium fashion and jewelry. Our exclusive collections
              are designed to make you stand out."
            </p>
            <footer className="text-sm">The Mizizzi Team</footer>
          </blockquote>
        </div>
        <div className="relative z-20 mt-auto">
          <div className="flex items-center">
            <div className="ml-4 space-y-1">
              <p className="text-base font-medium leading-none">Member Benefits</p>
              <p className="text-sm text-white/70">Exclusive deals, early access, and more</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Registration Form */}
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
