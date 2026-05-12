import { NextRequest, NextResponse } from "next/server";
import { buildBackendApiUrl } from "@/lib/api/backend-url";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json(
        { error: "user_id is required." },
        { status: 400 },
      );
    }

    const backendUrl = buildBackendApiUrl(
      BACKEND_URL,
      `/payments/orders?user_id=${encodeURIComponent(userId)}`,
    );
    const response = await fetch(backendUrl, { method: "GET" });
    const rawBody = await response.text();
    const data = rawBody ? JSON.parse(rawBody) : null;

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.detail ?? data?.error ?? "Failed to fetch payment orders." },
        { status: response.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[payments/orders] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment orders." },
      { status: 500 },
    );
  }
}
