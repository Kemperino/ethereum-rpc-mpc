import { readFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
if (process.env.RELEASE_TAG !== `v${version}`) {
  console.error(`Release tag must match package.json: v${version}`);
  process.exitCode = 1;
}
