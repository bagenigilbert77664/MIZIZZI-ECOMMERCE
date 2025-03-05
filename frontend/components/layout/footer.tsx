"use client"

import type React from "react"

import Image from "next/image"
import Link from "next/link"
import {
  MapPin,
  Mail,
  Phone,
  Clock,
  Globe,
  CreditCard,
  ShieldCheck,
  Truck,
  Heart,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
  ChevronRight,
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { motion } from "framer-motion"
import { useState } from "react"

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
    name: "Mastercard",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1280px-Mastercard-logo.svg.png",
    width: 50,
    height: 30,
  },
  {
    name: "Stripe",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Stripe_Logo%2C_revised_2016.svg/512px-Stripe_Logo%2C_revised_2016.svg.png",
    width: 70,
    height: 30,
  },
  {
    name: "PayPal",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/PayPal.svg/1200px-PayPal.svg.png",
    width: 80,
    height: 30,
  },
]

const socialMedia = [
  {
    name: "Facebook",
    icon: Facebook,
    href: "https://facebook.com",
    color: "#1877F2",
  },
  {
    name: "Instagram",
    icon: Instagram,
    href: "https://instagram.com",
    color: "#E4405F",
  },
  {
    name: "Twitter",
    icon: Twitter,
    href: "https://twitter.com",
    color: "#1DA1F2",
  },
  {
    name: "YouTube",
    icon: Youtube,
    href: "https://youtube.com",
    color: "#FF0000",
  },
]

const customerServiceLinks = [
  { name: "Contact Us", href: "/contact" },
  { name: "Shipping Information", href: "/shipping" },
  { name: "Returns & Exchanges", href: "/returns" },
  { name: "Size Guide", href: "/size-guide" },
  { name: "FAQ", href: "/faq" },
  { name: "Track Order", href: "/track-order" },
]

const companyLinks = [
  { name: "About Us", href: "/about" },
  { name: "Careers", href: "/careers" },
  { name: "Store Locator", href: "/store-locator" },
  { name: "Corporate Responsibility", href: "/responsibility" },
  { name: "Press", href: "/press" },
]

const legalLinks = [
  { name: "Terms of Service", href: "/terms" },
  { name: "Privacy Policy", href: "/privacy" },
  { name: "Cookie Policy", href: "/cookies" },
  { name: "Accessibility", href: "/accessibility" },
]

