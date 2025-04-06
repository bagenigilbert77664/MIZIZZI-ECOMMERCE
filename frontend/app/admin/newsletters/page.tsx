"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, MoreHorizontal, Download, Mail, ToggleLeft, ToggleRight, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Loader } from "@/components/ui/loader"
import { adminService } from "@/services/admin"
import { toast } from "@/components/ui/use-toast"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { formatDate } from "@/lib/utils"

export default function NewslettersPage() {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth()
  const router = useRouter()
  const [newsletters, setNewsletters] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState("")

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/admin/login")
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    const fetchNewsletters = async () => {
      try {
        setIsLoading(true)
        const params: any = {
          page: currentPage,
          per_page: 10,
          q: searchQuery || undefined,
        }

        if (statusFilter) {
          params.is_active = statusFilter === "active" ? true : false
        }

        const response = await adminService.getNewsletters(params)
        setNewsletters(response.items || [])
        setTotalPages(response.pagination?.total_pages || 1)
      } catch (error) {
        console.error("Failed to fetch newsletters:", error)
        toast({
          title: "Error",
          description: "Failed to load newsletter subscribers. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (isAuthenticated) {
      fetchNewsletters()
    }
  }, [isAuthenticated, currentPage, searchQuery, statusFilter])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1) // Reset to first page on new search
  }

  const handleToggleNewsletter = async (id: string) => {
    try {
      await adminService.toggleNewsletter(id)
      setNewsletters(
        newsletters.map((newsletter) =>
          newsletter.id === id ? { ...newsletter, is_active: !newsletter.is_active } : newsletter,
        ),
      )
      toast({
        title: "Success",
        description: "Newsletter subscription status updated successfully",
      })
    } catch (error) {
      console.error(`Failed to toggle newsletter ${id}:`, error)
      toast({
        title: "Error",
        description: "Failed to update newsletter status. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteNewsletter = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this newsletter subscription?")) {
      try {
        await adminService.deleteNewsletter(id)
        setNewsletters(newsletters.filter((newsletter) => newsletter.id !== id))
        toast({
          title: "Success",
          description: "Newsletter subscription deleted successfully",
        })
      } catch (error) {
        console.error(`Failed to delete newsletter ${id}:`, error)
        toast({
          title: "Error",
          description: "Failed to delete newsletter subscription. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  const handleExportNewsletters = async () => {
    try {
      const data = await adminService.exportNewsletters({ is_active: statusFilter === "active" ? true : undefined })

      // Create a blob from the CSV data
      const blob = new Blob([data.csv_data], { type: "text/csv" })

      // Create a download link and trigger the download
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = data.filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Success",
        description: `Exported ${data.message}`,
      })
    } catch (error) {
      console.error("Failed to export newsletters:", error)
      toast({
        title: "Error",
        description: "Failed to export newsletter subscribers. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader size="lg" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Newsletter Subscribers</h1>
        <Button onClick={handleExportNewsletters}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Newsletter Management</CardTitle>
          <CardDescription>View and manage your newsletter subscribers.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <form onSubmit={handleSearch} className="flex-1 w-full">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    type="search"
                    placeholder="Search by email or name..."
                    className="w-full pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </form>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {isLoading ? (
              <div className="flex h-[400px] items-center justify-center">
                <Loader size="lg" />
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Subscribed On</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {newsletters.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                            No newsletter subscribers found
                          </TableCell>
                        </TableRow>
                      ) : (
                        newsletters.map((newsletter) => (
                          <TableRow key={newsletter.id}>
                            <TableCell className="font-medium">{newsletter.email}</TableCell>
                            <TableCell>{newsletter.name || "—"}</TableCell>
                            <TableCell>{formatDate(newsletter.created_at)}</TableCell>
                            <TableCell>
                              {newsletter.is_active ? (
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Active</Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Inactive</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem
                                    onClick={() => (window.location.href = `mailto:${newsletter.email}`)}
                                  >
                                    <Mail className="mr-2 h-4 w-4" />
                                    Send Email
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {newsletter.is_active ? (
                                    <DropdownMenuItem onClick={() => handleToggleNewsletter(newsletter.id)}>
                                      <ToggleLeft className="mr-2 h-4 w-4" />
                                      Deactivate
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onClick={() => handleToggleNewsletter(newsletter.id)}>
                                      <ToggleRight className="mr-2 h-4 w-4" />
                                      Activate
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => handleDeleteNewsletter(newsletter.id)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      />
                    </PaginationItem>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNumber =
                        currentPage <= 3
                          ? i + 1
                          : currentPage >= totalPages - 2
                            ? totalPages - 4 + i
                            : currentPage - 2 + i

                      if (pageNumber <= 0 || pageNumber > totalPages) return null

                      return (
                        <PaginationItem key={pageNumber}>
                          <PaginationLink
                            isActive={currentPage === pageNumber}
                            onClick={() => setCurrentPage(pageNumber)}
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    })}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

