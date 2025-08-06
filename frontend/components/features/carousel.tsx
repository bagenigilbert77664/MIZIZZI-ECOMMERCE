"use client"
import { AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { carouselItems } from "@/constants/carousel"
import { useCarousel } from "@/hooks/use-carousel"
import { useResponsiveLayout } from "@/hooks/use-responsive-layout"
import { CarouselSlide } from "@/components/carousel/carousel-slide"
import { CarouselNavigation } from "@/components/carousel/carousel-navigation"
import { FeatureCards } from "@/components/carousel/feature-cards"
import { ContactCTA } from "@/components/carousel/contact-cta"
import { PremiumCustomerExperience } from "@/components/carousel/premium-customer-experience"
import { ProductShowcase } from "@/components/carousel/product-showcase"

export function Carousel() {
  const { sidePanelsVisible, isDesktop, isLargeTablet } = useResponsiveLayout()
  const { currentSlide, isPaused, nextSlide, prevSlide, pause, resume } = useCarousel({
    itemsLength: carouselItems.length,
    autoPlay: true,
  })

  return (
    <div className="relative w-full overflow-hidden">
      {/* Left side - Product Showcase - Only on very large screens */}
      {isDesktop && sidePanelsVisible && (
        <div className="absolute left-0 top-0 h-full w-[200px] xl:w-[220px] transform z-10 p-2">
          <ProductShowcase />
        </div>
      )}

      {/* Right side - Premium Customer Experience - Only on very large screens */}
      {isDesktop && sidePanelsVisible && (
        <div className="absolute right-0 top-0 h-full w-[200px] xl:w-[220px] transform z-10 p-2">
          <PremiumCustomerExperience />
        </div>
      )}

      {/* Main carousel content */}
      <div
        className={cn(
          "mx-auto w-full max-w-[1200px] grid gap-3 sm:gap-4",
          isDesktop && sidePanelsVisible ? "xl:px-2 xl:grid-cols-[1fr,280px]" : "px-2 sm:px-4",
          "relative transition-all duration-300",
        )}
      >
        {/* Enhanced main carousel */}
        <main
          className="relative h-[300px] sm:h-[400px] md:h-[450px] lg:h-[500px] xl:h-[400px] overflow-hidden rounded-xl shadow-sm border border-gray-100"
          onMouseEnter={pause}
          onMouseLeave={resume}
          onFocus={pause}
          onBlur={resume}
          role="region"
          aria-label="Featured products carousel"
          aria-live="polite"
        >
          <div className="absolute inset-0">
            <AnimatePresence mode="wait">
              {carouselItems.map((item, index) => (
                <CarouselSlide key={index} item={item} isActive={index === currentSlide} index={index} />
              ))}
            </AnimatePresence>
          </div>

          {/* Navigation arrows */}
          <CarouselNavigation
            onPrevious={prevSlide}
            onNext={nextSlide}
            isPaused={isPaused}
            onPause={pause}
            onResume={resume}
          />

          {/* Progress indicator removed */}
        </main>

        {/* Side cards - Large tablets and desktop only */}
        <aside
          className={cn("flex-col gap-3", "hidden lg:flex xl:h-[400px]")}
          aria-label="Quick actions and promotions"
        >
          {/* Feature cards */}
          <FeatureCards />

          {/* Contact CTA */}
          <ContactCTA />
        </aside>
      </div>
    </div>
  )
}
