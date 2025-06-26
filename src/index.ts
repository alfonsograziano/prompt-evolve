import OpenAI from "openai";
import { promises as fs } from "fs";
import path from "path";

// ---- Types ----
interface VariableDef {
  name: string;
  description: string;
  example: string;
}

interface HistoryEntry {
  iteration: number;
  prompt: string;
  output: string;
  optimizedPrompt: string;
  difference: string;
}

interface TelemetryOptions {
  filePath: string;
}

interface TelemetryIteration {
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
}

interface PromptEvolveArgs {
  initialPromptTemplate: string;
  variables: VariableDef[];
  idealOutput: string;
  model: string;
  maxIterations: number;
  telemetry?: TelemetryOptions;
  currentOutput?: string;
}

// ---- 1. Prompt Renderer ----
function renderPrompt(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\$\{(\w+)\}/g, (_, v) => variables[v] ?? "");
}

// Helper function to build a simple prompt message array
async function buildSinglePrompt(
  prompt: string,
  systemMessage: string = "You are a helpful assistant."
): Promise<Array<{ role: "system" | "user" | "assistant"; content: string }>> {
  return [
    {
      role: "system",
      content: systemMessage,
    },
    {
      role: "user",
      content: prompt,
    },
  ];
}

// ---- 2. Evaluator ----
async function evaluateDifference(
  currentOutput: string,
  idealOutput: string
): Promise<string> {
  // If outputs are identical, no need for LLM analysis
  if (currentOutput.trim() === idealOutput.trim()) return "";

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
Current output: [current output]
Ideal output: [ideal output]
Key differences:
- [Category 1]: [specific difference]
- [Category 2]: [specific difference]
- [Category 3]: [specific difference]
...`;

  try {
    const messages = await buildSinglePrompt(
      analysisPrompt,
      "You are an expert prompt evaluator."
    );
    const analysis = await callLLM("gpt-4o-mini", messages);
    return analysis.trim();
  } catch (error) {
    // Fallback to simple diff if LLM call fails
    console.warn("LLM evaluation failed, using simple diff:", error);
    return `Current output: ${currentOutput}\nIdeal output: ${idealOutput}`;
  }
}

// ---- 3. Prompt Evolver ----
async function evolvePrompt({
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
}): Promise<string> {
  // Build conversation history from previous iterations
  const messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [
    {
      role: "system",
      content:
        "You are an expert prompt engineer. Your task is to improve prompt templates to better match desired outputs.",
    },
  ];

  // Add history of previous iterations as context
  for (const entry of history) {
    messages.push({
      role: "user",
      content: `Iteration ${entry.iteration}:\nPrompt: ${entry.prompt}\nOutput: ${entry.output}\nDifference Analysis: ${entry.difference}`,
    });
    messages.push({
      role: "assistant",
      content: `Based on the analysis, I evolved the prompt to: ${entry.optimizedPrompt}`,
    });
  }

  // Add current iteration request
  const currentRequest = `
### Current Prompt Template
${currentPrompt}

### Variables
${variables
  .map((v) => `- ${v.name}: ${v.description} (e.g., "${v.example}")`)
  .join("\n")}

### Current Output
${currentOutput}

### Ideal Output
${idealOutput}

### Difference Analysis
${differenceExplanation}

Output ONLY the new prompt template, using \${variableName} syntax.`;

  messages.push({
    role: "user",
    content: currentRequest,
  });

  const evolved = await callLLM("gpt-4o-mini", messages);
  return evolved.trim();
}

// ---- 4. LLM Executor ----
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function callLLM(
  model: string,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>
): Promise<string> {
  const completion = await openai.chat.completions.create({
    model,
    messages,
  });
  return completion.choices[0]?.message?.content ?? "";
}

// ---- 5. Telemetry Saver ----
async function saveTelemetryData(
  telemetryFilePath: string,
  telemetryData: TelemetryIteration[],
  metadata: {
    initialPromptTemplate: string;
    variables: VariableDef[];
    idealOutput: string;
    model: string;
    maxIterations: number;
    finalPromptTemplate?: string;
    finalOutput?: string;
    history: HistoryEntry[];
    startedAt: Date;
  }
) {
  const telemetryObj = {
    initialPromptTemplate: metadata.initialPromptTemplate,
    variables: metadata.variables,
    idealOutput: metadata.idealOutput,
    model: metadata.model,
    maxIterations: metadata.maxIterations,
    iterations: telemetryData,
    finalPromptTemplate: metadata.finalPromptTemplate,
    finalOutput: metadata.finalOutput,
    history: metadata.history,
    startedAt: metadata.startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    totalDurationMs: Date.now() - metadata.startedAt.getTime(),
  };
  await fs.writeFile(
    path.resolve(telemetryFilePath),
    JSON.stringify(telemetryObj, null, 2),
    "utf-8"
  );
}

// ---- 6. Main Loop ----
export async function promptEvolve({
  initialPromptTemplate,
  variables,
  idealOutput,
  model,
  maxIterations,
  telemetry,
  currentOutput: initialCurrentOutput,
}: PromptEvolveArgs) {
  let currentPrompt = initialPromptTemplate;
  let currentOutput = initialCurrentOutput ?? "";
  let history: HistoryEntry[] = [];
  const telemetryData: TelemetryIteration[] = [];
  const startedAt = new Date();
  const totalStart = Date.now();

  // Pre-fill variables with example values
  const filledVars: Record<string, string> = {};
  for (const v of variables) {
    filledVars[v.name] = v.example;
  }

  console.log("\n--- Prompt Evolve Started ---");
  console.log(`Model: ${model}`);
  console.log(`Max Iterations: ${maxIterations}`);
  console.log("Initial Prompt Template:\n", initialPromptTemplate);
  console.log("Variables:", variables);
  console.log("Ideal Output:", idealOutput);
  if (telemetry?.filePath) {
    console.log(`Telemetry will be saved to: ${telemetry.filePath}`);
  }

  for (let i = 0; i < maxIterations; i++) {
    console.log(`\n[Iteration ${i + 1}]`);
    const iterStart = Date.now();

    const renderedPrompt = renderPrompt(currentPrompt, filledVars);

    // Always get the LLM output for the current prompt (the task output, e.g., a title)
    let taskOutput: string;
    if (i === 0 && currentOutput !== "") {
      // Use provided currentOutput for the first iteration if given
      taskOutput = currentOutput;
    } else {
      taskOutput = await callLLM(
        model,
        await buildSinglePrompt(renderedPrompt)
      );
    }

    // Evaluate difference
    const difference = await evaluateDifference(taskOutput, idealOutput);

    // Evolve the prompt
    let evolvedPrompt: string | undefined = undefined;
    let promptEvolutionDurationMs: number | undefined = undefined;
    const promptEvolutionStart = Date.now();
    evolvedPrompt = await evolvePrompt({
      currentPrompt,
      currentOutput: taskOutput,
      idealOutput,
      differenceExplanation: difference,
      variables,
      history,
    });
    promptEvolutionDurationMs = Date.now() - promptEvolutionStart;

    // Get the LLM output for the evolved prompt (for next iteration)
    const nextRenderedPrompt = renderPrompt(evolvedPrompt!, filledVars);
    const nextTaskOutput = await callLLM(
      model,
      await buildSinglePrompt(nextRenderedPrompt)
    );

    const iterEnd = Date.now();
    telemetryData.push({
      iteration: i,
      startTime: new Date(iterStart).toISOString(),
      endTime: new Date(iterEnd).toISOString(),
      durationMs: iterEnd - iterStart,
      prompt: currentPrompt,
      renderedPrompt,
      output: taskOutput,
      difference,
      evolvedPrompt,
      promptEvolutionDurationMs,
    });
    history.push({
      iteration: i,
      prompt: currentPrompt,
      output: taskOutput,
      difference,
      optimizedPrompt: evolvedPrompt,
    });

    // Save telemetry after each iteration if telemetry is enabled
    // So that we can see the progress of the prompt evolution
    // And in case of early stopping of the script, or error, we can still have the partial telemetry data
    if (telemetry?.filePath) {
      await saveTelemetryData(telemetry.filePath, telemetryData, {
        initialPromptTemplate,
        variables,
        idealOutput,
        model,
        maxIterations,
        finalPromptTemplate: evolvedPrompt,
        finalOutput: nextTaskOutput,
        history,
        startedAt,
      });
    }

    currentPrompt = evolvedPrompt!;
    currentOutput = nextTaskOutput;
  }

  if (telemetry?.filePath) {
    await saveTelemetryData(telemetry.filePath, telemetryData, {
      initialPromptTemplate,
      variables,
      idealOutput,
      model,
      maxIterations,
      finalPromptTemplate: currentPrompt,
      finalOutput: currentOutput,
      history,
      startedAt,
    });
    console.log(`\nTelemetry saved to: ${path.resolve(telemetry.filePath)}`);
  }

  console.log("\n--- Prompt Evolve Finished ---");

  return {
    finalPromptTemplate: currentPrompt,
    finalOutput: currentOutput,
    history,
  };
}
