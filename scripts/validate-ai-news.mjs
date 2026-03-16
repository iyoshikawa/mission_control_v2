#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const payloadPath = path.join(repoRoot, 'data', 'ai-news.generated.json');

const REQUIRED_SOURCES = [
  'Anthropic',
  'OpenAI',
  'Google DeepMind',
  'Microsoft Azure AI',
  'Meta AI'
];
const ALLOWED_IMPACTS = new Set(['HIGH', 'WATCH', 'LOW']);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIsoDate(value, label) {
  assert(typeof value === 'string' && value.trim(), `${label} must be a non-empty string.`);
  const timestamp = Date.parse(value);
  assert(Number.isFinite(timestamp), `${label} must be a valid ISO date.`);
}

function assertNonEmptyString(value, label) {
  assert(typeof value === 'string' && value.trim(), `${label} must be a non-empty string.`);
}

function assertImpact(value, label) {
  assert(ALLOWED_IMPACTS.has(value), `${label} must be one of ${Array.from(ALLOWED_IMPACTS).join(', ')}.`);
}

async function main() {
  const raw = await fs.readFile(payloadPath, 'utf8');
  const payload = JSON.parse(raw);

  assert(payload && typeof payload === 'object', 'Generated payload must be an object.');
  assert(payload.meta && typeof payload.meta === 'object', 'meta block is required.');
  assertIsoDate(payload.meta.generatedAt, 'meta.generatedAt');
  assert(payload.meta.refreshCadence === 'hourly', 'meta.refreshCadence must equal "hourly".');
  assert(Array.isArray(payload.meta.sources), 'meta.sources must be an array.');
  assert(REQUIRED_SOURCES.every((source) => payload.meta.sources.includes(source)), 'meta.sources must include all required providers.');

  assert(Array.isArray(payload.newsFeed), 'newsFeed must be an array.');
  assert(payload.newsFeed.length > 0, 'newsFeed must contain at least one item.');
  assert(payload.newsFeed.length <= 10, 'newsFeed must not exceed 10 items.');

  const seenHeadlines = new Set();
  const seenLinks = new Set();
  for (const [index, item] of payload.newsFeed.entries()) {
    const prefix = `newsFeed[${index}]`;
    assertNonEmptyString(item.headline, `${prefix}.headline`);
    assertNonEmptyString(item.source, `${prefix}.source`);
    assertIsoDate(item.timestamp, `${prefix}.timestamp`);
    assertImpact(item.impact, `${prefix}.impact`);
    assertNonEmptyString(item.category, `${prefix}.category`);
    assertNonEmptyString(item.link, `${prefix}.link`);
    assert(/^https?:\/\//.test(item.link), `${prefix}.link must be http(s).`);

    const headlineKey = item.headline.trim().toLowerCase();
    const linkKey = item.link.trim();
    assert(!seenHeadlines.has(headlineKey), `${prefix}.headline duplicates another newsFeed entry.`);
    assert(!seenLinks.has(linkKey), `${prefix}.link duplicates another newsFeed entry.`);
    seenHeadlines.add(headlineKey);
    seenLinks.add(linkKey);
  }

  assert(payload.aiNews && typeof payload.aiNews === 'object', 'aiNews block is required.');
  assert(Array.isArray(payload.aiNews.topStories), 'aiNews.topStories must be an array.');
  assert(payload.aiNews.topStories.length > 0, 'aiNews.topStories must contain at least one item.');
  assert(payload.aiNews.topStories.length <= 6, 'aiNews.topStories must not exceed 6 items.');

  for (const [index, item] of payload.aiNews.topStories.entries()) {
    const prefix = `aiNews.topStories[${index}]`;
    assertNonEmptyString(item.headline, `${prefix}.headline`);
    assertNonEmptyString(item.source, `${prefix}.source`);
    assertIsoDate(item.timestamp, `${prefix}.timestamp`);
    assertImpact(item.impact, `${prefix}.impact`);
    assertNonEmptyString(item.whyItMatters, `${prefix}.whyItMatters`);
    if (item.link != null) {
      assertNonEmptyString(item.link, `${prefix}.link`);
      assert(/^https?:\/\//.test(item.link), `${prefix}.link must be http(s).`);
    }
  }

  assert(Array.isArray(payload.aiNews.whyItMatters), 'aiNews.whyItMatters must be an array.');
  assert(payload.aiNews.whyItMatters.length > 0, 'aiNews.whyItMatters must contain at least one assessment.');
  for (const [index, item] of payload.aiNews.whyItMatters.entries()) {
    const prefix = `aiNews.whyItMatters[${index}]`;
    assertNonEmptyString(item.topic, `${prefix}.topic`);
    assertNonEmptyString(item.assessment, `${prefix}.assessment`);
    assertImpact(item.urgency, `${prefix}.urgency`);
    assertNonEmptyString(item.recommendedAction, `${prefix}.recommendedAction`);
  }

  assert(Array.isArray(payload.aiNews.watchlist), 'aiNews.watchlist must be an array.');
  assert(payload.aiNews.watchlist.length === REQUIRED_SOURCES.length, 'aiNews.watchlist must contain one entry per required source.');
  assert(REQUIRED_SOURCES.every((source) => payload.aiNews.watchlist.some((item) => item.name === source)), 'aiNews.watchlist must cover all required sources.');

  for (const [index, item] of payload.aiNews.watchlist.entries()) {
    const prefix = `aiNews.watchlist[${index}]`;
    assertNonEmptyString(item.name, `${prefix}.name`);
    assert(['ACTIVE', 'WATCH', 'DORMANT'].includes(item.status), `${prefix}.status must be ACTIVE, WATCH, or DORMANT.`);
    assertNonEmptyString(item.note, `${prefix}.note`);
  }

  console.log(`Validated ${payloadPath}`);
  console.log(`- newsFeed items: ${payload.newsFeed.length}`);
  console.log(`- topStories: ${payload.aiNews.topStories.length}`);
  console.log(`- watchlist entries: ${payload.aiNews.watchlist.length}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
