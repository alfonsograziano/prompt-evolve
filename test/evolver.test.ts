import { describe, it, expect, vi, beforeEach } from "vitest";
import { evolvePrompt } from "../src/utils/evolver";
import * as utilsIndex from "../src/utils/index";
import { LLMResponse, VariableDef, HistoryEntry } from "../src/types";

vi.mock("openai", () => ({
  __esModule: true,
  default: class {
    constructor() {}
  },
  OpenAI: class {
    constructor() {}
  },
}));

const baseLLMResponse = (output: string): LLMResponse => ({
  output,
  duration: 100,
  startTime: 1,
  endTime: 101,
  rawOutput: { choices: [{ message: { content: output } }] } as any,
  inputMessages: [],
});

describe("evolvePrompt", () => {
  const variables: VariableDef[] = [
    { name: "topic", description: "The topic", example: "Solar Power" },
    { name: "audience", description: "Target audience", example: "engineers" },
  ];
  const baseArgs = {
    currentPrompt: "Write about ${topic} for ${audience}.",
    currentOutput: "A casual text.",
    idealOutput: "A formal text about Solar Power for engineers.",
    differenceExplanation: "Too casual. Needs to be formal.",
    variables,
    history: [] as HistoryEntry[],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns valid response when all variables are present", async () => {
    vi.spyOn(utilsIndex, "callLLM").mockResolvedValueOnce(
      baseLLMResponse("Formal about ${topic} for ${audience}.")
    );
    const res = await evolvePrompt(baseArgs);
    expect(res.output).toContain("${topic}");
    expect(res.output).toContain("${audience}");
  });

  it("retries if a variable is missing, then succeeds", async () => {
    vi.spyOn(utilsIndex, "callLLM")
      .mockResolvedValueOnce(baseLLMResponse("Only ${topic} present."))
      .mockResolvedValueOnce(
        baseLLMResponse("Formal about ${topic} for ${audience}.")
      );
    const res = await evolvePrompt(baseArgs);
    expect(res.output).toContain("${topic}");
    expect(res.output).toContain("${audience}");
  });

  it("throws if variables are still missing after retries", async () => {
    vi.spyOn(utilsIndex, "callLLM").mockResolvedValue(
      baseLLMResponse("Only ${topic} is present.")
    );
    await expect(evolvePrompt(baseArgs)).rejects.toThrow(/missing=audience/);
  });

  it("throws if extra variables are present after retries", async () => {
    vi.spyOn(utilsIndex, "callLLM").mockResolvedValue(
      baseLLMResponse("Formal about ${topic} for ${audience} and ${extra}.")
    );
    await expect(evolvePrompt(baseArgs)).rejects.toThrow(/unexpected=extra/);
  });

  it("handles history correctly in the prompt", async () => {
    vi.spyOn(utilsIndex, "callLLM").mockResolvedValue(
      baseLLMResponse("Formal about ${topic} for ${audience}.")
    );
    const args = {
      ...baseArgs,
      history: [
        {
          iteration: 1,
          timing: { startTime: 0, endTime: 1, duration: 1 },
          input: { prompt: "Old prompt", output: "Old output" },
          output: {
            difference: baseLLMResponse("diff"),
            prompt: baseLLMResponse("prompt"),
            output: baseLLMResponse("output"),
          },
        },
      ],
    };
    const res = await evolvePrompt(args);
    expect(res.output).toContain("${topic}");
    expect(res.output).toContain("${audience}");
  });

  it("throws if all variables are missing after retries", async () => {
    vi.spyOn(utilsIndex, "callLLM").mockResolvedValue(
      baseLLMResponse("No variables present.") // Neither ${topic} nor ${audience}
    );
    await expect(evolvePrompt(baseArgs)).rejects.toThrow(
      /missing=topic,audience|missing=audience,topic/
    );
  });
});
