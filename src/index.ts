import {
  renderPrompt,
  buildSinglePrompt,
  callLLM,
  evaluateDifference,
  evolvePrompt,
  saveTelemetryFromHistory,
} from "./utils";
import { HistoryEntry, PromptEvolveArgs } from "./types";

export async function promptEvolve({
  initialPromptTemplate,
  variables,
  idealOutput,
  model,
  maxIterations,
  telemetry,
  initialOutput,
}: PromptEvolveArgs) {
  let currentPrompt = initialPromptTemplate;
  let currentOutput: string | null = null;
  let history: HistoryEntry[] = [];

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

  // If no initial output is provided, call the LLM with the initial prompt
  // This is useful for the first iteration, where we don't have a previous output to use
  if (typeof initialOutput === "undefined") {
    const { output, duration: initialOutputDuration } = await callLLM(
      model,
      await buildSinglePrompt(renderPrompt(currentPrompt, filledVars))
    );
    console.log(
      `  [Iteration 0] LLM (generating initial output): ${initialOutputDuration}ms`
    );
    currentOutput = output;
  } else {
    currentOutput = initialOutput;
  }

  // Main evolution loop
  for (let i = 0; i < maxIterations; i++) {
    const startTime = Date.now();
    console.log(`\n[Iteration ${i + 1}]`);
    // Right now, currentOutput will be a string for sure - given that we initialized it earlier
    if (typeof currentOutput !== "string") {
      throw new Error("Current output is not a string");
    }

    // Get the difference between the current output and the ideal output
    const difference = await evaluateDifference(currentOutput, idealOutput);
    console.log(
      `  [Iteration ${i + 1}] - Computing Difference: ${difference.duration}ms`
    );

    // Evolve the prompt
    const evolvedPrompt = await evolvePrompt({
      currentPrompt,
      currentOutput,
      idealOutput,
      differenceExplanation: difference.output,
      variables,
      history,
    });
    console.log(
      `  [Iteration ${i + 1}] - Evolving Prompt: ${evolvedPrompt.duration}ms`
    );

    const renderedEvolvedPrompt = renderPrompt(
      evolvedPrompt.output,
      filledVars
    );

    const outputFromEvolvedPrompt = await callLLM(
      model,
      await buildSinglePrompt(renderedEvolvedPrompt)
    );
    console.log(
      `  [Iteration ${i + 1}] - Calling LLM with Evolved Prompt: ${
        outputFromEvolvedPrompt.duration
      }ms`
    );

    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`  [Iteration ${i + 1}] - Total Duration: ${duration}ms`);

    history.push({
      iteration: i + 1,
      timing: {
        startTime,
        endTime,
        duration,
      },
      input: {
        prompt: currentPrompt,
        output: currentOutput,
      },
      output: {
        difference,
        prompt: evolvedPrompt,
        output: outputFromEvolvedPrompt,
      },
    });

    // Update the current prompt and output
    currentPrompt = evolvedPrompt.output;
    currentOutput = outputFromEvolvedPrompt.output;
  }

  console.log("\n--- Prompt Evolve Finished ---");

  if (telemetry) {
    await saveTelemetryFromHistory(history, {
      initialPromptTemplate,
      variables,
      idealOutput,
      model,
      maxIterations,
      telemetry,
    });
  }

  return {
    finalPromptTemplate: currentPrompt,
    finalOutput: currentOutput,
    history,
  };
}
