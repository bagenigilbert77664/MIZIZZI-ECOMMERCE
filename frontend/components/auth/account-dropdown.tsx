"use client"

import { Package, Heart, Gift, Settings, LogOut, CreditCard, Clock, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react"

// Mock user data - in a real app, this would come from your auth system
const user = {
  name: "Gilbert Doe",
  email: "gilbert@example.com",
  avatar: "/placeholder.svg?height=32&width=32",
}

const accountLinks = [
  {
    group: "Shopping",
    items: [
      { label: "Orders", icon: Package, href: "/orders" },
      { label: "Wishlist", icon: Heart, href: "/wishlist" },
      { label: "Reviews", icon: Star, href: "/reviews" },
    ],
  },
  {
    group: "Payments",
    items: [
      { label: "Payment Methods", icon: CreditCard, href: "/payments" },
      { label: "Gift Cards", icon: Gift, href: "/gift-cards" },
      { label: "Purchase History", icon: Clock, href: "/purchase-history" },
    ],
  },
  {
    group: "Account",
    items: [
      { label: "Settings", icon: Settings, href: "/settings" },
      { label: "Sign Out", icon: LogOut, href: "/signout" },
    ],
  },
]

const dropdownAnimation = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.2, ease: "easeOut" },
}

const itemAnimation = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.2 },
}

export function AccountDropdown() {
  const [open, setOpen] = useState(false)
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 px-2 sm:px-4 hover:bg-cherry-50 hover:text-cherry-900 transition-colors duration-200"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-cherry-100 to-cherry-50 text-cherry-900 shadow-sm"
          >
            <span className="text-sm font-semibold">GB</span>
          </motion.div>
          <div className="hidden flex-col items-start text-left sm:flex">
            <span className="text-sm font-medium">{user.name}</span>
            <span className="text-xs text-muted-foreground">Account</span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <AnimatePresence>
        <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] sm:w-[280px] bg-white" asChild>
          <motion.div {...dropdownAnimation}>
            <div className="flex items-center gap-2 p-4 border-b">
              <motion.div
                className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-cherry-100 to-cherry-50 text-cherry-900"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <span className="text-base font-semibold">GB</span>
              </motion.div>
              <motion.div
                className="flex flex-col"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: 0.1 }}
              >
                <span className="text-sm font-medium">{user.name}</span>
                <span className="text-xs text-muted-foreground">{user.email}</span>
              </motion.div>
            </div>
            <DropdownMenuSeparator className="bg-gray-100" />
            {accountLinks.map((group, index) => (
              <motion.div
                key={group.group}
                initial="initial"
                animate="animate"
                variants={itemAnimation}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <DropdownMenuLabel className="px-4 text-xs font-medium text-gray-500">{group.group}</DropdownMenuLabel>
                <DropdownMenuGroup>
                  {group.items.map((item, itemIndex) => (
                    <DropdownMenuItem
                      key={item.label}
                      asChild
                      className="flex items-center gap-2 px-4 py-2 hover:bg-cherry-50 hover:text-cherry-900 focus:bg-cherry-50 focus:text-cherry-900"
                    >
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + index * 0.1 + itemIndex * 0.05 }}
                      >
                        <Link href={item.href} className="flex items-center gap-2 w-full">
                          <item.icon className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-700">{item.label}</span>
                        </Link>
                      </motion.div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                {index < accountLinks.length - 1 && <DropdownMenuSeparator className="opacity-50" />}
              </motion.div>
            ))}
          </motion.div>
        </DropdownMenuContent>
      </AnimatePresence>
    </DropdownMenu>
  )
}
