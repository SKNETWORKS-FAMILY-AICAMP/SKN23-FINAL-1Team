import { NextRequest, NextResponse } from "next/server";
import { buildBackendApiUrl } from "@/lib/api/backend-url";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json(
        { error: "user_id가 필요합니다." },
        { status: 400 },
      );
    }

    const response = await fetch(
      buildBackendApiUrl(BACKEND_URL, `/user-credit?user_id=${userId}`),
      {
        method: "GET",
      },
    );

    const rawBody = await response.text();
    const data = rawBody ? JSON.parse(rawBody) : null;

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.detail ?? data?.error ?? "credit 조회에 실패했습니다." },
        { status: response.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[user-credit] Error:", error);
    return NextResponse.json(
      { error: "credit 조회에 실패했습니다." },
      { status: 500 },
    );
  }
}
