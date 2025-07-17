"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import {
  Search,
  Plus,
  RefreshCw,
  Download,
  Upload,
  Package,
  Warehouse,
  MapPin,
  BarChart3,
  Truck,
  Users,
  Building,
  Archive,
  Box,
  PackageOpen,
  Home,
  Phone,
  Mail,
  User,
} from "lucide-react"

// Types
interface WarehouseLocation {
  id: number
  name: string
  code: string
  type: "main" | "satellite" | "storage" | "retail"
  address: {
    street: string
    city: string
    state: string
    country: string
    postal_code: string
  }
  contact: {
    manager_name?: string
    phone?: string
    email?: string
  }
  capacity: {
    total_space: number // in sq ft
    used_space: number
    available_space: number
    max_items: number
    current_items: number
  }
  zones: WarehouseZone[]
  status: "active" | "inactive" | "maintenance"
  features: string[]
  operating_hours: {
    monday: string
    tuesday: string
    wednesday: string
    thursday: string
    friday: string
    saturday: string
    sunday: string
  }
  created_at: string
  updated_at: string
}

interface WarehouseZone {
  id: number
  warehouse_id: number
  name: string
  code: string
  type: "receiving" | "storage" | "picking" | "packing" | "shipping" | "returns"
  capacity: number
  current_items: number
  temperature_controlled: boolean
  security_level: "low" | "medium" | "high"
  accessibility: "ground" | "elevated" | "automated"
  status: "active" | "inactive" | "maintenance"
}

interface InventoryByLocation {
  location_id: number
  location_name: string
  total_items: number
  total_value: number
  low_stock_items: number
  out_of_stock_items: number
  categories: {
    category_name: string
    item_count: number
    value: number
  }[]
}

