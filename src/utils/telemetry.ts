import { HistoryEntry, TelemetryData, TelemetryMetadata } from "../types";
import { generateHTML } from "../reporters/htmlReporter";
import fs from "fs";
import path from "path";

export async function saveTelemetryFromHistory(
  telemetryData: HistoryEntry[],
  metadata: TelemetryMetadata
) {
  const telemetryObj: TelemetryData = {
    ...metadata,
    iterations: telemetryData,
  };
  // Always save the telemetry data as JSON
  await fs.writeFileSync(
    path.resolve(metadata.telemetry.filePath.replace(".html", ".json")),
    JSON.stringify(telemetryObj, null, 2),
    "utf-8"
  );

  if (metadata.telemetry.reporterType === "html") {
    const html = await generateHTML(telemetryObj);
    await fs.writeFileSync(
      path.resolve(metadata.telemetry.filePath),
      html,
      "utf-8"
    );
  }
}
