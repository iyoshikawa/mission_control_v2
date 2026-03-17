#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const outputPath = path.join(repoRoot, 'views', 'data', 'global-news.generated.json');

const SOURCE_QUERY = '(site:reuters.com OR site:bloomberg.com OR site:ft.com OR site:apnews.com OR site:wsj.com OR site:nikkei.com OR site:cnbc.com)';

const FEEDS = [
  {
    name: 'shipping',
    url: `https://news.google.com/rss/search?q=when:1d+${encodeURIComponent(`shipping OR Suez OR Red Sea logistics ${SOURCE_QUERY}`)}&hl=en-US&gl=US&ceid=US:en`
  },
  {
    name: 'trade',
    url: `https://news.google.com/rss/search?q=when:1d+${encodeURIComponent(`tariffs OR trade restrictions OR export controls ${SOURCE_QUERY}`)}&hl=en-US&gl=US&ceid=US:en`
  },
  {
    name: 'energy',
    url: `https://news.google.com/rss/search?q=when:1d+${encodeURIComponent(`oil OR OPEC OR LNG ${SOURCE_QUERY}`)}&hl=en-US&gl=US&ceid=US:en`
  },
  {
    name: 'rates',
    url: `https://news.google.com/rss/search?q=when:1d+${encodeURIComponent(`Fed OR ECB OR Bank of Japan rates ${SOURCE_QUERY}`)}&hl=en-US&gl=US&ceid=US:en`
  },
  {
    name: 'geopolitics',
    url: `https://news.google.com/rss/search?q=when:1d+${encodeURIComponent(`geopolitics OR sanctions OR conflict ${SOURCE_QUERY}`)}&hl=en-US&gl=US&ceid=US:en`
  }
];

const CATEGORY_RULES = [
  { match: /(ship|shipping|container|freight|suez|red sea|logistics|port)/i, category: 'shipping', region: 'Global', impact: 'HIGH' },
  { match: /(oil|gas|opec|energy|crude|lng)/i, category: 'energy', region: 'Global', impact: 'MEDIUM' },
  { match: /(tariff|trade|export control|sanction|duties)/i, category: 'trade', region: 'Global', impact: 'HIGH' },
  { match: /(fed|ecb|bank of japan|boj|rate|inflation|cpi|ppi|payrolls|jobs)/i, category: 'central-banks', region: 'Global', impact: 'MEDIUM' },
  { match: /(war|missile|attack|ceasefire|conflict|military|strait of hormuz|iran|israel)/i, category: 'conflict', region: 'Global', impact: 'HIGH' },
  { match: /(stimulus|policy|election|government|regulation)/i, category: 'policy', region: 'Global', impact: 'MEDIUM' }
];

const SOURCE_BLOCKLIST = [
  /global finance magazine/i,
  /marketscreener/i,
  /seeking alpha/i,
  /journal record/i,
  /syrian observer/i,
  /quwa\.org/i
];

const HEADLINE_BLOCKLIST = [
  /^press release:/i,
  /best bank awards/i,
  /regional banks 2026/i,
  /currency recap/i,
  /^the blogs:/i,
  /^opinion:/i,
  /^analysis:/i
];

const PREFERRED_SOURCE_ORDER = [
  /reuters/i,
  /financial times|\bft\b/i,
  /bloomberg/i,
  /ap\b|associated press/i,
  /wall street journal|\bwsj\b/i,
  /nikkei/i,
  /cnbc/i,
  /business times/i
];

function decodeHtml(value = '') {
  return value
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .trim();
}

