import { NextRequest, NextResponse } from "next/server";
import { buildBackendApiUrl } from "@/lib/api/backend-url";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { user_id?: number };

    if (!body.user_id) {
      return NextResponse.json(
        { error: "user_id가 필요합니다." },
        { status: 400 },
      );
    }

    const response = await fetch(
      buildBackendApiUrl(BACKEND_URL, "/user-credit/increment"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: body.user_id }),
      },
    );

    const rawBody = await response.text();
    const data = rawBody ? JSON.parse(rawBody) : null;

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.detail ?? data?.error ?? "credit 충전에 실패했습니다." },
        { status: response.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[user-credit/increment] Error:", error);
    return NextResponse.json(
      { error: "credit 충전에 실패했습니다." },
      { status: 500 },
    );
  }
}
