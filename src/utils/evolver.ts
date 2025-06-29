import { HistoryEntry, LLMResponse, VariableDef } from "../types";
import { callLLM } from "./index";

export async function evolvePrompt({
  currentPrompt,
  currentOutput,
  idealOutput,
  differenceExplanation,
  variables,
  history = [],
}: {
  currentPrompt: string;
  currentOutput: string;
  idealOutput: string;
  differenceExplanation: string;
  variables: VariableDef[];
  history: HistoryEntry[];
}): Promise<LLMResponse> {
  const messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [];

  messages.push({
    role: "system",
    content: `
  You are **Prompt-Evolve**, an elite prompt-engineering agent.
  
  Goal → Produce a *new* prompt template that, when rendered with the same variables, will drive the LLM's output as close as possible to the IDEAL output.
  
  Success rubric:
  1. All variable placeholders \${var} must be preserved and used meaningfully.
  2. Include clear meta-instructions to guide the LLM's output format, style, and approach.
  3. Make the prompt generic enough to work with different variable values.
  4. Focus on providing context and guidance rather than being overly prescriptive.
  5. Respond **ONLY** with the new prompt template, don't add comments or anything else.
  
  Remember:
  - Meta-instructions like "Write in a [style]" or "Format as [format]" are encouraged
  - The prompt should work well for any valid values of the variables
  - Variables can be used multiple times if it helps create better context
  - Include structural guidance (bullet points, sections, etc.) when relevant
  `.trim(),
  });

  // Add the last 7 iterations to the messages
  const recentHistory = history.slice(-7);
  for (const h of recentHistory) {
    messages.push({
      role: "user",
      content: `History-${h.iteration}:Prompt: ${h.input.prompt}\nOutput: ${h.input.output}\nDifference Analysis: ${h.output.difference}`,
    });
    messages.push({
      role: "assistant",
      content: `Based on the analysis, I evolved the prompt to: ${h.output.prompt.output}`,
    });
  }

  const variableBlock = variables
    .map(
      (v) =>
        `• **${v.name}** – ${v.description}\n  ↳ e.g. "${v.example
          .replace(/\n/g, " ")
          .slice(0, 120)}"`
    )
    .join("\n");

  const userPrompt = `
  ### Current Prompt Template
  ${currentPrompt}
  
  ### Variables
  ${variableBlock}
  
  ### Current Output
  ${currentOutput}
  
  ### Ideal Output
  ${idealOutput}
  
  ### Difference Analysis
  ${differenceExplanation}
  
  🛠 **Task**  
  Update the template so that, when rendered with the SAME variable values, it will likely produce the IDEAL output.
  When you return the new template, keep in mind all the differences that were found durig the Difference analysis from the system. Use them as a guide to improve the prompt. Try to buid a prompt that removes the differences.
  Return **only** the new, updated template, as specified in the system prompt.
  `.trim();

  messages.push({ role: "user", content: userPrompt });

  return callLLM("gpt-4o-mini", messages);
}
