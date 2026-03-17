#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(repoRoot, 'data', 'tasks.json');
const outputPath = path.join(repoRoot, 'views', 'data', 'tasks.generated.json');
const VALID_STATUSES = ['active', 'blocked', 'backlog', 'done'];

function assertTask(task, index) {
  if (!task || typeof task !== 'object' || Array.isArray(task)) {
    throw new Error(`Task at index ${index} must be an object.`);
  }
  if (!task.id || typeof task.id !== 'string') {
    throw new Error(`Task at index ${index} is missing string id.`);
  }
  if (!task.title || typeof task.title !== 'string') {
    throw new Error(`Task ${task.id} is missing string title.`);
  }
  if (!VALID_STATUSES.includes(task.status)) {
    throw new Error(`Task ${task.id} has invalid status ${JSON.stringify(task.status)}.`);
  }
}

async function main() {
  const raw = await fs.readFile(sourcePath, 'utf8');
  const source = JSON.parse(raw);
  const tasks = Array.isArray(source.tasks) ? source.tasks : [];

  if (!tasks.length) {
    throw new Error('Canonical task source must include at least one task.');
  }

  tasks.forEach(assertTask);

  const payload = {
    meta: {
      generatedAt: new Date().toISOString(),
      sourcePath: 'data/tasks.json',
      taskCount: tasks.length,
      statuses: VALID_STATUSES
    },
    tasks: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      summary: task.summary || '',
      owner: task.owner || '',
      nextAction: task.nextAction || '',
      blocker: task.blocker || '',
      updatedAt: task.updatedAt || null
    }))
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${payload.tasks.length} tasks to ${outputPath}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
