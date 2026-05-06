import { NextRequest, NextResponse } from "next/server";
import { buildBackendApiUrl, getBackendApiBaseUrl } from "@/lib/api/backend-url";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

function toBackendReadableImageUrl(imageUrl: string) {
  const backendApiBaseUrl = getBackendApiBaseUrl(BACKEND_URL);

  if (imageUrl.startsWith("/backend/api/")) {
    return `${backendApiBaseUrl}${imageUrl.replace(/^\/backend\/api/, "")}`;
  }

  if (imageUrl.startsWith("/api/")) {
    return `${backendApiBaseUrl}${imageUrl.replace(/^\/api/, "")}`;
  }

  return imageUrl;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const imageUrl = body.image_url ?? body.imageUrl;

    if (!imageUrl || typeof imageUrl !== "string") {
      return NextResponse.json(
        { error: "image_url is required." },
        { status: 400 },
      );
    }

    const response = await fetch(
      buildBackendApiUrl(BACKEND_URL, "/find-similar-rooms"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...body,
          image_url: toBackendReadableImageUrl(imageUrl),
        }),
        cache: "no-store",
      },
    );

    const text = await response.text();

    if (!text) {
      return new NextResponse(null, { status: response.status });
    }

    try {
      return NextResponse.json(JSON.parse(text), { status: response.status });
    } catch {
      return NextResponse.json({ message: text }, { status: response.status });
    }
  } catch (error) {
    console.error("[find-similar-rooms] Error:", error);
    return NextResponse.json(
      { error: "유사 매물 검색에 실패했습니다." },
      { status: 500 },
    );
  }
}
