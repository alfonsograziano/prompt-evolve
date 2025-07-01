import OpenAI from "openai";
import { TelemetryData } from "../types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Get text embeddings from OpenAI's text-embedding-3-small model.
 * @param text The input text to embed.
 * @returns The embedding vector as an array of numbers.
 * @throws Error if the API call fails or no embedding is returned.
 *
 * TODO: Implement a chunking strategy for long texts.
 */
export async function getTextEmbeddings(text: string): Promise<number[]> {
  // TODO: Implement a chunking strategy for long texts
  // For now we assume that the text is not too long
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  if (!response.data || !response.data[0]?.embedding) {
    throw new Error("No embedding returned from OpenAI API");
  }
  return response.data[0].embedding;
}

/**
 * Compute the cosine similarity between two embedding vectors.
 * @param a First embedding vector.
 * @param b Second embedding vector.
 * @returns Cosine similarity value between -1 and 1.
 */
export function computeCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Embedding vectors must be of the same length");
  }
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  if (normA === 0 || normB === 0) {
    throw new Error("Embedding vectors must not be zero vectors");
  }
  return dotProduct / (normA * normB);
}

export const generateEmbeddingMetrics = async (telemetry: TelemetryData) => {
  // Generate all embeddings in parallel
  const [idealEmb, initialEmb, finalEmb] = await Promise.all([
    getTextEmbeddings(telemetry.idealOutput),
    getTextEmbeddings(telemetry.iterations[0].input.output),
    getTextEmbeddings(
      telemetry.iterations[telemetry.iterations.length - 1].output.output.output
    ),
  ]);

  const initialSim = computeCosineSimilarity(initialEmb, idealEmb);
  const finalSim = computeCosineSimilarity(finalEmb, idealEmb);

  const initialPct = initialSim * 100; // e.g. 75.27%
  const finalPct = finalSim * 100; // e.g. 80.30%
  const pointDelta = finalPct - initialPct; // e.g. 5.03 percentage‐points
  const relativeGain = (pointDelta / initialPct) * 100; // e.g. 6.68% relative gain

  return {
    initialPct,
    finalPct,
    pointDelta,
    relativeGain,
  };
};
