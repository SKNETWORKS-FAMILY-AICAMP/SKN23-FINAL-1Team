import { NextRequest, NextResponse } from "next/server";
import { buildBackendApiUrl } from "@/lib/api/backend-url";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
const MAX_AI_EDIT_COUNT = 2;

type EditImageRequestBody = {
  sourceImageUrl?: string;
  basePrompt?: string;
  editPrompt?: string;
  editCount?: number;
};

export async function POST(request: NextRequest) {
  try {
    const {
      sourceImageUrl = "",
      basePrompt = "",
      editPrompt = "",
      editCount = 0,
    } = (await request.json()) as EditImageRequestBody;

    if (!sourceImageUrl.trim()) {
      return NextResponse.json(
        { error: "수정할 원본 이미지가 필요합니다." },
        { status: 400 },
      );
    }

    if (!editPrompt.trim()) {
      return NextResponse.json(
        { error: "수정 프롬프트를 입력해주세요." },
        { status: 400 },
      );
    }

    if (editCount >= MAX_AI_EDIT_COUNT) {
      return NextResponse.json(
        { error: "이미지 수정은 최대 2번까지 가능합니다." },
        { status: 400 },
      );
    }

    const response = await fetch(
      buildBackendApiUrl(BACKEND_URL, "/edit-image"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_image_url: sourceImageUrl,
          base_prompt: basePrompt,
          edit_prompt: editPrompt,
          size: "1024x1024",
          n: 4,
        }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const errorMessage =
        errorBody?.detail ??
        errorBody?.error ??
        "이미지 수정에 실패했습니다.";
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status },
      );
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
    console.error("[edit-image] Error:", error);
    return NextResponse.json(
      { error: "이미지 수정에 실패했습니다. 다시 시도해주세요." },
      { status: 500 },
    );
  }
}
