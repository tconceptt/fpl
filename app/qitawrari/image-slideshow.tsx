"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"

const images = [
  "/Images/5EB66BF4-382F-4445-B79D-E37443A6EE6F.JPG"
    
  
]

export function ImageSlideshow() {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((current) => (current + 1) % images.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [])

  const goToNext = () => {
    setCurrentIndex((current) => (current + 1) % images.length)
  }

  const goToPrevious = () => {
    setCurrentIndex((current) => (current - 1 + images.length) % images.length)
  }

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20">
      <CardContent className="p-0">
        <div className="relative aspect-[16/9] w-full">
          <Image
            src={images[currentIndex]}
            alt="Slideshow image"
            fill
            className="object-cover transition-all duration-500"
            priority
          />
          <div className="absolute inset-0 bg-black/20" />
          
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 flex items-center justify-center text-white transition-all hover:bg-black/70"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 flex items-center justify-center text-white transition-all hover:bg-black/70"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 w-2 rounded-full transition-all ${
                  index === currentIndex ? "bg-white" : "bg-white/50"
                }`}
              />
            ))}
          </div>
        </div>
      </CardContent>
      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
    </Card>
  )
} 