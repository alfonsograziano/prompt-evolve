export * from "./embeddings";
export * from "./length";
import { TelemetryData } from "../types";
import { generateEmbeddingMetrics } from "./embeddings";
import { lengthAdherence } from "./length";

export const generateMetrics = async (telemetry: TelemetryData) => {
  const embeddingMetrics = await generateEmbeddingMetrics(telemetry);
  const lengthMetrics = lengthAdherence(
    telemetry.iterations[0].input.output,
    telemetry.idealOutput
  );
  return {
    embeddingMetrics,
    lengthMetrics,
  };
};
