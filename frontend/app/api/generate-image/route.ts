import { NextRequest, NextResponse } from "next/server";
import { buildBackendApiUrl } from "@/lib/api/backend-url";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
const MAX_AI_EDIT_COUNT = 2;

type GenerateImageRequestBody = {
  prompt?: string;
  mode?: "generate" | "edit";
  editCount?: number;
};

export async function POST(request: NextRequest) {
  try {
    const {
      prompt = "",
      mode = "generate",
      editCount = 0,
    } = (await request.json()) as GenerateImageRequestBody;

    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      return NextResponse.json(
        { error: "프롬프트를 입력해주세요." },
        { status: 400 },
      );
    }

    if (mode === "edit" && editCount >= MAX_AI_EDIT_COUNT) {
      return NextResponse.json(
        { error: "이미지 수정은 최대 2번까지 가능합니다." },
        { status: 400 },
      );
    }

    const response = await fetch(
      buildBackendApiUrl(BACKEND_URL, "/generate-image"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_prompt: trimmedPrompt,
          size: "1024x1024",
          quality: "medium",
          n: 4,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[generate-room-images] Python backend error:", errorText);

      try {
        const errorBody = JSON.parse(errorText) as {
          detail?: string;
          error?: string;
        };
        return NextResponse.json(
          {
            error:
              errorBody.detail ??
              errorBody.error ??
              "이미지 생성에 실패했습니다. 다시 시도해주세요.",
          },
          { status: response.status },
        );
      } catch {
        return NextResponse.json(
          { error: errorText || "이미지 생성에 실패했습니다. 다시 시도해주세요." },
          { status: response.status },
        );
      }
    }

    const data = await response.json();
    const filePaths: string[] = data.file_paths ?? data.images ?? [];

    const images = filePaths.map((filePath: string, index: number) => ({
      id: `${Date.now()}-${index}`,
      url: `/backend/api/images/${encodeURIComponent(
        filePath.split(/[\\/]/).pop() ?? filePath,
      )}`,
    }));

    return NextResponse.json({ images });
  } catch (error) {
    console.error("[generate-room-images] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "이미지 생성에 실패했습니다. 다시 시도해주세요.",
      },
      { status: 500 },
    );
  }
}
