"use client"
import Icon from "@/public/image_icon.png"
import { useState, useRef, DragEvent } from "react"
import Image from "next/image"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Listing } from "./map-view"
import { useAuthStore } from "@/store/authStore"

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

type AIScreen = "init" | "generated"

const QUICK_PROMPTS = [
  "복층 구조로 만들어줘",
  "넓은 주방으로 만들어줘",
  "채광 좋게 만들어줘",
  "미니멀하게 만들어줘",
]

const ACCEPTED_TYPES = ["image/png", "image/jpeg"]

// ✅ 컴포넌트 외부로 이동 — 렌더마다 재생성되지 않아 input focus 끊김 해결
interface PromptInputWithUploadProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  placeholder: string
  inputSize?: "md" | "sm"
  attachedFile: File | null
  isDragging: boolean
  fileError: string
  onRemoveFile: () => void
  onFileClick: () => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

const PromptInputWithUpload = ({
  value,
  onChange,
  onKeyDown,
  placeholder,
  inputSize = "md",
  attachedFile,
  isDragging,
  fileError,
  onRemoveFile,
  onFileClick,
  fileInputRef,
  onFileChange,
}: PromptInputWithUploadProps) => (
  <div className="flex flex-col gap-1.5 w-full">
    {attachedFile && (
      <div className="flex items-center gap-2 px-2 py-1.5 bg-[#f5f0eb] border border-[#d6cfc8] rounded-lg">
        <div className="relative w-7 h-7 rounded-md overflow-hidden flex-shrink-0">
          <Image
            src={URL.createObjectURL(attachedFile)}
            alt={attachedFile.name}
            fill
            className="object-cover"
          />
        </div>
        <span className="text-xs text-stone-600 flex-1 truncate">{attachedFile.name}</span>
        <button
          onClick={onRemoveFile}
          className="text-stone-400 hover:text-stone-600 text-sm leading-none transition-colors"
        >
          ✕
        </button>
      </div>
    )}

    <div
      className={cn(
        "flex items-center w-full border rounded-xl overflow-hidden transition-all",
        isDragging
          ? "border-[#a8896c] ring-2 ring-[#a8896c]/30"
          : "border-[#d6cfc8]"
      )}
    >
      <button
        type="button"
        onClick={onFileClick}
        className="flex items-center justify-center h-full px-3 bg-white border-r border-[#d6cfc8] hover:bg-stone-50 transition-colors flex-shrink-0"
        style={{ minHeight: inputSize === "md" ? "42px" : "36px" }}
        title="이미지 첨부 (PNG, JPEG)"
      >
        <Image src={Icon} width={20} height={10} className="object-contain" alt="" />
      </button>
      <input
        type="text"
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={isDragging ? "이미지를 여기에 놓으세요" : placeholder}
        className={cn(
          "flex-1 bg-[#faf7f4] text-stone-800 placeholder:text-stone-400 focus:outline-none focus:bg-white transition-colors",
          inputSize === "md" ? "px-3 py-2.5 text-sm" : "px-3 py-2 text-xs"
        )}
      />
    </div>

    {fileError && (
      <p className="text-[11px] text-red-500 pl-1">{fileError}</p>
    )}

    <input
      ref={fileInputRef}
      type="file"
      accept="image/png,image/jpeg"
      className="hidden"
      onChange={onFileChange}
    />
  </div>
)

