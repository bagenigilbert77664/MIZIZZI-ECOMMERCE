"use client"
import { CloudinaryImagesTab } from "./cloudinary-images-tab"
import CloudinaryImageData from "@/services/cloudinary-service"

interface ProductImagesTabProps {
  images: string[]
  setImages: (images: string[]) => void
  setFormChanged: (changed: boolean) => void
  saveSectionChanges: (section: string) => Promise<boolean>
  productId?: string
}

export function ProductImagesTab({
  images,
  setImages,
  setFormChanged,
  saveSectionChanges,
  productId,
}: ProductImagesTabProps) {
  const handleImagesChange = (cloudinaryImages: CloudinaryImageData[]) => {
    // Convert Cloudinary images to URL array for backward compatibility
    const imageUrls = cloudinaryImages.map((img) => img.secure_url || img.url)
    setImages(imageUrls)
    setFormChanged(true)
  }

  if (!productId) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Product ID is required to manage images</p>
      </div>
    )
  }

  return <CloudinaryImagesTab productId={productId} onImagesChange={handleImagesChange} />
}
