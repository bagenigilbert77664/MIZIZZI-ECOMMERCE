// "use client"

// import { useState, useEffect } from "react"
// import Link from "next/link"
// import { categoryService, type Category } from "@/services/category"
// import {
//   NavigationMenu as NavigationMenuPrimitive,
//   NavigationMenuContent,
//   NavigationMenuItem,
//   NavigationMenuLink,
//   NavigationMenuList,
//   NavigationMenuTrigger,
// } from "@/components/ui/navigation-menu"

// export function NavigationMenu() {
//   const [categories, setCategories] = useState<Category[]>([])
//   const [loading, setLoading] = useState(true)

//   useEffect(() => {
//     const fetchCategories = async () => {
//       try {
//         setLoading(true)
//         const fetchedCategories = await categoryService.getCategories()
//         const categoriesArray = Array.isArray(fetchedCategories) ? fetchedCategories : []
//         const topLevelCategories = categoriesArray.filter((cat) => !cat.parent_id).slice(0, 6)

//         const categoriesWithSubcategories = await Promise.all(
//           topLevelCategories.map(async (category) => {
//             if (category.id) {
//               const subcategories = await categoryService.getSubcategories(category.id)
//               return { ...category, subcategories }
//             }
//             return category
//           }),
//         )

//         setCategories(categoriesWithSubcategories)
//       } catch (error) {
//         console.error("Failed to fetch categories:", error)
//         setCategories([
//           { id: 2, name: "Clothing", slug: "clothing", description: "Fashion and apparel" },
//           { id: 3, name: "Home & Garden", slug: "home-garden", description: "Home improvement and garden supplies" },
//           { id: 4, name: "Sports", slug: "sports", description: "Sports equipment and accessories" },
//           { id: 5, name: "Books", slug: "books", description: "Books and educational materials" },
//         ])
//       } finally {
//         setLoading(false)
//       }
//     }

//     fetchCategories()
//   }, [])

//   if (loading) {
//     return (
//       <div className="py-3">
//         <div className="flex items-center gap-6">
//           {[1, 2, 3, 4, 5].map((i) => (
//             <div key={i} className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
//           ))}
//         </div>
//       </div>
//     )
//   }

//   return (
//     <div className="py-3 overflow-x-auto max-w-full">
//       <NavigationMenuPrimitive className="relative z-10 flex max-w-max flex-1 items-center justify-center min-w-full">
//         <NavigationMenuList className="group flex flex-1 list-none items-center justify-start md:justify-center space-x-1 px-2">
//           {/* All Categories Link */}
//           <NavigationMenuItem className="shrink-0">
//             <NavigationMenuLink asChild>
//               <Link
//                 href="/categories"
//                 className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-3 md:px-4 py-2 text-xs md:text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50 whitespace-nowrap"
//               >
//                 All Categories
//               </Link>
//             </NavigationMenuLink>
//           </NavigationMenuItem>

//           {/* Dynamic Categories */}
//           {categories.map((category) => (
//             <NavigationMenuItem key={category.id} className="shrink-0">
//               {category.subcategories && category.subcategories.length > 0 ? (
//                 <>
//                   <NavigationMenuTrigger className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-3 md:px-4 py-2 text-xs md:text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50 whitespace-nowrap">
//                     {category.name}
//                   </NavigationMenuTrigger>
//                   <NavigationMenuContent>
//                     <div className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
//                       {/* Main Category Link */}
//                       <div className="row-span-3">
//                         <NavigationMenuLink asChild>
//                           <Link
//                             className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
//                             href={`/category/${category.slug}`}
//                           >
//                             {category.image_url && (
//                               <div className="mb-2 h-12 w-12 rounded-lg overflow-hidden">
//                                 <img
//                                   src={category.image_url || "/placeholder.svg"}
//                                   alt={category.name}
//                                   className="h-full w-full object-cover"
//                                 />
//                               </div>
//                             )}
//                             <div className="mb-2 mt-4 text-lg font-medium">{category.name}</div>
//                             <p className="text-sm leading-tight text-muted-foreground">
//                               {category.description || `Browse all ${category.name.toLowerCase()} products`}
//                             </p>
//                           </Link>
//                         </NavigationMenuLink>
//                       </div>

//                       {/* Subcategories */}
//                       <div className="space-y-2">
//                         {category.subcategories?.slice(0, 6).map((subcategory, index) => (
//                           <NavigationMenuLink key={`${category.id}-${subcategory.id || index}`} asChild>
//                             <Link
//                               href={`/category/${subcategory.slug}`}
//                               className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
//                             >
//                               <div className="text-sm font-medium leading-none">{subcategory.name}</div>
//                             </Link>
//                           </NavigationMenuLink>
//                         )) || []}

//                         {(category.subcategories?.length || 0) > 6 && (
//                           <NavigationMenuLink key={`${category.id}-view-all`} asChild>
//                             <Link
//                               href={`/category/${category.slug}`}
//                               className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground text-sm font-medium text-cherry-600"
//                             >
//                               View all {category.name} →
//                             </Link>
//                           </NavigationMenuLink>
//                         )}
//                       </div>
//                     </div>
//                   </NavigationMenuContent>
//                 </>
//               ) : (
//                 <NavigationMenuLink asChild>
//                   <Link
//                     href={`/category/${category.slug}`}
//                     className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-3 md:px-4 py-2 text-xs md:text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50 whitespace-nowrap"
//                   >
//                     {category.name}
//                   </Link>
//                 </NavigationMenuLink>
//               )}
//             </NavigationMenuItem>
//           ))}

//           {/* Featured Links */}
//           <NavigationMenuItem className="shrink-0">
//             <NavigationMenuLink asChild>
//               <Link
//                 href="/products"
//                 className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-3 md:px-4 py-2 text-xs md:text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50 whitespace-nowrap"
//               >
//                 Products
//               </Link>
//             </NavigationMenuLink>
//           </NavigationMenuItem>
//         </NavigationMenuList>
//       </NavigationMenuPrimitive>
//     </div>
//   )
// }
