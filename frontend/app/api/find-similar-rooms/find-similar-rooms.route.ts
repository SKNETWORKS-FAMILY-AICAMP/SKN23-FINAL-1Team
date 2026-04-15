import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000"

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json()

    if (!imageUrl) {
      return NextResponse.json(
        { error: "imageUrl이 필요합니다." },
        { status: 400 }
      )
    }

    const response = await fetch(`${BACKEND_URL}/api/find-similar-rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: imageUrl }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[find-similar-rooms] Python backend error:", errorText)
      throw new Error(`Python 백엔드 오류: ${response.status}`)
    }

    const data = await response.json()

    // Python 백엔드 응답을 프론트엔드 형태로 정규화
    // 기대 형태: { similarListings: [{ listingId: string, similarity: number }] }
    const similarListings = data.similar_listings ?? data.similarListings ?? []

    return NextResponse.json({ similarListings })
  } catch (error) {
    console.error("[find-similar-rooms] Error:", error)
    return NextResponse.json(
      { error: "유사 매물 검색에 실패했습니다." },
      { status: 500 }
    )
  }
}
