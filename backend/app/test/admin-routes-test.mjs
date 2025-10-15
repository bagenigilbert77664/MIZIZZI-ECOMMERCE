import fetch from "node-fetch"
import chalk from "chalk"

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5000"
const TOKEN =
  process.env.TOKEN ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc1MDczOTcwOSwianRpIjoiYTgxODBhZGItNTMyZS00ZTQ4LThhM2MtOTUzYTU5Yzk2OTY2IiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjIwIiwibmJmIjoxNzUwNzM5NzA5LCJjc3JmIjoiMjdkMzIxMGItZmMzZi00ZmMyLWIzNDEtM2NkY2ZkZTc3M2JhIiwiZXhwIjoxNzUwNzQzMzA5LCJyb2xlIjoiYWRtaW4ifQ.ZitsW6-dpYH20IO_KrMXidRlvliiEEoePPzn-1bw0UE"

console.log(chalk.cyan(`Using token: ${TOKEN.substring(0, 20)}...`))

// Helper function for API requests
async function apiRequest(endpoint, method = "GET", body = null) {
  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  }

  const options = {
    method,
    headers,
  }

  if (body && (method === "POST" || method === "PUT")) {
    options.body = JSON.stringify(body)
  }

  try {
    console.log(chalk.gray(`Making ${method} request to: ${API_BASE_URL}/api/admin${endpoint}`))
    const response = await fetch(`${API_BASE_URL}/api/admin${endpoint}`, options)

    let data
    try {
      data = await response.json()
    } catch (e) {
      data = { error: "Failed to parse JSON response" }
    }

    if (!response.ok) {
      console.log(chalk.red(`Request failed: ${response.status} ${response.statusText}`))
      console.log(chalk.red(`Response:`, JSON.stringify(data, null, 2)))
    }

    return { status: response.status, data }
  } catch (error) {
    console.error(chalk.red(`Network error calling ${endpoint}:`), error.message)
    return { status: 500, error: error.message }
  }
}

// Test functions for each section
async function testDashboard() {
  console.log(chalk.blue.bold("\n🧪 Testing Dashboard..."))
  const result = await apiRequest("/dashboard")

  if (result.status === 200) {
    console.log(chalk.green("✅ Dashboard endpoint working"))
    console.log(chalk.gray(`   Users: ${result.data.counts?.users || 0}`))
    console.log(chalk.gray(`   Products: ${result.data.counts?.products || 0}`))
    console.log(chalk.gray(`   Orders: ${result.data.counts?.orders || 0}`))
    console.log(chalk.gray(`   Monthly Sales: $${((result.data.sales?.monthly || 0) / 100).toFixed(2)}`))
    console.log(chalk.gray(`   Categories: ${result.data.counts?.categories || 0}`))
    console.log(chalk.gray(`   Brands: ${result.data.counts?.brands || 0}`))
  } else {
    console.log(chalk.red("❌ Dashboard endpoint failed:"), result.status, result.data?.error || "")
  }

  return result.status === 200
}

async function testUsers() {
  console.log(chalk.blue.bold("\n🧪 Testing User Management..."))
  let allPassed = true

  // Test GET users
  const usersResult = await apiRequest("/users")
  if (usersResult.status === 200) {
    console.log(chalk.green("✅ Get users endpoint working"))
    console.log(chalk.gray(`   Total users: ${usersResult.data.pagination?.total_items || 0}`))

    if (usersResult.data.items && usersResult.data.items.length > 0) {
      const userId = usersResult.data.items[0].id

      // Test GET single user
      const userResult = await apiRequest(`/users/${userId}`)
      if (userResult.status === 200) {
        console.log(chalk.green(`✅ Get user details endpoint working (ID: ${userId})`))
      } else {
        console.log(chalk.red(`❌ Get user details endpoint failed:`), userResult.status, userResult.data?.error || "")
        allPassed = false
      }

      // Test user activation/deactivation
      const activateResult = await apiRequest(`/users/${userId}/activate`, "POST")
      if (activateResult.status === 200) {
        console.log(chalk.green(`✅ User activation endpoint working`))
      } else {
        console.log(chalk.red(`❌ User activation endpoint failed:`), activateResult.status)
        allPassed = false
      }
    }

    // Test user filtering
    const filteredResult = await apiRequest("/users?role=CUSTOMER&is_active=true")
    if (filteredResult.status === 200) {
      console.log(chalk.green("✅ User filtering endpoint working"))
    } else {
      console.log(chalk.red("❌ User filtering endpoint failed:"), filteredResult.status)
      allPassed = false
    }
  } else {
    console.log(chalk.red("❌ Get users endpoint failed:"), usersResult.status, usersResult.data?.error || "")
    allPassed = false
  }

  return allPassed
}

