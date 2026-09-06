/**
 * Computes cosine similarity between two numeric vectors.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Finds top K items most similar to a query vector.
 */
export function findTopKSimilar<T extends { embedding?: number[] }>(
  queryVec: number[],
  items: T[],
  k: number = 5
): Array<{ item: T; entry: T; similarity: number }> {
  const scored = items
    .map((item) => ({
      item,
      entry: item,
      similarity: item.embedding ? cosineSimilarity(queryVec, item.embedding) : 0,
    }))
    .filter((entry) => entry.similarity > 0);

  scored.sort((a, b) => b.similarity - a.similarity);

  // If no items had positive similarity (e.g. embeddings not generated yet), fallback to first k
  if (scored.length === 0) {
    return items.slice(0, k).map((item) => ({
      item,
      entry: item,
      similarity: 0,
    }));
  }

  return scored.slice(0, k);
}
