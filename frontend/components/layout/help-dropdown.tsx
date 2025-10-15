"use client"

import type React from "react"

import { HelpCircle, MessageCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FaWhatsapp } from "react-icons/fa"

const helpLinks = [
  { label: "Help Center", href: "/help" },
  { label: "Place your Order", href: "/help#place-order" },
  { label: "Payment Options", href: "/help#payment" },
  { label: "Delivery Timelines & Track your Order", href: "/shipping" },
  { label: "Returns & Refunds", href: "/returns" },
  { label: "Warranty", href: "/help#warranty" },
]

export function HelpDropdown({ trigger }: { trigger?: React.ReactNode }) {
  const router = useRouter()

  const handleLiveChat = () => {
    // Implement live chat functionality
    console.log("Opening live chat...")
  }

  const handleWhatsApp = () => {
    // Open WhatsApp with your business number
    window.open("https://wa.me/254700000000", "_blank")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger || (
          <Button
            variant="ghost"
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            aria-label="Help menu"
          >
            <HelpCircle className="h-5 w-5" />
            <span className="text-sm font-medium hidden lg:inline">Help</span>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-2">
        {helpLinks.map((link, index) => (
          <DropdownMenuItem
            key={index}
            onClick={() => router.push(link.href)}
            className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md cursor-pointer"
          >
            {link.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="my-2" />
        <div className="space-y-2 px-2">
          <Button
            onClick={handleLiveChat}
            className="w-full bg-[#f68b1e] hover:bg-[#e57a0d] text-white font-medium py-2 rounded-md flex items-center justify-center gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            Live Chat
          </Button>
          <Button
            onClick={handleWhatsApp}
            className="w-full bg-[#25D366] hover:bg-[#1fb855] text-white font-medium py-2 rounded-md flex items-center justify-center gap-2"
          >
            <FaWhatsapp className="h-5 w-5" />
            WhatsApp
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