function stripTags(value = '') {
  return decodeHtml(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTag(block, tag) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? stripTags(match[1]) : '';
}

function extractItems(xml) {
  return Array.from(xml.matchAll(/<item\b[\s\S]*?<\/item>/gi), (match) => match[0]);
}

function splitHeadlineAndSource(title = '') {
  const parts = title.split(/\s+-\s+/);
  if (parts.length < 2) return { headline: title.trim(), source: 'Google News' };
  return {
    headline: parts.slice(0, -1).join(' - ').trim(),
    source: parts.at(-1).trim()
  };
}

function classify(text = '') {
  for (const rule of CATEGORY_RULES) {
    if (rule.match.test(text)) return { category: rule.category, region: inferRegion(text, rule.region), impact: rule.impact };
  }
  return { category: 'policy', region: inferRegion(text, 'Global'), impact: 'MEDIUM' };
}

function inferRegion(text, fallback = 'Global') {
  const rules = [
    [/china|beijing/i, 'China'],
    [/europe|eu\b|eurozone|germany|france|uk\b|britain/i, 'Europe'],
    [/japan|tokyo|boj/i, 'Japan'],
    [/middle east|israel|iran|gaza|red sea|suez|saudi|uae/i, 'Middle East'],
    [/latin america|brazil|argentina|mexico/i, 'Latin America'],
    [/india/i, 'India'],
    [/russia|ukraine/i, 'Europe'],
    [/us\b|u\.s\.|federal reserve|fed/i, 'United States']
  ];
  for (const [pattern, region] of rules) {
    if (pattern.test(text)) return region;
  }
  return fallback;
}

function whyItMatters(category, region) {
  const byCategory = {
    shipping: 'Watch for delivery delays and freight-cost pressure on hardware or imported goods.',
    energy: 'Energy moves can bleed into transport, hosting, and broad operating costs.',
    trade: 'Trade restrictions can tighten supply chains and change vendor pricing.',
    'central-banks': 'Rates and inflation signals shape financing conditions and market risk.',
    conflict: 'Geopolitical escalation can spill into supply, energy, and operating risk quickly.',
    policy: 'Policy shifts can change demand, regulation, and cross-border operating assumptions.'
  };
  return byCategory[category] || `Useful morning context for ${region.toLowerCase()} risk and decision-making.`;
}

function sourceRank(source = '') {
  const index = PREFERRED_SOURCE_ORDER.findIndex((pattern) => pattern.test(source));
  return index === -1 ? 999 : index;
}

async function fetchFeed(feed) {
  const response = await fetch(feed.url, {
    headers: {
      'user-agent': 'mission-control-global-news-bot/1.0',
      accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8'
    }
  });
  if (!response.ok) throw new Error(`${feed.name} feed failed with HTTP ${response.status}`);
  return response.text();
}

async function main() {
  const xmlBodies = await Promise.all(FEEDS.map(fetchFeed));
  const seen = new Set();
  const items = [];

  for (const xml of xmlBodies) {
    for (const block of extractItems(xml)) {
      const rawTitle = extractTag(block, 'title');
      const link = extractTag(block, 'link');
      const summary = extractTag(block, 'description');
      const timestamp = new Date(extractTag(block, 'pubDate') || Date.now()).toISOString();
      const { headline, source } = splitHeadlineAndSource(rawTitle);
      if (!headline || !link) continue;

      const dedupeKey = headline.toLowerCase();
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      if (SOURCE_BLOCKLIST.some((pattern) => pattern.test(source))) continue;
      if (HEADLINE_BLOCKLIST.some((pattern) => pattern.test(headline))) continue;

      const combinedText = `${headline} ${summary} ${source}`;
      const { category, region, impact } = classify(combinedText);
      items.push({
        headline,
        summary: summary || undefined,
        source,
        timestamp,
        impact,
        region,
        category,
        whyItMatters: whyItMatters(category, region),
        link
      });
    }
  }

  const ranked = items
    .filter(item => Date.now() - Date.parse(item.timestamp) <= 36 * 60 * 60 * 1000)
    .sort((a, b) => {
      const impactRank = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return (impactRank[a.impact] - impactRank[b.impact])
        || (sourceRank(a.source) - sourceRank(b.source))
        || (Date.parse(b.timestamp) - Date.parse(a.timestamp));
    })
    .slice(0, 8);

  if (!ranked.length) throw new Error('No global news items found from live feeds.');

  const payload = {
    meta: {
      generatedAt: new Date().toISOString(),
      refreshCadence: 'hourly',
      sources: FEEDS.map(feed => feed.url)
    },
    newsFeed: ranked
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${ranked.length} global news items to ${outputPath}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
