import { OpenAI } from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// ---- Types ----
export interface VariableDef {
  name: string;
  description: string;
  example: string;
}

export interface HistoryEntry {
  iteration: number;
  timing: {
    startTime: number;
    endTime: number;
    duration: number;
  };
  input: {
    prompt: string;
    output: string;
  };
  output: {
    difference: LLMResponse;
    prompt: LLMResponse;
    output: LLMResponse;
  };
}

export interface TelemetryOptions {
  filePath: string;
  reporterType: "json" | "html";
}

export interface TelemetryIteration {
  iteration: number;
  startTime: string;
  endTime: string;
  durationMs: number;
  prompt: string;
  renderedPrompt: string;
  output: string;
  difference: string;
  evolvedPrompt?: string;
  promptEvolutionDurationMs?: number;
  cosineSimilarityToIdeal?: number | null;
}

export interface PromptEvolveArgs {
  initialPromptTemplate: string;
  initialOutput?: string;
  variables: VariableDef[];
  idealOutput: string;

  model: string;
  maxIterations: number;
  telemetry?: TelemetryOptions;
}

export interface LLMResponse {
  output: string;
  duration: number;
  startTime: number;
  endTime: number;
  rawOutput: OpenAI.Chat.Completions.ChatCompletion;
  inputMessages: ChatCompletionMessageParam[];
}

export interface TelemetryMetadata {
  initialPromptTemplate: string;
  variables: VariableDef[];
  idealOutput: string;
  model: string;
  maxIterations: number;
  telemetry: TelemetryOptions;
}

export interface TelemetryData extends TelemetryMetadata {
  iterations: HistoryEntry[];
}
