import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const saida = mkdtempSync(join(tmpdir(), "data-"));
execFileSync(
  "npx",
  ["tsc", "lib/data.ts", "--outDir", saida, "--module", "esnext", "--target", "es2022", "--moduleResolution", "bundler"],
  { shell: true, stdio: "inherit" },
);

const { diasAteNoFuso }: typeof import("./data.ts") = await import(
  pathToFileURL(join(saida, "data.js")).href
);

const prazo = "2026-09-23";

// 00:30 UTC ainda é 21:30 do dia 23 em Brasília: o prazo segue aberto.
assert.equal(diasAteNoFuso(prazo, new Date("2026-09-24T00:30:00Z")), 0);

// Depois da meia-noite em Brasília, o prazo passou.
assert.equal(diasAteNoFuso(prazo, new Date("2026-09-24T03:01:00Z")), -1);

assert.equal(diasAteNoFuso(null), null);
assert.equal(diasAteNoFuso("23/09/2026"), null);

console.log("data: ok");