export function Footer() {
  const [email, setEmail] = useState("")
  const [subscribed, setSubscribed] = useState(false)
  const [language, setLanguage] = useState("en")

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      setSubscribed(true)
      setEmail("")
      // In a real app, you would send this to your API
      setTimeout(() => setSubscribed(false), 5000)
    }
  }

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "sw" : "en")
  }

  return (
    <footer className="relative bg-gray-800 text-gray-200">
      {/* Newsletter Section */}
      <div className="relative border-b border-gray-700">
        <div className="container mx-auto max-w-[1200px] px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-xl font-bold sm:text-2xl">Join Our Newsletter</h3>
              <p className="max-w-md text-gray-400">
                Subscribe to receive updates, exclusive offers, and special discounts directly to your inbox.
              </p>
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-gray-400" />
                <button onClick={toggleLanguage} className="text-sm text-gray-400 hover:text-white">
                  {language === "en" ? "English" : "Kiswahili"}
                </button>
              </div>
            </div>
            <div>
              {subscribed ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg bg-green-900/20 p-4 text-center"
                >
                  <p className="font-medium text-white">
                    {language === "en" ? "Thank you for subscribing!" : "Asante kwa kujisajili!"}
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    {language === "en"
                      ? "You'll receive our next newsletter soon."
                      : "Utapokea jarida letu la habari hivi karibuni."}
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubscribe} className="space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      type="email"
                      placeholder={language === "en" ? "Your email address" : "Barua pepe yako"}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="border-gray-700 bg-gray-700/50 text-white placeholder:text-gray-500"
                      required
                    />
                    <Button type="submit" className="bg-white text-gray-900 hover:bg-gray-200">
                      {language === "en" ? "Subscribe" : "Jiandikishe"}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    {language === "en"
                      ? "By subscribing, you agree to our Privacy Policy and consent to receive updates from our company."
                      : "Kwa kujisajili, unakubali Sera yetu ya Faragha na kukubali kupokea masasisho kutoka kwa kampuni yetu."}
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="relative container mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8">
        {/* Desktop Footer */}
        <div className="hidden lg:grid grid-cols-12 gap-8">
          {/* Brand Column */}
          <div className="col-span-4 space-y-6">
            <div className="flex items-center gap-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative h-20 w-20 overflow-hidden rounded-lg bg-white p-0.5 shadow-sm"
              >
                <Link href="/" className="block h-full w-full">
                  <div className="h-full w-full rounded-lg bg-white p-2">
                    <Image
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png"
                      alt="MIZIZZI"
                      width={64}
                      height={64}
                      className="h-full w-full object-contain"
                      priority
                    />
                  </div>
                </Link>
              </motion.div>
              <div>
                <h2 className="text-xl font-bold text-white">Mizizzi</h2>
                <p className="text-sm text-gray-400">Premium Fashion & Jewelry</p>
              </div>
            </div>
            <p className="max-w-xs text-sm text-gray-400">
              Discover our curated collection of fashion and jewelry pieces. Where style meets elegance, crafted for the
              modern Kenyan and global customer.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span>123 Fashion Street, Nairobi, Kenya</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Phone className="h-4 w-4 text-gray-500" />
                <span>+254 700 000 000</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Mail className="h-4 w-4 text-gray-500" />
                <span>support@mizizzi.com</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Clock className="h-4 w-4 text-gray-500" />
                <span>Mon-Sat: 9AM - 9PM, Sun: 10AM - 6PM</span>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              {socialMedia.map((social) => (
                <Link key={social.name} href={social.href} target="_blank" rel="noopener noreferrer">
                  <motion.div
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.9 }}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
                    style={{ color: social.color }}
                  >
                    <social.icon className="h-5 w-5" />
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>

          {/* Customer Service & Company */}
          <div className="col-span-4 space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white">Customer Service</h3>
              <ul className="grid grid-cols-2 gap-2">
                {customerServiceLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                    >
                      <ChevronRight className="h-3 w-3" />
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white">Company</h3>
              <ul className="grid grid-cols-2 gap-2">
                {companyLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                    >
                      <ChevronRight className="h-3 w-3" />
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Trust Badges & Payment */}
          <div className="col-span-4 space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white">We Promise</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-gray-700 p-1.5">
                    <ShieldCheck className="h-4 w-4 text-gray-400" />
                  </div>
                  <span className="text-sm text-gray-400">100% Authentic Products</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-gray-700 p-1.5">
                    <Truck className="h-4 w-4 text-gray-400" />
                  </div>
                  <span className="text-sm text-gray-400">Fast Delivery Nationwide</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-gray-700 p-1.5">
                    <CreditCard className="h-4 w-4 text-gray-400" />
                  </div>
                  <span className="text-sm text-gray-400">Secure Payment Options</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-gray-700 p-1.5">
                    <Heart className="h-4 w-4 text-gray-400" />
                  </div>
                  <span className="text-sm text-gray-400">14-Day Easy Returns</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-bold text-white">We Accept</h3>
              <div className="flex flex-wrap gap-3">
                {paymentMethods.map((payment) => (
                  <motion.div
                    key={payment.name}
                    whileHover={{ scale: 1.05, y: -2 }}
                    className="relative h-10 overflow-hidden rounded-md bg-white p-1.5 shadow-sm transition-shadow duration-200 hover:shadow-lg"
                  >
                    <Image
                      src={payment.logo || "/placeholder.svg"}
                      alt={`${payment.name} payment method`}
                      width={payment.width * 1.5}
                      height={payment.height * 1.5}
                      className="h-full w-auto object-contain"
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Footer */}
        <div className="lg:hidden space-y-8">
          {/* Mobile Logo and Description */}
          <div className="flex flex-col items-center text-center">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative h-20 w-20 overflow-hidden rounded-lg bg-white p-0.5"
            >
              <Link href="/" className="block h-full w-full">
                <div className="h-full w-full rounded-lg bg-white p-2">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png"
                    alt="MIZIZZI"
                    width={64}
                    height={64}
                    className="h-full w-full object-contain"
                    priority
                  />
                </div>
              </Link>
            </motion.div>
            <div className="mt-4">
              <h2 className="text-xl font-bold text-white">Mizizzi</h2>
              <p className="text-sm text-gray-400">Premium Fashion & Jewelry</p>
            </div>
            <p className="mt-4 max-w-xs text-sm text-gray-400">
              Discover our curated collection of fashion and jewelry pieces. Where style meets elegance.
            </p>
          </div>

          {/* Mobile Contact Info */}
          <div className="space-y-3 rounded-lg bg-gray-700 p-4">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span>123 Fashion Street, Nairobi, Kenya</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Phone className="h-4 w-4 text-gray-400" />
              <span>+254 700 000 000</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Mail className="h-4 w-4 text-gray-400" />
              <span>support@mizizzi.com</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Clock className="h-4 w-4 text-gray-400" />
              <span>Mon-Sat: 9AM - 9PM, Sun: 10AM - 6PM</span>
            </div>
          </div>

          {/* Mobile Social Media */}
          <div className="space-y-4">
            <h3 className="text-center text-lg font-bold text-white">Connect With Us</h3>
            <div className="flex justify-center gap-4">
              {socialMedia.map((social) => (
                <Link key={social.name} href={social.href} target="_blank" rel="noopener noreferrer">
                  <motion.div
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.9 }}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
                    style={{ color: social.color }}
                  >
                    <social.icon className="h-6 w-6" />
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>

          {/* Mobile Accordion Sections */}
          <Accordion type="single" collapsible className="w-full space-y-4">
            <AccordionItem value="customer-service" className="rounded-lg border border-gray-700 px-4 shadow-sm">
              <AccordionTrigger className="py-4 text-base font-medium text-white hover:text-gray-300">
                Customer Service
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <ul className="grid grid-cols-2 gap-2">
                  {customerServiceLinks.map((link) => (
                    <li key={link.name}>
                      <Link href={link.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="company" className="rounded-lg border border-gray-700 px-4 shadow-sm">
              <AccordionTrigger className="py-4 text-base font-medium text-white hover:text-gray-300">
                Company
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <ul className="grid grid-cols-2 gap-2">
                  {companyLinks.map((link) => (
                    <li key={link.name}>
                      <Link href={link.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="trust" className="rounded-lg border border-gray-700 px-4 shadow-sm">
              <AccordionTrigger className="py-4 text-base font-medium text-white hover:text-gray-300">
                We Promise
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center gap-2">
                    <div className="rounded-full bg-gray-700 p-1.5">
                      <ShieldCheck className="h-4 w-4 text-gray-400" />
                    </div>
                    <span className="text-sm text-gray-400">100% Authentic Products</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="rounded-full bg-gray-700 p-1.5">
                      <Truck className="h-4 w-4 text-gray-400" />
                    </div>
                    <span className="text-sm text-gray-400">Fast Delivery Nationwide</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="rounded-full bg-gray-700 p-1.5">
                      <CreditCard className="h-4 w-4 text-gray-400" />
                    </div>
                    <span className="text-sm text-gray-400">Secure Payment Options</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="rounded-full bg-gray-700 p-1.5">
                      <Heart className="h-4 w-4 text-gray-400" />
                    </div>
                    <span className="text-sm text-gray-400">14-Day Easy Returns</span>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Mobile Payment Methods */}
          <div className="space-y-4">
            <h3 className="text-center text-lg font-bold text-white">We Accept</h3>
            <div className="flex flex-wrap justify-center gap-3">
              {paymentMethods.map((payment) => (
                <motion.div
                  key={payment.name}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="relative h-10 overflow-hidden rounded-md bg-white p-1.5 shadow-sm transition-shadow duration-200 hover:shadow-lg"
                >
                  <Image
                    src={payment.logo || "/placeholder.svg"}
                    alt={`${payment.name} payment method`}
                    width={payment.width * 1.5}
                    height={payment.height * 1.5}
                    className="h-full w-auto object-contain"
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="relative mt-12 border-t border-gray-700 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row">
            <p className="text-sm text-gray-500">© {new Date().getFullYear()} Mizizzi. All rights reserved.</p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
              {legalLinks.map((link, index) => (
                <div key={link.name} className="flex items-center">
                  {index > 0 && <Separator orientation="vertical" className="mx-2 h-4 bg-gray-600" />}
                  <Link href={link.href} className="transition-colors hover:text-white">
                    {link.name}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

