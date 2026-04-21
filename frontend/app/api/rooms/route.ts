import { NextRequest, NextResponse } from "next/server";
import { getBackendApiBaseUrl } from "@/lib/api/backend-url";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const MAX_RETRIES = 1;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getApiBaseUrl() {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
  }

  return getBackendApiBaseUrl(API_BASE_URL);
}

function isAbortError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === "AbortError" ||
    error.name === "ResponseAborted" ||
    error.message.includes("AbortError") ||
    error.message.includes("ResponseAborted") ||
    error.message.toLowerCase().includes("aborted")
  );
}

async function jsonResponse(response: Response) {
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

async function postJsonWithRetry(
  url: string,
  body: Record<string, unknown>,
) {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
      });

      return jsonResponse(response);
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }

      lastError = error;

      if (attempt === MAX_RETRIES) {
        break;
      }

      await delay(500);
    }
  }

  throw lastError ?? new Error("Room request failed.");
}

export async function GET(request: NextRequest) {
  try {
    const itemId = request.nextUrl.searchParams.get("item_id");

    if (!itemId) {
      return NextResponse.json(
        { message: "item_id is required." },
        { status: 400 },
      );
    }

    const response = await fetch(`${getApiBaseUrl()}/rooms/${itemId}`, {
      method: "GET",
      cache: "no-store",
    });

    return jsonResponse(response);
  } catch (error) {
    if (request.signal.aborted || isAbortError(error)) {
      return new Response(null, { status: 499 });
    }

    console.error("[rooms] GET failed", error);
    return NextResponse.json(
      { message: "Room detail request failed." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const mode = request.nextUrl.searchParams.get("mode");
    const body = await request.json();
    const path = mode === "map" ? "/rooms/map-search" : "/rooms/search";

    return postJsonWithRetry(
      `${getApiBaseUrl()}${path}`,
      body,
    );
  } catch (error) {
    if (request.signal.aborted || isAbortError(error)) {
      return new Response(null, { status: 499 });
    }

    console.error("[rooms] POST failed", error);
    return NextResponse.json(
      { message: "Room search request failed." },
      { status: 500 },
    );
  }
}