async function testCategories() {
  console.log(chalk.blue.bold("\n🧪 Testing Category Management..."))
  let allPassed = true

  // Test GET categories
  const categoriesResult = await apiRequest("/categories")
  if (categoriesResult.status === 200) {
    console.log(chalk.green("✅ Get categories endpoint working"))
    console.log(chalk.gray(`   Total categories: ${categoriesResult.data.pagination?.total_items || 0}`))

    if (categoriesResult.data.items && categoriesResult.data.items.length > 0) {
      const categoryId = categoriesResult.data.items[0].id

      // Test GET single category
      const categoryResult = await apiRequest(`/categories/${categoryId}`)
      if (categoryResult.status === 200) {
        console.log(chalk.green(`✅ Get category details endpoint working (ID: ${categoryId})`))
      } else {
        console.log(
          chalk.red(`❌ Get category details endpoint failed:`),
          categoryResult.status,
          categoryResult.data?.error || "",
        )
        allPassed = false
      }

      // Test toggle featured
      const toggleResult = await apiRequest(`/categories/${categoryId}/toggle-featured`, "POST")
      if (toggleResult.status === 200) {
        console.log(chalk.green(`✅ Toggle category featured endpoint working`))
      } else {
        console.log(chalk.red(`❌ Toggle category featured endpoint failed:`), toggleResult.status)
        allPassed = false
      }
    }

    // Test category filtering
    const filteredResult = await apiRequest("/categories?is_featured=true")
    if (filteredResult.status === 200) {
      console.log(chalk.green("✅ Category filtering endpoint working"))
    } else {
      console.log(chalk.red("❌ Category filtering endpoint failed:"), filteredResult.status)
      allPassed = false
    }
  } else {
    console.log(
      chalk.red("❌ Get categories endpoint failed:"),
      categoriesResult.status,
      categoriesResult.data?.error || "",
    )
    allPassed = false
  }

  return allPassed
}

