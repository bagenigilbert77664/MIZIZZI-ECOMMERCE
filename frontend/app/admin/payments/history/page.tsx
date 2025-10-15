"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { Search, Download, CalendarIcon, Clock, HistoryIcon } from "lucide-react"

interface PaymentEvent {
  id: number
  transaction_id: string
  order_id: number
  user_id: number
  customer_name: string
  customer_email: string
  amount: number
  currency: string
  payment_method: string
  status: string
  event_type: string
  event_description: string
  created_at: string
  metadata?: any
}

export default function PaymentHistoryPage() {
  const [events, setEvents] = useState<PaymentEvent[]>([])
  const [filteredEvents, setFilteredEvents] = useState<PaymentEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [methodFilter, setMethodFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState<Date>()
  const [dateTo, setDateTo] = useState<Date>()
  const [selectedEvent, setSelectedEvent] = useState<PaymentEvent | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 20

  useEffect(() => {
    fetchPaymentHistory()
  }, [currentPage, statusFilter, methodFilter, dateFrom, dateTo])

  useEffect(() => {
    filterEvents()
  }, [searchTerm, events])

  const fetchPaymentHistory = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("admin_token")

      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: itemsPerPage.toString(),
      })

      if (statusFilter !== "all") params.append("status", statusFilter)
      if (methodFilter !== "all") params.append("payment_method", methodFilter)
      if (dateFrom) params.append("date_from", format(dateFrom, "yyyy-MM-dd"))
      if (dateTo) params.append("date_to", format(dateTo, "yyyy-MM-dd"))

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/pesapal/admin/transactions?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch payment history")
      }

      const data = await response.json()
      setEvents(data.transactions || [])
      setTotalPages(data.total_pages || 1)
    } catch (error) {
      console.error("Error fetching payment history:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterEvents = () => {
    if (!searchTerm) {
      setFilteredEvents(events)
      return
    }

    const filtered = events.filter(
      (event) =>
        event.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.order_id?.toString().includes(searchTerm),
    )
    setFilteredEvents(filtered)
  }

  const exportHistory = () => {
    const csv = [
      ["Date", "Transaction ID", "Order ID", "Customer", "Email", "Amount", "Method", "Status", "Event"],
      ...filteredEvents.map((event) => [
        format(new Date(event.created_at), "yyyy-MM-dd HH:mm:ss"),
        event.transaction_id,
        event.order_id,
        event.customer_name,
        event.customer_email,
        `${event.currency} ${event.amount}`,
        event.payment_method,
        event.status,
        event.event_description,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `payment-history-${format(new Date(), "yyyy-MM-dd")}.csv`
    a.click()
  }

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "COMPLETED":
      case "SUCCESS":
        return "bg-green-500/10 text-green-500 border-green-500/20"
      case "PENDING":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20"
      case "FAILED":
      case "REJECTED":
        return "bg-red-500/10 text-red-500 border-red-500/20"
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Payment History
            </h1>
            <p className="text-slate-600 mt-1">Complete chronological history of all payment activities</p>
          </div>
          <Button onClick={exportHistory} className="gap-2">
            <Download className="h-4 w-4" />
            Export History
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal bg-transparent">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "PPP") : "From Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal bg-transparent">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "PPP") : "To Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HistoryIcon className="h-5 w-5" />
              Payment Timeline
            </CardTitle>
            <CardDescription>Showing {filteredEvents.length} events</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-slate-600 mt-4">Loading payment history...</p>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-12">
                <HistoryIcon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">No payment history found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEvents.map((event, index) => (
                  <div
                    key={event.id}
                    className="flex gap-4 p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white">
                        <Clock className="h-5 w-5" />
                      </div>
                      {index < filteredEvents.length - 1 && <div className="w-0.5 flex-1 bg-slate-200 mt-2" />}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-slate-900">{event.event_description || "Payment Event"}</p>
                          <p className="text-sm text-slate-600">{format(new Date(event.created_at), "PPP 'at' p")}</p>
                        </div>
                        <Badge className={getStatusColor(event.status)}>{event.status}</Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500">Transaction ID</p>
                          <p className="font-mono text-slate-900">{event.transaction_id}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Order ID</p>
                          <p className="font-medium text-slate-900">#{event.order_id}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Customer</p>
                          <p className="font-medium text-slate-900">{event.customer_name}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Amount</p>
                          <p className="font-medium text-slate-900">
                            {event.currency} {event.amount?.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t">
                <p className="text-sm text-slate-600">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Event Details</DialogTitle>
            <DialogDescription>Complete information about this payment event</DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Transaction ID</p>
                  <p className="font-mono text-sm">{selectedEvent.transaction_id}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Order ID</p>
                  <p className="font-medium">#{selectedEvent.order_id}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Customer Name</p>
                  <p className="font-medium">{selectedEvent.customer_name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Customer Email</p>
                  <p className="font-medium">{selectedEvent.customer_email}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Amount</p>
                  <p className="font-medium">
                    {selectedEvent.currency} {selectedEvent.amount?.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Payment Method</p>
                  <p className="font-medium">{selectedEvent.payment_method}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <Badge className={getStatusColor(selectedEvent.status)}>{selectedEvent.status}</Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Date & Time</p>
                  <p className="font-medium">{format(new Date(selectedEvent.created_at), "PPP 'at' p")}</p>
                </div>
              </div>

              {selectedEvent.metadata && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Additional Information</p>
                  <pre className="bg-slate-100 p-3 rounded text-xs overflow-auto">
                    {JSON.stringify(selectedEvent.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
