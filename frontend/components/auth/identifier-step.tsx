"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2 } from "lucide-react"

interface IdentifierStepProps {
  onSubmit: (identifier: string, isEmail: boolean) => void
  isLoading: boolean
}

export function IdentifierStep({ onSubmit, isLoading }: IdentifierStepProps) {
  const [activeTab, setActiveTab] = useState<"email" | "phone">("email")

  // Combined schema for identifier step
  const formSchema = z.object({
    identifier: z.string().min(1, "This field is required"),
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      identifier: "",
    },
  })

  const handleFormSubmit = (data: z.infer<typeof formSchema>) => {
    const isEmail = activeTab === "email"
    onSubmit(data.identifier, isEmail)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Welcome</h1>
        <p className="text-sm text-muted-foreground">Enter your email or phone to continue</p>
      </div>

      <Tabs
        defaultValue="email"
        className="w-full"
        onValueChange={(value) => {
          setActiveTab(value as "email" | "phone")
          form.reset({ identifier: "" }) // Clear input when switching tabs
        }}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="phone">Phone</TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="mt-3">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-3">
              <FormField
                control={form.control}
                name="identifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-cherry-700 font-medium">Email</FormLabel>
                    <FormControl>
                      <Input placeholder="name@example.com" type="email" autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full h-14 text-lg font-medium" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Please wait
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="phone" className="mt-3">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-3">
              <FormField
                control={form.control}
                name="identifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-cherry-700 font-medium">Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+254 7XX XXX XXX" type="tel" autoComplete="tel" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full h-14 text-lg font-medium" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Please wait
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </form>
          </Form>
        </TabsContent>
      </Tabs>

      <div className="text-center text-xs text-muted-foreground">
        By continuing, you agree to our{" "}
        <a href="/terms" className="underline underline-offset-4 hover:text-primary">
          Terms
        </a>{" "}
        and{" "}
        <a href="/privacy" className="underline underline-offset-4 hover:text-primary">
          Privacy Policy
        </a>
      </div>
    </div>
  )
}
