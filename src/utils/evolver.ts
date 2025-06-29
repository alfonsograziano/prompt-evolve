import { HistoryEntry, LLMResponse, VariableDef } from "../types";
import { callLLM } from "./index";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { OpenAI } from "openai";

/* Clip long strings and mark truncation */
const TRIM = (txt: string, max = 2_000) =>
  txt.length > max ? `${txt.slice(0, max)}\n[…truncated…]` : txt;

// Helper: extract placeholders from a prompt string
const extractPlaceholders = (prompt: string) => {
  const regex = /\$\{(\w+)\}/g;
  const placeholders = new Set<string>();
  let match;
  while ((match = regex.exec(prompt))) {
    placeholders.add(match[1]);
  }
  return placeholders;
};

/**
 * Prompt-Surgeon 3.1 — evolve a prompt template so that,
 * when rendered with identical variable values, the model's
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
  const MAX_RETRIES = 3;
  let attempt = 0;
  let lastResponse: LLMResponse = {
    output: "",
    duration: 0,
    startTime: 0,
    endTime: 0,
    rawOutput: {} as OpenAI.Chat.Completions.ChatCompletion,
    inputMessages: [],
  };

  // Build the common initial messages
  const buildBaseMessages = (): ChatCompletionMessageParam[] => {
    const msgs: ChatCompletionMessageParam[] = [];

    /* 1. SYSTEM PERSONA & RULES */
    msgs.push({
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
- Apologies or meta-comments`.trim(),
    });

    /* 2. FEW-SHOT DEMONSTRATIONS */
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
      msgs.push({ role: "user", content: TRIM(ex.user, 450) });
      msgs.push({ role: "assistant", content: ex.assistant });
    });

    /* 3. TRIMMED RECENT HISTORY (≤3) */
    history.slice(-3).forEach((h) => {
      msgs.push({
        role: "user",
        content: `History-${h.iteration}\nPrompt:\n${TRIM(
          h.input.prompt,
          500
        )}\n—\nDiff (High/Med):\n${TRIM(h.output.difference.output, 300)}`,
      });
      msgs.push({
        role: "assistant",
        content: `Evolved prompt (v${h.iteration + 1}):\n${TRIM(
          h.output.prompt.output,
          300
        )}`,
      });
    });

    /* 4. VARIABLE DOC & VALUES BLOCKS */
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

    /* 5. USER TASK — LIVE CASE */
    msgs.push({
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
Remember: output *only* the new template + example, no extra prose.`.trim(),
    });

    return msgs;
  };

  // Attempt loop
  for (; attempt < MAX_RETRIES; attempt++) {
    const messages = buildBaseMessages();
    // Add retry hint if not first
    if (attempt > 0 && lastResponse.output.length > 0) {
      const usedPlaceholders = extractPlaceholders(lastResponse.output);
      const expected = new Set(variables.map((v) => v.name));

      // Determine missing and unexpected
      const missing = [...expected].filter((v) => !usedPlaceholders.has(v));
      const unexpected = [...usedPlaceholders].filter((p) => !expected.has(p));

      let hint = "";
      if (missing.length) {
        hint += `You forgot to add this variable: ${missing.join(", ")}. `;
      }
      if (unexpected.length) {
        hint += `You created a new variable mistakenly: ${unexpected.join(
          ", "
        )}. `;
      }
      if (hint) {
        messages.push({ role: "assistant", content: hint.trim() });
      }
    }

    // Call LLM
    lastResponse = await callLLM("gpt-4o-mini", messages);

    // Validate response
    const outputPrompt = lastResponse.output;
    const found = extractPlaceholders(outputPrompt);
    const expectedVars = new Set(variables.map((v) => v.name));
    const missingNow = [...expectedVars].filter((v) => !found.has(v));
    const extraNow = [...found].filter((p) => !expectedVars.has(p));

    // If invalid, log and retry
    if (missingNow.length > 0 || extraNow.length > 0) {
      console.log(
        `Retry ${attempt + 1} failed:` +
          `${missingNow.length ? ` missing=${missingNow.join(",")}` : ""}` +
          `${extraNow.length ? ` unexpected=${extraNow.join(",")}` : ""}`
      );
      continue;
    }

    // Valid response
    return lastResponse;
  }

  // After retries, still invalid
  const expectedVars = Array.from(variables.map((v) => v.name));
  // Ensure lastResponse is defined with an output property
  const safeLastResponse =
    lastResponse && lastResponse.output ? lastResponse : { output: "" };
  const foundFinal = extractPlaceholders(safeLastResponse.output);
  const missingFinal = expectedVars.filter((v) => !foundFinal.has(v));
  const extraFinal = Array.from(foundFinal).filter(
    (p) => !expectedVars.includes(p)
  );
  throw new Error(
    `Variable mismatch after ${MAX_RETRIES} retries:` +
      `${missingFinal.length ? ` missing=${missingFinal.join(",")}` : ""}` +
      `${extraFinal.length ? ` unexpected=${extraFinal.join(",")}` : ""}`
  );
}
