#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(repoRoot, 'data', 'tasks.json');
const outputPath = path.join(repoRoot, 'views', 'data', 'tasks.generated.json');

const STATUS_ORDER = ['active', 'blocked', 'backlog', 'done'];
const STATUS_TO_BADGE = {
  active: 'ACTIVE',
  blocked: 'BLOCKED',
  backlog: 'DORMANT',
  done: 'HEALTHY'
};
const VALID_LANES = new Set(['projects', 'commsQueue', 'intelligenceQueue']);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function compareTasks(a, b) {
  const statusDelta = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
  if (statusDelta) return statusDelta;
  const priorityDelta = (a.priority ?? Number.MAX_SAFE_INTEGER) - (b.priority ?? Number.MAX_SAFE_INTEGER);
  if (priorityDelta) return priorityDelta;
  return a.title.localeCompare(b.title);
}

function normalizeTask(task = {}) {
  assert(task.id, 'Each task requires id.');
  assert(task.title, `Task ${task.id || '<unknown>'} requires title.`);
  assert(STATUS_ORDER.includes(task.status), `Task ${task.id} has invalid status: ${task.status}`);
  assert(VALID_LANES.has(task.lane), `Task ${task.id} has invalid lane: ${task.lane}`);

  return {
    id: task.id,
    title: task.title,
    status: task.status,
    lane: task.lane,
    owner: task.owner ?? null,
    summary: task.summary ?? '',
    nextAction: task.nextAction ?? null,
    blocker: task.blocker ?? null,
    priority: task.priority ?? null,
    reviewDate: task.reviewDate ?? null,
    dueTiming: task.dueTiming ?? null,
    cadence: task.cadence ?? null,
    lastUpdate: task.lastUpdate ?? null,
    phase: task.phase ?? null
  };
}

function toProjectCard(task) {
  return {
    id: task.id,
    name: task.title,
    phase: task.phase || task.summary || '',
    owner: task.owner || '',
    nextMilestone: task.nextAction || '',
    blockerSummary: task.blocker || null,
    status: STATUS_TO_BADGE[task.status] || 'DORMANT'
  };
}

function toCommsCard(task) {
  return {
    id: task.id,
    item: task.title,
    context: task.summary || '',
    dueTiming: task.dueTiming || task.reviewDate || '',
    status: STATUS_TO_BADGE[task.status] || 'DORMANT'
  };
}

function toIntelCard(task) {
  return {
    id: task.id,
    topic: task.title,
    whyItMatters: task.summary || '',
    cadence: task.cadence || task.reviewDate || '',
    owner: task.owner || '',
    lastUpdate: task.lastUpdate || null,
    status: STATUS_TO_BADGE[task.status] || 'DORMANT'
  };
}

async function main() {
  const raw = await fs.readFile(sourcePath, 'utf8');
  const source = JSON.parse(raw);

  assert(Array.isArray(source.tasks), 'data/tasks.json must contain a tasks array.');

  const tasks = source.tasks.map(normalizeTask).sort(compareTasks);
  const byStatus = Object.fromEntries(STATUS_ORDER.map((status) => [status, tasks.filter((task) => task.status === status).length]));

  const dashboard = {
    projects: tasks.filter((task) => task.lane === 'projects').map(toProjectCard),
    commsQueue: tasks.filter((task) => task.lane === 'commsQueue').map(toCommsCard),
    intelligenceQueue: tasks.filter((task) => task.lane === 'intelligenceQueue').map(toIntelCard)
  };

  const payload = {
    meta: {
      generatedAt: new Date().toISOString(),
      sourcePath: 'data/tasks.json',
      sourceUpdatedAt: source.meta?.updatedAt || null,
      statuses: STATUS_ORDER
    },
    tasks,
    summary: {
      total: tasks.length,
      byStatus
    },
    dashboard
  };

  await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  console.log(`Wrote ${path.relative(repoRoot, outputPath)}`);
  console.log(`- tasks: ${payload.summary.total}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
