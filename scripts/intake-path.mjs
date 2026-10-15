/**
 * intake-path.mjs — which intake file this build reads.
 *
 * Default: client-intake.json in the repo root, exactly as before. Set the
 * INTAKE environment variable (a path, relative to the repo root or absolute)
 * to build from another file without touching client-intake.json. The template
 * uses it to build its own demo: `npm run demo` sets INTAKE to
 * client-intake.demo.json through scripts/with-intake.mjs.
 *
 * Every reader goes through here: astro.config.mjs (which also points the
 * `@intake` import alias used by src/config.ts at the same file), check-fonts,
 * check-intake, check-universal, pick-variants, verify-lock and apply-picks.
 * A reader that hardcodes the filename would build one business and check
 * another.
 */
import { isAbsolute, join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const DEFAULT_INTAKE = "client-intake.json";

export function intakePath() {
  const name = (process.env.INTAKE || "").trim() || DEFAULT_INTAKE;
  return isAbsolute(name) ? name : join(ROOT, name);
}

/** Repo-relative name for messages ("client-intake.demo.json"). */
export function intakeName() {
  return relative(ROOT, intakePath()).split("\\").join("/");
}
