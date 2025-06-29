import { LLMResponse } from "../types";
import { buildSinglePrompt, callLLM } from "./index";

export async function evaluateDifference(
  currentOutput: string,
  idealOutput: string
): Promise<LLMResponse> {
  const analysisPrompt = `
  You are an expert prompt evaluator. Analyze the differences between the current output and ideal output across multiple categories.
  
  ### Current Output:
  ${currentOutput}
  
  ### Ideal Output:
  ${idealOutput}
  
  ### Analysis Instructions:
  Categorize the differences into these areas:
  1. **Length & Structure**: Is the output too long/short? Different sentence structure?
  2. **Tone & Style**: Formal vs casual, technical vs simple, etc.
  3. **Content Focus**: Missing or extra information, different emphasis
  4. **Specificity**: Vague vs detailed, concrete vs abstract
  5. **Formatting**: Bullet points, paragraphs, special formatting
  6. **Key Elements**: Missing or incorrect names, numbers, features
  7. **Anything else**: Anything else that is different between the two outputs
  
  Provide a detailed analysis in this format:
  Key differences:
  - [Category 1]: [specific difference]
  - [Category 2]: [specific difference]
  - [Category 3]: [specific difference]
  ...`;

  const messages = await buildSinglePrompt(
    analysisPrompt,
    "You are an expert prompt evaluator."
  );
  const analysis = await callLLM("gpt-4o-mini", messages);
  return analysis;
}
