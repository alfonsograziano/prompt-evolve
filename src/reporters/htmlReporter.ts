import { HistoryEntry, TelemetryData } from "../types";

export async function generateHTML(telemetryObj: TelemetryData) {
  // Simple HTML template for demonstration
  const html = `<!DOCTYPE html>
<html lang=\"en\">
<head>
  <meta charset=\"UTF-8\">
  <title>Prompt Evolve Telemetry Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 2em; background: #181c27; color: #f3f6fa; }
    h1 { color: #4f8cff; letter-spacing: 1px; font-size: 2.2em; text-shadow: 0 2px 12px #222b44cc; }
    h2 { color: #f3f6fa; border-left: 5px solid #4f8cff; padding-left: 0.5em; margin-bottom: 0.7em; }
    pre { margin-bottom: 2em; background: #232a3b; border-radius: 10px; box-shadow: 0 2px 8px #0004; padding: 2em; color: #f3f6fa; }
    ul { padding-left: 1.5em; }
    li { margin-bottom: 0.5em; }
    .section { margin-bottom: 2.5em; }
    .meta-row, .output-row { display: flex; gap: 2em; flex-wrap: wrap; background: linear-gradient(90deg, #232a3b 60%, #1a2030 100%); border-radius: 16px; box-shadow: 0 4px 24px #0006; padding: 1.5em 1.5em 1.2em 1.5em; margin-bottom: 2em; }
    .meta-col, .output-col { background: #232a3b; border-radius: 10px; box-shadow: 0 2px 8px #0003; padding: 1em 1.2em 1.2em 1.2em; margin-bottom: 0; flex: 1 1 0; min-width: 280px; gap: 0.5em; border: 1.5px solid #4f8cff33; }
    .meta-col h2, .output-col b { color: #4f8cff; }
    .output-col pre, .meta-col pre { background: #181c27; color: #f3f6fa; border: 1px solid #4f8cff33; white-space: pre-wrap; word-break: break-word; }
    .iteration-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 2em; }
    .iteration-item { background: linear-gradient(90deg, #232a3b 60%, #1a2030 100%); border-radius: 14px; box-shadow: 0 4px 24px #0007; padding: 2em 2em 1.5em 2em; border-left: 6px solid #4f8cff; transition: box-shadow 0.2s, border-color 0.2s; position: relative; }
    .iteration-item:hover { box-shadow: 0 8px 32px #000b; border-left: 6px solid #00e0ff; }
    .iteration-header { display: flex; align-items: center; margin-bottom: 1.2em; gap: 0.7em; }
    .iteration-number { font-weight: bold; font-size: 1.3em; color: #fff; background: linear-gradient(135deg, #4f8cff 60%, #00e0ff 100%); border-radius: 50%; width: 2.2em; height: 2.2em; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 4px #0005; }
    .iteration-label { font-size: 1em; color: #00e0ff; letter-spacing: 1px; text-transform: uppercase; }
    .iteration-fields { display: flex; flex-wrap: wrap; gap: 2em; }
    .field-block { flex: 1 1 0; min-width: 280px; background: #232a3b; border-radius: 8px; box-shadow: 0 1px 3px #0003; padding: 1em 1.2em 1.2em 1.2em; margin-bottom: 0; display: flex; flex-direction: column; gap: 0.5em; border: 1px solid #4f8cff33; }
    .field-label { font-weight: 600; color: #00e0ff; margin-bottom: 0.2em; font-size: 1.05em; letter-spacing: 0.5px; }
    .field-block pre { background: #181c27; border-radius: 6px; padding: 0.7em 1em; font-size: 0.98em; margin: 0; box-shadow: none; border: 1px solid #4f8cff33; color: #f3f6fa; max-height: 260px; overflow-y: auto; white-space: pre-wrap; word-break: break-word; }
    .copy-btn { display: inline-block; margin-left: 0.5em; padding: 0.2em 0.7em; font-size: 0.95em; background: linear-gradient(90deg, #4f8cff 60%, #00e0ff 100%); color: #181c27; border: none; border-radius: 5px; cursor: pointer; transition: background 0.2s, color 0.2s; vertical-align: middle; font-weight: 600; box-shadow: 0 2px 8px #0003; }
    .copy-btn:hover { background: linear-gradient(90deg, #00e0ff 60%, #4f8cff 100%); color: #fff; }
    @media (max-width: 900px) { .meta-row, .output-row { flex-direction: column; gap: 1em; } .meta-col, .output-col { max-width: 100%; } }
    @media (max-width: 700px) { .iteration-fields { flex-direction: column; gap: 1em; } .field-block { max-width: 100%; } }
  </style>
</head>
<body>
  <h1>🧠⚙️📊 Prompt Evolve Telemetry Report</h1>
  <div class="section">
    <div class="meta-row">
      <div class="meta-col">
        <h2>🔢 Variables</h2>
        <ul>
          ${(telemetryObj.variables || [])
            .map(
              (v: any) =>
                `<li><b>${v.name}</b>: ${v.description} (e.g., ${v.example})</li>`
            )
            .join("")}
        </ul>
      </div>
      <div class="meta-col">
        <h2>🗂️ Metadata</h2>
        <ul>
          <li><b>Model:</b> ${telemetryObj.model}</li>
          <li><b>Max Iterations:</b> ${telemetryObj.maxIterations}</li>
          <li><b>Started At:</b> ${
            telemetryObj.iterations[0].timing.startTime
          }</li>
          <li><b>Finished At:</b> ${
            telemetryObj.iterations[telemetryObj.iterations.length - 1].timing
              .endTime
          }</li>
          <li><b>Total Duration (ms):</b> ${
            telemetryObj.iterations[telemetryObj.iterations.length - 1].timing
              .duration
          }</li>
         
        </ul>
      </div>
    </div>
    <div class="output-row" style="margin-bottom: 1.5em;">
      <div class="output-col">
        <b>Initial Prompt:</b>
        <pre>${telemetryObj.initialPromptTemplate}</pre>
      </div>
      <div class="output-col">
        <span><b>Final Prompt:</b> <button class="copy-btn" onclick="copyFinalPromptTemplate()">Copy</button></span>
        <pre id="finalPromptTemplate">${
          telemetryObj.iterations[telemetryObj.iterations.length - 1].output
            .prompt.output
        }</pre>
        <div style="margin-top:0.7em; color:#00e0ff; font-size:1.08em;">
         
        </div>
      </div>
    </div>
    <div class="output-row">
      <div class="output-col">
        <b>Ideal Output:</b>
        <pre>${telemetryObj.idealOutput}</pre>
      </div>
      <div class="output-col">
        <b>Final Output:</b>
        <pre>${
          telemetryObj.iterations[telemetryObj.iterations.length - 1].output
            .output.output
        }</pre>
      </div>
    </div>
  </div>
 
  <div class="section">
    <h2>🔁 Iterations</h2>
    <ul class="iteration-list">
      ${(telemetryObj.iterations || [])
        .map(
          (it: HistoryEntry) => `
        <li class="iteration-item">
          <div class="iteration-header">
            <span class="iteration-number">#${it.iteration}</span>
            <span class="iteration-label">Iteration</span>
          </div>
          <div class="iteration-fields">
            <div class="field-block">
              <div class="field-label">Prompt</div>
              <pre>${it.input.prompt}</pre>
            </div>
            <div class="field-block">
              <div class="field-label">Output</div>
              <pre>${it.input.output}</pre>
            </div>
            <div class="field-block">
              <div class="field-label">Difference</div>
              <pre>${it.output.difference.output}</pre>
            </div>
            <div class="field-block">
              <div class="field-label">Evolved Prompt</div>
              <pre>${it.output.prompt.output}</pre>
            </div>
          </div>
        </li>
      `
        )
        .join("")}
    </ul>
  </div>
  
</body>
<script>
function copyFinalPromptTemplate() {
  const pre = document.getElementById('finalPromptTemplate');
  if (!pre) return;
  const text = pre.innerText;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector('.copy-btn');
    if (btn) {
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy'; }, 1200);
    }
  });
}
</script>
</html>`;
  return html;
}
