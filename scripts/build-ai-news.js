const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const inputPath = path.join(root, 'data', 'ai-news-raw.json');
const outputPath = path.join(root, 'views', 'ai-news.json');

const APPROVED_SOURCES = new Set([
  'Anthropic',
  'OpenAI',
  'Google DeepMind',
  'Microsoft Azure AI',
  'Meta AI',
  'The Rundown AI'
]);

const WATCHLIST_ORDER = ['Anthropic', 'OpenAI', 'Google DeepMind', 'Microsoft Azure AI', 'Meta AI', 'The Rundown AI'];
const PRIORITY_ORDER = { HIGH: 0, WATCH: 1, LOW: 2 };

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function computePriority(item) {
  const signals = new Set(item.signals || []);
  if (signals.has('pricing-change') || signals.has('model-release') || signals.has('regulation') || signals.has('platform-shift')) {
    return 'HIGH';
  }
  if (signals.has('enterprise-distribution') || signals.has('workflow-integration') || signals.has('open-source') || signals.has('research-to-product') || signals.has('ecosystem')) {
    return 'WATCH';
  }
  return 'LOW';
}

function buildWhyItMatters(item, priority, supportingCount) {
  const sourceLabel = item.source;
  const supportNote = supportingCount ? ` Supporting coverage from ${supportingCount} additional approved source${supportingCount === 1 ? '' : 's'} confirms the same core development without adding a separate feed item.` : '';

  switch (item.topicKey) {
    case 'openai-gpt5-release':
      return `OpenAI just changed the operational frontier: higher-end reasoning capability is shipping now, but the new enterprise price point means this is both a capability upgrade and a cost benchmark reset.${supportNote}`;
    case 'anthropic-claude-46-computer-use':
      return `This is directly relevant to agent execution because ${sourceLabel} is improving computer-use reliability without a price increase, which can raise task coverage before forcing a model-switch decision.${supportNote}`;
    case 'google-gemma-3-open':
      return `Gemma 3 matters as a cost-control option more than a prestige launch: it expands the set of tasks that could move to lighter open-weight models if quality is good enough.${supportNote}`;
    case 'microsoft-copilot-workflow-expansion':
      return `Microsoft is leveraging distribution and workflow placement rather than pure model novelty, which is strategically important but not yet an immediate operating change unless your stack depends on Windows or Azure-native flows.${supportNote}`;
    case 'meta-open-agent-framework':
      return `Meta is trying to pull builders deeper into the Llama ecosystem. That is worth monitoring for ecosystem momentum, but it is not yet a must-react move for current operations.${supportNote}`;
    default:
      return `${sourceLabel} published an AI update with ${priority.toLowerCase()} operational relevance.${supportNote}`;
  }
}

function buildAssessment(stories) {
  const assessments = [];
  const highStories = stories.filter((story) => story.priority === 'HIGH');
  if (highStories.length) {
    assessments.push({
      topic: 'Frontier model release pressure',
      assessment: 'OpenAI and Anthropic both pushed meaningful product changes into the market window. That combination raises both capability expectations and negotiation pressure around pricing, evaluation, and switching costs.',
      urgency: 'HIGH',
      recommendedAction: 'Benchmark the newest OpenAI and Anthropic releases against current workflows before accepting any new default or spend increase.'
    });
  }

  if (stories.some((story) => story.topicKey === 'google-gemma-3-open')) {
    assessments.push({
      topic: 'Open-weight fallback economics',
      assessment: 'Google DeepMind’s Gemma 3 release strengthens the case for cheaper task segmentation: not everything needs frontier pricing if lighter models are now good enough for bounded workflows.',
      urgency: 'WATCH',
      recommendedAction: 'Identify one narrow workflow where open-weight evaluation could reduce cost without creating reliability debt.'
    });
  }

  if (stories.some((story) => story.topicKey === 'microsoft-copilot-workflow-expansion' || story.topicKey === 'meta-open-agent-framework')) {
    assessments.push({
      topic: 'Platform and ecosystem pull',
      assessment: 'Microsoft and Meta are both reinforcing distribution ecosystems around AI usage. The main risk is less about missing a headline and more about getting locked into somebody else’s workflow assumptions too early.',
      urgency: 'LOW',
      recommendedAction: 'Monitor distribution moves, but avoid architecture changes until the operating benefit is concrete.'
    });
  }

  return assessments;
}

function buildWatchlist(stories) {
  const seen = new Set(stories.map((story) => story.source));
  return WATCHLIST_ORDER.filter((name) => APPROVED_SOURCES.has(name)).map((name) => ({
    name,
    status: seen.has(name) ? (name === 'Anthropic' || name === 'OpenAI' ? 'ACTIVE' : 'WATCH') : 'DORMANT',
    note: name === 'The Rundown AI'
      ? 'Useful secondary confirmation source. Keep it for breadth, but do not let it create duplicate flooding.'
      : `Approved AI news source for Phase 5 monitoring.`
  }));
}

function main() {
  const input = readJson(inputPath);
  const filtered = (input.items || []).filter((item) => APPROVED_SOURCES.has(item.source));

  const grouped = new Map();
  for (const item of filtered) {
    const key = item.topicKey || item.id;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(item);
  }

  const stories = Array.from(grouped.entries()).map(([topicKey, items]) => {
    const sortedItems = [...items].sort((a, b) => {
      if (a.sourceType === 'official' && b.sourceType !== 'official') return -1;
      if (a.sourceType !== 'official' && b.sourceType === 'official') return 1;
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    const primary = sortedItems[0];
    const priority = computePriority(primary);
    const supporting = sortedItems.slice(1).map((item) => ({
      source: item.source,
      headline: item.headline,
      sourceUrl: item.sourceUrl,
      timestamp: item.timestamp
    }));

    return {
      topicKey,
      headline: primary.headline,
      summary: primary.summary,
      source: primary.source,
      timestamp: primary.timestamp,
      priority,
      category: primary.category,
      whyItMatters: buildWhyItMatters(primary, priority, supporting.length),
      link: primary.sourceUrl,
      recommendedAction: priority === 'HIGH'
        ? 'Evaluate immediate relevance to current model, tooling, or spend decisions.'
        : priority === 'WATCH'
          ? 'Monitor for concrete operating impact before changing defaults.'
          : null,
      supportingSources: supporting
    };
  }).sort((a, b) => {
    const priorityDiff = (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    refreshCadence: 'hourly',
    topStories: stories,
    whyItMatters: buildAssessment(stories),
    watchlist: buildWatchlist(stories)
  };

  writeJson(outputPath, payload);
  console.log(`Wrote ${outputPath}`);
}

main();
