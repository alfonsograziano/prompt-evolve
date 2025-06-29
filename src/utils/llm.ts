import { OpenAI } from "openai";
import { LLMResponse } from "../types";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function callLLM(
  model: string,
  messages: ChatCompletionMessageParam[]
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
    inputMessages: messages,
  };
}
