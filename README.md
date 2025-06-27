# Prompt-evolve

Prompt-evolve is a tool designed to automatically improve and evolve LLM (Large Language Model) prompts to better match desired outputs. It implements an iterative approach to prompt engineering, using the power of LLMs themselves to enhance prompt effectiveness.

## Features

- 🔄 Iterative prompt evolution
- 📝 Template-based prompt system with variable support
- 📊 Detailed telemetry and iteration tracking
- 🔍 Automatic difference evaluation between current and ideal outputs
- 📈 Progress monitoring and logging
- 💾 Telemetry data export (JSON or beautiful HTML report)

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd prompt-evolve
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory with your OpenAI API key:

```bash
OPENAI_API_KEY=your_api_key_here
```

## Usage

The project provides three main ways to run prompt evolution:

### 1. Basic Usage

```typescript
import { promptEvolve } from "./index";

const result = await promptEvolve({
  initialPromptTemplate: "Generate a title for: ${content}",
  variables: [
    {
      name: "content",
      description: "The content to generate a title for",
      example: "A story about a brave cat",
    },
  ],
  idealOutput: "The Brave Cat's Tale",
  model: "gpt-4",
  maxIterations: 5,
  telemetry: {
    filePath: "telemetry.json",
  },
});
```

#### Enabling the HTML Reporter

To generate a beautiful, interactive HTML report of the prompt evolution process, set the `reporterType` to `"html"` in the telemetry options:

```typescript
telemetry: {
  filePath: "telemetry.html",
  reporterType: "html",
},
```

### 2. Running from Examples

```bash
npm run run-from-examples
```

### 3. Running from File

```bash
npm run run-from-file "./path/to/file.json"
```

## Configuration Options

The `promptEvolve` function accepts the following parameters:

- `initialPromptTemplate`: The starting prompt template with variable placeholders
- `variables`: Array of variable definitions with name, description, and example
- `idealOutput`: The target output you want to achieve
- `model`: The OpenAI model to use (e.g., "gpt-4")
- `maxIterations`: Maximum number of evolution iterations
- `telemetry`: Optional telemetry configuration (set `reporterType` to `"html"` for HTML report)
- `currentOutput`: Optional initial output to start with

## How It Works

1. **Prompt Rendering**: Converts template with variables into actual prompts
2. **Evaluation**: Compares current output with ideal output
3. **Evolution**: Uses LLM to improve the prompt based on the difference
4. **Iteration**: Repeats the process until maxIterations is reached
5. **Telemetry**: Records detailed information about each iteration

## Output

The system returns:

- `finalPromptTemplate`: The evolved prompt template
- `finalOutput`: The last output generated
- `history`: Complete evolution history

If telemetry is enabled, it also saves detailed iteration data to the specified file. If you use `reporterType: "html"`, the output will be a visually rich HTML report.

## Requirements

- Node.js
- OpenAI API key

## License

MIT License

Copyright (c) 2025 Alfonso Graziano

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request or open a new Issue.