export function AIRecommendation({
  onSimilarListingsFound,
  allListings,
  compact = false,
}: AIRecommendationProps) {
  const [screen, setScreen] = useState<AIScreen>("init")
  const [prompt, setPrompt] = useState("")
  const [regenPrompt, setRegenPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null)
  const [isFindingSimilar, setIsFindingSimilar] = useState(false)
  const [editPrompt, setEditPrompt] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [message, setMessage] = useState("")

  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateAndSetFile = (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFileError("이 파일 형식은 지원하지 않아요!")
      return
    }
    setFileError("")
    setAttachedFile(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    validateAndSetFile(file)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // 전체 영역 드래그 이벤트
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    // 자식 요소로 이동할 때 false 방지
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    validateAndSetFile(file)
  }

  const removeFile = () => {
    setAttachedFile(null)
    setFileError("")
  }

  const handleGenerate = async (overridePrompt?: string) => {
    const activePrompt = overridePrompt ?? prompt
    if (!activePrompt.trim() || isGenerating) return

    setIsGenerating(true)
    setMessage("")
    setSelectedImage(null)

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: activePrompt }),
      })

      if (!response.ok) throw new Error("이미지 생성에 실패했습니다.")

      const data = await response.json()
      setGeneratedImages(data.images)
      setScreen("generated")
      setRegenPrompt("")
      setAttachedFile(null)
    } catch (error) {
      console.error("Error generating images:", error)
      setMessage("이미지 생성에 실패했습니다. 다시 시도해주세요.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSelectImage = (image: GeneratedImage) => {
    setSelectedImage((prev) => (prev?.id === image.id ? null : image))
    setEditPrompt("")
  }

  const handleEdit = async () => {
    if (!editPrompt.trim() || !selectedImage || isEditing) return

    setIsEditing(true)
    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: `${selectedImage.prompt}, ${editPrompt}` }),
      })

      if (!response.ok) throw new Error()

      const data = await response.json()
      setGeneratedImages(data.images)
      setSelectedImage(null)
      setEditPrompt("")
    } catch (error) {
      console.error("Error editing images:", error)
    } finally {
      setIsEditing(false)
    }
  }

  const user = useAuthStore((state) => state.user)

  const handleFindSimilar = async () => {
    if (!selectedImage || isFindingSimilar) return

    setIsFindingSimilar(true)
    try {
      // 갤러리 저장 (로그인 상태일 때만)
      if (user?.user_id) {
        await fetch("/api/gallery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user.user_id,
            image_url: selectedImage.url,
            prompt: selectedImage.prompt,
          }),
        })
      }

      const response = await fetch("/api/find-similar-rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: selectedImage.url }),
      })

      if (!response.ok) throw new Error()

      const data = await response.json()
      const similarListings = data.similarListings
        .map((item: { listingId: string; similarity: number }) =>
          allListings.find((l) => l.id === item.listingId)
        )
        .filter(Boolean) as Listing[]

      onSimilarListingsFound(
        similarListings.length > 0 ? similarListings : allListings.slice(0, 4)
      )
    } catch (error) {
      console.error("Error finding similar rooms:", error)
      onSimilarListingsFound(allListings.slice(0, 4))
    } finally {
      setIsFindingSimilar(false)
    }
  }

  const handleReset = () => {
    setScreen("init")
    setGeneratedImages([])
    setSelectedImage(null)
    setPrompt("")
    setRegenPrompt("")
    setEditPrompt("")
    setMessage("")
    setAttachedFile(null)
    setFileError("")
  }

  // 공통 props — PromptInputWithUpload에 넘길 파일 관련 값들
  const sharedFileProps = {
    attachedFile,
    isDragging,
    fileError,
    onRemoveFile: removeFile,
    onFileClick: () => fileInputRef.current?.click(),
    fileInputRef,
    onFileChange: handleFileChange,
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
              onClick={() => handleGenerate()}
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
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

      {/* 상태 1 — 전체 영역에 드래그 이벤트 */}
      {screen === "init" && (
        <div
          className={cn(
            "flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col items-center justify-center px-5 py-8 gap-5 transition-all rounded-xl",
            isDragging && "bg-[#f5f0eb] ring-2 ring-inset ring-[#a8896c]/40"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* 드래그 중 오버레이 텍스트 */}
          {isDragging && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="bg-white/90 rounded-xl px-6 py-3 border border-[#a8896c] text-sm font-semibold text-[#a8896c]">
                이미지를 여기에 놓으세요
              </div>
            </div>
          )}

          <div className="w-14 h-14 rounded-2xl bg-[#f5f0eb] border border-[#e8e0d5] flex items-center justify-center">
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <rect x="2.5" y="2.5" width="21" height="21" rx="3.5" stroke="#a8896c" strokeWidth="1.5"/>
              <circle cx="8.5" cy="8.5" r="2" stroke="#a8896c" strokeWidth="1.5"/>
              <path d="M2.5 18l6-6 4 4 3.5-3.5 8 8" stroke="#a8896c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <div className="text-center">
            <p className="text-sm font-semibold text-stone-800 mb-1">원하는 방 구조를 설명해주세요</p>
            <p className="text-xs text-stone-500 leading-relaxed">
              설명한 내용을 바탕으로 AI가<br />이미지를 만들어드려요
            </p>
          </div>

          <div className="w-full flex flex-col gap-2">
            <PromptInputWithUpload
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder="예) 복층 구조에 채광 좋은 원룸..."
              inputSize="md"
              {...sharedFileProps}
            />
            <button
              onClick={() => handleGenerate()}
              disabled={isGenerating || !prompt.trim()}
              className="w-full flex items-center justify-center py-2.5 bg-stone-700 text-white rounded-xl text-sm font-semibold hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : "이미지 생성하기!"}
            </button>
          </div>

          <div className="w-full grid grid-cols-2 gap-2">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                onClick={() => {
                  setPrompt(q)
                  handleGenerate(q)
                }}
                className="px-3 py-2 rounded-lg bg-[#faf7f4] border border-[#e8e0d5] text-xs text-stone-500 hover:border-[#a8896c] hover:text-[#a8896c] hover:bg-[#f5f0eb] transition-all whitespace-nowrap overflow-hidden text-ellipsis"
              >
                {q}
              </button>
            ))}
          </div>

          {message && (
            <p className="text-xs text-red-500 text-center">{message}</p>
          )}
        </div>
      )}

      {/* 상태 2 — 생성 후 */}
      {screen === "generated" && (
        <>
          <div className="flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-3 pt-3">
            <div className="grid grid-cols-2 gap-2 pb-2">
              {generatedImages.map((image, index) => {
                const isSelected = selectedImage?.id === image.id
                const isDimmed = selectedImage !== null && !isSelected

                return (
                  <div
                    key={image.id}
                    onClick={() => handleSelectImage(image)}
                    className={cn(
                      "relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all duration-150",
                      isSelected ? "border-stone-600" : "border-transparent",
                      isDimmed && "opacity-30"
                    )}
                  >
                    <Image
                      src={image.url}
                      alt={image.prompt}
                      fill
                      className="object-cover"
                    />
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-stone-700 flex items-center justify-center">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <polyline points="1.5,5 4,7.5 8.5,2.5" stroke="white" strokeWidth="2.5"/>
                        </svg>
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 bg-black/45 text-white text-[10px] px-1.5 py-0.5 rounded">
                      {index + 1}/4
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 케이스 1 — 선택 전 */}
          {!selectedImage && (
            <div className="shrink-0 border-t border-[#e8e0d5] px-3 py-3 flex flex-col gap-2">
              <p className="text-xs text-stone-500 text-center">마음에 드는 이미지를 선택하세요</p>
              <div className="flex gap-2">
                <PromptInputWithUpload
                  value={regenPrompt}
                  onChange={(e) => setRegenPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGenerate(regenPrompt)}
                  placeholder="다른 스타일로 바꿔볼까요?"
                  inputSize="sm"
                  {...sharedFileProps}
                />
                <button
                  onClick={() => handleGenerate(regenPrompt)}
                  disabled={isGenerating || !regenPrompt.trim()}
                  className="px-3 py-2 bg-stone-700 text-white rounded-lg text-xs font-semibold hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap self-end"
                >
                  {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "재생성"}
                </button>
              </div>
              <button
                onClick={handleReset}
                className="text-xs text-stone-400 text-center hover:text-stone-600 transition-colors"
              >
                ← 처음으로
              </button>
            </div>
          )}

          {/* 케이스 2 + 3 — 선택 후 */}
          {selectedImage && (
            <div className="shrink-0 border-t border-[#e8e0d5] px-3 py-3 flex flex-col gap-2">
              <div className="bg-[#faf7f4] rounded-xl p-2.5 border border-[#e8e0d5] flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-stone-700 leading-relaxed font-semibold">
                    조금 더 바꾸고 싶다면? 구체적일수록 잘 반영돼요<br />
                    <span className="text-[10px] text-stone-400 font-normal">
                      예) &quot;창문을 크게&quot;, &quot;더 밝은 느낌으로&quot;
                    </span>
                  </p>
                  <button
                    onClick={() => { setSelectedImage(null); setEditPrompt("") }}
                    className="text-stone-400 hover:text-stone-600 transition-colors shrink-0 mt-0.5 text-sm leading-none"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleEdit()}
                    placeholder="변경사항을 입력하세요..."
                    className="flex-1 px-3 py-2 bg-white border border-[#d6cfc8] rounded-lg text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400/40"
                  />
                  <button
                    onClick={handleEdit}
                    disabled={isEditing || !editPrompt.trim()}
                    className="px-3 py-2 bg-stone-700 text-white rounded-lg text-xs font-semibold hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  >
                    {isEditing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "수정하기!"}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-[#e8e0d5]" />
                <span className="text-[10px] text-stone-400">이 이미지가 마음에 든다면</span>
                <div className="flex-1 h-px bg-[#e8e0d5]" />
              </div>

              <button
                onClick={handleFindSimilar}
                disabled={isFindingSimilar}
                className="w-full py-2.5 bg-stone-700 text-white rounded-xl text-sm font-semibold hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isFindingSimilar ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  "이 이미지로 유사 매물 검색 →"
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
