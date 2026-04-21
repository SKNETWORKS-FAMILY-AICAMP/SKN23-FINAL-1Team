import { NextRequest, NextResponse } from "next/server";
import { getBackendApiBaseUrl } from "@/lib/api/backend-url";

const API_BASE_URL = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;

function getApiBaseUrl() {
  if (!API_BASE_URL) {
    throw new Error("BACKEND_URL or NEXT_PUBLIC_API_BASE_URL is not configured.");
  }

  return getBackendApiBaseUrl(API_BASE_URL);
}

async function proxyFavoriteRequest(
  request: NextRequest,
  path: string,
  options: RequestInit,
) {
  const headers = new Headers(options.headers);
  const cookie = request.headers.get("cookie");

  headers.set("Content-Type", "application/json");

  if (cookie) {
    headers.set("Cookie", cookie);
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });
  const text = await response.text();

  if (!text) {
    return new NextResponse(null, { status: response.status });
  }

  try {
    return NextResponse.json(JSON.parse(text), { status: response.status });
  } catch {
    return NextResponse.json(
      { message: text },
      { status: response.status },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json(
        { message: "user_id is required." },
        { status: 400 },
      );
    }

    return proxyFavoriteRequest(request, `/favorites?user_id=${userId}`, {
      method: "GET",
    });
  } catch (error) {
    console.error("[favorites] GET failed", error);
    return NextResponse.json(
      { message: "Favorite list request failed." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const itemId = body.item_id;
    const userId = body.user_id;

    if (!itemId || !userId) {
      return NextResponse.json(
        { message: "item_id and user_id are required." },
        { status: 400 },
      );
    }

    return proxyFavoriteRequest(request, `/favorites/${itemId}`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    });
  } catch (error) {
    console.error("[favorites] POST failed", error);
    return NextResponse.json(
      { message: "Favorite create request failed." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const itemId = body.item_id;
    const userId = body.user_id;

    if (!itemId || !userId) {
      return NextResponse.json(
        { message: "item_id and user_id are required." },
        { status: 400 },
      );
    }

    return proxyFavoriteRequest(request, `/favorites/${itemId}`, {
      method: "DELETE",
      body: JSON.stringify({ user_id: userId }),
    });
  } catch (error) {
    console.error("[favorites] DELETE failed", error);
    return NextResponse.json(
      { message: "Favorite delete request failed." },
      { status: 500 },
    );
  }
}
