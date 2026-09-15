#!/usr/bin/env node
// Snapshots the gateway catalogue into public/data/models.json.
//
// Why a committed snapshot: api.kilo.ai does not send CORS headers, so a
// browser SPA cannot fetch it directly. The CI sync job below refreshes this
// file every 15 minutes; the app reads only this snapshot. Runs on Node
// built-ins alone — the workflow executes it before `npm ci`, with no
// dependencies installed.
//
// The models:sync script only needs Node ≥ 18 (global fetch); everything else
// uses Bun. Keep this file dependency-free.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MODELS_API_URL = "https://api.kilo.ai/api/gateway/models";
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/data/models.json");

try {
  const res = await fetch(MODELS_API_URL);
  if (!res.ok) {
    console.error(`models:sync failed: HTTP ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  const data = await res.json();
  if (!data || !Array.isArray(data.data)) {
    console.error("models:sync failed: unexpected response shape");
    process.exit(1);
  }
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(data));
  console.log(`models:sync wrote ${data.data.length} models to public/data/models.json`);
} catch (err) {
  console.error("models:sync failed:", err);
  process.exit(1);
}
