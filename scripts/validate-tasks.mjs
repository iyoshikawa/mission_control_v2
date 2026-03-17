#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const outputPath = path.join(repoRoot, 'views', 'data', 'tasks.generated.json');
const VALID_STATUSES = new Set(['active', 'blocked', 'backlog', 'done']);
const VALID_DASHBOARD_KEYS = ['projects', 'commsQueue', 'intelligenceQueue'];

async function main() {
  const raw = await fs.readFile(outputPath, 'utf8');
  const payload = JSON.parse(raw);

  if (!payload.meta || typeof payload.meta !== 'object') {
    throw new Error('Generated tasks payload is missing meta.');
  }
  if (payload.meta.sourcePath !== 'data/tasks.json') {
    throw new Error(`Generated tasks payload should point to data/tasks.json, got ${payload.meta.sourcePath || '<missing>'}`);
  }
  if (!Array.isArray(payload.tasks) || !payload.tasks.length) {
    throw new Error('Generated tasks payload must contain a non-empty tasks array.');
  }
  if (!payload.dashboard || typeof payload.dashboard !== 'object') {
    throw new Error('Generated tasks payload is missing dashboard projections.');
  }

  for (const key of VALID_DASHBOARD_KEYS) {
    if (!Array.isArray(payload.dashboard[key])) {
      throw new Error(`Generated tasks payload is missing dashboard.${key}.`);
    }
  }

  for (const task of payload.tasks) {
    if (!task.id || !task.title) {
      throw new Error('Each generated task requires id and title.');
    }
    if (!VALID_STATUSES.has(task.status)) {
      throw new Error(`Invalid generated task status for ${task.id}: ${task.status}`);
    }
  }

  console.log(`Validated ${payload.tasks.length} generated tasks in ${path.relative(repoRoot, outputPath)}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
