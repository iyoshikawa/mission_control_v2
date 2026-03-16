const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(repoRoot, 'views', 'sample-data.json');
const outputDir = path.join(repoRoot, 'views', 'generated');
const outputPath = path.join(outputDir, 'ai-news.json');

const MUST_HAVE_SOURCES = ['Anthropic', 'OpenAI', 'Google DeepMind', 'Microsoft/Azure AI', 'Meta AI'];
const NICE_TO_HAVE_SOURCES = ['The Rundown AI'];
const ALLOWED_SOURCES = new Set([...MUST_HAVE_SOURCES, ...NICE_TO_HAVE_SOURCES]);

function inferCanonicalSource(...values) {
  const haystack = values.filter(Boolean).join(' ');
  if (/anthropic|claude/i.test(haystack)) return 'Anthropic';
  if (/openai|gpt-?5/i.test(haystack)) return 'OpenAI';
  if (/google|deepmind|gemma/i.test(haystack)) return 'Google DeepMind';
  if (/microsoft|azure ai|copilot/i.test(haystack)) return 'Microsoft/Azure AI';
  if (/meta|llama/i.test(haystack)) return 'Meta AI';
  if (/rundown/i.test(haystack)) return 'The Rundown AI';
  return '';
}

function impactRank(value) {
  return { HIGH: 0, MEDIUM: 1, LOW: 2 }[value] ?? 3;
}

function dedupeByHeadline(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = String(item.headline || '').trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildTopStories(sampleData) {
  const existing = Array.isArray(sampleData.aiNews?.topStories) ? sampleData.aiNews.topStories : [];
  const feed = Array.isArray(sampleData.newsFeed) ? sampleData.newsFeed : [];

  const normalizedExisting = existing.map(item => ({
    ...item,
    source: inferCanonicalSource(item.source, item.headline, item.summary),
    whyItMatters: item.whyItMatters || `Track ${inferCanonicalSource(item.source, item.headline, item.summary) || 'this source'} for execution-relevant AI changes.`
  }));

  const synthesized = feed.map(item => {
    const source = inferCanonicalSource(item.source, item.headline, item.summary);
    return {
      headline: item.headline,
      source,
      timestamp: item.timestamp,
      impact: item.impact,
      summary: item.summary,
      whyItMatters: `Track ${source || 'this source'} for execution-relevant AI developments and pricing/regulatory shifts.`
    };
  });

  const combined = dedupeByHeadline([...normalizedExisting, ...synthesized])
    .filter(item => ALLOWED_SOURCES.has(item.source));

  combined.sort((a, b) => {
    const aMust = MUST_HAVE_SOURCES.includes(a.source) ? 0 : 1;
    const bMust = MUST_HAVE_SOURCES.includes(b.source) ? 0 : 1;
    return aMust - bMust
      || impactRank(a.impact) - impactRank(b.impact)
      || new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
  });

  const bySource = [];
  const usedSources = new Set();
  for (const item of combined) {
    if (usedSources.has(item.source)) continue;
    usedSources.add(item.source);
    bySource.push(item);
  }

  return bySource;
}

function main() {
  const sampleData = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const generatedAt = new Date().toISOString();
  const topStories = buildTopStories(sampleData);
  const whyItMatters = Array.isArray(sampleData.aiNews?.whyItMatters) ? sampleData.aiNews.whyItMatters : [];
  const watchlist = Array.isArray(sampleData.aiNews?.watchlist) ? sampleData.aiNews.watchlist : [];

  const payload = {
    generatedAt,
    cadence: 'hourly',
    sources: [...MUST_HAVE_SOURCES, ...NICE_TO_HAVE_SOURCES],
    topStories,
    whyItMatters,
    watchlist
  };

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2) + '\n');
  console.log(`Wrote ${path.relative(repoRoot, outputPath)} with ${topStories.length} top stories at ${generatedAt}`);
}

main();
