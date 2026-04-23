import { NextRequest, NextResponse } from "next/server"
import { buildBackendApiUrl } from "@/lib/api/backend-url"

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const response = await fetch(buildBackendApiUrl(BACKEND_URL, "/gallery"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[gallery] Backend error:", errorText)
      throw new Error(`Backend error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("[gallery] Error:", error)
    return NextResponse.json(
      { error: "갤러리 저장에 실패했습니다." },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")

    if (!userId) {
      return NextResponse.json({ error: "user_id가 필요합니다." }, { status: 400 })
    }

    const response = await fetch(
      buildBackendApiUrl(BACKEND_URL, `/gallery?user_id=${userId}`),
      { method: "GET" }
    )

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("[gallery] Error:", error)
    return NextResponse.json(
      { error: "갤러리 조회에 실패했습니다." },
      { status: 500 }
    )
  }
}
