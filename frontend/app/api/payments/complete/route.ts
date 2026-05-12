import { NextRequest, NextResponse } from "next/server";
import { buildBackendApiUrl } from "@/lib/api/backend-url";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      user_id?: number;
      payment_id?: string;
      provider_transaction_id?: string;
    };

    if (!body.user_id || !body.payment_id) {
      return NextResponse.json(
        { error: "user_id and payment_id are required." },
        { status: 400 },
      );
    }

    const response = await fetch(
      buildBackendApiUrl(BACKEND_URL, "/payments/complete"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: body.user_id,
          payment_id: body.payment_id,
          provider_transaction_id: body.provider_transaction_id,
        }),
      },
    );

    const rawBody = await response.text();
    const data = rawBody ? JSON.parse(rawBody) : null;

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.detail ?? data?.error ?? "Failed to complete payment." },
        { status: response.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[payments/complete] Error:", error);
    return NextResponse.json(
      { error: "Failed to complete payment." },
      { status: 500 },
    );
  }
}
