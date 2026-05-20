import { NextRequest, NextResponse } from "next/server";
import { buildBackendApiUrl } from "@/lib/api/backend-url";

const BACKEND_URL = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;

async function jsonResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return new NextResponse(null, { status: response.status });
  }

  try {
    return NextResponse.json(JSON.parse(text), { status: response.status });
  } catch {
    return NextResponse.json({ message: text }, { status: response.status });
  }
}

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q") ?? "";
    const limit = request.nextUrl.searchParams.get("limit") ?? "10";
    const params = new URLSearchParams({ q, limit });
    const url = `${buildBackendApiUrl(BACKEND_URL, "/places/search")}?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    return jsonResponse(response);
  } catch (error) {
    console.error("[places/search] GET failed", error);
    return NextResponse.json(
      { message: "Place search request failed." },
      { status: 500 },
    );
  }
}