export default function WarehouseManagementPage() {
  const [warehouses, setWarehouses] = useState<WarehouseLocation[]>([])
  const [inventoryByLocation, setInventoryByLocation] = useState<InventoryByLocation[]>([])
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseLocation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNewWarehouseDialog, setShowNewWarehouseDialog] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  // Filters
  const [filters, setFilters] = useState({
    search: "",
    type: "all",
    status: "all",
    zone_type: "all",
  })

  const { toast } = useToast()

  // Mock data for development
  const mockWarehouses: WarehouseLocation[] = [
    {
      id: 1,
      name: "Main Distribution Center",
      code: "MDC-001",
      type: "main",
      address: {
        street: "123 Industrial Way",
        city: "Nairobi",
        state: "Nairobi County",
        country: "Kenya",
        postal_code: "00100",
      },
      contact: {
        manager_name: "John Kamau",
        phone: "+254712345678",
        email: "john.kamau@mizizzi.com",
      },
      capacity: {
        total_space: 50000,
        used_space: 35000,
        available_space: 15000,
        max_items: 10000,
        current_items: 7500,
      },
      zones: [
        {
          id: 1,
          warehouse_id: 1,
          name: "Receiving Bay A",
          code: "RBA-001",
          type: "receiving",
          capacity: 500,
          current_items: 150,
          temperature_controlled: false,
          security_level: "medium",
          accessibility: "ground",
          status: "active",
        },
        {
          id: 2,
          warehouse_id: 1,
          name: "High Value Storage",
          code: "HVS-001",
          type: "storage",
          capacity: 1000,
          current_items: 850,
          temperature_controlled: true,
          security_level: "high",
          accessibility: "elevated",
          status: "active",
        },
        {
          id: 3,
          warehouse_id: 1,
          name: "General Storage A",
          code: "GSA-001",
          type: "storage",
          capacity: 5000,
          current_items: 4200,
          temperature_controlled: false,
          security_level: "medium",
          accessibility: "ground",
          status: "active",
        },
        {
          id: 4,
          warehouse_id: 1,
          name: "Picking Zone 1",
          code: "PZ1-001",
          type: "picking",
          capacity: 800,
          current_items: 600,
          temperature_controlled: false,
          security_level: "low",
          accessibility: "ground",
          status: "active",
        },
        {
          id: 5,
          warehouse_id: 1,
          name: "Shipping Dock B",
          code: "SDB-001",
          type: "shipping",
          capacity: 300,
          current_items: 120,
          temperature_controlled: false,
          security_level: "medium",
          accessibility: "ground",
          status: "active",
        },
      ],
      status: "active",
      features: ["Climate Control", "24/7 Security", "Loading Docks", "CCTV", "Fire Suppression"],
      operating_hours: {
        monday: "06:00 - 22:00",
        tuesday: "06:00 - 22:00",
        wednesday: "06:00 - 22:00",
        thursday: "06:00 - 22:00",
        friday: "06:00 - 22:00",
        saturday: "08:00 - 18:00",
        sunday: "10:00 - 16:00",
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 2,
      name: "Mombasa Coastal Hub",
      code: "MCH-002",
      type: "satellite",
      address: {
        street: "456 Port Road",
        city: "Mombasa",
        state: "Mombasa County",
        country: "Kenya",
        postal_code: "80100",
      },
      contact: {
        manager_name: "Sarah Otieno",
        phone: "+254723456789",
        email: "sarah.otieno@mizizzi.com",
      },
      capacity: {
        total_space: 25000,
        used_space: 18000,
        available_space: 7000,
        max_items: 5000,
        current_items: 3600,
      },
      zones: [
        {
          id: 6,
          warehouse_id: 2,
          name: "Coastal Storage",
          code: "CS-002",
          type: "storage",
          capacity: 3000,
          current_items: 2400,
          temperature_controlled: true,
          security_level: "high",
          accessibility: "ground",
          status: "active",
        },
        {
          id: 7,
          warehouse_id: 2,
          name: "Export Packing",
          code: "EP-002",
          type: "packing",
          capacity: 500,
          current_items: 300,
          temperature_controlled: false,
          security_level: "medium",
          accessibility: "ground",
          status: "active",
        },
      ],
      status: "active",
      features: ["Humidity Control", "Security", "Loading Docks", "Customs Office"],
      operating_hours: {
        monday: "07:00 - 19:00",
        tuesday: "07:00 - 19:00",
        wednesday: "07:00 - 19:00",
        thursday: "07:00 - 19:00",
        friday: "07:00 - 19:00",
        saturday: "08:00 - 16:00",
        sunday: "Closed",
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 3,
      name: "Kisumu Regional Center",
      code: "KRC-003",
      type: "storage",
      address: {
        street: "789 Lake View Avenue",
        city: "Kisumu",
        state: "Kisumu County",
        country: "Kenya",
        postal_code: "40100",
      },
      contact: {
        manager_name: "Peter Odhiambo",
        phone: "+254734567890",
        email: "peter.odhiambo@mizizzi.com",
      },
      capacity: {
        total_space: 15000,
        used_space: 8000,
        available_space: 7000,
        max_items: 3000,
        current_items: 1600,
      },
      zones: [
        {
          id: 8,
          warehouse_id: 3,
          name: "Regional Storage",
          code: "RS-003",
          type: "storage",
          capacity: 2000,
          current_items: 1200,
          temperature_controlled: false,
          security_level: "medium",
          accessibility: "ground",
          status: "active",
        },
      ],
      status: "maintenance",
      features: ["Basic Security", "Loading Dock"],
      operating_hours: {
        monday: "08:00 - 17:00",
        tuesday: "08:00 - 17:00",
        wednesday: "08:00 - 17:00",
        thursday: "08:00 - 17:00",
        friday: "08:00 - 17:00",
        saturday: "09:00 - 15:00",
        sunday: "Closed",
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  const mockInventoryByLocation: InventoryByLocation[] = [
    {
      location_id: 1,
      location_name: "Main Distribution Center",
      total_items: 7500,
      total_value: 750000,
      low_stock_items: 45,
      out_of_stock_items: 12,
      categories: [
        { category_name: "Electronics", item_count: 2500, value: 400000 },
        { category_name: "Clothing", item_count: 3000, value: 200000 },
        { category_name: "Home & Garden", item_count: 1500, value: 100000 },
        { category_name: "Sports", item_count: 500, value: 50000 },
      ],
    },
    {
      location_id: 2,
      location_name: "Mombasa Coastal Hub",
      total_items: 3600,
      total_value: 450000,
      low_stock_items: 28,
      out_of_stock_items: 8,
      categories: [
        { category_name: "Electronics", item_count: 1200, value: 240000 },
        { category_name: "Clothing", item_count: 1800, value: 150000 },
        { category_name: "Home & Garden", item_count: 600, value: 60000 },
      ],
    },
    {
      location_id: 3,
      location_name: "Kisumu Regional Center",
      total_items: 1600,
      total_value: 180000,
      low_stock_items: 15,
      out_of_stock_items: 5,
      categories: [
        { category_name: "Electronics", item_count: 600, value: 90000 },
        { category_name: "Clothing", item_count: 800, value: 70000 },
        { category_name: "Sports", item_count: 200, value: 20000 },
      ],
    },
  ]

  const fetchWarehouseData = async () => {
    try {
      setLoading(true)
      setError(null)

      // In a real implementation, you would call your API here
      // const [warehousesRes, inventoryRes] = await Promise.all([
      //   warehouseService.getWarehouses(filters),
      //   warehouseService.getInventoryByLocation()
      // ])

      // For now, using mock data
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setWarehouses(mockWarehouses)
      setInventoryByLocation(mockInventoryByLocation)
      if (!selectedWarehouse && mockWarehouses.length > 0) {
        setSelectedWarehouse(mockWarehouses[0])
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch warehouse data")
      toast({
        title: "Error",
        description: "Failed to fetch warehouse data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWarehouseData()
  }, [filters])

  const getWarehouseTypeIcon = (type: string) => {
    switch (type) {
      case "main":
        return <Building className="h-5 w-5 text-blue-500" />
      case "satellite":
        return <Warehouse className="h-5 w-5 text-green-500" />
      case "storage":
        return <Archive className="h-5 w-5 text-purple-500" />
      case "retail":
        return <Home className="h-5 w-5 text-orange-500" />
      default:
        return <Package className="h-5 w-5 text-gray-500" />
    }
  }

  const getZoneTypeIcon = (type: string) => {
    switch (type) {
      case "receiving":
        return <Upload className="h-4 w-4 text-blue-500" />
      case "storage":
        return <Archive className="h-4 w-4 text-green-500" />
      case "picking":
        return <PackageOpen className="h-4 w-4 text-orange-500" />
      case "packing":
        return <Box className="h-4 w-4 text-purple-500" />
      case "shipping":
        return <Truck className="h-4 w-4 text-red-500" />
      case "returns":
        return <RefreshCw className="h-4 w-4 text-gray-500" />
      default:
        return <Package className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "default",
      inactive: "secondary",
      maintenance: "outline",
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getCapacityColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-500"
    if (percentage >= 75) return "text-yellow-500"
    return "text-green-500"
  }

  if (loading && warehouses.length === 0) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Warehouse Management</h1>
            <p className="text-muted-foreground">Manage warehouse locations and zones</p>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  const totalCapacity = warehouses.reduce((sum, w) => sum + w.capacity.total_space, 0)
  const totalUsed = warehouses.reduce((sum, w) => sum + w.capacity.used_space, 0)
  const totalItems = inventoryByLocation.reduce((sum, inv) => sum + inv.total_items, 0)
  const totalValue = inventoryByLocation.reduce((sum, inv) => sum + inv.total_value, 0)

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Warehouse Management</h1>
          <p className="text-muted-foreground">Manage warehouse locations, zones, and capacity</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
          <Dialog open={showNewWarehouseDialog} onOpenChange={setShowNewWarehouseDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Warehouse
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Warehouse</DialogTitle>
                <DialogDescription>Create a new warehouse location for inventory management</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Warehouse Name</Label>
                  <Input placeholder="Enter warehouse name" />
                </div>
                <div>
                  <Label>Code</Label>
                  <Input placeholder="WHX-001" />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="main">Main Distribution Center</SelectItem>
                      <SelectItem value="satellite">Satellite Warehouse</SelectItem>
                      <SelectItem value="storage">Storage Facility</SelectItem>
                      <SelectItem value="retail">Retail Location</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select defaultValue="active">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Address</Label>
                  <Input placeholder="Street address" />
                </div>
                <div>
                  <Label>City</Label>
                  <Input placeholder="City" />
                </div>
                <div>
                  <Label>Postal Code</Label>
                  <Input placeholder="Postal code" />
                </div>
                <div>
                  <Label>Manager Name</Label>
                  <Input placeholder="Manager name" />
                </div>
                <div>
                  <Label>Contact Phone</Label>
                  <Input placeholder="+254..." />
                </div>
                <div>
                  <Label>Total Space (sq ft)</Label>
                  <Input type="number" placeholder="50000" />
                </div>
                <div>
                  <Label>Max Items</Label>
                  <Input type="number" placeholder="10000" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setShowNewWarehouseDialog(false)}>
                  Cancel
                </Button>
                <Button>Create Warehouse</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Warehouses</p>
                <p className="text-2xl font-bold">{warehouses.length}</p>
              </div>
              <Warehouse className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Space</p>
                <p className="text-2xl font-bold">{totalCapacity.toLocaleString()} sq ft</p>
                <p className="text-sm text-muted-foreground">
                  {((totalUsed / totalCapacity) * 100).toFixed(1)}% utilized
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{totalItems.toLocaleString()}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">KSh {totalValue.toLocaleString()}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Warehouse List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Warehouse Locations</CardTitle>
              <Button variant="outline" size="sm" onClick={fetchWarehouseData}>
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
            </div>
            <CardDescription>Manage your warehouse locations and monitor capacity</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search warehouses..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10"
                />
              </div>
              <Select value={filters.type} onValueChange={(value) => setFilters({ ...filters, type: value })}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="main">Main</SelectItem>
                  <SelectItem value="satellite">Satellite</SelectItem>
                  <SelectItem value="storage">Storage</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Warehouse Cards */}
            <div className="space-y-4">
              {warehouses
                .filter((warehouse) => {
                  const matchesSearch =
                    warehouse.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                    warehouse.code.toLowerCase().includes(filters.search.toLowerCase())
                  const matchesType = filters.type === "all" || warehouse.type === filters.type
                  const matchesStatus = filters.status === "all" || warehouse.status === filters.status
                  return matchesSearch && matchesType && matchesStatus
                })
                .map((warehouse) => {
                  const utilizationPercentage = (warehouse.capacity.used_space / warehouse.capacity.total_space) * 100
                  const itemUtilization = (warehouse.capacity.current_items / warehouse.capacity.max_items) * 100

                  return (
                    <div
                      key={warehouse.id}
                      className={cn(
                        "p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md",
                        selectedWarehouse?.id === warehouse.id
                          ? "border-primary bg-primary/5"
                          : "hover:border-primary/50",
                      )}
                      onClick={() => setSelectedWarehouse(warehouse)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {getWarehouseTypeIcon(warehouse.type)}
                          <div>
                            <h3 className="font-medium">{warehouse.name}</h3>
                            <p className="text-sm text-muted-foreground">{warehouse.code}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(warehouse.status)}
                          <Badge variant="outline" className="text-xs">
                            {warehouse.type}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Space Utilization</p>
                          <div className="flex items-center gap-2">
                            <Progress value={utilizationPercentage} className="flex-1" />
                            <span className={cn("text-sm font-medium", getCapacityColor(utilizationPercentage))}>
                              {utilizationPercentage.toFixed(1)}%
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {warehouse.capacity.used_space.toLocaleString()} /{" "}
                            {warehouse.capacity.total_space.toLocaleString()} sq ft
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Item Capacity</p>
                          <div className="flex items-center gap-2">
                            <Progress value={itemUtilization} className="flex-1" />
                            <span className={cn("text-sm font-medium", getCapacityColor(itemUtilization))}>
                              {itemUtilization.toFixed(1)}%
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {warehouse.capacity.current_items.toLocaleString()} /{" "}
                            {warehouse.capacity.max_items.toLocaleString()} items
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>
                            {warehouse.address.city}, {warehouse.address.country}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{warehouse.zones.length} zones</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>

        {/* Warehouse Details */}
        <Card>
          <CardHeader>
            <CardTitle>{selectedWarehouse ? selectedWarehouse.name : "Select Warehouse"}</CardTitle>
            <CardDescription>
              {selectedWarehouse ? "Warehouse details and zone information" : "Choose a warehouse to view details"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedWarehouse ? (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="zones">Zones</TabsTrigger>
                  <TabsTrigger value="inventory">Inventory</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Contact Information</h4>
                    <div className="space-y-2 text-sm">
                      {selectedWarehouse.contact.manager_name && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedWarehouse.contact.manager_name}</span>
                        </div>
                      )}
                      {selectedWarehouse.contact.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedWarehouse.contact.phone}</span>
                        </div>
                      )}
                      {selectedWarehouse.contact.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedWarehouse.contact.email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-2">Address</h4>
                    <div className="text-sm text-muted-foreground">
                      <p>{selectedWarehouse.address.street}</p>
                      <p>
                        {selectedWarehouse.address.city}, {selectedWarehouse.address.state}
                      </p>
                      <p>
                        {selectedWarehouse.address.country} {selectedWarehouse.address.postal_code}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-2">Features</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedWarehouse.features.map((feature, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-2">Operating Hours</h4>
                    <div className="space-y-1 text-sm">
                      {Object.entries(selectedWarehouse.operating_hours).map(([day, hours]) => (
                        <div key={day} className="flex justify-between">
                          <span className="capitalize">{day}:</span>
                          <span className="text-muted-foreground">{hours}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="zones" className="space-y-4">
                  <div className="space-y-3">
                    {selectedWarehouse.zones.map((zone) => {
                      const zoneUtilization = (zone.current_items / zone.capacity) * 100

                      return (
                        <div key={zone.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getZoneTypeIcon(zone.type)}
                              <div>
                                <h5 className="font-medium text-sm">{zone.name}</h5>
                                <p className="text-xs text-muted-foreground">{zone.code}</p>
                              </div>
                            </div>
                            {getStatusBadge(zone.status)}
                          </div>

                          <div className="mb-2">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span>Capacity</span>
                              <span>{zoneUtilization.toFixed(1)}%</span>
                            </div>
                            <Progress value={zoneUtilization} className="h-2" />
                            <p className="text-xs text-muted-foreground mt-1">
                              {zone.current_items} / {zone.capacity} items
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline" className="text-xs">
                              {zone.type}
                            </Badge>
                            {zone.temperature_controlled && (
                              <Badge variant="outline" className="text-xs">
                                Climate Control
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {zone.security_level} security
                            </Badge>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="inventory" className="space-y-4">
                  {(() => {
                    const warehouseInventory = inventoryByLocation.find(
                      (inv) => inv.location_id === selectedWarehouse.id,
                    )

                    if (!warehouseInventory) {
                      return (
                        <div className="text-center py-8">
                          <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-muted-foreground">No inventory data available</p>
                        </div>
                      )
                    }

                    return (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <p className="text-lg font-bold">{warehouseInventory.total_items.toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">Total Items</p>
                          </div>
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <p className="text-lg font-bold">KSh {warehouseInventory.total_value.toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">Total Value</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 border rounded-lg">
                            <p className="text-lg font-bold text-yellow-600">{warehouseInventory.low_stock_items}</p>
                            <p className="text-sm text-muted-foreground">Low Stock</p>
                          </div>
                          <div className="text-center p-3 border rounded-lg">
                            <p className="text-lg font-bold text-red-600">{warehouseInventory.out_of_stock_items}</p>
                            <p className="text-sm text-muted-foreground">Out of Stock</p>
                          </div>
                        </div>

                        <div>
                          <h5 className="font-medium mb-2">Inventory by Category</h5>
                          <div className="space-y-2">
                            {warehouseInventory.categories.map((category, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                                <span className="font-medium text-sm">{category.category_name}</span>
                                <div className="text-right">
                                  <p className="text-sm font-medium">{category.item_count} items</p>
                                  <p className="text-xs text-muted-foreground">KSh {category.value.toLocaleString()}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center py-8">
                <Warehouse className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-muted-foreground">Select a warehouse from the list to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
