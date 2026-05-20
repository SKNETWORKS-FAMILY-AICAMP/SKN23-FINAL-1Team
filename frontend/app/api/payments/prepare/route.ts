import { NextRequest, NextResponse } from "next/server";
import { buildBackendApiUrl } from "@/lib/api/backend-url";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      user_id?: number;
      product_id?: string;
      payment_sdk?: string;
      payment_channel?: string;
    };

    if (
      !body.user_id ||
      !body.product_id ||
      !body.payment_sdk ||
      !body.payment_channel
    ) {
      return NextResponse.json(
        {
          error:
            "user_id, product_id, payment_sdk and payment_channel are required.",
        },
        { status: 400 },
      );
    }

    const response = await fetch(
      buildBackendApiUrl(BACKEND_URL, "/payments/prepare"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: body.user_id,
          product_id: body.product_id,
          payment_sdk: body.payment_sdk,
          payment_channel: body.payment_channel,
        }),
      },
    );

    const rawBody = await response.text();
    const data = rawBody ? JSON.parse(rawBody) : null;

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.detail ?? data?.error ?? "Failed to prepare payment." },
        { status: response.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[payments/prepare] Error:", error);
    return NextResponse.json(
      { error: "Failed to prepare payment." },
      { status: 500 },
    );
  }
}
