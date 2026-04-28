import { NextRequest, NextResponse } from "next/server";
import { buildBackendApiUrl } from "@/lib/api/backend-url";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

type EditImageRequestBody = {
  userId?: number;
  sourceImageUrl?: string;
  basePrompt?: string;
  editPrompt?: string;
};

function parseJsonSafely(rawBody: string) {
  if (!rawBody) return null;

  try {
    return JSON.parse(rawBody) as {
      detail?: string;
      error?: string;
      file_paths?: string[];
      images?: string[];
      remain?: number;
      credit?: number;
    };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      userId = 0,
      sourceImageUrl = "",
      basePrompt = "",
      editPrompt = "",
    } = (await request.json()) as EditImageRequestBody;

    if (!userId) {
      return NextResponse.json(
        { error: "로그인한 사용자 정보가 필요합니다." },
        { status: 400 },
      );
    }

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

    const response = await fetch(
      buildBackendApiUrl(BACKEND_URL, "/edit-image"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          source_image_url: sourceImageUrl,
          base_prompt: basePrompt,
          edit_prompt: editPrompt,
          size: "1024x1024",
          n: 4,
        }),
      },
    );

    const rawBody = await response.text();

    if (!response.ok) {
      const errorBody = parseJsonSafely(rawBody);
      const errorMessage =
        errorBody?.detail ??
        errorBody?.error ??
        rawBody ??
        "이미지 수정에 실패했습니다.";
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status },
      );
    }

    if (!rawBody) {
      return NextResponse.json(
        { error: "이미지 수정 결과를 받아오지 못했습니다." },
        { status: 502 },
      );
    }

    const data = parseJsonSafely(rawBody);
    if (!data) {
      return NextResponse.json(
        { error: "이미지 수정 응답 형식을 읽을 수 없습니다." },
        { status: 502 },
      );
    }

    const filePaths: string[] = data.file_paths ?? data.images ?? [];

    if (!Array.isArray(filePaths) || filePaths.length === 0) {
      return NextResponse.json(
        { error: "수정된 이미지 결과가 비어 있습니다." },
        { status: 502 },
      );
    }

    const images = filePaths.map((filePath: string, index: number) => ({
      id: `${Date.now()}-${index}`,
      url: `/backend/api/images/${encodeURIComponent(
        filePath.split(/[\\/]/).pop() ?? filePath,
      )}`,
    }));

    return NextResponse.json({
      images,
      remain: data.remain,
      credit: data.credit,
    });
  } catch (error) {
    console.error("[edit-image] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "이미지 수정에 실패했습니다. 다시 시도해주세요.",
      },
      { status: 500 },
    );
  }
}