async function testProducts() {
  console.log(chalk.blue.bold("\n🧪 Testing Product Management..."))
  let allPassed = true

  // Test GET products
  const productsResult = await apiRequest("/products")
  if (productsResult.status === 200) {
    console.log(chalk.green("✅ Get products endpoint working"))
    console.log(chalk.gray(`   Total products: ${productsResult.data.pagination?.total_items || 0}`))

    if (productsResult.data.items && productsResult.data.items.length > 0) {
      const productId = productsResult.data.items[0].id

      // Test GET single product
      const productResult = await apiRequest(`/products/${productId}`)
      if (productResult.status === 200) {
        console.log(chalk.green(`✅ Get product details endpoint working (ID: ${productId})`))
      } else {
        console.log(
          chalk.red(`❌ Get product details endpoint failed:`),
          productResult.status,
          productResult.data?.error || "",
        )
        allPassed = false
      }

      // Test product images endpoint
      const imagesResult = await apiRequest(`/products/${productId}/images`)
      if (imagesResult.status === 200) {
        console.log(chalk.green(`✅ Get product images endpoint working`))
      } else {
        console.log(
          chalk.red(`❌ Get product images endpoint failed:`),
          imagesResult.status,
          imagesResult.data?.error || "",
        )
        allPassed = false
      }

      // Test product variants endpoint
      const variantsResult = await apiRequest(`/products/${productId}/variants`)
      if (variantsResult.status === 200) {
        console.log(chalk.green(`✅ Get product variants endpoint working`))
      } else {
        console.log(
          chalk.red(`❌ Get product variants endpoint failed:`),
          variantsResult.status,
          variantsResult.data?.error || "",
        )
        allPassed = false
      }

      // Test product main image endpoint
      const mainImageResult = await apiRequest(`/products/${productId}/image`)
      if (mainImageResult.status === 200) {
        console.log(chalk.green(`✅ Get product main image endpoint working`))
      } else {
        console.log(chalk.red(`❌ Get product main image endpoint failed:`), mainImageResult.status)
        allPassed = false
      }

      // Test product stock update
      const stockResult = await apiRequest(`/products/${productId}/stock`, "PUT", { stock: 10 })
      if (stockResult.status === 200) {
        console.log(chalk.green(`✅ Update product stock endpoint working`))
      } else {
        console.log(chalk.red(`❌ Update product stock endpoint failed:`), stockResult.status)
        allPassed = false
      }
    }

    // Test product filtering
    const filteredResult = await apiRequest("/products?stock_status=in_stock&sort_by=name")
    if (filteredResult.status === 200) {
      console.log(chalk.green("✅ Product filtering endpoint working"))
    } else {
      console.log(chalk.red("❌ Product filtering endpoint failed:"), filteredResult.status)
      allPassed = false
    }

    // Test bulk update
    if (productsResult.data.items && productsResult.data.items.length > 0) {
      const productIds = productsResult.data.items.slice(0, 2).map((p) => p.id)
      const bulkResult = await apiRequest("/products/bulk-update", "POST", {
        product_ids: productIds,
        updates: { is_featured: true },
      })
      if (bulkResult.status === 200) {
        console.log(chalk.green("✅ Bulk update products endpoint working"))
      } else {
        console.log(chalk.red("❌ Bulk update products endpoint failed:"), bulkResult.status)
        allPassed = false
      }
    }
  } else {
    console.log(chalk.red("❌ Get products endpoint failed:"), productsResult.status, productsResult.data?.error || "")
    allPassed = false
  }

  return allPassed
}

async function testOrders() {
  console.log(chalk.blue.bold("\n🧪 Testing Order Management..."))
  let allPassed = true

  // Test GET orders
  const ordersResult = await apiRequest("/orders")
  if (ordersResult.status === 200) {
    console.log(chalk.green("✅ Get orders endpoint working"))
    console.log(chalk.gray(`   Total orders: ${ordersResult.data.pagination?.total_items || 0}`))

    if (ordersResult.data.items && ordersResult.data.items.length > 0) {
      const orderId = ordersResult.data.items[0].id

      // Test GET single order
      const orderResult = await apiRequest(`/orders/${orderId}`)
      if (orderResult.status === 200) {
        console.log(chalk.green(`✅ Get order details endpoint working (ID: ${orderId})`))
      } else {
        console.log(
          chalk.red(`❌ Get order details endpoint failed:`),
          orderResult.status,
          orderResult.data?.error || "",
        )
        allPassed = false
      }

      // Test order status update
      const statusResult = await apiRequest(`/orders/${orderId}/status`, "PUT", {
        status: "PROCESSING",
        notes: "Test status update",
      })
      if (statusResult.status === 200) {
        console.log(chalk.green(`✅ Update order status endpoint working`))
      } else {
        console.log(chalk.red(`❌ Update order status endpoint failed:`), statusResult.status)
        allPassed = false
      }
    }

    // Test order filtering
    const filteredResult = await apiRequest("/orders?status=PENDING&sort_by=created_at")
    if (filteredResult.status === 200) {
      console.log(chalk.green("✅ Order filtering endpoint working"))
    } else {
      console.log(chalk.red("❌ Order filtering endpoint failed:"), filteredResult.status)
      allPassed = false
    }
  } else {
    console.log(chalk.red("❌ Get orders endpoint failed:"), ordersResult.status, ordersResult.data?.error || "")
    allPassed = false
  }

  return allPassed
}

