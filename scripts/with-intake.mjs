#!/usr/bin/env node
/**
 * with-intake.mjs — run a command against another intake file.
 *
 *   node scripts/with-intake.mjs client-intake.demo.json npm run build
 *
 * Sets INTAKE (see scripts/intake-path.mjs) for the command and everything it
 * starts, then exits with the command's exit code. It exists because
 * `INTAKE=x npm run build` is not valid in cmd.exe or PowerShell, and npm
 * scripts have to run on Windows and Linux alike.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { isAbsolute, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const [file, ...command] = process.argv.slice(2);
if (!file || !command.length) {
  console.error("usage: node scripts/with-intake.mjs <intake.json> <command...>");
  process.exit(1);
}
const path = isAbsolute(file) ? file : join(ROOT, file);
if (!existsSync(path)) {
  console.error(`✗ with-intake: ${file} not found.`);
  process.exit(1);
}
console.log(`with-intake: INTAKE=${file}`);
const result = spawnSync(command.join(" "), {
  cwd: ROOT,
  stdio: "inherit",
  shell: true,
  env: { ...process.env, INTAKE: file },
});
process.exit(result.status ?? 1);
