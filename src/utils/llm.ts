import { OpenAI } from "openai";
import { LLMResponse } from "../types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function callLLM(
  model: string,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>
): Promise<LLMResponse> {
  const start = Date.now();
  const completion = await openai.chat.completions.create({
    model,
    messages,
  });
  const end = Date.now();
  const duration = end - start;
  return {
    output: completion.choices[0]?.message?.content ?? "",
    duration,
    startTime: start,
    endTime: end,
    rawOutput: completion,
  };
}
