import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { buildBackendApiUrl } from "@/lib/api/backend-url";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

type EditImageRequestBody = {
  userId?: number;
  sourceImageUrl?: string;
  basePrompt?: string;
  editPrompt?: string;
  editCount?: number;
};

function parseJsonSafely(rawBody: string) {
  if (!rawBody) return null;

  try {
    return JSON.parse(rawBody) as {
      job_id?: string;
      status?: string;
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
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token?.user_id) {
      return NextResponse.json(
        { error: "로그인 후 AI 이미지를 수정할 수 있습니다." },
        { status: 401 },
      );
    }

    const {
      userId = 0,
      sourceImageUrl = "",
      basePrompt = "",
      editPrompt = "",
      editCount = 0,
    } = (await request.json()) as EditImageRequestBody;

    if (!userId) {
      return NextResponse.json(
        { error: "로그인한 사용자 정보가 필요합니다." },
        { status: 400 },
      );
    }

    if (Number(token.user_id) !== userId) {
      return NextResponse.json(
        { error: "로그인한 사용자 정보와 요청 정보가 일치하지 않습니다." },
        { status: 403 },
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

    if (editCount >= 2) {
      return NextResponse.json(
        { error: "이미지 수정은 최대 2번까지 가능합니다." },
        { status: 400 },
      );
    }

    const response = await fetch(
      buildBackendApiUrl(BACKEND_URL, "/edit-image-jobs"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          source_image_url: sourceImageUrl,
          base_prompt: basePrompt,
          edit_prompt: editPrompt,
          edit_count: editCount,
          size: "1024x1024",
          n: 4,
        }),
      },
    );

    const rawBody = await response.text();
    const data = parseJsonSafely(rawBody);

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.detail ??
            data?.error ??
            rawBody ??
            "이미지 수정 작업 시작에 실패했습니다.",
        },
        { status: response.status },
      );
    }

    return NextResponse.json({
      jobId: data?.job_id,
      status: data?.status,
      remain: data?.remain,
      credit: data?.credit,
    });
  } catch (error) {
    console.error("[edit-image][POST] Error:", error);
    return NextResponse.json(
      { error: "이미지 수정 작업 시작에 실패했습니다." },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const jobId = request.nextUrl.searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json(
        { error: "jobId가 필요합니다." },
        { status: 400 },
      );
    }

    const response = await fetch(
      buildBackendApiUrl(BACKEND_URL, `/edit-image-jobs/${jobId}`),
      { method: "GET" },
    );

    const rawBody = await response.text();
    const data = parseJsonSafely(rawBody);

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.detail ??
            data?.error ??
            rawBody ??
            "이미지 수정 상태 조회에 실패했습니다.",
        },
        { status: response.status },
      );
    }

    const filePaths: string[] = data?.file_paths ?? data?.images ?? [];

    if (data?.status === "completed" && filePaths.length !== 4) {
      return NextResponse.json({
        status: "failed",
        error: "AI 이미지 4장이 모두 생성되지 않았습니다. 다시 시도해 주세요.",
        remain: data?.remain,
        credit: data?.credit,
        images: [],
      });
    }

    const images = filePaths.map((filePath: string, index: number) => ({
      id: `${Date.now()}-${index}`,
      url: `/backend/api/images/${encodeURIComponent(
        filePath.split(/[\\/]/).pop() ?? filePath,
      )}`,
    }));

    return NextResponse.json({
      status: data?.status,
      error: data?.error,
      remain: data?.remain,
      credit: data?.credit,
      images,
    });
  } catch (error) {
    console.error("[edit-image][GET] Error:", error);
    return NextResponse.json(
      { error: "이미지 수정 상태 조회에 실패했습니다." },
      { status: 500 },
    );
  }
}
