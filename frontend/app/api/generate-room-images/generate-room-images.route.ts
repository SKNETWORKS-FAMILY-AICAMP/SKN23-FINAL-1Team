import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000"

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json()

    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: "프롬프트를 입력해주세요." },
        { status: 400 }
      )
    }

    const response = await fetch(`${BACKEND_URL}/api/generate-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_prompt: prompt,
        size: "1024x1024",
        quality: "standard",
        n: 1,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[generate-room-images] Python backend error:", errorText)
      throw new Error(`Python 백엔드 오류: ${response.status}`)
    }

    const data = await response.json()

    // Python 백엔드 응답: { file_paths: [...] } or { images: [...] }
    // 프론트엔드가 기대하는 형태: { images: [{ id, url, prompt }] }
    const filePaths: string[] = data.file_paths ?? data.images ?? []

    const images = filePaths.map((filePath: string, index: number) => ({
      id: `${Date.now()}-${index}`,
      // Python 서버가 static으로 serve하는 경로로 변환
      url: `${BACKEND_URL}/images/${encodeURIComponent(
        filePath.split(/[\\/]/).pop() ?? filePath
      )}`,
      prompt,
    }))

    return NextResponse.json({ images })
  } catch (error) {
    console.error("[generate-room-images] Error:", error)
    return NextResponse.json(
      { error: "이미지 생성에 실패했습니다. 다시 시도해주세요." },
      { status: 500 }
    )
  }
}
