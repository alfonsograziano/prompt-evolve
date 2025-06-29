import { LLMResponse } from "../types";
import { buildSinglePrompt, callLLM } from "./index";
import { diffWordsWithSpace } from "diff"; // npm install diff

/** Build inline diff string using [[+...]] and [[-...]] markers */
function buildInlineDiff(a: string, b: string): string {
  return diffWordsWithSpace(a, b)
    .map((part) => {
      if (part.added) return `[[+${part.value}]]`;
      if (part.removed) return `[[-${part.value}]]`;
      return part.value;
    })
    .join("");
}

/**
 * Evaluate textual differences between a current and ideal output,
 * returning a rich human-readable critique.
 */
export async function evaluateDifference(
  currentOutput: string,
  idealOutput: string
): Promise<LLMResponse> {
  const inlineDiff = buildInlineDiff(currentOutput, idealOutput);
  const trimmedDiff =
    inlineDiff.length > 2000
      ? `${inlineDiff.slice(0, 2000)}\n[…truncated…]`
      : inlineDiff;

  const analysisPrompt = `
You are **Diff-Sensei 2.0**, an elite text-diff-evaluation agent.

# TASK
Compare **Text A** and **Text B** (plus the **Inline Diff**).  
Write a human-readable critique divided into the seven sections below.  
For **each** section:

• Start with \`### <Section Name>\`  
• Up to **5** bullet points.  
• Each bullet:  ≤ 40 words, label impact **(High/Med/Low)**, then a quick fix in brackets.  
• If no issues: write “None”.

After all sections add:

\`\`\`
### Overall Divergence
Score: <0–10>
\`\`\`

## CATEGORY GUIDE
Length & Structure – size, ordering, sentence shape.  
  Example: “Current omits conclusion.”  
Tone & Style – voice, formality.  
  Example: “Current too casual.”  
Content Focus – topic presence & emphasis.  
  Example: “Ideal stresses security; current ignores it.”  
Specificity – detail & precision.  
  Example: “Ideal cites exact latency; current says ‘fast’.”  
Formatting – layout & markup.  
  Example: “Current lacks code fences.”  
Key Elements – names, numbers, facts.  
  Example: “API endpoint version mismatch.”  
Anything Else – humour, references, licensing, etc.

## TEXT A (current)
\`\`\`
${currentOutput}
\`\`\`

## TEXT B (ideal)
\`\`\`
${idealOutput}
\`\`\`

## INLINE DIFF (A→B) – additions [[+...]], deletions [[-...]]
\`\`\`
${trimmedDiff}
\`\`\`

## DON’Ts
• No JSON  
• No apologies or meta-commentary  
• Do not summarise the full texts  
`.trim();

  const messages = await buildSinglePrompt(
    analysisPrompt,
    "You are an expert text differences evaluator."
  );

  return callLLM("gpt-4o-mini", messages);
}
