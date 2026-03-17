#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(repoRoot, 'data', 'tasks.source.json');
const payloadPath = path.join(repoRoot, 'data', 'tasks.generated.json');
const ALLOWED_STATUSES = ['active', 'blocked', 'backlog', 'done'];
const ALLOWED_LANES = ['projects', 'commsQueue', 'intelligenceQueue'];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertNonEmptyString(value, label) {
  assert(typeof value === 'string' && value.trim(), `${label} must be a non-empty string.`);
}

async function main() {
  const [sourceRaw, payloadRaw] = await Promise.all([
    fs.readFile(sourcePath, 'utf8'),
    fs.readFile(payloadPath, 'utf8')
  ]);

  const source = JSON.parse(sourceRaw);
  const payload = JSON.parse(payloadRaw);

  assert(Array.isArray(source.tasks), 'Source tasks array is required.');
  assert(Array.isArray(payload.tasks), 'Generated tasks array is required.');
  assert(payload.meta?.sourcePath === 'data/tasks.source.json', 'Generated payload must point to the canonical source path.');
  assert(Array.isArray(payload.meta?.statuses), 'Generated payload must list canonical statuses.');
  assert(JSON.stringify(payload.meta.statuses) === JSON.stringify(ALLOWED_STATUSES), 'Generated payload statuses must match the canonical status order.');
  assert(payload.tasks.length === source.tasks.length, 'Generated task count must match source task count.');

  const seenIds = new Set();
  for (const [index, task] of source.tasks.entries()) {
    const prefix = `source.tasks[${index}]`;
    assertNonEmptyString(task.id, `${prefix}.id`);
    assert(!seenIds.has(task.id), `${prefix}.id must be unique.`);
    seenIds.add(task.id);
    assertNonEmptyString(task.title, `${prefix}.title`);
    assert(ALLOWED_STATUSES.includes(task.status), `${prefix}.status must be one of ${ALLOWED_STATUSES.join(', ')}.`);
    assert(ALLOWED_LANES.includes(task.lane), `${prefix}.lane must be one of ${ALLOWED_LANES.join(', ')}.`);
  }

  const counts = Object.fromEntries(ALLOWED_STATUSES.map((status) => [status, 0]));
  for (const [index, task] of payload.tasks.entries()) {
    const prefix = `payload.tasks[${index}]`;
    assertNonEmptyString(task.id, `${prefix}.id`);
    assertNonEmptyString(task.title, `${prefix}.title`);
    assert(ALLOWED_STATUSES.includes(task.status), `${prefix}.status must be canonical.`);
    assert(ALLOWED_LANES.includes(task.lane), `${prefix}.lane must be supported.`);
    counts[task.status] += 1;
  }

  assert(payload.summary?.total === payload.tasks.length, 'summary.total must equal generated task count.');
  for (const status of ALLOWED_STATUSES) {
    assert(payload.summary?.byStatus?.[status] === counts[status], `summary.byStatus.${status} must match generated tasks.`);
  }

  assert(Array.isArray(payload.dashboard?.projects), 'dashboard.projects must be an array.');
  assert(Array.isArray(payload.dashboard?.commsQueue), 'dashboard.commsQueue must be an array.');
  assert(Array.isArray(payload.dashboard?.intelligenceQueue), 'dashboard.intelligenceQueue must be an array.');
  assert(payload.dashboard.projects.every((item) => ['ACTIVE', 'BLOCKED', 'DORMANT', 'HEALTHY'].includes(item.status)), 'dashboard.projects statuses must be mapped to dashboard badge values.');
  assert(payload.dashboard.commsQueue.every((item) => ['ACTIVE', 'BLOCKED', 'DORMANT', 'HEALTHY'].includes(item.status)), 'dashboard.commsQueue statuses must be mapped to dashboard badge values.');
  assert(payload.dashboard.intelligenceQueue.every((item) => ['ACTIVE', 'BLOCKED', 'DORMANT', 'HEALTHY'].includes(item.status)), 'dashboard.intelligenceQueue statuses must be mapped to dashboard badge values.');

  console.log(`Validated ${payloadPath}`);
  console.log(`- tasks: ${payload.tasks.length}`);
  console.log(`- active: ${counts.active}`);
  console.log(`- blocked: ${counts.blocked}`);
  console.log(`- backlog: ${counts.backlog}`);
  console.log(`- done: ${counts.done}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
