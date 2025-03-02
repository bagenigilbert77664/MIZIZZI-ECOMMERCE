"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { LoginForm } from "@/components/auth/login-form"; // Your login form component
import { useAuth } from "@/contexts/auth/auth-context"; // Auth context hook
import { Loader } from "@/components/ui/loader";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to home if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push("/");
    }
}, [isAuthenticated, isLoading, router]);

// Display a loader while authentication state is being determined
  if (isLoading) {
    return <Loader />;
  }

  // If not authenticated, show the login page
  if (!isAuthenticated) {
    return (
      <div className="container relative flex min-h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
        {/* Left side: Promotional image and messaging */}
        <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
          <div className="absolute inset-0 bg-cherry-900">
            <Image
              src="https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=1470&auto=format&fit=crop"
              alt="Luxury Fashion Background"
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
                "Mizizzi has transformed my shopping experience. The quality of products and the seamless checkout
                process make it my go-to online store for fashion and jewelry."
              </p>
              <footer className="text-sm">Sofia Kimani, Loyal Customer</footer>
            </blockquote>
          </div>
          <div className="relative z-20 mt-auto">
            <div className="flex items-center">
              <div className="ml-4 space-y-1">
                <p className="text-base font-medium leading-none">Secure Shopping</p>
                <p className="text-sm text-white/70">Your data is always protected</p>
              </div>
            </div>
          </div>
        </div>
        {/* Right side: Login form */}
        <div className="lg:p-8">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            <LoginForm />
          </div>
        </div>
      </div>
    );
  }

  return null;
}
