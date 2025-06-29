// ---- 1. Prompt Renderer ----
export function renderPrompt(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\$\{(\w+)\}/g, (_, v) => variables[v] ?? "");
}

// Helper function to build a simple prompt message array
export async function buildSinglePrompt(
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
