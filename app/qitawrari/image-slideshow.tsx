"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"

const images = [
  "/Images/5EB66BF4-382F-4445-B79D-E37443A6EE6F.JPG",
]

export function ImageSlideshow() {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (images.length <= 1) return
    const timer = setInterval(() => {
      setCurrentIndex((current) => (current + 1) % images.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  const goToNext = () => {
    setCurrentIndex((current) => (current + 1) % images.length)
  }

  const goToPrevious = () => {
    setCurrentIndex((current) => (current - 1 + images.length) % images.length)
  }

  return (
    <Card className="overflow-hidden p-0">
      <CardContent className="p-0">
        <div className="relative aspect-[16/9] w-full bg-surface-2">
          <Image
            src={images[currentIndex]}
            alt="Qitawrari league moment"
            fill
            className="object-cover"
            priority
          />

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={goToPrevious}
                aria-label="Previous image"
                className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface-3 text-fg transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={goToNext}
                aria-label="Next image"
                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface-3 text-fg transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                {images.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setCurrentIndex(index)}
                    aria-label={`Show image ${index + 1}`}
                    aria-current={index === currentIndex}
                    className={cn(
                      "h-1.5 w-1.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      index === currentIndex ? "bg-accent" : "bg-fg-3"
                    )}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
