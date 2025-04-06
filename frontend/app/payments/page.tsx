"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { CreditCard, Smartphone, Plus, ChevronRight, Shield, CheckCircle2, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"

// Mock transaction data
const transactions = [
  {
    id: "TXN001",
    date: "2024-02-26",
    amount: 149999,
    status: "completed",
    method: "mpesa",
    reference: "MPESA123456",
    description: "Payment for Order #ORD-2024-001",
  },
  {
    id: "TXN002",
    date: "2024-02-25",
    amount: 299999,
    status: "completed",
    method: "card",
    reference: "CARD987654",
    description: "Payment for Order #ORD-2024-002",
  },
  {
    id: "TXN003",
    date: "2024-02-24",
    amount: 89999,
    status: "pending",
    method: "mpesa",
    reference: "MPESA789012",
    description: "Payment for Order #ORD-2024-003",
  },
]

const savedCards = [
  {
    id: "card_1",
    type: "visa",
    last4: "4242",
    expiry: "12/25",
    name: "John Doe",
  },
  {
    id: "card_2",
    type: "mastercard",
    last4: "8888",
    expiry: "06/24",
    name: "John Doe",
  },
]

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState("methods")

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Payments & Transactions</h1>
        <p className="mt-2 text-muted-foreground">Manage your payment methods and view transaction history</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList>
          <TabsTrigger value="methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="transactions">Transaction History</TabsTrigger>
        </TabsList>

        <TabsContent value="methods" className="space-y-6">
          {/* M-PESA Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/M-PESA_LOGO-01.svg/512px-M-PESA_LOGO-01.svg.png"
                  alt="M-PESA"
                  width={80}
                  height={30}
                  className="h-8 w-auto"
                />
                <Badge variant="outline" className="ml-2">
                  Preferred
                </Badge>
              </CardTitle>
              <CardDescription>Fast and secure mobile money payments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-green-100 p-2">
                    <Smartphone className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium">How to pay with M-PESA</h4>
                    <ol className="mt-2 space-y-2 text-sm text-muted-foreground">
                      <li>1. Go to M-PESA on your phone</li>
                      <li>2. Select Pay Bill</li>
                      <li>3. Enter Business Number: 123456</li>
                      <li>4. Enter Account Number: [Order ID]</li>
                      <li>5. Enter Amount and confirm with your PIN</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-4 text-sm">
                <Shield className="h-5 w-5 text-cherry-600" />
                <span>Your M-PESA transactions are secure and instantly confirmed</span>
              </div>
            </CardContent>
          </Card>

          {/* Credit/Debit Cards Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Saved Cards
              </CardTitle>
              <CardDescription>Manage your saved credit and debit cards</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {savedCards.map((card) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative h-8 w-12 overflow-hidden rounded">
                      <Image
                        src={`https://raw.githubusercontent.com/aaronfagan/svg-credit-card-payment-icons/main/flat/${
                          card.type
                        }.svg`}
                        alt={card.type}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <div>
                      <p className="font-medium">
                        {card.type.charAt(0).toUpperCase() + card.type.slice(1)} ****{card.last4}
                      </p>
                      <p className="text-sm text-muted-foreground">Expires {card.expiry}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    Remove
                  </Button>
                </motion.div>
              ))}

              <Button className="w-full gap-2" variant="outline">
                <Plus className="h-4 w-4" />
                Add New Card
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          {transactions.map((transaction) => (
            <motion.div
              key={transaction.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-lg border bg-white shadow-sm"
            >
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  {transaction.method === "mpesa" ? (
                    <div className="relative h-8 w-16">
                      <Image
                        src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/M-PESA_LOGO-01.svg/512px-M-PESA_LOGO-01.svg.png"
                        alt="M-PESA"
                        fill
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <CreditCard className="h-8 w-8 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">{transaction.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(transaction.date).toLocaleDateString()} • Ref: {transaction.reference}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-cherry-600">KSh {transaction.amount.toLocaleString()}</p>
                  <Badge
                    variant="outline"
                    className={
                      transaction.status === "completed"
                        ? "border-green-200 bg-green-50 text-green-700"
                        : "border-yellow-200 bg-yellow-50 text-yellow-700"
                    }
                  >
                    {transaction.status === "completed" ? (
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                    ) : (
                      <Clock className="mr-1 h-3 w-3" />
                    )}
                    {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                  </Badge>
                </div>
              </div>
            </motion.div>
          ))}

          <div className="flex justify-center">
            <Button variant="outline" className="gap-2">
              Load More Transactions
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

