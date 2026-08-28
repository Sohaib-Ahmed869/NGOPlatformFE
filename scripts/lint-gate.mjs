#!/usr/bin/env node
/**
 * The lint rules that are actually FATAL — the ones whose violations throw in
 * the browser rather than annoy a reviewer.
 *
 * Why this exists: `vite build` doesn't resolve identifiers, so it happily
 * built this app three times with `useRef`, `scrollToTopOf` and `SASelect`
 * undefined. Each would have been a ReferenceError that blanked the screen on
 * load. `npm run lint` does catch them — but it reports ~3100 problems, 2895 of
 * them `react/prop-types` (this codebase deliberately doesn't declare them), so
 * a real failure is invisible in the noise and the command always exits 1.
 *
 * This runs the project's own ESLint config and fails on that fatal subset
 * only. Style stays advisory; crashes stop the build.
 */
import { ESLint } from "eslint";

// Violating any of these means the code is broken at runtime, not untidy.
const FATAL = new Set([
  "no-undef", // an identifier that doesn't exist — the one that bit us
  "react/jsx-no-undef", // <Component /> that was never imported
  "react-hooks/rules-of-hooks", // conditional hooks → "rendered fewer hooks"
  "no-const-assign",
  "no-dupe-args",
  "no-dupe-keys",
  "no-dupe-class-members",
  "no-func-assign",
  "no-import-assign",
  "no-obj-calls",
  "no-unreachable",
  "no-unsafe-negation",
  "valid-typeof",
]);

const eslint = new ESLint({
  // `no-use-before-define` isn't in eslint:recommended, and the TDZ bug it
  // catches has already cost this project a stuck screen.
  overrideConfig: [
    {
      files: ["**/*.{js,jsx}"],
      rules: {
        "no-use-before-define": ["error", { variables: true, functions: false, classes: false }],
      },
    },
  ],
});

const results = await eslint.lintFiles(["src"]);

const hits = [];
const advisory = [];
for (const file of results) {
  for (const m of file.messages) {
    // A parse error means the file can't even be read — always fatal.
    if (m.fatal || FATAL.has(m.ruleId)) hits.push({ file: file.filePath, ...m });
    // Reported, never blocking: a `const fn = …` referenced inside a callback
    // that runs later is perfectly safe, and this codebase is full of those.
    // It IS fatal when the reference is evaluated during render — a hook's
    // dependency array, say — which has cost this project a stuck screen, so
    // it stays visible rather than switched off.
    else if (m.ruleId === "no-use-before-define") advisory.push({ file: file.filePath, ...m });
  }
}

const root = process.cwd();
const rel = (f) => (f.startsWith(root) ? f.slice(root.length + 1) : f);

if (advisory.length) {
  console.log(
    `lint-gate: ${advisory.length} use-before-define reference${advisory.length === 1 ? "" : "s"} ` +
      `(not blocking — safe inside deferred callbacks, fatal in a render path):`,
  );
  for (const a of advisory.slice(0, 5)) console.log(`  ${rel(a.file)}:${a.line} — ${a.message}`);
  if (advisory.length > 5) console.log(`  …and ${advisory.length - 5} more`);
  console.log("");
}

if (hits.length === 0) {
  console.log(`lint-gate: clean (${results.length} files checked for runtime-fatal rules)`);
  process.exit(0);
}
console.error(`\nlint-gate: ${hits.length} runtime-fatal problem${hits.length === 1 ? "" : "s"}\n`);
for (const h of hits) {
  console.error(`  ${rel(h.file)}:${h.line}:${h.column}`);
  console.error(`    ${h.ruleId || "parse error"} — ${h.message}`);
}
console.error("\nThese throw in the browser. Fix them before shipping.\n");
process.exit(1);