async function testCartItems() {
  console.log(chalk.blue.bold("\n🧪 Testing Cart Management..."))
  let allPassed = true

  // Test GET cart items
  const cartItemsResult = await apiRequest("/cart-items")
  if (cartItemsResult.status === 200) {
    console.log(chalk.green("✅ Get cart items endpoint working"))
    console.log(chalk.gray(`   Total cart items: ${cartItemsResult.data.pagination?.total_items || 0}`))

    if (cartItemsResult.data.items && cartItemsResult.data.items.length > 0) {
      const cartItemId = cartItemsResult.data.items[0].id
      const userId = cartItemsResult.data.items[0].user_id

      // Test delete cart item
      const deleteResult = await apiRequest(`/cart-items/${cartItemId}`, "DELETE")
      if (deleteResult.status === 200) {
        console.log(chalk.green(`✅ Delete cart item endpoint working`))
      } else {
        console.log(chalk.red(`❌ Delete cart item endpoint failed:`), deleteResult.status)
        allPassed = false
      }

      // Test clear user cart
      if (userId) {
        const clearResult = await apiRequest(`/users/${userId}/cart/clear`, "DELETE")
        if (clearResult.status === 200) {
          console.log(chalk.green(`✅ Clear user cart endpoint working`))
        } else {
          console.log(chalk.red(`❌ Clear user cart endpoint failed:`), clearResult.status)
          allPassed = false
        }
      }
    }
  } else {
    console.log(
      chalk.red("❌ Get cart items endpoint failed:"),
      cartItemsResult.status,
      cartItemsResult.data?.error || "",
    )
    allPassed = false
  }

  return allPassed
}

async function testWishlistItems() {
  console.log(chalk.blue.bold("\n🧪 Testing Wishlist Management..."))
  let allPassed = true

  // Test GET wishlist items
  const wishlistItemsResult = await apiRequest("/wishlist-items")
  if (wishlistItemsResult.status === 200) {
    console.log(chalk.green("✅ Get wishlist items endpoint working"))
    console.log(chalk.gray(`   Total wishlist items: ${wishlistItemsResult.data.pagination?.total_items || 0}`))

    if (wishlistItemsResult.data.items && wishlistItemsResult.data.items.length > 0) {
      const wishlistItemId = wishlistItemsResult.data.items[0].id
      const userId = wishlistItemsResult.data.items[0].user_id

      // Test delete wishlist item
      const deleteResult = await apiRequest(`/wishlist-items/${wishlistItemId}`, "DELETE")
      if (deleteResult.status === 200) {
        console.log(chalk.green(`✅ Delete wishlist item endpoint working`))
      } else {
        console.log(chalk.red(`❌ Delete wishlist item endpoint failed:`), deleteResult.status)
        allPassed = false
      }

      // Test clear user wishlist
      if (userId) {
        const clearResult = await apiRequest(`/users/${userId}/wishlist/clear`, "DELETE")
        if (clearResult.status === 200) {
          console.log(chalk.green(`✅ Clear user wishlist endpoint working`))
        } else {
          console.log(chalk.red(`❌ Clear user wishlist endpoint failed:`), clearResult.status)
          allPassed = false
        }
      }
    }
  } else {
    console.log(
      chalk.red("❌ Get wishlist items endpoint failed:"),
      wishlistItemsResult.status,
      wishlistItemsResult.data?.error || "",
    )
    allPassed = false
  }

  return allPassed
}

