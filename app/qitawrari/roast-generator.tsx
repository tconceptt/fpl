"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Flame } from "lucide-react"
import { cn } from "@/lib/utils"

const jokes =  [
  "T's scalp is smoother than United's midfield—zero resistance, zero wins.",
  "Etsub's so short, he captains Salah just to feel tall for once.",
  "Dedebu's name translates to 'idiot,' ስምን መላክ ያወጣዋል አሉ.",
  "Eyosi's Jiu Jitsu is so weak, his FPL team submits faster.",
  "Biruk's IQ is so low, he thinks Arsenal's invincible again.",
  "Bk's rap career tanked harder than his FPL rookie season.",
  "Aman's FPL glory days are deader than Liverpool's title odds.",
  "Kena storms the chat like United's attack—brief and pointless.",
  "Zemike's so quiet, we forgot he's even in the league.",
]

export function RoastGenerator() {
  const [currentJoke, setCurrentJoke] = useState("")
  const [isAnimating, setIsAnimating] = useState(false)

  const generateRoast = () => {
    setIsAnimating(true)
    const randomJoke = jokes[Math.floor(Math.random() * jokes.length)]
    setCurrentJoke(randomJoke)
    setTimeout(() => setIsAnimating(false), 500)
  }

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-orange-500/20 to-red-500/20">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl font-medium">CORNY Jokes for Free!🔥</CardTitle>
        <Flame className="h-6 w-6 text-orange-500 animate-pulse" />
      </CardHeader>
      <CardContent className="space-y-4">
        <button
          onClick={generateRoast}
          className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium transition-all hover:opacity-90 active:scale-95"
        >
          Get roasted by Grok 3 
        </button>
        
        {currentJoke && (
          <div className="mt-4 p-4 rounded-lg bg-white/5 backdrop-blur-sm">
            <p className={cn(
              "text-lg font-medium text-white transition-all duration-500",
              isAnimating && "scale-105 opacity-0"
            )}>
              {currentJoke}
            </p>
          </div>
        )}
      </CardContent>
      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-orange-500 to-red-500" />
    </Card>
  )
} 