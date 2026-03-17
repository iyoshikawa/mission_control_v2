#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const samplePath = path.join(repoRoot, 'views', 'sample-data.json');
const outputDir = path.join(repoRoot, 'data');
const outputPath = path.join(outputDir, 'ai-news.generated.json');
const REQUIRED_SOURCES = ['Anthropic', 'OpenAI', 'Google DeepMind', 'Microsoft Azure AI', 'Meta AI'];
const SOURCE_LINKS = {
  AP: 'https://apnews.com/',
  Bloomberg: 'https://www.bloomberg.com/',
  'Financial Times': 'https://www.ft.com/',
  'Nikkei Asia': 'https://asia.nikkei.com/',
  Reuters: 'https://www.reuters.com/',
  'Ars Technica': 'https://arstechnica.com/',
  BBC: 'https://www.bbc.com/news',
  TechCrunch: 'https://techcrunch.com/',
  'The Verge': 'https://www.theverge.com/',
  Anthropic: 'https://www.anthropic.com/news',
  OpenAI: 'https://openai.com/news/',
  'Google DeepMind': 'https://deepmind.google/discover/blog/',
  'Microsoft Azure AI': 'https://azure.microsoft.com/en-us/blog/topics/ai-machine-learning/',
  'Meta AI': 'https://ai.meta.com/blog/'
};

function normalizeImpact(value) {
  if (value === 'MEDIUM') return 'WATCH';
  return value || 'LOW';
}

function slugify(value) {
  return String(value || 'item')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item';
}

function buildLink(item) {
  if (item.link) return item.link;
  const base = SOURCE_LINKS[item.source] || 'https://www.reuters.com/';
  return `${base.replace(/\/$/, '')}/#${slugify(item.headline)}`;
}

function withLink(item) {
  return {
    ...item,
    impact: normalizeImpact(item.impact),
    urgency: normalizeImpact(item.urgency),
    link: buildLink(item)
  };
}

function buildWatchlist(sample = {}) {
  const byName = new Map((Array.isArray(sample.aiNews?.watchlist) ? sample.aiNews.watchlist : []).map((item) => [item.name, item]));
  return REQUIRED_SOURCES.map((name) => {
    const existing = byName.get(name);
    if (existing) return existing;
    return {
      name,
      status: 'WATCH',
      note: `Track ${name} updates in the hourly automation refresh.`
    };
  });
}

async function main() {
  const raw = await fs.readFile(samplePath, 'utf8');
  const sample = JSON.parse(raw);

  const generated = {
    meta: {
      generatedAt: new Date().toISOString(),
      refreshCadence: 'hourly',
      sources: REQUIRED_SOURCES
    },
    newsFeed: Array.isArray(sample.newsFeed) ? sample.newsFeed.slice(0, 10).map(withLink) : [],
    aiNews: {
      topStories: Array.isArray(sample.aiNews?.topStories) ? sample.aiNews.topStories.slice(0, 6).map(withLink) : [],
      whyItMatters: Array.isArray(sample.aiNews?.whyItMatters) ? sample.aiNews.whyItMatters.map(withLink) : [],
      watchlist: buildWatchlist(sample)
    }
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(generated, null, 2)}\n`, 'utf8');

  console.log(`Generated ${path.relative(repoRoot, outputPath)}`);
  console.log(`- newsFeed items: ${generated.newsFeed.length}`);
  console.log(`- topStories: ${generated.aiNews.topStories.length}`);
  console.log(`- watchlist entries: ${generated.aiNews.watchlist.length}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
