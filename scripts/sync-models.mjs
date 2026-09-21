#!/usr/bin/env bun
// Snapshots the gateway catalogue into public/data/models.json.
//
// Why a committed snapshot: api.kilo.ai does not send CORS headers, so a
// browser SPA cannot fetch it directly. The CI sync job below refreshes this
// file every 15 minutes; the app reads only this snapshot. Runs on runtime
// built-ins alone — the workflow executes it before `bun install`, with no
// dependencies installed.
//
// The models:sync script only needs a modern runtime with global fetch
// (Bun ≥ 1.0). Keep this file dependency-free.
import { mkdir, readFile, writeFile } from "node:fs/promises";
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
  // Stamp when this snapshot was taken so the UI can show the snapshot's age
  // instead of the client's fetch moment. Skip the rewrite when the catalogue
  // bytes are unchanged (ignoring our own stamp) so CI commits stay
  // change-driven rather than firing every 15 minutes on a new timestamp.
  const takenAt = new Date().toISOString();
  let prev = null;
  try {
    prev = JSON.parse(await readFile(OUT, "utf8"));
  } catch {
    prev = null; // No usable snapshot yet — write through below.
  }
  // The `enkrypt` block is unused by the app and churns on its own freshness
  // timestamps (lastCheckedAt/staleAfter), so exclude it from the comparison
  // to keep CI commits change-driven on catalogue data the UI actually shows.
  const stripEnkrypt = (models) => JSON.stringify(models, (key, value) => (key === "enkrypt" ? undefined : value));
  const prevDataJson = prev && Array.isArray(prev.data) ? stripEnkrypt(prev.data) : null;
  if (prevDataJson === stripEnkrypt(data.data) && typeof prev.snapshotTakenAt === "string") {
    console.log(`models:sync unchanged (${data.data.length} models); snapshot kept.`);
    process.exit(0);
  }
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify({ ...data, snapshotTakenAt: takenAt }));
  console.log(`models:sync wrote ${data.data.length} models to public/data/models.json (snapshotTakenAt ${takenAt})`);
} catch (err) {
  console.error("models:sync failed:", err);
  process.exit(1);
}