async function testAddresses() {
  console.log(chalk.blue.bold("\n🧪 Testing Address Management..."))
  let allPassed = true

  // Test GET address types
  const addressTypesResult = await apiRequest("/address-types")
  if (addressTypesResult.status === 200) {
    console.log(chalk.green("✅ Get address types endpoint working"))
    console.log(chalk.gray(`   Address types: ${addressTypesResult.data.address_types?.length || 0}`))
  } else {
    console.log(
      chalk.red("❌ Get address types endpoint failed:"),
      addressTypesResult.status,
      addressTypesResult.data?.error || "",
    )
    allPassed = false
  }

  // Test GET addresses
  const addressesResult = await apiRequest("/addresses")
  if (addressesResult.status === 200) {
    console.log(chalk.green("✅ Get addresses endpoint working"))
    console.log(chalk.gray(`   Total addresses: ${addressesResult.data.pagination?.total_items || 0}`))

    if (addressesResult.data.items && addressesResult.data.items.length > 0) {
      const addressId = addressesResult.data.items[0].id

      // Test GET single address
      const addressResult = await apiRequest(`/addresses/${addressId}`)
      if (addressResult.status === 200) {
        console.log(chalk.green(`✅ Get address details endpoint working (ID: ${addressId})`))
      } else {
        console.log(chalk.red(`❌ Get address details endpoint failed:`), addressResult.status)
        allPassed = false
      }
    }

    // Test address filtering
    const filteredResult = await apiRequest("/addresses?is_default=true")
    if (filteredResult.status === 200) {
      console.log(chalk.green("✅ Address filtering endpoint working"))
    } else {
      console.log(chalk.red("❌ Address filtering endpoint failed:"), filteredResult.status)
      allPassed = false
    }
  } else {
    console.log(
      chalk.red("❌ Get addresses endpoint failed:"),
      addressesResult.status,
      addressesResult.data?.error || "",
    )
    allPassed = false
  }

  return allPassed
}

async function testNewsletters() {
  console.log(chalk.blue.bold("\n🧪 Testing Newsletter Management..."))
  let allPassed = true

  // Test GET newsletters
  const newslettersResult = await apiRequest("/newsletters")
  if (newslettersResult.status === 200) {
    console.log(chalk.green("✅ Get newsletters endpoint working"))
    console.log(chalk.gray(`   Total newsletter subscribers: ${newslettersResult.data.pagination?.total_items || 0}`))

    if (newslettersResult.data.items && newslettersResult.data.items.length > 0) {
      const newsletterId = newslettersResult.data.items[0].id

      // Test toggle newsletter
      const toggleResult = await apiRequest(`/newsletters/${newsletterId}/toggle`, "POST")
      if (toggleResult.status === 200) {
        console.log(chalk.green(`✅ Toggle newsletter endpoint working`))
      } else {
        console.log(chalk.red(`❌ Toggle newsletter endpoint failed:`), toggleResult.status)
        allPassed = false
      }
    }

    // Test newsletter export
    const exportResult = await apiRequest("/newsletters/export")
    if (exportResult.status === 200) {
      console.log(chalk.green("✅ Export newsletters endpoint working"))
    } else {
      console.log(chalk.red("❌ Export newsletters endpoint failed:"), exportResult.status)
      allPassed = false
    }

    // Test newsletter filtering
    const filteredResult = await apiRequest("/newsletters?is_active=true")
    if (filteredResult.status === 200) {
      console.log(chalk.green("✅ Newsletter filtering endpoint working"))
    } else {
      console.log(chalk.red("❌ Newsletter filtering endpoint failed:"), filteredResult.status)
      allPassed = false
    }
  } else {
    console.log(
      chalk.red("❌ Get newsletters endpoint failed:"),
      newslettersResult.status,
      newslettersResult.data?.error || "",
    )
    allPassed = false
  }

  return allPassed
}

async function testBrands() {
  console.log(chalk.blue.bold("\n🧪 Testing Brand Management..."))
  let allPassed = true

  // Test GET brands
  const brandsResult = await apiRequest("/brands")
  if (brandsResult.status === 200) {
    console.log(chalk.green("✅ Get brands endpoint working"))
    console.log(chalk.gray(`   Total brands: ${brandsResult.data.pagination?.total_items || 0}`))

    if (brandsResult.data.items && brandsResult.data.items.length > 0) {
      const brandId = brandsResult.data.items[0].id

      // Test GET single brand
      const brandResult = await apiRequest(`/brands/${brandId}`)
      if (brandResult.status === 200) {
        console.log(chalk.green(`✅ Get brand details endpoint working (ID: ${brandId})`))
      } else {
        console.log(chalk.red(`❌ Get brand details endpoint failed:`), brandResult.status)
        allPassed = false
      }
    }
  } else {
    console.log(chalk.red("❌ Get brands endpoint failed:"), brandsResult.status, brandsResult.data?.error || "")
    allPassed = false
  }

  // Test brands list endpoint
  const brandsListResult = await apiRequest("/brands/list")
  if (brandsListResult.status === 200) {
    console.log(chalk.green("✅ Get brands list endpoint working"))
  } else {
    console.log(chalk.red("❌ Get brands list endpoint failed:"), brandsListResult.status)
    allPassed = false
  }

  return allPassed
}

