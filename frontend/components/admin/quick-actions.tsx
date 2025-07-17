"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { Plus, ShoppingBag, Tag, Users, X, Package, Settings } from "lucide-react"

export function QuickActions() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <TooltipProvider>
      <div className="fixed bottom-6 right-6 z-50">
        <div className="relative">
          {isOpen && (
            <div className="absolute bottom-16 right-0 flex flex-col space-y-2">
              <QuickActionButton
                href="/admin/products/new"
                icon={<ShoppingBag className="h-4 w-4" />}
                label="New Product"
              />
              <QuickActionButton href="/admin/categories/new" icon={<Tag className="h-4 w-4" />} label="New Category" />
              <QuickActionButton
                href="/admin/customers/new"
                icon={<Users className="h-4 w-4" />}
                label="New Customer"
              />
              <QuickActionButton href="/admin/orders/new" icon={<Package className="h-4 w-4" />} label="New Order" />
              <QuickActionButton href="/admin/settings" icon={<Settings className="h-4 w-4" />} label="Settings" />
            </div>
          )}
          <Button
            size="lg"
            className="h-14 w-14 rounded-full bg-cherry-600 hover:bg-cherry-700"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  )
}

interface QuickActionButtonProps {
  href: string
  icon: React.ReactNode
  label: string
}

function QuickActionButton({ href, icon, label }: QuickActionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link href={href}>
          <Button
            size="icon"
            className="h-10 w-10 rounded-full bg-white text-slate-700 shadow-md hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {icon}
          </Button>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="left">{label}</TooltipContent>
    </Tooltip>
  )
}
