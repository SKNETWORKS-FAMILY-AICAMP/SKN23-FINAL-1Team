import { NextRequest, NextResponse } from "next/server";
import { buildBackendApiUrl } from "@/lib/api/backend-url";

const BACKEND_URL = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;

type RouteContext = {
  params: Promise<{
    itemId: string;
    imageId: string;
  }>;
};

function getBackendUrl(path: string) {
  if (!BACKEND_URL) {
    throw new Error("BACKEND_URL or NEXT_PUBLIC_API_BASE_URL is not configured.");
  }

  return buildBackendApiUrl(BACKEND_URL, path);
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { itemId, imageId } = await context.params;
    const response = await fetch(
      getBackendUrl(
        `/rooms/${encodeURIComponent(itemId)}/images/${encodeURIComponent(imageId)}`,
      ),
      {
        method: "GET",
        cache: "no-store",
      },
    );

    if (!response.ok || !response.body) {
      const message = await response.text().catch(() => "");
      return NextResponse.json(
        { message: message || "Room image request failed." },
        { status: response.status },
      );
    }

    const headers = new Headers();
    const contentType = response.headers.get("content-type");
    const cacheControl = response.headers.get("cache-control");
    const contentLength = response.headers.get("content-length");

    headers.set("Content-Type", contentType ?? "image/jpeg");
    headers.set("Cache-Control", cacheControl ?? "private, max-age=3600");

    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }

    return new NextResponse(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error("[room-image-proxy] GET failed", error);
    return NextResponse.json(
      { message: "Room image request failed." },
      { status: 500 },
    );
  }
}