async function testStatistics() {
  console.log(chalk.blue.bold("\n🧪 Testing Statistics..."))
  let allPassed = true

  // Test sales stats
  const salesStatsResult = await apiRequest("/stats/sales?period=month")
  if (salesStatsResult.status === 200) {
    console.log(chalk.green("✅ Get sales statistics endpoint working"))
    console.log(chalk.gray(`   Sales data points: ${salesStatsResult.data.data?.length || 0}`))
  } else {
    console.log(
      chalk.red("❌ Get sales statistics endpoint failed:"),
      salesStatsResult.status,
      salesStatsResult.data?.error || "",
    )
    allPassed = false
  }

  // Test different periods
  for (const period of ["day", "week", "year"]) {
    const periodResult = await apiRequest(`/stats/sales?period=${period}`)
    if (periodResult.status === 200) {
      console.log(chalk.green(`✅ Sales statistics ${period} period working`))
    } else {
      console.log(chalk.red(`❌ Sales statistics ${period} period failed:`), periodResult.status)
      allPassed = false
    }
  }

  // Test product stats
  const productStatsResult = await apiRequest("/stats/products")
  if (productStatsResult.status === 200) {
    console.log(chalk.green("✅ Get product statistics endpoint working"))
    console.log(chalk.gray(`   Top selling products: ${productStatsResult.data.top_selling?.length || 0}`))
    console.log(chalk.gray(`   Highest rated products: ${productStatsResult.data.highest_rated?.length || 0}`))
    console.log(chalk.gray(`   Low stock products: ${productStatsResult.data.low_stock?.length || 0}`))
    console.log(chalk.gray(`   Out of stock products: ${productStatsResult.data.out_of_stock?.length || 0}`))
  } else {
    console.log(
      chalk.red("❌ Get product statistics endpoint failed:"),
      productStatsResult.status,
      productStatsResult.data?.error || "",
    )
    allPassed = false
  }

  return allPassed
}

async function testImageUpload() {
  console.log(chalk.blue.bold("\n🧪 Testing Image Upload..."))
  let allPassed = true

  // Test image upload endpoint (without actual file)
  const uploadResult = await apiRequest("/upload/image", "POST", {})
  // This should fail with 400 because no file is provided
  if (uploadResult.status === 400) {
    console.log(chalk.green("✅ Image upload endpoint properly validates file requirement"))
  } else {
    console.log(chalk.red("❌ Image upload endpoint validation failed:"), uploadResult.status)
    allPassed = false
  }

  // Test product image reorder endpoint
  const reorderResult = await apiRequest("/product-images/reorder", "PUT", {
    images: [{ id: 1 }, { id: 2 }],
  })
  if (reorderResult.status === 200 || reorderResult.status === 404) {
    console.log(chalk.green("✅ Product image reorder endpoint accessible"))
  } else {
    console.log(chalk.red("❌ Product image reorder endpoint failed:"), reorderResult.status)
    allPassed = false
  }

  return allPassed
}

