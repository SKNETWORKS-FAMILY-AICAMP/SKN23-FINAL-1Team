import { NextRequest, NextResponse } from "next/server";
import { getBackendApiBaseUrl } from "@/lib/api/backend-url";

const API_BASE_URL = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;

function getApiBaseUrl() {
  if (!API_BASE_URL) {
    throw new Error("BACKEND_URL or NEXT_PUBLIC_API_BASE_URL is not configured.");
  }
  return getBackendApiBaseUrl(API_BASE_URL);
}

async function proxyGalleryRequest(
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
    return proxyGalleryRequest(request, `/gallery?user_id=${userId}`, {
      method: "GET",
    });
  } catch (error) {
    console.error("[gallery] GET failed", error);
    return NextResponse.json(
      { message: "Gallery list request failed." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return proxyGalleryRequest(request, `/gallery`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error("[gallery] POST failed", error);
    return NextResponse.json(
      { message: "Gallery save request failed." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const imageId = pathParts[pathParts.length - 1];
    const userId = url.searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json({ message: "user_id is required." }, { status: 400 });
    }

    return proxyGalleryRequest(request, `/gallery/${imageId}?user_id=${userId}`, {
      method: "DELETE",
    });
  } catch (error) {
    console.error("[gallery] DELETE failed", error);
    return NextResponse.json(
      { message: "Gallery delete request failed." },
      { status: 500 },
    );
  }
}
