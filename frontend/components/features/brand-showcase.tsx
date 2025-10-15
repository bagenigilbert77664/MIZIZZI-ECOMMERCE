"use client"

import { motion } from "framer-motion"
import { ShieldCheck, Truck, CreditCard, RotateCcw } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export function BrandShowcase() {
  const features = [
    {
      icon: ShieldCheck,
      title: "100% Authentic",
      description: "Every item is verified for authenticity",
    },
    {
      icon: Truck,
      title: "Fast Delivery",
      description: "24-48 hours in major cities",
    },
    {
      icon: CreditCard,
      title: "Secure Payment",
      description: "Multiple payment options",
    },
    {
      icon: RotateCcw,
      title: "Easy Returns",
      description: "14-day return policy",
    },
  ]

  const faqs = [
    {
      question: "How can I place an order?",
      answer:
        "Browse our collections, add items to your cart, and proceed to checkout. We accept various payment methods including M-PESA, credit cards, and cash on delivery.",
    },
    {
      question: "What are your delivery times?",
      answer:
        "We offer express delivery within 24-48 hours in major cities across Kenya. For other locations, delivery takes 3-5 business days.",
    },
    {
      question: "Are your products authentic?",
      answer: "Yes, all our products are 100% authentic and come with a certificate of authenticity for luxury items.",
    },
    {
      question: "What is your return policy?",
      answer: "We offer a hassle-free 14-day return policy for unused items in original packaging.",
    },
  ]

  return (
    <section className="w-full bg-white py-16">
      {/* Welcome Section */}
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h1 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl">Welcome to MIZIZZI</h1>
          <p className="mx-auto max-w-2xl text-base text-gray-600">
            Your premier destination for luxury fashion and jewelry in Kenya. Discover exclusive collections, unbeatable
            prices, and an exceptional shopping experience.
          </p>
        </div>

        {/* Features */}
        <div className="mb-20 grid grid-cols-2 gap-6 sm:grid-cols-4">
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <feature.icon className="mx-auto h-6 w-6 text-cherry-900" />
              <h3 className="mt-3 text-sm font-semibold text-gray-900">{feature.title}</h3>
              <p className="mt-1 text-xs text-gray-600">{feature.description}</p>
            </motion.div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-center text-2xl font-bold text-gray-900">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left text-base font-medium">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-sm text-gray-600">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}