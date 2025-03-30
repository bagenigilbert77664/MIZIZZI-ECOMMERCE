"use client"

import type React from "react"

import { useState } from "react"
import { Phone, Send, ShoppingBag, Gift, Clock, MessageCircle, HelpCircle, Store, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { motion } from "framer-motion"

const supportCards = [
  {
    icon: ShoppingBag,
    title: "Shopping",
    description: "Product inquiries",
  },
  {
    icon: Gift,
    title: "Custom",
    description: "Bespoke orders",
  },
  {
    icon: Store,
    title: "Store",
    description: "Visit showroom",
  },
  {
    icon: Clock,
    title: "Schedule",
    description: "Book viewing",
  },
  {
    icon: Sparkles,
    title: "New",
    description: "Latest items",
  },
  {
    icon: HelpCircle,
    title: "Help",
    description: "Get support",
  },
]

interface WhatsAppButtonProps {
  customTrigger?: React.ReactNode
}

export function WhatsAppButton({ customTrigger }: WhatsAppButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [selectedCard, setSelectedCard] = useState<number | null>(null)
  const phoneNumber = "254746741719"

  const handleSendMessage = () => {
    const finalMessage = selectedCard !== null ? `${supportCards[selectedCard].title}: ${message}` : message
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(finalMessage)}`, "_blank")
    setIsOpen(false)
    setMessage("")
    setSelectedCard(null)
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {customTrigger || (
          <Button
            variant="ghost"
            size="icon"
            className="relative h-8 w-8 sm:h-10 sm:w-10 transition-colors hover:bg-cherry-50 hover:text-cherry-900"
          >
            <Phone className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-md p-0 bg-white" aria-describedby="whatsapp-description">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>Chat with Us</SheetTitle>
          <SheetDescription id="whatsapp-description">
            Select a category or start chatting directly with our support team
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {supportCards.map((card, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedCard(index)}
                  className={`group flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-all duration-200 hover:bg-cherry-50 ${
                    selectedCard === index
                      ? "border-cherry-200 bg-cherry-50 shadow-sm"
                      : "border-gray-100 hover:border-cherry-100"
                  }`}
                >
                  <div className="rounded-full bg-white p-2 shadow-sm transition-shadow group-hover:shadow">
                    <card.icon className="h-5 w-5 text-cherry-900" />
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-medium text-gray-900">{card.title}</h3>
                    <p className="text-xs text-gray-500">{card.description}</p>
                  </div>
                </motion.button>
              ))}
            </div>

            <div className="space-y-4">
              {selectedCard !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg bg-cherry-50 p-3"
                >
                  <div className="flex items-center gap-2 text-sm text-cherry-900">
                    <MessageCircle className="h-4 w-4" />
                    <span className="font-medium">{supportCards[selectedCard].title} Support</span>
                  </div>
                </motion.div>
              )}

              <div className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="flex-1"
                />
                <Button
                  className="bg-cherry-600 hover:bg-cherry-700 transition-colors"
                  size="icon"
                  disabled={!message.trim()}
                  onClick={handleSendMessage}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-cherry-100 bg-cherry-50/50 p-3">
              <p className="text-center text-xs font-medium text-cherry-900">Available: Mon-Sat, 9AM - 6PM</p>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

