import { NextRequest, NextResponse } from "next/server";
import { getBackendApiBaseUrl } from "@/lib/api/backend-url";

const API_BASE_URL = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;

function getApiBaseUrl() {
  if (!API_BASE_URL) {
    throw new Error("BACKEND_URL or NEXT_PUBLIC_API_BASE_URL is not configured.");
  }
  return getBackendApiBaseUrl(API_BASE_URL);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const userId = request.nextUrl.searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json({ message: "user_id is required." }, { status: 400 });
    }

    const response = await fetch(
      `${getApiBaseUrl()}/gallery/${id}?user_id=${userId}`,
      {
        method: "DELETE",
        cache: "no-store",
      }
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
    console.error("[gallery] DELETE failed", error);
    return NextResponse.json(
      { message: "Gallery delete request failed." },
      { status: 500 }
    );
  }
}
