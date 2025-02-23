"use client"

import Image from "next/image"
import Link from "next/link"
import { MapPin, Mail, Phone } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { motion } from "framer-motion"

const paymentMethods = [
  {
    name: "M-PESA",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/M-PESA_LOGO-01.svg/512px-M-PESA_LOGO-01.svg.png",
    width: 80,
    height: 30,
  },
  {
    name: "Visa",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/512px-Visa_Inc._logo.svg.png",
    width: 60,
    height: 30,
  },
  {
    name: "Stripe",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Stripe_Logo%2C_revised_2016.svg/512px-Stripe_Logo%2C_revised_2016.svg.png",
    width: 70,
    height: 30,
  },
]

const socialMedia = [
  {
    name: "Facebook",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/2021_Facebook_icon.svg/2048px-2021_Facebook_icon.svg.png",
    width: 30,
    height: 30,
    href: "https://facebook.com",
  },
  {
    name: "Instagram",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Instagram_logo_2022.svg/1920px-Instagram_logo_2022.svg.png",
    width: 30,
    height: 30,
    href: "https://instagram.com",
  },
  {
    name: "Twitter",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Logo_of_Twitter.svg/512px-Logo_of_Twitter.svg.png",
    width: 30,
    height: 30,
    href: "https://twitter.com",
  },
  {
    name: "YouTube",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/YouTube_full-color_icon_%282017%29.svg/2560px-YouTube_full-color_icon_%282017%29.svg.png",
    width: 30,
    height: 30,
    href: "https://youtube.com",
  },
]

