#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const payloadPath = path.join(repoRoot, 'views', 'data', 'global-news.generated.json');
const ALLOWED_IMPACTS = new Set(['HIGH', 'MEDIUM', 'LOW']);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertNonEmptyString(value, label) {
  assert(typeof value === 'string' && value.trim(), `${label} must be a non-empty string.`);
}

function assertIsoDate(value, label) {
  assertNonEmptyString(value, label);
  assert(Number.isFinite(Date.parse(value)), `${label} must be a valid ISO timestamp.`);
}

async function main() {
  const raw = await fs.readFile(payloadPath, 'utf8');
  const payload = JSON.parse(raw);

  assert(payload && typeof payload === 'object', 'Payload must be an object.');
  assert(payload.meta && typeof payload.meta === 'object', 'meta block is required.');
  assertIsoDate(payload.meta.generatedAt, 'meta.generatedAt');
  assert(payload.meta.refreshCadence === 'hourly', 'meta.refreshCadence must equal hourly.');
  assert(Array.isArray(payload.meta.sources) && payload.meta.sources.length > 0, 'meta.sources must list at least one feed URL.');

  assert(Array.isArray(payload.newsFeed), 'newsFeed must be an array.');
  assert(payload.newsFeed.length > 0, 'newsFeed must contain at least one item.');
  assert(payload.newsFeed.length <= 8, 'newsFeed must not exceed 8 items.');

  const seenHeadlines = new Set();
  for (const [index, item] of payload.newsFeed.entries()) {
    const prefix = `newsFeed[${index}]`;
    assertNonEmptyString(item.headline, `${prefix}.headline`);
    assertNonEmptyString(item.source, `${prefix}.source`);
    assertIsoDate(item.timestamp, `${prefix}.timestamp`);
    assert(ALLOWED_IMPACTS.has(item.impact), `${prefix}.impact must be HIGH, MEDIUM, or LOW.`);
    assertNonEmptyString(item.category, `${prefix}.category`);
    assertNonEmptyString(item.region, `${prefix}.region`);
    assertNonEmptyString(item.whyItMatters, `${prefix}.whyItMatters`);
    assertNonEmptyString(item.link, `${prefix}.link`);
    assert(/^https?:\/\//.test(item.link), `${prefix}.link must be http(s).`);
    const dedupeKey = item.headline.trim().toLowerCase();
    assert(!seenHeadlines.has(dedupeKey), `${prefix}.headline duplicates another item.`);
    seenHeadlines.add(dedupeKey);
  }

  console.log(`Validated ${payloadPath}`);
  console.log(`- newsFeed items: ${payload.newsFeed.length}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
