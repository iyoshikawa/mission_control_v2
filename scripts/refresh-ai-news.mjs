#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const outputDir = path.join(repoRoot, 'data');
const outputPath = path.join(outputDir, 'ai-news.generated.json');

const WATCH_SOURCES = [
  {
    name: 'Anthropic',
    status: 'ACTIVE',
    note: 'Primary model provider watch. Track releases, pricing, and API changes.',
    query: 'Anthropic AI'
  },
  {
    name: 'OpenAI',
    status: 'ACTIVE',
    note: 'Competitive benchmark watch. Track model launches, enterprise positioning, and pricing.',
    query: 'OpenAI AI'
  },
  {
    name: 'Google DeepMind',
    status: 'WATCH',
    note: 'Monitor Gemini, DeepMind research, and open model moves.',
    query: 'Google DeepMind AI'
  },
  {
    name: 'Microsoft Azure AI',
    status: 'WATCH',
    note: 'Track enterprise AI platform changes, Azure OpenAI positioning, and copilots.',
    query: 'Microsoft Azure AI'
  },
  {
    name: 'Meta AI',
    status: 'WATCH',
    note: 'Monitor open-source model and agent ecosystem moves.',
    query: 'Meta AI'
  }
];

function decodeXml(value = '') {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function stripHtml(value = '') {
  return decodeXml(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractTag(block, tag) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? stripHtml(match[1]) : '';
}

function extractItems(xml) {
  return Array.from(xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)).map((match) => {
    const block = match[0];
    return {
      title: extractTag(block, 'title'),
      link: extractTag(block, 'link'),
      pubDate: extractTag(block, 'pubDate'),
      description: extractTag(block, 'description'),
      source: extractTag(block, 'source')
    };
  });
}

function classifyImpact(title, summary) {
  const text = `${title} ${summary}`.toLowerCase();
  if (/(launch|release|ship|funding|regulat|policy|price|enterprise|partnership|lawsuit|ban|safety|model)/.test(text)) return 'HIGH';
  if (/(research|benchmark|open source|open-source|paper|pilot|preview|beta|hire|rumor)/.test(text)) return 'WATCH';
  return 'LOW';
}

function categorize(title, source) {
  const text = `${title} ${source}`.toLowerCase();
  if (/(law|act|regulat|policy|government|eu)/.test(text)) return 'regulation';
  if (/(price|pricing|enterprise|revenue|funding|market)/.test(text)) return 'market';
  if (/(model|release|launch|agent|copilot|gemini|gpt|claude|llama)/.test(text)) return 'models';
  return 'ecosystem';
}

function whyItMatters(source, title, category) {
  if (category === 'regulation') return `${source} item may affect compliance timing, governance, or customer requirements.`;
  if (category === 'market') return `${source} item may shift vendor pricing, buyer expectations, or stack selection.`;
  if (category === 'models') return `${source} item may change capability tradeoffs, evaluation priorities, or near-term tooling choices.`;
  return `${source} item is worth monitoring for competitive or ecosystem drift.`;
}

function buildAssessment(topic, items) {
  const highCount = items.filter((item) => item.impact === 'HIGH').length;
  const urgency = highCount >= 2 ? 'HIGH' : highCount === 1 ? 'WATCH' : 'LOW';
  return {
    topic,
    assessment: highCount
      ? `${highCount} high-signal item${highCount === 1 ? '' : 's'} in the latest cycle. Keep this provider on active watch.`
      : 'No top-tier signal in the latest cycle, but it remains part of the monitored competitive set.',
    urgency,
    recommendedAction: highCount
      ? 'Review the linked items and decide whether any stack, pricing, or compliance follow-up is needed.'
      : 'No immediate action. Keep monitoring on the hourly refresh cadence.'
  };
}

async function fetchFeed(query) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'mission-control-ai-news-refresh/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${query}: HTTP ${response.status}`);
  }

  return response.text();
}

function normalizeItem(item, provider) {
  const headline = item.title || `${provider.name} update`;
  const timestamp = new Date(item.pubDate || Date.now()).toISOString();
  const category = categorize(headline, item.source);
  const summary = item.description || `Latest ${provider.name} coverage.`;
  const source = item.source || provider.name;
  return {
    headline,
    source,
    timestamp,
    impact: classifyImpact(headline, summary),
    category,
    summary,
    whyItMatters: whyItMatters(provider.name, headline, category),
    link: item.link
  };
}

async function main() {
  const providerResults = [];

  for (const provider of WATCH_SOURCES) {
    const xml = await fetchFeed(provider.query);
    const items = extractItems(xml)
      .slice(0, 4)
      .map((item) => normalizeItem(item, provider));

    if (!items.length) {
      throw new Error(`No items returned for ${provider.name}`);
    }

    providerResults.push({ provider, items });
  }

  const merged = providerResults
    .flatMap(({ items }) => items)
    .filter((item, index, all) => all.findIndex((candidate) => candidate.link === item.link || candidate.headline === item.headline) === index)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const topStories = merged.slice(0, 6).map((item) => ({
    headline: item.headline,
    source: item.source,
    timestamp: item.timestamp,
    impact: item.impact,
    whyItMatters: item.whyItMatters,
    link: item.link,
    summary: item.summary
  }));

  const payload = {
    meta: {
      generatedAt: new Date().toISOString(),
      refreshCadence: 'hourly',
      sources: WATCH_SOURCES.map((item) => item.name)
    },
    newsFeed: merged.slice(0, 10),
    aiNews: {
      topStories,
      whyItMatters: providerResults.map(({ provider, items }) => buildAssessment(provider.name, items)),
      watchlist: WATCH_SOURCES.map(({ name, status, note }) => ({ name, status, note }))
    }
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  console.log(`Wrote ${outputPath}`);
  console.log(`- newsFeed items: ${payload.newsFeed.length}`);
  console.log(`- topStories: ${payload.aiNews.topStories.length}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
