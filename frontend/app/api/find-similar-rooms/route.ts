import { mockRoomEmbeddings } from "@/lib/mock-data"

// Cosine similarity function
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

export async function POST(req: Request) {
  try {
    const { imageUrl } = await req.json()

    if (!imageUrl) {
      return Response.json({ error: "이미지 URL이 필요합니다." }, { status: 400 })
    }

    // In a real implementation, we would:
    // 1. Download the image from imageUrl
    // 2. Generate an embedding using a vision model
    // 3. Compare against stored embeddings in a vector database

    // For demo, generate a mock embedding for the generated image
    const generatedImageEmbedding = Array.from({ length: 128 }, () => Math.random())

    // Calculate similarity scores for all listings
    const similarities = Object.entries(mockRoomEmbeddings).map(([listingId, embedding]) => ({
      listingId,
      similarity: cosineSimilarity(generatedImageEmbedding, embedding),
    }))

    // Sort by similarity (highest first)
    similarities.sort((a, b) => b.similarity - a.similarity)

    // Return top 4 most similar listings
    const topSimilar = similarities.slice(0, 4)

    return Response.json({ similarListings: topSimilar })
  } catch (error) {
    console.error("[v0] Error in find-similar-rooms:", error)
    return Response.json(
      { error: "유사 매물 검색 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}
