/*
 * The global stylesheet is allowed to hold the ground and the reset, and nothing else.
 *
 * It exists only because those have to apply on the first paint, before any JavaScript
 * runs — everything else belongs in a component's own .styled module. That boundary is
 * easy to erode one convenient rule at a time, so it is checked rather than remembered.
 *
 * The test is simple: a global sheet may not name a class. A class is a component's
 * business, and a component styles itself.
 */

import fs from "node:fs";
import path from "node:path";

const SHEETS = process.argv.slice(2);
if (SHEETS.length === 0) {
  console.error("usage: check-global-css.mjs <stylesheet>...");
  process.exit(2);
}

/** Selectors a global sheet may use: the ground, the reset, and bare elements. */
// A bare element, the universal selector, :root or #root, each able to carry attribute
// selectors and pseudos — plus a standalone pseudo such as :focus-visible or ::selection.
const BASE = String.raw`(?:\*|[a-z][a-z0-9]*|#root|:root)`;
const PSEUDO = String.raw`(?::{1,2}[a-z-]+(?:\([^)]*\))?)`;
const ATTR = String.raw`(?:\[[a-z-]+(?:=['"]?[^\]]*?['"]?)?\])`;
const ALLOWED = new RegExp(`^(?:${BASE}(?:${ATTR}|${PSEUDO})*|(?:${PSEUDO})+)$`);

let failures = 0;

for (const sheet of SHEETS) {
  if (!fs.existsSync(sheet)) continue;
  const raw = fs.readFileSync(sheet, "utf8");

  /*
   * A rule may be exempted by the comment directly above it. The escape hatch is
   * deliberately noisy: it names a reason, and it shows up in a diff.
   */
  const allowed = new Set(
    [...raw.matchAll(/\/\*\s*global-css-allow:[^*]*\*\/\s*([^{]+)\{/g)]
      .map((m) => m[1].trim()),
  );

  const css = raw
    // Comments can contain anything, including examples that look like selectors.
    .replace(/\/\*[\s\S]*?\*\//g, "")
    // A keyframes block's steps are percentages, not selectors.
    .replace(/@keyframes[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/g, "");

  // Whatever sits between the last brace or semicolon and a "{" is a selector.
  let buffer = "";
  for (const ch of css) {
    if (ch === "{") {
      const selector = buffer.trim();
      buffer = "";
      if (!selector || selector.startsWith("@") || allowed.has(selector)) continue;

      for (const part of selector.split(",")) {
        // Descendant and combinator parts are each judged on their own.
        for (const token of part.trim().split(/[\s>+~]+/)) {
          const bare = token.trim();
          if (!bare) continue;
          if (bare.includes(".")) {
            console.error(`  ${path.relative(process.cwd(), sheet)}: names a class — "${selector}"`);
            failures++;
          } else if (!ALLOWED.test(bare)) {
            console.error(`  ${path.relative(process.cwd(), sheet)}: not a ground or reset selector — "${selector}"`);
            failures++;
          }
        }
      }
    } else if (ch === "}" || ch === ";") {
      buffer = "";
    } else {
      buffer += ch;
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} rule(s) do not belong in a global stylesheet.`);
  console.error("Move them into the component's own .styled module.\n");
  process.exit(1);
}

console.log(`global css ok (${SHEETS.length} sheet${SHEETS.length === 1 ? "" : "s"})`);
