import NextImage, { type ImageProps as NextImageProps } from "next/image"
import { cn } from "@/lib/utils"

interface ImageProps extends NextImageProps {
  className?: string
}

export function Image({ className, alt, ...props }: ImageProps) {
  // Add priority prop to images that are likely to be above the fold
  const isPriority = props.src?.toString().includes("unsplash") || props.src?.toString().includes("placeholder.svg")

  return (
    <NextImage className={cn("rounded-md", className)} alt={alt} priority={isPriority || props.priority} {...props} />
  )
}

