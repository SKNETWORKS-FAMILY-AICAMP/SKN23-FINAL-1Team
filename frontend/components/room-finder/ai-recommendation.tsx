"use client"

import { useState } from "react"
import Image from "next/image"
import { Send, Loader2, ChevronLeft, Share2, Bookmark } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Listing } from "./map-view"

interface AIRecommendationProps {
  onSimilarListingsFound: (listings: Listing[]) => void
  allListings: Listing[]
  compact?: boolean
}

interface GeneratedImage {
  id: string
  url: string
  prompt: string
}

export function AIRecommendation({
  onSimilarListingsFound,
  allListings,
  compact = false,
}: AIRecommendationProps) {
  const [prompt, setPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null)
  const [isFindingSimilar, setIsFindingSimilar] = useState(false)
  const [message, setMessage] = useState("")

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return

    setIsGenerating(true)
    setMessage("")
    setGeneratedImages([])

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      })

      if (!response.ok) {
        throw new Error("이미지 생성에 실패했습니다.")
      }

      const data = await response.json()
      setGeneratedImages(data.images)
    } catch (error) {
      console.error("Error generating images:", error)
      setMessage("이미지 생성에 실패했습니다. 다시 시도해주세요.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleImageClick = async (image: GeneratedImage) => {
    setSelectedImage(image)
    setIsFindingSimilar(true)

    try {
      const response = await fetch("/api/find-similar-rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: image.url }),
      })

      if (!response.ok) {
        throw new Error("유사 매물 검색에 실패했습니다.")
      }

      const data = await response.json()
      
      const similarListings = data.similarListings.map((item: { listingId: string; similarity: number }) => {
        const listing = allListings.find((l) => l.id === item.listingId)
        return listing
      }).filter(Boolean) as Listing[]

      onSimilarListingsFound(similarListings.length > 0 ? similarListings : allListings.slice(0, 4))
    } catch (error) {
      console.error("Error finding similar rooms:", error)
      onSimilarListingsFound(allListings.slice(0, 4))
    } finally {
      setIsFindingSimilar(false)
    }
  }

  if (compact) {
    return (
      <div className="p-3 md:p-4 border-t border-border-warm bg-linen">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <span className="text-xs md:text-sm text-neutral-muted shrink-0">
            {message || "최근 독산동 정보로는 '복층에 창문에 3개가 있는 방'이 만들어졌어요"}
          </span>
          <div className="w-full sm:flex-1 flex items-center gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder="다시 생성하려면 입력하세요..."
              className="flex-1 px-3 py-2 bg-linen border border-border-warm rounded-lg text-xs md:text-sm text-neutral-dark placeholder:text-neutral-muted focus:outline-none focus:ring-2 focus:ring-warm-brown/50"
            />
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="px-3 md:px-4 py-2 bg-linen border border-border-warm rounded-lg text-xs md:text-sm font-medium text-neutral-dark hover:bg-beige disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : "입력"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full p-3 md:p-4">
      {generatedImages.length === 0 ? (
        <>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-4 md:p-6 bg-linen rounded-lg max-w-sm border border-border-warm">
              <p className="text-sm md:text-base text-neutral-muted">
                {message || "최근 독산동 정보로는 '복층에 창문에 3개가 있는 방'이 만들어졌어요"}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                placeholder="원하는 방 구조를 설명해주세요..."
                className="flex-1 px-3 md:px-4 py-2 md:py-3 bg-linen border border-border-warm rounded-lg text-sm md:text-base text-neutral-dark placeholder:text-neutral-muted focus:outline-none focus:ring-2 focus:ring-warm-brown/50"
              />
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="p-2 md:p-3 bg-warm-brown text-ivory rounded-lg hover:bg-warm-brown-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 md:h-5 md:w-5" />
                )}
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex-1">
            <div className="grid grid-cols-2 gap-2 md:gap-3">
              {generatedImages.map((image) => (
                <div
                  key={image.id}
                  onClick={() => !isFindingSimilar && handleImageClick(image)}
                  className={cn(
                    "relative aspect-square rounded-lg overflow-hidden cursor-pointer group",
                    selectedImage?.id === image.id && "ring-2 ring-warm-brown",
                    isFindingSimilar && "pointer-events-none"
                  )}
                >
                  <Image
                    src={image.url}
                    alt={image.prompt}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                  
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors">
                    <div className="absolute top-1 md:top-2 right-1 md:right-2 flex gap-0.5 md:gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1 md:p-1.5 bg-linen/80 rounded-md hover:bg-linen">
                        <ChevronLeft className="h-3 w-3 md:h-4 md:w-4 text-neutral-dark" />
                      </button>
                      <button className="p-1 md:p-1.5 bg-linen/80 rounded-md hover:bg-linen">
                        <Share2 className="h-3 w-3 md:h-4 md:w-4 text-neutral-dark" />
                      </button>
                      <button className="p-1 md:p-1.5 bg-linen/80 rounded-md hover:bg-linen">
                        <Bookmark className="h-3 w-3 md:h-4 md:w-4 text-neutral-dark" />
                      </button>
                    </div>
                    <div className="absolute bottom-1 md:bottom-2 right-1 md:right-2 text-[10px] md:text-xs text-white/80 bg-black/50 px-1 md:px-1.5 py-0.5 rounded">
                      1/16
                    </div>
                  </div>

                  {isFindingSimilar && selectedImage?.id === image.id && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 md:h-8 md:w-8 text-white animate-spin" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <span className="text-xs md:text-sm text-neutral-muted shrink-0">
                최근 독산동 정보로는 &apos;복층에 창문에 3개가 있는 방&apos;이 만들어졌어요
              </span>
              <button
                onClick={() => {
                  setGeneratedImages([])
                  setPrompt("")
                }}
                className="px-3 md:px-4 py-2 bg-linen border border-border-warm rounded-lg text-xs md:text-sm font-medium text-neutral-dark hover:bg-beige transition-colors"
              >
                입력
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
