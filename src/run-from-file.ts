import { z } from "zod";
import { promptEvolve } from "./index";
import { promises as fs } from "fs";
import path from "path";

const PromptEvolveArgsSchema = z.object({
  initialPromptTemplate: z.string(),
  variables: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      example: z.string(),
    })
  ),
  idealOutput: z.string(),
  model: z.string(),
  maxIterations: z.number(),
  telemetry: z
    .object({
      filePath: z.string(),
      reporterType: z.enum(["json", "html"]),
    })
    .optional(),
  currentOutput: z.string().optional(),
});

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: ts-node run-from-file.ts <input.json>");
    process.exit(1);
  }
  const absPath = path.resolve(filePath);
  let fileContent: string;
  try {
    fileContent = await fs.readFile(absPath, "utf-8");
  } catch (err) {
    console.error(`Failed to read file: ${absPath}`);
    process.exit(1);
  }
  let json: unknown;
  try {
    json = JSON.parse(fileContent);
  } catch (err) {
    console.error("Invalid JSON format.");
    process.exit(1);
  }
  const parsed = PromptEvolveArgsSchema.safeParse(json);
  if (!parsed.success) {
    console.error("JSON does not match the required schema:");
    console.error(parsed.error.format());
    process.exit(1);
  }
  await promptEvolve(parsed.data);
}

if (require.main === module) {
  main();
}