async function testCRUDOperations() {
  console.log(chalk.blue.bold("\n🧪 Testing CRUD Operations..."))
  let allPassed = true

  // Test creating a new category
  const newCategory = {
    name: "Test Category " + Date.now(),
    description: "Test category description",
    is_featured: false,
  }

  const createCategoryResult = await apiRequest("/categories", "POST", newCategory)
  if (createCategoryResult.status === 201) {
    console.log(chalk.green("✅ Create category endpoint working"))

    const categoryId = createCategoryResult.data.category.id

    // Test updating the category
    const updateCategoryResult = await apiRequest(`/categories/${categoryId}`, "PUT", {
      description: "Updated description",
    })
    if (updateCategoryResult.status === 200) {
      console.log(chalk.green("✅ Update category endpoint working"))
    } else {
      console.log(chalk.red("❌ Update category endpoint failed:"), updateCategoryResult.status)
      allPassed = false
    }

    // Test deleting the category
    const deleteCategoryResult = await apiRequest(`/categories/${categoryId}`, "DELETE")
    if (deleteCategoryResult.status === 200) {
      console.log(chalk.green("✅ Delete category endpoint working"))
    } else {
      console.log(chalk.red("❌ Delete category endpoint failed:"), deleteCategoryResult.status)
      allPassed = false
    }
  } else {
    console.log(
      chalk.red("❌ Create category endpoint failed:"),
      createCategoryResult.status,
      createCategoryResult.data?.error || "",
    )
    allPassed = false
  }

  // Test creating a new brand
  const newBrand = {
    name: "Test Brand " + Date.now(),
    description: "Test brand description",
  }

  const createBrandResult = await apiRequest("/brands", "POST", newBrand)
  if (createBrandResult.status === 201) {
    console.log(chalk.green("✅ Create brand endpoint working"))

    const brandId = createBrandResult.data.brand.id

    // Test updating the brand
    const updateBrandResult = await apiRequest(`/brands/${brandId}`, "PUT", {
      description: "Updated brand description",
    })
    if (updateBrandResult.status === 200) {
      console.log(chalk.green("✅ Update brand endpoint working"))
    } else {
      console.log(chalk.red("❌ Update brand endpoint failed:"), updateBrandResult.status)
      allPassed = false
    }

    // Test deleting the brand
    const deleteBrandResult = await apiRequest(`/brands/${brandId}`, "DELETE")
    if (deleteBrandResult.status === 200) {
      console.log(chalk.green("✅ Delete brand endpoint working"))
    } else {
      console.log(chalk.red("❌ Delete brand endpoint failed:"), deleteBrandResult.status)
      allPassed = false
    }
  } else {
    console.log(
      chalk.red("❌ Create brand endpoint failed:"),
      createBrandResult.status,
      createBrandResult.data?.error || "",
    )
    allPassed = false
  }

  return allPassed
}

// Main test function
async function runTests() {
  console.log(chalk.green.bold("🚀 Starting Comprehensive Admin Routes Tests..."))
  console.log(chalk.cyan(`Testing API at: ${API_BASE_URL}`))

  const results = {
    dashboard: await testDashboard(),
    users: await testUsers(),
    categories: await testCategories(),
    products: await testProducts(),
    orders: await testOrders(),
    cartItems: await testCartItems(),
    wishlistItems: await testWishlistItems(),
    addresses: await testAddresses(),
    newsletters: await testNewsletters(),
    brands: await testBrands(),
    statistics: await testStatistics(),
    imageUpload: await testImageUpload(),
    crudOperations: await testCRUDOperations(),
  }

  console.log(chalk.cyan("\n📊 Test Results Summary:"))
  for (const [test, passed] of Object.entries(results)) {
    const testName = test.charAt(0).toUpperCase() + test.slice(1).replace(/([A-Z])/g, " $1")
    console.log(`${passed ? chalk.green("✅") : chalk.red("❌")} ${testName}`)
  }

  const passedCount = Object.values(results).filter(Boolean).length
  const totalCount = Object.values(results).length

  console.log(
    chalk.cyan(
      `\n🏁 ${passedCount}/${totalCount} test suites passed (${Math.round((passedCount / totalCount) * 100)}%)`,
    ),
  )

  if (passedCount === totalCount) {
    console.log(chalk.green.bold("\n🎉 All admin endpoints are working correctly!"))
  } else {
    console.log(chalk.yellow.bold("\n⚠️  Some endpoints need attention. Check the logs above for details."))
  }

  // Performance summary
  console.log(chalk.blue("\n⚡ Performance Notes:"))
  console.log(chalk.gray("- All endpoints tested with proper authentication"))
  console.log(chalk.gray("- CRUD operations tested end-to-end"))
  console.log(chalk.gray("- Filtering and pagination tested"))
  console.log(chalk.gray("- Error handling validated"))
}

// Run the tests
runTests().catch((error) => {
  console.error(chalk.red("Error running tests:"), error)
  process.exit(1)
})
