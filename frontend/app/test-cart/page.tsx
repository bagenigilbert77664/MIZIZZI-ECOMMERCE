"use client"

import { useState, useEffect } from "react"
import { useCart } from "@/contexts/cart/cart-context"
import { useAuth } from "@/contexts/auth/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  RotateCw,
  ClipboardList,
  CheckSquare,
  Clock,
  ArrowRight,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"

export default function TestCartPage() {
  const { isAuthenticated, user } = useAuth()
  const {
    items,
    itemCount,
    subtotal,
    total,
    isLoading,
    isUpdating,
    error,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    refreshCart,
  } = useCart()

  // Update the initial state to use a more generic product ID
  const [productId, setProductId] = useState(1) // Start with a simple ID, will be updated by search
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([1, 2, 3])
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info")
  const [testResults, setTestResults] = useState<{
    add: boolean | null
    update: boolean | null
    remove: boolean | null
    clear: boolean | null
  }>({
    add: null,
    update: null,
    remove: null,
    clear: null,
  })
  const [isRunningTests, setIsRunningTests] = useState(false)
  const [testProgress, setTestProgress] = useState(0)
  const [activeOperation, setActiveOperation] = useState<string | null>(null)
  const [testHistory, setTestHistory] = useState<
    Array<{
      operation: string
      status: "success" | "error" | "pending"
      timestamp: Date
      details: string
    }>
  >([])
  const [currentTestStep, setCurrentTestStep] = useState(0)
  const [quantity, setQuantity] = useState(1)

  // Add useEffect to search for products on component mount
  useEffect(() => {
    // Only search if authenticated
    if (isAuthenticated) {
      searchProducts()
    }
  }, [isAuthenticated]) // eslint-disable-line react-hooks/exhaustive-deps

  // Function to show a message with type
  const showMessage = (msg: string, type: "success" | "error" | "info" = "info") => {
    setMessage(msg)
    setMessageType(type)
    // Auto-clear success messages after 5 seconds
    if (type === "success") {
      setTimeout(() => {
        setMessage("")
      }, 5000)
    }
  }

  // Add to test history
  const addToTestHistory = (operation: string, status: "success" | "error" | "pending", details: string) => {
    setTestHistory((prev) => [
      {
        operation,
        status,
        timestamp: new Date(),
        details,
      },
      ...prev.slice(0, 19), // Keep only the last 20 entries
    ])
  }

  // Individual operation handlers
  const handleAddToCart = async () => {
    setActiveOperation("add")
    showMessage(`Adding product ID ${productId} with quantity ${quantity} to cart...`, "info")
    addToTestHistory("Add to Cart", "pending", `Product ID: ${productId}, Quantity: ${quantity}`)

    try {
      const success = await addToCart(productId, quantity)
      if (success) {
        showMessage(`Successfully added product ID ${productId} to cart!`, "success")
        addToTestHistory("Add to Cart", "success", `Product ID: ${productId}, Quantity: ${quantity}`)
        return true
      } else {
        showMessage("Failed to add to cart.", "error")
        addToTestHistory("Add to Cart", "error", `Product ID: ${productId}, Quantity: ${quantity}`)
        return false
      }
    } catch (error) {
      console.error("Error adding to cart:", error)
      showMessage("Error adding to cart: " + (error as Error).message, "error")
      addToTestHistory("Add to Cart", "error", `Error: ${(error as Error).message}`)
      return false
    } finally {
      setActiveOperation(null)
    }
  }

  const handleUpdateQuantity = async (itemId: number, newQuantity: number) => {
    setActiveOperation("update")
    showMessage(`Updating item ${itemId} quantity to ${newQuantity}...`, "info")
    addToTestHistory("Update Quantity", "pending", `Item ID: ${itemId}, New Quantity: ${newQuantity}`)

    try {
      const success = await updateQuantity(itemId, newQuantity)
      if (success) {
        showMessage(`Successfully updated quantity to ${newQuantity}!`, "success")
        addToTestHistory("Update Quantity", "success", `Item ID: ${itemId}, New Quantity: ${newQuantity}`)
        return true
      } else {
        showMessage("Failed to update quantity.", "error")
        addToTestHistory("Update Quantity", "error", `Item ID: ${itemId}, New Quantity: ${newQuantity}`)
        return false
      }
    } catch (error) {
      console.error("Error updating quantity:", error)
      showMessage("Error updating quantity: " + (error as Error).message, "error")
      addToTestHistory("Update Quantity", "error", `Error: ${(error as Error).message}`)
      return false
    } finally {
      setActiveOperation(null)
    }
  }

  const handleRemoveItem = async (itemId: number) => {
    setActiveOperation("remove")
    showMessage(`Removing item ${itemId} from cart...`, "info")
    addToTestHistory("Remove Item", "pending", `Item ID: ${itemId}`)

    try {
      const success = await removeItem(itemId)
      if (success) {
        showMessage("Successfully removed item from cart!", "success")
        addToTestHistory("Remove Item", "success", `Item ID: ${itemId}`)
        return true
      } else {
        showMessage("Failed to remove item.", "error")
        addToTestHistory("Remove Item", "error", `Item ID: ${itemId}`)
        return false
      }
    } catch (error) {
      console.error("Error removing item:", error)
      showMessage("Error removing item: " + (error as Error).message, "error")
      addToTestHistory("Remove Item", "error", `Error: ${(error as Error).message}`)
      return false
    } finally {
      setActiveOperation(null)
    }
  }

  const handleClearCart = async () => {
    setActiveOperation("clear")
    showMessage("Clearing cart...", "info")
    addToTestHistory("Clear Cart", "pending", `Removing all items`)

    try {
      const success = await clearCart()
      if (success) {
        showMessage("Successfully cleared cart!", "success")
        addToTestHistory("Clear Cart", "success", `All items removed`)
        return true
      } else {
        showMessage("Failed to clear cart.", "error")
        addToTestHistory("Clear Cart", "error", `Failed to clear cart`)
        return false
      }
    } catch (error) {
      console.error("Error clearing cart:", error)
      showMessage("Error clearing cart: " + (error as Error).message, "error")
      addToTestHistory("Clear Cart", "error", `Error: ${(error as Error).message}`)
      return false
    } finally {
      setActiveOperation(null)
    }
  }

  const handleRefreshCart = async () => {
    setActiveOperation("refresh")
    showMessage("Refreshing cart...", "info")
    addToTestHistory("Refresh Cart", "pending", `Fetching latest cart data`)

    try {
      await refreshCart()
      showMessage("Cart refreshed successfully!", "success")
      addToTestHistory("Refresh Cart", "success", `Cart data refreshed`)
    } catch (error) {
      console.error("Error refreshing cart:", error)
      showMessage("Error refreshing cart: " + (error as Error).message, "error")
      addToTestHistory("Refresh Cart", "error", `Error: ${(error as Error).message}`)
    } finally {
      setActiveOperation(null)
    }
  }

  // Comprehensive test suite
  const runAllTests = async () => {
    if (!isAuthenticated) {
      showMessage("You need to be logged in to run tests.", "error")
      return
    }

    setIsRunningTests(true)
    setTestResults({
      add: null,
      update: null,
      remove: null,
      clear: null,
    })
    setTestProgress(0)
    setCurrentTestStep(0)

    try {
      // Step 1: Clear the cart to start with a clean slate
      setCurrentTestStep(1)
      showMessage("STEP 1: Clearing cart to start tests...", "info")
      addToTestHistory("Test Suite", "pending", `Step 1: Clearing cart to start tests`)
      await clearCart()
      setTestProgress(20)

      // Add a refresh and delay to ensure cart is cleared
      await refreshCart()
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Step 2: Add an item to the cart
      setCurrentTestStep(2)
      const testProductId = productId // Use the current product ID from the form
      showMessage(`STEP 2: Testing add to cart...\nAdding product ID ${testProductId} with quantity 2`, "info")
      addToTestHistory("Test Suite", "pending", `Step 2: Adding product ID ${testProductId} to cart`)

      // Add more detailed logging
      console.log("Before adding to cart - current items:", items)

      const addResult = await addToCart(testProductId, 2)
      setTestResults((prev) => ({ ...prev, add: addResult }))
      setTestProgress(40)

      if (!addResult) {
        throw new Error("Add to cart test failed. Stopping tests.")
      }

      // Wait longer for the cart to update and explicitly refresh
      await refreshCart()
      await new Promise((resolve) => setTimeout(resolve, 2000))
      await refreshCart() // Refresh again to be sure

      console.log("After adding to cart - current items:", items)

      // Check if items were actually added
      if (items.length === 0) {
        throw new Error(
          "Add to cart appeared to succeed, but no items were found in the cart. Check the product ID and API.",
        )
      }

      // Step 3: Update the quantity of the item
      setCurrentTestStep(3)
      if (items.length > 0) {
        const itemId = items[0].id
        showMessage(`STEP 3: Testing update quantity...\nUpdating item ${itemId} quantity to 3`, "info")
        addToTestHistory("Test Suite", "pending", `Step 3: Updating item ${itemId} quantity to 3`)
        const updateResult = await updateQuantity(itemId, 3)
        setTestResults((prev) => ({ ...prev, update: updateResult }))
        setTestProgress(60)

        if (!updateResult) {
          throw new Error("Update quantity test failed. Stopping tests.")
        }

        // Wait for the cart to update
        await refreshCart()
        await new Promise((resolve) => setTimeout(resolve, 1500))

        // Step 4: Remove the item from the cart
        setCurrentTestStep(4)
        showMessage(`STEP 4: Testing remove item...\nRemoving item ${itemId} from cart`, "info")
        addToTestHistory("Test Suite", "pending", `Step 4: Removing item ${itemId} from cart`)
        const removeResult = await removeItem(itemId)
        setTestResults((prev) => ({ ...prev, remove: removeResult }))
        setTestProgress(80)

        if (!removeResult) {
          throw new Error("Remove item test failed. Stopping tests.")
        }
      } else {
        setTestResults((prev) => ({ ...prev, update: false }))
        throw new Error("No items in cart to update. Update test failed. Check if the product was actually added.")
      }

      // Wait for the cart to update
      await refreshCart()
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Step 5: Add an item and then clear the cart
      setCurrentTestStep(5)
      showMessage(
        `STEP 5: Testing clear cart...\nAdding product ID ${testProductId} with quantity 1 and then clearing cart`,
        "info",
      )
      addToTestHistory("Test Suite", "pending", `Step 5: Testing clear cart`)
      await addToCart(testProductId, 1)

      // Wait for the cart to update
      await refreshCart()
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const clearResult = await clearCart()
      setTestResults((prev) => ({ ...prev, clear: clearResult }))
      setTestProgress(100)

      if (!clearResult) {
        throw new Error("Clear cart test failed.")
      }

      // All tests passed
      addToTestHistory("Test Suite", "success", `All tests completed successfully!`)
      showMessage(
        "All tests completed successfully! 🎉\n\nSummary:\n✅ Add to Cart: Passed\n✅ Update Quantity: Passed\n✅ Remove Item: Passed\n✅ Clear Cart: Passed",
        "success",
      )
    } catch (error) {
      console.error("Test suite error:", error)
      let errorMessage = "Test suite error: " + (error as Error).message

      // Add summary of what passed and failed
      errorMessage += "\n\nTest Summary:"
      errorMessage +=
        "\n" + (testResults.add ? "✅" : "❌") + " Add to Cart: " + (testResults.add ? "Passed" : "Failed")
      errorMessage +=
        "\n" +
        (testResults.update === null ? "⏸️" : testResults.update ? "✅" : "❌") +
        " Update Quantity: " +
        (testResults.update === null ? "Not Run" : testResults.update ? "Passed" : "Failed")
      errorMessage +=
        "\n" +
        (testResults.remove === null ? "⏸️" : testResults.remove ? "✅" : "❌") +
        " Remove Item: " +
        (testResults.remove === null ? "Not Run" : testResults.remove ? "Passed" : "Failed")
      errorMessage +=
        "\n" +
        (testResults.clear === null ? "⏸️" : testResults.clear ? "✅" : "❌") +
        " Clear Cart: " +
        (testResults.clear === null ? "Not Run" : testResults.clear ? "Passed" : "Failed")

      addToTestHistory("Test Suite", "error", errorMessage)
      showMessage(errorMessage, "error")
    } finally {
      setIsRunningTests(false)
      setCurrentTestStep(0)
    }
  }

  // Add a new function to test just the add to cart functionality
  const testAddToCartOnly = async () => {
    if (!isAuthenticated) {
      showMessage("You need to be logged in to run tests.", "error")
      return
    }

    setActiveOperation("test-add")
    showMessage(`Testing add to cart only...\nAdding product ID ${productId} with quantity 1`, "info")
    addToTestHistory("Single Test", "pending", `Testing add to cart for product ID: ${productId}`)

    try {
      // Clear cart first to start fresh
      await clearCart()
      await refreshCart()
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Log the current state
      console.log("Before adding - Cart items:", items)

      // Try to add the product
      const success = await addToCart(productId, 1)

      // Refresh and wait
      await refreshCart()
      await new Promise((resolve) => setTimeout(resolve, 2000))
      await refreshCart() // Double refresh to be sure

      // Log the after state
      console.log("After adding - Cart items:", items)

      if (success && items.length > 0) {
        showMessage(`Successfully added product ID ${productId} to cart and verified it exists!`, "success")
        addToTestHistory("Single Test", "success", `Product ID: ${productId} was added successfully`)
      } else if (success) {
        showMessage(`API reported success but no items found in cart. Check product ID ${productId}.`, "error")
        addToTestHistory("Single Test", "error", `API reported success but cart is empty`)
      } else {
        showMessage(`Failed to add product ID ${productId} to cart.`, "error")
        addToTestHistory("Single Test", "error", `Failed to add product ID: ${productId}`)
      }
    } catch (error) {
      console.error("Test error:", error)
      showMessage("Error during test: " + (error as Error).message, "error")
      addToTestHistory("Single Test", "error", `Error: ${(error as Error).message}`)
    } finally {
      setActiveOperation(null)
    }
  }

  // Add a new function to verify product exists
  const verifyProductExists = async () => {
    setActiveOperation("verify-product")
    showMessage(`Verifying product ID ${productId} exists...`, "info")
    addToTestHistory("Verification", "pending", `Checking if product ID: ${productId} exists`)

    try {
      // Use the Flask backend API URL instead of the Next.js API route
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
      const response = await fetch(`${apiUrl}/api/products/${productId}`)

      if (response.ok) {
        const product = await response.json()
        showMessage(
          `Product verified! Name: ${product.name || product.title}, Price: $${(product.price || 0).toFixed(2)}`,
          "success",
        )
        addToTestHistory("Verification", "success", `Product exists: ${product.name || product.title}`)
      } else {
        showMessage(`Product ID ${productId} not found. Please use a valid product ID.`, "error")
        addToTestHistory("Verification", "error", `Product ID ${productId} not found`)
      }
    } catch (error) {
      console.error("Verification error:", error)
      showMessage("Error verifying product: " + (error as Error).message, "error")
      addToTestHistory("Verification", "error", `Error: ${(error as Error).message}`)
    } finally {
      setActiveOperation(null)
    }
  }

  // Add a function to search for products
  const searchProducts = async () => {
    setActiveOperation("search-products")
    showMessage("Searching for available products...", "info")
    addToTestHistory("Search", "pending", "Fetching product list")

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
      const response = await fetch(`${apiUrl}/api/products?limit=5`)

      if (response.ok) {
        const products = await response.json()
        if (Array.isArray(products) && products.length > 0) {
          // Update the default product ID to the first one found
          const firstProduct = products[0]
          setProductId(firstProduct.id)

          // Create a list of product IDs for batch operations
          const productIds = products.map((p) => p.id).slice(0, 3)
          setSelectedProductIds(productIds)

          // Show success message with available products
          const productList = products
            .map((p) => `ID: ${p.id} - ${p.name || p.title} - $${(p.price || 0).toFixed(2)}`)
            .join("\n")

          showMessage(`Found ${products.length} products:\n${productList}`, "success")
          addToTestHistory("Search", "success", `Found ${products.length} products`)
        } else {
          showMessage("No products found in the database.", "error")
          addToTestHistory("Search", "error", "No products found")
        }
      } else {
        showMessage("Failed to fetch products. Check API connection.", "error")
        addToTestHistory("Search", "error", "API request failed")
      }
    } catch (error) {
      console.error("Search error:", error)
      showMessage("Error searching products: " + (error as Error).message, "error")
      addToTestHistory("Search", "error", `Error: ${(error as Error).message}`)
    } finally {
      setActiveOperation(null)
    }
  }

  // Batch operations
  const addMultipleProducts = async () => {
    setActiveOperation("batch-add")
    showMessage(`Adding multiple products to cart...`, "info")

    try {
      let allSuccess = true
      for (const pid of selectedProductIds) {
        addToTestHistory("Batch Add", "pending", `Adding product ID: ${pid}`)
        const success = await addToCart(pid, 1)
        if (!success) {
          allSuccess = false
          addToTestHistory("Batch Add", "error", `Failed to add product ID: ${pid}`)
        } else {
          addToTestHistory("Batch Add", "success", `Added product ID: ${pid}`)
        }
        // Small delay between operations
        await new Promise((resolve) => setTimeout(resolve, 300))
      }

      if (allSuccess) {
        showMessage(`Successfully added all products to cart!`, "success")
      } else {
        showMessage(`Some products could not be added to cart.`, "error")
      }
    } catch (error) {
      console.error("Error in batch add:", error)
      showMessage("Error adding multiple products: " + (error as Error).message, "error")
    } finally {
      setActiveOperation(null)
    }
  }

  // Format timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Cart Testing Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive testing for cart operations</p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={isAuthenticated ? "default" : "default"} className="px-3 py-1">
            {isAuthenticated ? "Authenticated" : "Not Authenticated"}
          </Badge>

          {user && (
            <Badge variant="outline" className="px-3 py-1">
              User ID: {user.id}
            </Badge>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshCart}
            disabled={isUpdating || activeOperation !== null}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${activeOperation === "refresh" ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="manual" className="mb-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="manual">Manual Testing</TabsTrigger>
          <TabsTrigger value="automated">Automated Testing</TabsTrigger>
          <TabsTrigger value="history">Test History</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Cart Operations
                  </CardTitle>
                  <CardDescription>Test individual cart operations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Add to Cart Section */}
                    <div className="border rounded-lg p-4 relative">
                      <div className="absolute top-0 right-0 -mt-2 -mr-2">
                        <Badge variant="outline" className={`${activeOperation === "add" ? "bg-blue-100" : ""}`}>
                          {activeOperation === "add" ? "Running..." : "Add"}
                        </Badge>
                      </div>
                      <h3 className="font-medium text-lg mb-3 flex items-center">
                        <Plus className="w-4 h-4 mr-2" />
                        Add to Cart
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Product ID</label>
                          <Input
                            type="number"
                            value={productId}
                            onChange={(e) => setProductId(Number(e.target.value))}
                            min="1"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Quantity</label>
                          <Input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                            min="1"
                          />
                        </div>
                        <Button
                          onClick={handleAddToCart}
                          disabled={isUpdating || !isAuthenticated || activeOperation !== null}
                          className="w-full"
                        >
                          {activeOperation === "add" ? (
                            <>
                              <RotateCw className="w-4 h-4 mr-2 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-2" />
                              Add to Cart
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <Button
                          onClick={testAddToCartOnly}
                          disabled={isUpdating || !isAuthenticated || activeOperation !== null}
                          variant="outline"
                          size="sm"
                        >
                          {activeOperation === "test-add" ? (
                            <>
                              <RotateCw className="w-4 h-4 mr-2 animate-spin" />
                              Testing...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Test Add Only
                            </>
                          )}
                        </Button>

                        <Button
                          onClick={verifyProductExists}
                          disabled={isUpdating || activeOperation !== null}
                          variant="outline"
                          size="sm"
                        >
                          {activeOperation === "verify-product" ? (
                            <>
                              <RotateCw className="w-4 h-4 mr-2 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-4 h-4 mr-2" />
                              Verify Product
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Batch Operations */}
                    <div className="border rounded-lg p-4 relative">
                      <div className="absolute top-0 right-0 -mt-2 -mr-2">
                        <Badge variant="outline" className={`${activeOperation === "batch-add" ? "bg-blue-100" : ""}`}>
                          {activeOperation === "batch-add" ? "Running..." : "Batch"}
                        </Badge>
                      </div>
                      <h3 className="font-medium text-lg mb-3 flex items-center">
                        <ClipboardList className="w-4 h-4 mr-2" />
                        Batch Operations
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Product IDs (comma separated)</label>
                          <Input
                            value={selectedProductIds.join(", ")}
                            onChange={(e) => {
                              const ids = e.target.value
                                .split(",")
                                .map((id) => Number.parseInt(id.trim()))
                                .filter((id) => !isNaN(id))
                              setSelectedProductIds(ids)
                            }}
                            placeholder="e.g. 1548, 1549, 1550"
                          />
                        </div>
                        <Button
                          onClick={addMultipleProducts}
                          disabled={
                            isUpdating ||
                            !isAuthenticated ||
                            activeOperation !== null ||
                            selectedProductIds.length === 0
                          }
                          className="w-full"
                        >
                          {activeOperation === "batch-add" ? (
                            <>
                              <RotateCw className="w-4 h-4 mr-2 animate-spin" />
                              Adding Multiple...
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-2" />
                              Add Multiple Products
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Clear Cart */}
                    <div className="border rounded-lg p-4 relative">
                      <div className="absolute top-0 right-0 -mt-2 -mr-2">
                        <Badge variant="outline" className={`${activeOperation === "clear" ? "bg-blue-100" : ""}`}>
                          {activeOperation === "clear" ? "Running..." : "Clear"}
                        </Badge>
                      </div>
                      <h3 className="font-medium text-lg mb-3 flex items-center">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Clear Cart
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">Remove all items from your cart at once.</p>
                      <Button
                        onClick={handleClearCart}
                        disabled={isUpdating || !isAuthenticated || itemCount === 0 || activeOperation !== null}
                        variant="outline"
                        className="w-full"
                      >
                        {activeOperation === "clear" ? (
                          <>
                            <RotateCw className="w-4 h-4 mr-2 animate-spin" />
                            Clearing...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Clear Cart
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Cart Status
                  </CardTitle>
                  <CardDescription>Current cart information</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <RotateCw className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-muted rounded-lg p-3 text-center">
                          <p className="text-sm text-muted-foreground">Items</p>
                          <p className="text-2xl font-bold">{itemCount}</p>
                        </div>
                        <div className="bg-muted rounded-lg p-3 text-center">
                          <p className="text-sm text-muted-foreground">Total</p>
                          <p className="text-2xl font-bold">${total.toFixed(2)}</p>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <p className="text-sm font-medium mb-1">Subtotal</p>
                        <p className="text-lg">${subtotal.toFixed(2)}</p>
                      </div>

                      {error && (
                        <Alert variant="default">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Error</AlertTitle>
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Cart Items
                  </CardTitle>
                  <CardDescription>Items currently in your cart</CardDescription>
                </CardHeader>
                <CardContent className="max-h-[400px] overflow-y-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <RotateCw className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : items.length === 0 ? (
                    <div className="text-center py-8">
                      <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-lg font-medium">Your cart is empty</p>
                      <p className="text-muted-foreground">Add some products to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-12 gap-4 font-medium text-sm text-muted-foreground border-b pb-2">
                        <div className="col-span-5">Product</div>
                        <div className="col-span-2 text-center">Price</div>
                        <div className="col-span-2 text-center">Quantity</div>
                        <div className="col-span-2 text-center">Total</div>
                        <div className="col-span-1 text-right">Actions</div>
                      </div>

                      {items.map((item) => (
                        <div key={item.id} className="grid grid-cols-12 gap-4 items-center border-b pb-4">
                          <div className="col-span-5">
                            <div className="flex items-center gap-3">
                              {item.product.thumbnail_url ? (
                                <img
                                  src={item.product.thumbnail_url || "/placeholder.svg"}
                                  alt={item.product.name}
                                  className="w-12 h-12 object-cover rounded-md"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                                  <ShoppingCart className="w-6 h-6 text-muted-foreground" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium">{item.product.name}</p>
                                <p className="text-sm text-muted-foreground">ID: {item.product_id}</p>
                              </div>
                            </div>
                          </div>
                          <div className="col-span-2 text-center">${item.price.toFixed(2)}</div>
                          <div className="col-span-2">
                            <div className="flex items-center justify-center">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                disabled={isUpdating || activeOperation !== null}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="mx-2 w-8 text-center">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                disabled={isUpdating || activeOperation !== null}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="col-span-2 text-center font-medium">${item.total.toFixed(2)}</div>
                          <div className="col-span-1 text-right">
                            <Button
                              variant="default"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleRemoveItem(item.id)}
                              disabled={isUpdating || activeOperation !== null}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="automated" className="mt-4">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <RotateCw className="w-5 h-5 mr-2" />
                  Automated Test Suite
                </CardTitle>
                <CardDescription>Run all cart tests automatically</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <p>This will test all cart operations in sequence:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                      <div
                        className={`p-3 rounded-md border flex flex-col items-center ${currentTestStep === 1 ? "bg-blue-50 border-blue-200" : currentTestStep > 1 ? "bg-green-50 border-green-200" : "bg-muted"}`}
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2 border">
                          {currentTestStep > 1 ? (
                            <CheckSquare className="w-4 h-4 text-green-600" />
                          ) : currentTestStep === 1 ? (
                            <Clock className="w-4 h-4 text-blue-600 animate-pulse" />
                          ) : (
                            <span className="text-sm font-medium">1</span>
                          )}
                        </div>
                        <p className="text-xs text-center font-medium">Clear Cart</p>
                        <p className="text-xs text-center text-muted-foreground">(Preparation)</p>
                      </div>

                      <div className="flex items-center justify-center">
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>

                      <div
                        className={`p-3 rounded-md border flex flex-col items-center ${currentTestStep === 2 ? "bg-blue-50 border-blue-200" : currentTestStep > 2 ? "bg-green-50 border-green-200" : "bg-muted"}`}
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2 border">
                          {currentTestStep > 2 ? (
                            <CheckSquare className="w-4 h-4 text-green-600" />
                          ) : currentTestStep === 2 ? (
                            <Clock className="w-4 h-4 text-blue-600 animate-pulse" />
                          ) : (
                            <span className="text-sm font-medium">2</span>
                          )}
                        </div>
                        <p className="text-xs text-center font-medium">Add Item</p>
                        <p className="text-xs text-center text-muted-foreground">(To Cart)</p>
                      </div>

                      <div className="flex items-center justify-center">
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>

                      <div
                        className={`p-3 rounded-md border flex flex-col items-center ${currentTestStep === 3 ? "bg-blue-50 border-blue-200" : currentTestStep > 3 ? "bg-green-50 border-green-200" : "bg-muted"}`}
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2 border">
                          {currentTestStep > 3 ? (
                            <CheckSquare className="w-4 h-4 text-green-600" />
                          ) : currentTestStep === 3 ? (
                            <Clock className="w-4 h-4 text-blue-600 animate-pulse" />
                          ) : (
                            <span className="text-sm font-medium">3</span>
                          )}
                        </div>
                        <p className="text-xs text-center font-medium">Update Quantity</p>
                        <p className="text-xs text-center text-muted-foreground">(Change Amount)</p>
                      </div>

                      <div className="flex items-center justify-center">
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>

                      <div
                        className={`p-3 rounded-md border flex flex-col items-center ${currentTestStep === 4 ? "bg-blue-50 border-blue-200" : currentTestStep > 4 ? "bg-green-50 border-green-200" : "bg-muted"}`}
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2 border">
                          {currentTestStep > 4 ? (
                            <CheckSquare className="w-4 h-4 text-green-600" />
                          ) : currentTestStep === 4 ? (
                            <Clock className="w-4 h-4 text-blue-600 animate-pulse" />
                          ) : (
                            <span className="text-sm font-medium">4</span>
                          )}
                        </div>
                        <p className="text-xs text-center font-medium">Remove Item</p>
                        <p className="text-xs text-center text-muted-foreground">(From Cart)</p>
                      </div>

                      <div className="flex items-center justify-center">
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>

                      <div
                        className={`p-3 rounded-md border flex flex-col items-center ${currentTestStep === 5 ? "bg-blue-50 border-blue-200" : currentTestStep > 5 ? "bg-green-50 border-green-200" : "bg-muted"}`}
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2 border">
                          {currentTestStep > 5 ? (
                            <CheckSquare className="w-4 h-4 text-green-600" />
                          ) : currentTestStep === 5 ? (
                            <Clock className="w-4 h-4 text-blue-600 animate-pulse" />
                          ) : (
                            <span className="text-sm font-medium">5</span>
                          )}
                        </div>
                        <p className="text-xs text-center font-medium">Clear Cart</p>
                        <p className="text-xs text-center text-muted-foreground">(Final Test)</p>
                      </div>
                    </div>
                  </div>

                  {isRunningTests && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Test Progress</span>
                        <span>{testProgress}%</span>
                      </div>
                      <Progress value={testProgress} className="h-2" />
                    </div>
                  )}

                  {!isAuthenticated && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Authentication Required</AlertTitle>
                      <AlertDescription>You need to be logged in to run the automated tests.</AlertDescription>
                    </Alert>
                  )}

                  {testResults.add !== null && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">Test Results:</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className={`p-4 rounded-md ${testResults.add ? "bg-green-100" : "bg-red-100"}`}>
                          <p className="font-medium flex items-center">
                            {testResults.add ? (
                              <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                            ) : (
                              <AlertCircle className="w-5 h-5 mr-2 text-red-600" />
                            )}
                            Add to Cart: {testResults.add ? "Passed" : "Failed"}
                          </p>
                        </div>

                        <div
                          className={`p-4 rounded-md ${
                            testResults.update === null
                              ? "bg-gray-100"
                              : testResults.update
                                ? "bg-green-100"
                                : "bg-red-100"
                          }`}
                        >
                          <p className="font-medium flex items-center">
                            {testResults.update === null ? (
                              <span className="w-5 h-5 mr-2" />
                            ) : testResults.update ? (
                              <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                            ) : (
                              <AlertCircle className="w-5 h-5 mr-2 text-red-600" />
                            )}
                            Update Quantity:{" "}
                            {testResults.update === null ? "Not Run" : testResults.update ? "Passed" : "Failed"}
                          </p>
                        </div>

                        <div
                          className={`p-4 rounded-md ${
                            testResults.remove === null
                              ? "bg-gray-100"
                              : testResults.remove
                                ? "bg-green-100"
                                : "bg-red-100"
                          }`}
                        >
                          <p className="font-medium flex items-center">
                            {testResults.remove === null ? (
                              <span className="w-5 h-5 mr-2" />
                            ) : testResults.remove ? (
                              <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                            ) : (
                              <AlertCircle className="w-5 h-5 mr-2 text-red-600" />
                            )}
                            Remove Item:{" "}
                            {testResults.remove === null ? "Not Run" : testResults.remove ? "Passed" : "Failed"}
                          </p>
                        </div>

                        <div
                          className={`p-4 rounded-md ${
                            testResults.clear === null
                              ? "bg-gray-100"
                              : testResults.clear
                                ? "bg-green-100"
                                : "bg-red-100"
                          }`}
                        >
                          <p className="font-medium flex items-center">
                            {testResults.clear === null ? (
                              <span className="w-5 h-5 mr-2" />
                            ) : testResults.clear ? (
                              <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                            ) : (
                              <AlertCircle className="w-5 h-5 mr-2 text-red-600" />
                            )}
                            Clear Cart:{" "}
                            {testResults.clear === null ? "Not Run" : testResults.clear ? "Passed" : "Failed"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Debugging Information */}
                  <div className="mt-6 border rounded-lg p-4">
                    <h3 className="font-semibold text-lg mb-3">Debugging Information</h3>

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium">Current Product ID for Testing:</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            type="number"
                            value={productId}
                            onChange={(e) => setProductId(Number(e.target.value))}
                            className="max-w-[200px]"
                          />
                          <Button
                            onClick={verifyProductExists}
                            disabled={isUpdating || activeOperation !== null}
                            variant="outline"
                            size="sm"
                          >
                            Verify
                          </Button>
                          <Button
                            onClick={searchProducts}
                            disabled={isUpdating || activeOperation !== null}
                            variant="outline"
                            size="sm"
                          >
                            Search Products
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Make sure this product ID exists in your database
                        </p>
                      </div>

                      <div>
                        <p className="text-sm font-medium">Test Options:</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <Button
                            onClick={testAddToCartOnly}
                            disabled={isUpdating || !isAuthenticated || activeOperation !== null}
                            variant="outline"
                            size="sm"
                          >
                            Test Add Only
                          </Button>

                          <Button
                            onClick={handleRefreshCart}
                            disabled={isUpdating || activeOperation !== null}
                            variant="outline"
                            size="sm"
                          >
                            Refresh Cart
                          </Button>

                          <Button
                            onClick={handleClearCart}
                            disabled={isUpdating || !isAuthenticated || activeOperation !== null || itemCount === 0}
                            variant="outline"
                            size="sm"
                          >
                            Clear Cart
                          </Button>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium">Cart Status:</p>
                        <div className="bg-muted p-2 rounded text-sm mt-1">
                          <p>Items in cart: {itemCount}</p>
                          <p>Is loading: {isLoading ? "Yes" : "No"}</p>
                          <p>Is updating: {isUpdating ? "Yes" : "No"}</p>
                          <p>Active operation: {activeOperation || "None"}</p>
                          <p>API URL: {process.env.NEXT_PUBLIC_API_URL || "Not set (using default)"}</p>
                          {error && <p className="text-red-500">Error: {error}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={runAllTests}
                  disabled={isRunningTests || !isAuthenticated || activeOperation !== null}
                  className="w-full"
                >
                  {isRunningTests ? (
                    <>
                      <RotateCw className="w-4 h-4 mr-2 animate-spin" />
                      Running Tests...
                    </>
                  ) : (
                    <>
                      <RotateCw className="w-4 h-4 mr-2" />
                      Run All Tests
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ClipboardList className="w-5 h-5 mr-2" />
                Test History
              </CardTitle>
              <CardDescription>Log of all cart operations</CardDescription>
            </CardHeader>
            <CardContent className="max-h-[500px] overflow-y-auto">
              {testHistory.length === 0 ? (
                <div className="text-center py-8">
                  <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No test history yet</p>
                  <p className="text-muted-foreground">Run some tests to see the history</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {testHistory.map((entry, index) => (
                    <div key={index} className="border-b pb-3 last:border-0">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center">
                          {entry.status === "success" && <CheckCircle className="w-4 h-4 text-green-600 mr-2" />}
                          {entry.status === "error" && <AlertCircle className="w-4 h-4 text-red-600 mr-2" />}
                          {entry.status === "pending" && <Clock className="w-4 h-4 text-blue-600 mr-2" />}
                          <span className="font-medium">{entry.operation}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {formatTime(entry.timestamp)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{entry.details}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {message && (
        <Alert
          variant={messageType === "error" ? "default" : messageType === "success" ? "default" : "default"}
          className={`mt-6 ${messageType === "success" ? "bg-green-50 border-green-200 text-green-800" : ""}`}
        >
          {messageType === "error" && <AlertCircle className="h-4 w-4" />}
          {messageType === "success" && <CheckCircle className="h-4 w-4" />}
          <AlertTitle>{messageType === "error" ? "Error" : messageType === "success" ? "Success" : "Info"}</AlertTitle>
          <AlertDescription className="whitespace-pre-wrap">{message}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}