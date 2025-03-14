"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X, User, ShoppingBag, Heart, Phone, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

const categories = [
  {
    name: "Women",
    subcategories: ["Dresses", "Tops", "Bottoms", "Shoes", "Accessories"],
  },
  {
    name: "Men",
    subcategories: ["Shirts", "Pants", "Shoes", "Accessories"],
  },
  {
    name: "Kids",
    subcategories: ["Girls", "Boys", "Babies", "School Uniforms"],
  },
  {
    name: "Home",
    subcategories: ["Bedding", "Bath", "Decor", "Kitchen", "Furniture"],
  },
  {
    name: "Beauty",
    subcategories: ["Makeup", "Skincare", "Haircare", "Fragrance"],
  },
]

const accountLinks = [
  { name: "My Account", icon: User, href: "/account" },
  { name: "My Orders", icon: ShoppingBag, href: "/account/orders" },
  { name: "My Wishlist", icon: Heart, href: "/account/wishlist" },
]

const supportLinks = [
  { name: "Contact Us", icon: Phone, href: "/contact" },
  { name: "Help Center", icon: HelpCircle, href: "/help" },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between border-b p-4">
            <span className="font-semibold text-lg">Menu</span>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
          </div>

          <div className="flex-1 overflow-auto py-2">
            <Accordion type="multiple" className="w-full">
              {categories.map((category) => (
                <AccordionItem key={category.name} value={category.name}>
                  <AccordionTrigger className="px-4 py-2">{category.name}</AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col space-y-1 pl-4">
                      {category.subcategories.map((subcategory) => (
                        <Link
                          key={subcategory}
                          href={`/category/${category.name.toLowerCase()}/${subcategory.toLowerCase()}`}
                          className="py-2 px-4 hover:bg-accent rounded-md transition-colors"
                          onClick={() => setOpen(false)}
                        >
                          {subcategory}
                        </Link>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <div className="mt-4 border-t pt-4">
              <div className="px-4 py-2 font-medium">Account</div>
              <div className="flex flex-col">
                {accountLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="flex items-center py-2 px-4 hover:bg-accent rounded-md transition-colors"
                    onClick={() => setOpen(false)}
                  >
                    <link.icon className="h-4 w-4 mr-2" />
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-4 border-t pt-4">
              <div className="px-4 py-2 font-medium">Support</div>
              <div className="flex flex-col">
                {supportLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="flex items-center py-2 px-4 hover:bg-accent rounded-md transition-colors"
                    onClick={() => setOpen(false)}
                  >
                    <link.icon className="h-4 w-4 mr-2" />
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t p-4">
            <div className="flex space-x-2">
              <Button className="flex-1" onClick={() => setOpen(false)}>
                Sign In
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                Register
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

