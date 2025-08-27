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
const { sidePanelsVisible, isDesktop } = useResponsiveLayout()
const { currentSlide, isPaused, nextSlide, prevSlide, pause, resume } = useCarousel({
  itemsLength: carouselItems.length,
  autoPlay: true,
})

const activeItem = carouselItems[currentSlide]

return (
  <div className="relative w-full overflow-hidden">
    {/* Left side - Product Showcase - Only on very large screens */}
    {isDesktop && sidePanelsVisible && (
      <div className="absolute left-0 top-0 z-10 h-full w-[200px] transform p-2 xl:w-[220px]">
        <ProductShowcase />
      </div>
    )}

    {/* Right side - Premium Customer Experience - Only on very large screens */}
    {isDesktop && sidePanelsVisible && (
      <div className="absolute right-0 top-0 z-10 h-full w-[200px] transform p-2 xl:w-[220px]">
        <PremiumCustomerExperience />
      </div>
    )}

    {/* Main carousel content */}
    <div
      className={cn(
        "relative mx-auto grid w-full max-w-[1200px] gap-3 sm:gap-4",
        isDesktop && sidePanelsVisible ? "xl:grid-cols-[1fr,280px] xl:px-2" : "px-2 sm:px-4",
        "transition-all duration-300",
      )}
    >
      {/* Enhanced main carousel */}
      <main
        className="relative h-[300px] overflow-hidden rounded-xl border border-gray-100 shadow-sm sm:h-[400px] md:h-[450px] lg:h-[500px] xl:h-[400px]"
        onMouseEnter={pause}
        onMouseLeave={resume}
        onFocus={pause}
        onBlur={resume}
        role="region"
        aria-label="Featured products carousel"
        aria-live="polite"
      >
        <div className="absolute inset-0">
          {/* IMPORTANT: Only one child inside AnimatePresence */}
          <AnimatePresence mode="wait" initial={false}>
            {activeItem ? (
              <CarouselSlide
                key={String(currentSlide)}
                item={activeItem as any}
                isActive={true}
                index={currentSlide}
              />
            ) : null}
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
      </main>

      {/* Side cards - Large tablets and desktop only */}
      <aside
        className={cn("hidden flex-col gap-3 lg:flex xl:h-[400px]")}
        aria-label="Quick actions and promotions"
      >
        <FeatureCards />
        <ContactCTA />
      </aside>
    </div>
  </div>
)
}
