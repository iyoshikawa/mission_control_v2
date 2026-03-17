#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const sourcePath = path.join(rootDir, 'data', 'tasks.json');
const outputPath = path.join(rootDir, 'views', 'data', 'tasks.generated.json');

const STATUS_ORDER = {
  active: 0,
  blocked: 1,
  backlog: 2,
  done: 3
};

const AREA_TO_OUTPUT = {
  projects: 'projects',
  communications: 'commsQueue',
  intelligence: 'intelligenceQueue'
};

function toIso(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeStatus(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return STATUS_ORDER[normalized] == null ? 'backlog' : normalized;
}

function normalizeTask(task = {}) {
  const area = AREA_TO_OUTPUT[task.area] ? task.area : 'projects';
  const status = normalizeStatus(task.status);
  const updatedAt = toIso(task.updatedAt) || new Date().toISOString();

  return {
    id: task.id || `${area}-${task.title || 'task'}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    title: String(task.title || 'Untitled task').trim(),
    status,
    area,
    summary: String(task.summary || '').trim(),
    owner: String(task.owner || '').trim(),
    detail: String(task.detail || '').trim(),
    nextAction: String(task.nextAction || '').trim(),
    updatedAt
  };
}

function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    const byStatus = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
    if (byStatus !== 0) return byStatus;
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });
}

function buildViewItem(task) {
  const base = {
    id: task.id,
    title: task.title,
    status: task.status.toUpperCase(),
    owner: task.owner,
    summary: task.summary,
    nextAction: task.nextAction,
    updatedAt: task.updatedAt
  };

  if (task.area === 'projects') {
    return {
      name: base.title,
      phase: base.summary,
      owner: base.owner,
      blockerSummary: task.status === 'blocked' ? (task.detail || task.summary) : '',
      nextMilestone: base.nextAction,
      status: base.status,
      updatedAt: base.updatedAt
    };
  }

  if (task.area === 'communications') {
    return {
      item: base.title,
      context: task.detail || base.summary,
      dueTiming: base.nextAction,
      owner: base.owner,
      status: base.status,
      updatedAt: base.updatedAt
    };
  }

  return {
    topic: base.title,
    whyItMatters: task.detail || base.summary,
    cadence: base.nextAction,
    owner: base.owner,
    lastUpdate: base.updatedAt,
    status: base.status
  };
}

async function main() {
  const raw = await fs.readFile(sourcePath, 'utf8');
  const source = JSON.parse(raw);
  const tasks = sortTasks((source.tasks || []).map(normalizeTask));

  const grouped = {
    projects: [],
    commsQueue: [],
    intelligenceQueue: []
  };

  for (const task of tasks) {
    grouped[AREA_TO_OUTPUT[task.area]].push(buildViewItem(task));
  }

  const generated = {
    meta: {
      generatedAt: new Date().toISOString(),
      sourceLastUpdated: toIso(source.meta?.lastUpdated),
      totalTasks: tasks.length,
      countsByStatus: {
        active: tasks.filter(task => task.status === 'active').length,
        blocked: tasks.filter(task => task.status === 'blocked').length,
        backlog: tasks.filter(task => task.status === 'backlog').length,
        done: tasks.filter(task => task.status === 'done').length
      }
    },
    tasks,
    views: grouped
  };

  await fs.writeFile(outputPath, JSON.stringify(generated, null, 2) + '\n');
  process.stdout.write(`Generated ${path.relative(rootDir, outputPath)} from ${path.relative(rootDir, sourcePath)}\n`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
