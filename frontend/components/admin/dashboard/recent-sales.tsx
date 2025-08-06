"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function RecentSales() {
  return (
    <div className="space-y-8">
      <div className="flex items-center">
        <Avatar className="h-9 w-9">
          <AvatarImage src="/placeholder.svg?height=36&width=36" alt="Avatar" width={36} height={36} />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">John Doe</p>
          <p className="text-sm text-muted-foreground">john.doe@example.com</p>
        </div>
        <div className="ml-auto font-medium">+$249.00</div>
      </div>
      <div className="flex items-center">
        <Avatar className="h-9 w-9">
          <AvatarImage src="/placeholder.svg?height=36&width=36" alt="Avatar" width={36} height={36} />
          <AvatarFallback>AS</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Alice Smith</p>
          <p className="text-sm text-muted-foreground">alice.smith@example.com</p>
        </div>
        <div className="ml-auto font-medium">+$399.00</div>
      </div>
      <div className="flex items-center">
        <Avatar className="h-9 w-9">
          <AvatarImage src="/placeholder.svg?height=36&width=36" alt="Avatar" width={36} height={36} />
          <AvatarFallback>BJ</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Bob Johnson</p>
          <p className="text-sm text-muted-foreground">bob.johnson@example.com</p>
        </div>
        <div className="ml-auto font-medium">+$129.00</div>
      </div>
      <div className="flex items-center">
        <Avatar className="h-9 w-9">
          <AvatarImage src="/placeholder.svg?height=36&width=36" alt="Avatar" width={36} height={36} />
          <AvatarFallback>EW</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Emma Wilson</p>
          <p className="text-sm text-muted-foreground">emma.wilson@example.com</p>
        </div>
        <div className="ml-auto font-medium">+$549.00</div>
      </div>
      <div className="flex items-center">
        <Avatar className="h-9 w-9">
          <AvatarImage src="/placeholder.svg?height=36&width=36" alt="Avatar" width={36} height={36} />
          <AvatarFallback>MB</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Michael Brown</p>
          <p className="text-sm text-muted-foreground">michael.brown@example.com</p>
        </div>
        <div className="ml-auto font-medium">+$199.00</div>
      </div>
    </div>
  )
}

