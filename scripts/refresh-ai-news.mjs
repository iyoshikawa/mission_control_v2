#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const outputPath = path.join(repoRoot, 'data', 'ai-news.generated.json');

const MAX_PER_SOURCE = 4;
const MAX_NEWS_FEED = 10;
const MUST_HAVE_SOURCES = [
  'Anthropic',
  'OpenAI',
  'Google DeepMind',
  'Microsoft Azure AI',
  'Meta AI'
];

const WATCHLIST = MUST_HAVE_SOURCES.map((name, index) => ({
  name,
  status: index < 2 ? 'ACTIVE' : 'WATCH',
  note: `${name} live source is included in the hourly AI news refresh.`
}));

function stripTags(value = '') {
  return value
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#8217;|&#x2019;/gi, "'")
    .replace(/&#8211;|&#x2013;/gi, '–')
    .replace(/&#8212;|&#x2014;/gi, '—')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtml(value = '') {
  return stripTags(value).trim();
}

function slugifyHeadline(value = '') {
  return decodeHtml(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toIso(value) {
  if (!value) return new Date().toISOString();
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

function summarize(text = '', max = 180) {
  const clean = decodeHtml(text);
  if (!clean) return null;
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

function scoreItem(item) {
  const text = `${item.headline} ${item.summary || ''}`.toLowerCase();
  let score = 0;
  if (/(introduc|release|launch|ship|announce|available|general availability|debut)/.test(text)) score += 5;
  if (/(gpt|claude|gemini|gemma|llama|veo|model|api|agent|foundry|copilot)/.test(text)) score += 4;
  if (/(pricing|price|enterprise|security|policy|regulation|compliance|safety)/.test(text)) score += 3;
  if (/(customer|podcast|case study|story|spotlight|wayfair|rakuten)/.test(text)) score -= 4;
  return score;
}

function categorize(item) {
  const text = `${item.headline} ${item.summary || ''}`.toLowerCase();
  if (/(price|pricing|seat|cost|billing|economics)/.test(text)) return 'pricing';
  if (/(policy|regulation|act|compliance|safety)/.test(text)) return 'regulation';
  if (/(security|prompt injection|trust|abuse)/.test(text)) return 'tooling';
  if (/(gpu|chip|compute|cloud|infrastructure|sovereign|environment|container)/.test(text)) return 'infrastructure';
  if (/(research|paper|benchmark|science|biology|alphago)/.test(text)) return 'research';
  if (/(sdk|developer|tool|framework|agent|api|foundry|copilot|codemod)/.test(text)) return 'tooling';
  if (/(model|gpt|claude|gemini|llama|gemma|veo)/.test(text)) return 'model-release';
  return 'competitive';
}

function priorityFor(item) {
  const category = categorize(item);
  const text = `${item.headline} ${item.summary || ''}`.toLowerCase();
  if (category === 'pricing' || category === 'regulation' || category === 'model-release') return 'HIGH';
  if (/enterprise|api|foundry|copilot|agent|security/.test(text)) return 'HIGH';
  if (category === 'tooling' || category === 'infrastructure' || category === 'competitive') return 'WATCH';
  return 'LOW';
}

function whyItMatters(item) {
  switch (categorize(item)) {
    case 'pricing':
      return 'Could change current AI spend assumptions and vendor comparisons.';
    case 'regulation':
      return 'May affect compliance posture, acceptable use, or enterprise procurement requirements.';
    case 'infrastructure':
      return 'Relevant to model hosting options, cloud posture, and future capacity planning.';
    case 'tooling':
      return 'Worth evaluating for workflow leverage if it reduces manual operator effort.';
    case 'model-release':
      return 'Directly relevant to model selection, capability benchmarking, and stack choices.';
    default:
      return 'Useful competitive signal for provider positioning and roadmap tracking.';
  }
}

function pullTag(block, tagNames) {
  for (const tag of tagNames) {
    const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    if (match) return match[1].trim();
  }
  return '';
}

function parseRss(xml, source) {
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];
  return blocks.slice(0, MAX_PER_SOURCE * 2).map(block => {
    const headline = decodeHtml(pullTag(block, ['title']));
    const link = decodeHtml(pullTag(block, ['link']));
    const summary = summarize(pullTag(block, ['description', 'content:encoded']));
    const timestamp = toIso(pullTag(block, ['pubDate', 'dc:date', 'published', 'updated']));
    return { headline, link, summary, timestamp, source };
  }).filter(item => item.headline && item.link);
}

function parseAnthropicNews(html) {
  const matches = [...html.matchAll(/<a[^>]+href="(\/news\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
  const seen = new Set();
  const items = [];
  for (const [, relativeLink, block] of matches) {
    const link = `https://www.anthropic.com${relativeLink}`;
    if (seen.has(link)) continue;
    seen.add(link);
    const titleMatch = block.match(/<(?:h2|h3|h4)[^>]*>([\s\S]*?)<\/(?:h2|h3|h4)>/i)
      || block.match(/<span[^>]*title[^>]*>([\s\S]*?)<\/span>/i);
    const dateMatch = block.match(/<time[^>]*>([\s\S]*?)<\/time>/i);
    const summaryMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const headline = decodeHtml(titleMatch?.[1] || '');
    if (!headline) continue;
    items.push({
      headline,
      link,
      summary: summarize(summaryMatch?.[1] || ''),
      timestamp: toIso(dateMatch?.[1] || ''),
      source: 'Anthropic'
    });
    if (items.length >= MAX_PER_SOURCE) break;
  }
  return items;
}

function filterRelevant(source, items) {
  return items
    .filter(item => item.headline && item.link)
    .filter(item => {
      const text = `${item.headline} ${item.summary || ''}`.toLowerCase();
      if (/(podcast|customer story|case study|wayfair|rakuten)/.test(text)) return false;
      if (source === 'Microsoft Azure AI') return /(ai|gpt|copilot|foundry|model|mistral|openai|agent)/.test(text);
      if (source === 'Meta AI') return /(ai|llama|model|agent|machine learning|ml|codemod)/.test(text);
      return true;
    })
    .slice(0, MAX_PER_SOURCE)
    .map(item => {
      const category = categorize(item);
      const priority = priorityFor(item);
      return {
        ...item,
        category,
        priority,
        whyItMatters: whyItMatters(item)
      };
    });
}

async function fetchText(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'MissionControlBot/1.0 (+https://github.com/iyoshikawa/mission_control_v2)'
    }
  });
  if (!response.ok) throw new Error(`${url} -> HTTP ${response.status}`);
  return response.text();
}

async function loadSources() {
  const anthropicHtml = await fetchText('https://www.anthropic.com/news');
  const openAiXml = await fetchText('https://openai.com/news/rss.xml');
  const deepMindXml = await fetchText('https://deepmind.google/blog/rss.xml');
  const microsoftXml = await fetchText('https://azure.microsoft.com/en-us/blog/feed/');
  const metaXml = await fetchText('https://engineering.fb.com/feed/');

  return {
    'Anthropic': filterRelevant('Anthropic', parseAnthropicNews(anthropicHtml)),
    'OpenAI': filterRelevant('OpenAI', parseRss(openAiXml, 'OpenAI')),
    'Google DeepMind': filterRelevant('Google DeepMind', parseRss(deepMindXml, 'Google DeepMind')),
    'Microsoft Azure AI': filterRelevant('Microsoft Azure AI', parseRss(microsoftXml, 'Microsoft Azure AI')),
    'Meta AI': filterRelevant('Meta AI', parseRss(metaXml, 'Meta AI'))
  };
}

function buildPayload(sourceMap) {
  const allItems = Object.values(sourceMap)
    .flat()
    .map(item => ({ ...item, sortScore: scoreItem(item) }))
    .sort((a, b) => {
      const dateDiff = new Date(b.timestamp) - new Date(a.timestamp);
      if (dateDiff !== 0) return dateDiff;
      return b.sortScore - a.sortScore;
    });

  const deduped = [];
  const seen = new Set();
  for (const item of allItems) {
    const key = slugifyHeadline(item.headline);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  const ranked = [...deduped].sort((a, b) => {
    const impactOrder = { HIGH: 0, WATCH: 1, LOW: 2 };
    const impactDiff = (impactOrder[a.priority] ?? 3) - (impactOrder[b.priority] ?? 3);
    if (impactDiff !== 0) return impactDiff;
    const scoreDiff = b.sortScore - a.sortScore;
    if (scoreDiff !== 0) return scoreDiff;
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  const topStories = ranked.slice(0, 6).map(item => ({
    headline: item.headline,
    source: item.source,
    timestamp: item.timestamp,
    impact: item.priority,
    summary: item.summary,
    whyItMatters: item.whyItMatters,
    link: item.link
  }));

  const categoryPriority = ['pricing', 'regulation', 'model-release', 'tooling', 'infrastructure', 'competitive', 'research'];
  const whyItMattersItems = categoryPriority
    .map(category => ranked.find(item => item.category === category))
    .filter(Boolean)
    .slice(0, 4)
    .map(item => ({
      topic: item.category.replace(/-/g, ' '),
      assessment: item.whyItMatters,
      urgency: item.priority,
      recommendedAction: item.priority === 'HIGH'
        ? `Review ${item.source} update and compare against current stack assumptions.`
        : `Keep ${item.source} on watch during the next hourly refresh.`
    }));

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      refreshCadence: 'hourly',
      sources: MUST_HAVE_SOURCES,
      itemCount: deduped.length
    },
    newsFeed: deduped.slice(0, MAX_NEWS_FEED).map(item => ({
      headline: item.headline,
      source: item.source,
      timestamp: item.timestamp,
      impact: item.priority,
      category: item.category,
      summary: item.summary,
      link: item.link
    })),
    aiNews: {
      topStories,
      whyItMatters: whyItMattersItems,
      watchlist: WATCHLIST
    }
  };
}

async function main() {
  const sourceMap = await loadSources();
  const payload = buildPayload(sourceMap);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${outputPath}`);
  console.log(`Generated ${payload.newsFeed.length} news items from ${payload.meta.sources.length} sources.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
