import { HistoryEntry, LLMResponse, VariableDef } from "../types";
import { callLLM } from "./index";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

/* Clip long strings and mark truncation */
const TRIM = (txt: string, max = 2_000) =>
  txt.length > max ? `${txt.slice(0, max)}\n[…truncated…]` : txt;

/**
 * Prompt-Surgeon 3.1 — evolve a prompt template so that,
 * when rendered with identical variable values, the model’s
 * output moves toward the IDEAL output *and* the template
 * itself contains a worked Example section.
 */
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
  const messages: ChatCompletionMessageParam[] = [];

  /*─────────────────────────────────
    1. SYSTEM PERSONA & RULES
  ─────────────────────────────────*/
  messages.push({
    role: "system",
    content: `
You are **Prompt-Surgeon 3.1** ⚔️ — a trio of experts:
  • **Critic** spots weaknesses  
  • **Synthesizer** designs fixes  
  • **Writer** drafts the new template  

Think step-by-step *silently*; never reveal chain-of-thought.

### Success Checklist
1. Every placeholder \${var} is preserved.  
2. Clear meta-instructions for tone, format, reasoning.  
3. Works for *any* valid variable values.  
4. Provides helpful structural scaffolding (headings, bullets…).  
5. **Final answer = the new template only** (no fences / JSON / prose).  
6. Append an **“### Example”** block that:
   • Lists the *current* variable values.  
   • Shows the *Ideal Output* verbatim as the sample response.  

### Failure Modes to Avoid
- Renaming / adding variables  
- Exposing analysis / CoT  
- Wrapping output in back-ticks  
- Apologies or meta-comments  
`.trim(),
  });

  /*─────────────────────────────────
    2. FEW-SHOT DEMONSTRATIONS
      (prime with successful edits)
  ─────────────────────────────────*/
  const fewShots = [
    {
      user: `
Difference Analysis (excerpt):
• Tone & Style (High) → Too casual; needs formal  
• Formatting (Med) → Missing markdown headers  

Current template:
"Write a short intro about \${topic}."

Task: Fix the template.`,
      assistant: `## Instructions  
Write a **formal** introduction on **\${topic}** in ≤120 words.

### Structure  
1. Level-2 markdown header “Introduction”  
2. One concise paragraph

### Example  
\${topic} = “Solar Power”  

**Response (sample)**  
## Introduction  
Solar power is…`,
    },
    {
      user: `
Difference Analysis (excerpt):
• Key Elements (High) → Missing explicit list of \${features}

Current template:
"Describe the product."

Task: Fix the template.`,
      assistant: `Describe the product as follows:

**Key Features**  
• List each **\${features}** item as a bullet.  
Conclude with a 20-word value proposition.

### Example  
\${features} = cost-effective; resilient  

**Response (sample)**  
**Key Features**  
• cost-effective  
• resilient  

Our product delivers…`,
    },
  ];

  fewShots.forEach((ex) => {
    messages.push({ role: "user", content: TRIM(ex.user, 450) });
    messages.push({ role: "assistant", content: ex.assistant });
  });

  /*─────────────────────────────────
    3. TRIMMED RECENT HISTORY (≤3)
  ─────────────────────────────────*/
  history.slice(-3).forEach((h) => {
    messages.push({
      role: "user",
      content: `History-${h.iteration}\nPrompt:\n${TRIM(
        h.input.prompt,
        500
      )}\n—\nDiff (High/Med):\n${TRIM(h.output.difference.output, 300)}`,
    });
    messages.push({
      role: "assistant",
      content: `Evolved prompt (v${h.iteration + 1}):\n${TRIM(
        h.output.prompt.output,
        300
      )}`,
    });
  });

  /*─────────────────────────────────
    4. VARIABLE DOC & VALUES BLOCKS
  ─────────────────────────────────*/
  const variableDocs = variables
    .map(
      (v) =>
        `• **${v.name}** — ${v.description}\n   ↳ e.g. “${v.example
          .replace(/\n/g, " ")
          .slice(0, 500)}”`
    )
    .join("\n");

  const variableValues = variables
    .map((v) => `- ${v.name}: ${v.example.replace(/\n/g, " ").slice(0, 500)}`)
    .join("\n");

  /*─────────────────────────────────
    5. USER TASK — LIVE CASE
  ─────────────────────────────────*/
  messages.push({
    role: "user",
    content: `
### Current Prompt Template
${currentPrompt}

### Variables (reference)
${variableDocs}

### Variable Values to Use in Example
${variableValues}

### Current Output
${TRIM(currentOutput)}

### Ideal Output
${TRIM(idealOutput)}

### Difference Analysis (High & Med bullets)
${TRIM(differenceExplanation)}

🛠 **TASK**  
Critic → flag gaps.  
Synthesizer → craft fixes.  
Writer → output final template **followed by** the Example block (see Success 6).  
Remember: output *only* the new template + example, no extra prose.  
`.trim(),
  });

  /*─────────────────────────────────
    6. CALL MODEL
  ─────────────────────────────────*/
  return callLLM("gpt-4o-mini", messages);
}
