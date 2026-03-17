#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const outputPath = path.join(repoRoot, 'views', 'data', 'tasks.generated.json');
const VALID_STATUSES = new Set(['active', 'blocked', 'backlog', 'done']);

async function main() {
  const raw = await fs.readFile(outputPath, 'utf8');
  const payload = JSON.parse(raw);

  if (!payload.meta || typeof payload.meta !== 'object') {
    throw new Error('Generated tasks payload is missing meta.');
  }

  if (!Array.isArray(payload.tasks) || !payload.tasks.length) {
    throw new Error('Generated tasks payload must contain a non-empty tasks array.');
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
