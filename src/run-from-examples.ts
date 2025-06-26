import { argv } from "process";
import { promptEvolve } from ".";
import { findExample } from "./examples";

if (require.main === module) {
  (async () => {
    const exampleId = argv[2] || "1";

    const example = findExample(exampleId);
    if (!example) throw new Error(`Example ${exampleId} not found`);

    await promptEvolve(example.params);
  })();
}
