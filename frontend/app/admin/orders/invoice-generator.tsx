"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { FileText, Plus, Trash2 } from "lucide-react"

interface InvoiceItem {
  id: string
  name: string
  sku: string
  quantity: number
  unitPrice: number
}

interface InvoiceGeneratorProps {
  orderId: string
  onGenerate?: (invoiceData: any) => void
}

export default function InvoiceGenerator({ orderId, onGenerate }: InvoiceGeneratorProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<InvoiceItem[]>([{ id: "1", name: "", sku: "", quantity: 1, unitPrice: 0 }])
  const [formData, setFormData] = useState({
    dueDate: "",
    taxRate: 16,
    shippingCost: 0,
    discount: 0,
    notes: "",
    paymentTerms: "30",
  })

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      name: "",
      sku: "",
      quantity: 1,
      unitPrice: 0,
    }
    setItems([...items, newItem])
  }

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id))
    }
  }

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  }

  const calculateTax = () => {
    return (calculateSubtotal() * formData.taxRate) / 100
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax() + formData.shippingCost - formData.discount
  }

  const handleGenerate = async () => {
    setLoading(true)
    try {
      // Validate required fields
      const hasValidItems = items.some((item) => item.name && item.unitPrice > 0)
      if (!hasValidItems) {
        toast({
          title: "Validation Error",
          description: "Please add at least one valid item",
          variant: "destructive",
        })
        return
      }

      // Generate invoice data
      const invoiceData = {
        orderId,
        items: items.filter((item) => item.name && item.unitPrice > 0),
        subtotal: calculateSubtotal(),
        tax: calculateTax(),
        taxRate: formData.taxRate,
        shipping: formData.shippingCost,
        discount: formData.discount,
        total: calculateTotal(),
        dueDate: formData.dueDate,
        notes: formData.notes,
        paymentTerms: formData.paymentTerms,
      }

      // In a real app, this would call an API to generate the invoice
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "Invoice Generated",
        description: "Invoice has been successfully generated",
      })

      onGenerate?.(invoiceData)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate invoice",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(amount)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Generate Invoice
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Invoice Items */}
        <div>
          <Label className="text-base font-medium">Invoice Items</Label>
          <div className="space-y-4 mt-2">
            {items.map((item, index) => (
              <div key={item.id} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4">
                  <Label htmlFor={`item-name-${item.id}`}>Item Name</Label>
                  <Input
                    id={`item-name-${item.id}`}
                    value={item.name}
                    onChange={(e) => updateItem(item.id, "name", e.target.value)}
                    placeholder="Product name"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor={`item-sku-${item.id}`}>SKU</Label>
                  <Input
                    id={`item-sku-${item.id}`}
                    value={item.sku}
                    onChange={(e) => updateItem(item.id, "sku", e.target.value)}
                    placeholder="SKU"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor={`item-qty-${item.id}`}>Quantity</Label>
                  <Input
                    id={`item-qty-${item.id}`}
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, "quantity", Number.parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="col-span-3">
                  <Label htmlFor={`item-price-${item.id}`}>Unit Price (KES)</Label>
                  <Input
                    id={`item-price-${item.id}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(item.id, "unitPrice", Number.parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="col-span-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addItem} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>

        {/* Invoice Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="due-date">Due Date</Label>
            <Input
              id="due-date"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="payment-terms">Payment Terms</Label>
            <Select
              value={formData.paymentTerms}
              onValueChange={(value) => setFormData({ ...formData, paymentTerms: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">Net 15</SelectItem>
                <SelectItem value="30">Net 30</SelectItem>
                <SelectItem value="45">Net 45</SelectItem>
                <SelectItem value="60">Net 60</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="tax-rate">Tax Rate (%)</Label>
            <Input
              id="tax-rate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.taxRate}
              onChange={(e) => setFormData({ ...formData, taxRate: Number.parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label htmlFor="shipping">Shipping Cost (KES)</Label>
            <Input
              id="shipping"
              type="number"
              min="0"
              step="0.01"
              value={formData.shippingCost}
              onChange={(e) => setFormData({ ...formData, shippingCost: Number.parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label htmlFor="discount">Discount (KES)</Label>
            <Input
              id="discount"
              type="number"
              min="0"
              step="0.01"
              value={formData.discount}
              onChange={(e) => setFormData({ ...formData, discount: Number.parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional notes or terms..."
            rows={3}
          />
        </div>

        {/* Invoice Summary */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-3">Invoice Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(calculateSubtotal())}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax ({formData.taxRate}%):</span>
              <span>{formatCurrency(calculateTax())}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping:</span>
              <span>{formatCurrency(formData.shippingCost)}</span>
            </div>
            {formData.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount:</span>
                <span>-{formatCurrency(formData.discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-medium text-base border-t pt-2">
              <span>Total:</span>
              <span>{formatCurrency(calculateTotal())}</span>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <Button onClick={handleGenerate} disabled={loading} className="w-full">
          {loading ? "Generating..." : "Generate Invoice"}
        </Button>
      </CardContent>
    </Card>
  )
}