export function Footer() {
  return (
    <footer className="relative border-t border-cherry-700/50 bg-gradient-to-b from-[#67000d] to-[#350107] text-white">
      {/* Subtle Grid Pattern */}
      <div className="absolute inset-0 bg-grid-neutral-100/5 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,white)]" />

      <div className="container relative mx-auto max-w-[1200px] px-4 py-12 sm:px-6 lg:px-8">
        {/* Desktop Footer */}
        <div className="hidden lg:grid grid-cols-5 gap-8">
          <div className="col-span-2 space-y-6">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative h-16 w-16 overflow-hidden rounded-lg bg-gradient-to-br from-cherry-800 to-cherry-900 p-0.5"
            >
              <Link href="/" className="block h-full w-full">
                <div className="h-full w-full rounded-lg bg-white p-2">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png"
                    alt="MIZIZZI"
                    width={48}
                    height={48}
                    className="h-full w-full object-contain"
                    priority
                  />
                </div>
              </Link>
            </motion.div>
            <div>
              <h2 className="text-xl font-bold text-white">Official Store</h2>
              <p className="text-sm text-cherry-100/80">Exclusive Collection</p>
            </div>
            <p className="max-w-xs text-sm text-cherry-100/90">
              Discover our curated collection of fashion and jewelry pieces. Where style meets elegance.
            </p>
            <div className="flex gap-4">
              {socialMedia.map((social, index) => (
                <Link key={index} href={social.href} target="_blank" rel="noopener noreferrer">
                  <motion.div
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.9 }}
                    className="relative h-8 w-8 overflow-hidden rounded-full bg-white p-0.5 shadow-sm transition-shadow duration-200 hover:shadow-lg hover:shadow-cherry-400/10"
                  >
                    <Image
                      src={social.logo || "/placeholder.svg"}
                      alt={social.name}
                      width={social.width}
                      height={social.height}
                      className="h-full w-full object-contain"
                    />
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>

          <div className="transform space-y-3 transition-all duration-300 hover:-translate-y-1">
            <h2 className="text-lg font-bold text-white">Shop</h2>
            <ul className="space-y-2 text-sm">
              {["Body Jewelry", "Dresses", "Tops & Jackets", "Bottoms", "Shoes", "Bags"].map((item) => (
                <li key={item}>
                  <Link
                    href={`/category/${item.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-")}`}
                    className="text-cherry-100/90 transition-colors hover:text-cherry-400"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="transform space-y-3 transition-all duration-300 hover:-translate-y-1">
            <h2 className="text-lg font-bold text-white">Help</h2>
            <ul className="space-y-2 text-sm">
              {[
                ["Contact Us", "/contact"],
                ["Shipping Information", "/shipping"],
                ["Returns & Exchanges", "/returns"],
                ["Size Guide", "/size-guide"],
                ["FAQ", "/faq"],
              ].map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="text-cherry-100/90 transition-colors hover:text-cherry-400">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="transform space-y-3 transition-all duration-300 hover:-translate-y-1">
            <h2 className="text-lg font-bold text-white">Contact</h2>
            <ul className="space-y-2 text-sm">
              {[
                [MapPin, "123 Fashion Street, Nairobi, Kenya"],
                [Phone, "+254 700 000 000"],
                [Mail, "support@mizizzi.com"],
              ].map(([Icon, text], index) => (
                <li key={index} className="flex items-center gap-2 text-cherry-100/90">
                  <Icon className="h-4 w-4 text-cherry-500" />
                  {text}
                </li>
              ))}
            </ul>
            <div className="pt-4">
              <h3 className="mb-3 text-sm font-medium text-white">Accepted Payments</h3>
              <div className="flex gap-3">
                {paymentMethods.map((payment) => (
                  <motion.div
                    key={payment.name}
                    whileHover={{ scale: 1.05, y: -2 }}
                    className="relative h-10 overflow-hidden rounded-md bg-white p-2 shadow-sm transition-shadow duration-200 hover:shadow-lg hover:shadow-cherry-400/10"
                  >
                    <Image
                      src={payment.logo || "/placeholder.svg"}
                      alt={`${payment.name} payment method`}
                      width={payment.width}
                      height={payment.height}
                      className="h-full w-auto object-contain"
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Footer */}
        <div className="lg:hidden">
          {/* Mobile Logo and Description */}
          <div className="mb-8 flex flex-col items-center text-center">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative h-16 w-16 overflow-hidden rounded-lg bg-gradient-to-br from-cherry-800 to-cherry-900 p-0.5"
            >
              <Link href="/" className="block h-full w-full">
                <div className="h-full w-full rounded-lg bg-white p-2">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png"
                    alt="MIZIZZI"
                    width={48}
                    height={48}
                    className="h-full w-full object-contain"
                    priority
                  />
                </div>
              </Link>
            </motion.div>
            <div className="mt-4">
              <h2 className="text-xl font-bold text-white">Official Store</h2>
              <p className="text-sm text-cherry-100/80">Exclusive Collection</p>
            </div>
            <p className="mt-4 max-w-xs text-sm text-cherry-100/90">
              Discover our curated collection of fashion and jewelry pieces. Where style meets elegance.
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-4">
            {[
              ["Shop", ["Body Jewelry", "Dresses", "Tops & Jackets", "Bottoms", "Shoes", "Bags"]],
              ["Help", ["Contact Us", "Shipping Information", "Returns & Exchanges", "Size Guide", "FAQ"]],
              ["Contact", ["123 Fashion Street, Nairobi, Kenya", "+254 700 000 000", "support@mizizzi.com"]],
            ].map(([title, items]) => (
              <AccordionItem
                key={title as string}
                value={title as string}
                className="rounded-lg border border-cherry-700/20 px-4 shadow-sm"
              >
                <AccordionTrigger className="py-4 text-base font-medium text-white hover:text-cherry-400">
                  {title}
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <ul className="space-y-3 text-sm">
                    {items.map((item) => (
                      <li key={item}>
                        <Link href="#" className="text-cherry-100/90 transition-colors hover:text-cherry-400">
                          {item}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {/* Mobile Payment Methods */}
          <div className="mt-8 space-y-4">
            <h3 className="text-center text-sm font-medium text-white">Accepted Payments</h3>
            <div className="flex justify-center gap-4">
              {paymentMethods.map((payment) => (
                <motion.div
                  key={payment.name}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="relative h-12 overflow-hidden rounded-md bg-white p-2 shadow-sm transition-shadow duration-200 hover:shadow-lg hover:shadow-cherry-400/10"
                >
                  <Image
                    src={payment.logo || "/placeholder.svg"}
                    alt={`${payment.name} payment method`}
                    width={payment.width}
                    height={payment.height}
                    className="h-full w-auto object-contain"
                  />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Mobile Social Icons */}
          <div className="mt-8 flex justify-center gap-6">
            {socialMedia.map((social, index) => (
              <Link key={index} href={social.href} target="_blank" rel="noopener noreferrer">
                <motion.div
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.9 }}
                  className="relative h-10 w-10 overflow-hidden rounded-full bg-white p-2 shadow-sm transition-shadow duration-200 hover:shadow-lg hover:shadow-cherry-400/10"
                >
                  <Image
                    src={social.logo || "/placeholder.svg"}
                    alt={social.name}
                    width={social.width}
                    height={social.height}
                    className="h-full w-full object-contain"
                  />
                </motion.div>
              </Link>
            ))}
          </div>
        </div>

        {/* Copyright */}
        <div className="relative mt-12 border-t border-cherry-700/20 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row">
            <p className="text-sm text-cherry-100/90">© {new Date().getFullYear()} Mizizzi. All rights reserved.</p>
            <div className="flex gap-4 text-sm text-cherry-100/90">
              <Link href="/privacy" className="transition-colors hover:text-cherry-400">
                Privacy Policy
              </Link>
              <Separator orientation="vertical" className="h-4 bg-cherry-700/20" />
              <Link href="/terms" className="transition-colors hover:text-cherry-400">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

