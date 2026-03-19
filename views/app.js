const STATUS_CLASS_MAP = {
  ACTIVE: 'badge-active',
  DORMANT: 'badge-dormant',
  PROPOSED: 'badge-proposed',
  HEALTHY: 'badge-healthy',
  WATCH: 'badge-watch',
  ISSUE: 'badge-issue',
  BLOCKED: 'badge-issue',
  BACKLOG: 'badge-dormant',
  DONE: 'badge-healthy',
  NEEDS_DECISION: 'badge-decision',
  READY: 'badge-dormant',
  NEXT: 'badge-watch',
  SOON: 'badge-watch',
  LEAN: 'badge-healthy',
  REFERENCE: 'badge-healthy',
  HIGH: 'badge-issue',
  MEDIUM: 'badge-watch',
  LOW: 'badge-dormant',
  RELEASED: 'badge-active',
  UPCOMING: 'badge-watch'
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function badge(status) {
  const safeStatus = escapeHtml(status || 'UNKNOWN');
  const cls = STATUS_CLASS_MAP[status] || 'badge-dormant';
  return `<span class="badge ${cls}">${safeStatus.replaceAll('_', ' ')}</span>`;
}

function emptyState(message) {
  return `<div class="empty-state">${escapeHtml(message)}</div>`;
}

function formatTimestamp(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      + ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } catch { return iso; }
}

function relativeTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    return `${diffD}d ago`;
  } catch { return ''; }
}

function setMeta(meta = {}) {
  document.getElementById('dashboard-title').textContent = meta.title || 'Mission Control';
  const statusEl = document.getElementById('dashboard-status');
  const status = meta.status || 'REFERENCE';
  statusEl.textContent = status.replaceAll('_', ' ');
  statusEl.className = `badge ${STATUS_CLASS_MAP[status] || 'badge-dormant'}`;
  document.getElementById('dashboard-updated').textContent = formatTimestamp(meta.lastUpdated) || 'Unknown';
}

function renderOperationalPulse(data = {}) {
  const el = document.getElementById('operational-pulse');
  if (!el) return;

  const priorities = Array.isArray(data.priorityStack) ? data.priorityStack : [];
  const decisions = Array.isArray(data.decisionQueue) ? data.decisionQueue : [];
  const opsRisks = Array.isArray(data.opsHealth) ? data.opsHealth.filter(item => item.status && item.status !== 'HEALTHY') : [];
  const costRisks = Array.isArray(data.costWatch) ? data.costWatch.filter(item => !['LEAN', 'HEALTHY'].includes(item.status)) : [];
  const alerts = Array.isArray(data.alerts) ? data.alerts : [];

  const topPriority = priorities[0];
  const latestAlert = alerts[0];
  const attentionCount = decisions.length + opsRisks.length + costRisks.length;
  const healthyCount = (Array.isArray(data.opsHealth) ? data.opsHealth.filter(item => item.status === 'HEALTHY').length : 0)
    + (Array.isArray(data.costWatch) ? data.costWatch.filter(item => ['LEAN', 'HEALTHY'].includes(item.status)).length : 0);

  el.innerHTML = [
    {
      label: 'Top Priority',
      value: priorities.length ? `#1` : '—',
      tone: topPriority?.blocker ? 'watch' : 'good',
      note: topPriority?.title || 'No active priorities.'
    },
    {
      label: 'Owner Decisions',
      value: String(decisions.length),
      tone: decisions.length ? 'issue' : 'good',
      note: decisions.length ? 'Items waiting on judgment.' : 'Nothing queued for Owner review.'
    },
    {
      label: 'Active Exceptions',
      value: String(attentionCount),
      tone: attentionCount > 2 ? 'issue' : attentionCount ? 'watch' : 'good',
      note: attentionCount ? 'Operational or cost items need attention.' : 'No active operational exceptions.'
    },
    {
      label: 'Latest Alert',
      value: latestAlert ? relativeTime(latestAlert.timestamp) : 'Quiet',
      tone: latestAlert ? 'watch' : 'good',
      note: latestAlert?.summary || `${healthyCount} monitored areas are quiet.`
    }
  ].map(item => `
    <article class="snapshot-tile">
      <div class="snapshot-label">${escapeHtml(item.label)}</div>
      <div class="snapshot-value ${item.tone}">${escapeHtml(item.value)}</div>
      <p class="snapshot-note">${escapeHtml(item.note)}</p>
    </article>
  `).join('');
}

function buildAttentionItems(data = {}) {
  const items = [];

  (data.priorityStack || []).forEach((item, index) => {
    if (!item?.blocker && index > 0) return;
    items.push({
      kicker: index === 0 ? 'Top priority' : 'Priority blocker',
      title: item.title,
      summary: item.blocker || item.summary,
      nextAction: item.nextAction,
      status: item.blocker ? 'WATCH' : (item.status || 'ACTIVE')
    });
  });

  (data.decisionQueue || []).forEach(item => {
    items.push({
      kicker: 'Owner decision',
      title: item.decision,
      summary: item.whyItMatters,
      nextAction: item.recommendation ? `Recommended: ${item.recommendation}` : '',
      status: item.status || 'NEEDS_DECISION'
    });
  });

  (data.opsHealth || []).filter(item => item.status && item.status !== 'HEALTHY').forEach(item => {
    items.push({
      kicker: 'Ops risk',
      title: item.name,
      summary: item.issue,
      nextAction: item.recommendedNextStep,
      status: item.status
    });
  });

  (data.costWatch || []).filter(item => !['LEAN', 'HEALTHY'].includes(item.status)).forEach(item => {
    items.push({
      kicker: 'Cost watch',
      title: item.name,
      summary: item.utilizationNote,
      nextAction: item.actionRecommendation,
      status: item.status
    });
  });

  return items.slice(0, 6);
}

function renderAttentionNow(data = {}) {
  const el = document.getElementById('attention-now');
  if (!el) return;

  const items = buildAttentionItems(data);
  if (!items.length) {
    el.innerHTML = emptyState('No immediate pressure points loaded.');
    return;
  }

  el.innerHTML = items.map(item => `
    <article class="attention-item">
      <div>
        <div class="attention-kicker">${escapeHtml(item.kicker)}</div>
        <h3>${escapeHtml(item.title || 'Untitled')}</h3>
        ${item.summary ? `<p>${escapeHtml(item.summary)}</p>` : ''}
        ${item.nextAction ? `<p class="action-hint">Next: ${escapeHtml(item.nextAction)}</p>` : ''}
      </div>
      ${item.status ? badge(item.status) : ''}
    </article>
  `).join('');
}

function renderPriorityStack(items = []) {
  const el = document.getElementById('priority-stack');
  if (!items.length) {
    el.innerHTML = emptyState('No priorities loaded.');
    return;
  }

  el.innerHTML = items.slice(0, 5).map((item, i) => `
    <article class="list-item${item.blocker ? ' has-blocker' : ''}">
      <div class="item-header">
        <h3><span class="rank">#${i + 1}</span> ${escapeHtml(item.title)}</h3>
        ${badge(item.status)}
      </div>
      <p>${escapeHtml(item.summary || 'No summary provided.')}</p>
      ${item.blocker ? `<div class="blocker-bar">Blocked: ${escapeHtml(item.blocker)}</div>` : ''}
      <div class="item-meta">
        ${item.owner ? `<span>Owner: ${escapeHtml(item.owner)}</span>` : ''}
        ${item.reviewDate ? `<span>Review: ${escapeHtml(item.reviewDate)}</span>` : ''}
      </div>
      ${item.nextAction ? `<p class="action-hint">Next: ${escapeHtml(item.nextAction)}</p>` : ''}
    </article>
  `).join('');
}

function renderDecisionQueue(items = []) {
  const el = document.getElementById('decision-queue');
  if (!items.length) {
    el.innerHTML = emptyState('No pending Owner decisions loaded.');
    return;
  }

  el.innerHTML = items.slice(0, 5).map(item => {
    const options = Array.isArray(item.options) && item.options.length
      ? `<div class="option-list">${item.options.map(o => `<span class="option-chip">${escapeHtml(o)}</span>`).join('')}</div>`
      : '';
    const urgencyClass = (item.urgency || '').toLowerCase().includes('urgent') ? 'urgency-high' : 'urgency-low';
    return `
    <article class="decision-item">
      <div class="item-header">
        <h3>${escapeHtml(item.decision)}</h3>
        ${badge(item.status || 'NEEDS_DECISION')}
      </div>
      <p>${escapeHtml(item.whyItMatters || 'No context provided.')}</p>
      ${options}
      <div class="item-meta">
        ${item.recommendation ? `<span class="rec-tag">Rec: ${escapeHtml(item.recommendation)}</span>` : ''}
        ${item.urgency ? `<span class="urgency-tag ${urgencyClass}">${escapeHtml(item.urgency)}</span>` : ''}
        ${item.deadline ? `<span class="meta-blocker">Due: ${escapeHtml(item.deadline)}</span>` : ''}
      </div>
    </article>
  `;
  }).join('');
}

function renderOrg(org = {}) {
  const el = document.getElementById('org-chart');
  const nodes = Array.isArray(org.nodes) ? org.nodes : [];
  if (!nodes.length) {
    el.innerHTML = emptyState('No org data loaded.');
    return;
  }

  const owner = nodes.find(n => n.id === 'owner') || nodes.find(n => !n.reportsTo);
  const saidee = nodes.find(n => n.id === 'saidee');
  const children = nodes.filter(n => n.id !== owner?.id && n.id !== saidee?.id);

  const activeCount = nodes.filter(n => n.status === 'ACTIVE').length;
  const dormantCount = nodes.filter(n => n.status === 'DORMANT').length;
  const proposedCount = nodes.filter(n => n.status === 'PROPOSED').length;

  const renderLeaderNode = (node, roleLabel) => `
    <div class="org-node org-leader ${node.status === 'DORMANT' ? 'dormant' : ''}">
      <div class="org-node-header">
        <h3>${escapeHtml(node.label)}</h3>
        ${badge(node.status)}
      </div>
      ${roleLabel ? `<span class="org-role-label">${escapeHtml(roleLabel)}</span>` : ''}
      <p>${escapeHtml(node.summary || '')}</p>
    </div>
  `;

  const renderChildNode = (node) => `
    <div class="org-node org-child ${node.status === 'DORMANT' ? 'dormant' : ''}">
      <div class="org-node-header">
        <h3>${escapeHtml(node.label)}</h3>
        ${badge(node.status)}
      </div>
      <p>${escapeHtml(node.summary || '')}</p>
      ${node.activationTrigger ? `<p class="node-meta">Activate when: ${escapeHtml(node.activationTrigger)}</p>` : ''}
    </div>
  `;

  el.innerHTML = `
    <div class="org-counts">
      <span class="org-count org-count-active">${activeCount} active</span>
      <span class="org-count org-count-dormant">${dormantCount} dormant</span>
      ${proposedCount ? `<span class="org-count org-count-proposed">${proposedCount} proposed</span>` : ''}
    </div>
    <div class="org-leadership">
      ${owner ? renderLeaderNode(owner, 'Final decision-maker') : ''}
      ${owner && saidee ? '<div class="org-line vertical"></div>' : ''}
      ${saidee ? renderLeaderNode(saidee, 'CEO / Operator') : ''}
    </div>
    ${children.length ? `
      <div class="org-reports-label">
        <span class="org-line horizontal"></span>
        <span>Reports to ${escapeHtml(saidee?.label || 'leadership')}</span>
        <span class="org-line horizontal"></span>
      </div>
      <div class="org-children">
        ${children.map(node => renderChildNode(node)).join('')}
      </div>
    ` : ''}
  `;
}

function renderStatusList(targetId, items = [], config = {}) {
  const el = document.getElementById(targetId);
  if (!items.length) {
    el.innerHTML = emptyState(config.emptyMessage || 'No items loaded.');
    return;
  }

  const descField = config.descriptionField || 'issue';
  const actionField = config.actionField || null;
  const timeField = config.timeField || null;
  const quietStatuses = config.quietStatuses || [];

  const sorted = [...items].sort((a, b) => {
    const aQ = quietStatuses.includes(a.status);
    const bQ = quietStatuses.includes(b.status);
    return aQ === bQ ? 0 : aQ ? 1 : -1;
  });

  const allQuiet = sorted.every(i => quietStatuses.includes(i.status));

  el.innerHTML =
    (allQuiet ? `<div class="all-clear">${escapeHtml(config.allClearMessage || 'All clear.')}</div>` : '')
    + sorted.map(item => {
      const quiet = quietStatuses.includes(item.status);
      const title = item.name || 'Untitled';
      const desc = item[descField] || '';
      const action = actionField ? (item[actionField] || '') : '';
      const time = timeField ? (item[timeField] || '') : '';
      return `
      <article class="status-row${quiet ? ' status-quiet' : ''}">
        <div>
          <h3>${escapeHtml(title)}</h3>
          ${!quiet && desc ? `<p>${escapeHtml(desc)}</p>` : ''}
          ${!quiet && action ? `<p class="action-line">${escapeHtml(action)}</p>` : ''}
          ${time ? `<span class="timestamp">${escapeHtml(formatTimestamp(time))}</span>` : ''}
        </div>
        ${item.status ? badge(item.status) : ''}
      </article>`;
    }).join('');
}

function renderAlerts(items = []) {
  const el = document.getElementById('alerts');
  if (!items.length) {
    el.innerHTML = emptyState('No material alerts loaded.');
    return;
  }

  el.innerHTML = items.map((item, i) => `
    <article class="status-row alert-row${i === 0 ? ' alert-latest' : ''}">
      <div>
        <h3>${escapeHtml(item.summary)}</h3>
        <p>${escapeHtml(item.whyItMatters || 'No impact note provided.')}</p>
        ${item.recommendedAction ? `<p class="action-hint">Action: ${escapeHtml(item.recommendedAction)}</p>` : ''}
      </div>
      <div class="alert-time">
        <span class="timestamp-relative">${escapeHtml(relativeTime(item.timestamp))}</span>
        <span class="timestamp">${escapeHtml(formatTimestamp(item.timestamp))}</span>
      </div>
    </article>
  `).join('');
}

function renderCompactPreview(targetId, items = [], config = {}) {
  const el = document.getElementById(targetId);
  if (!items.length) {
    el.innerHTML = emptyState(config.emptyMessage || 'No items loaded.');
    return;
  }

  const max = config.maxItems || 5;
  const render = config.renderItem || (item => `
    <div class="compact-row">
      <span class="compact-stat">${escapeHtml(item.name || item.item || item.topic || 'Untitled')}</span>
      ${item.status ? badge(item.status) : ''}
    </div>
  `);
  const visible = items.slice(0, max);
  const overflow = items.length - max;
  el.innerHTML = `
    <div class="compact-list">${visible.map(render).join('')}</div>
    ${overflow > 0 ? `<p class="compact-overflow">+${overflow} more</p>` : ''}
  `;
}

// --- View navigation ---
function initViewNav() {
  const tabs = document.querySelectorAll('.view-tab');
  const viewIds = Array.from(tabs).map(t => 'view-' + t.dataset.view);
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = 'view-' + tab.dataset.view;
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      viewIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = id === target ? '' : 'none';
      });
    });
  });
}

// --- X Feed rendering ---
const SIGNAL_CLASS_MAP = {
  HIGH: 'signal-high',
  WATCH: 'signal-watch',
  LOW: 'signal-low'
};

function signalBadge(level) {
  const safe = escapeHtml(level || 'LOW');
  const cls = SIGNAL_CLASS_MAP[level] || 'signal-low';
  return `<span class="badge ${cls}">${safe}</span>`;
}

function renderXSummary(xFeed = {}) {
  const el = document.getElementById('x-summary');
  const accounts = xFeed.watchedAccounts || [];
  const signals = xFeed.signalItems || [];
  const activeAccounts = accounts.filter(a => a.status === 'ACTIVE').length;
  const watchAccounts = accounts.filter(a => a.status === 'WATCH').length;
  const highSignals = signals.filter(s => s.signalLevel === 'HIGH').length;
  const watchSignals = signals.filter(s => s.signalLevel === 'WATCH').length;

  el.innerHTML = `
    <span class="x-count">${activeAccounts} active source${activeAccounts !== 1 ? 's' : ''}</span>
    ${watchAccounts ? `<span class="x-count x-count-watch">${watchAccounts} on watch</span>` : ''}
    <span class="x-count-sep"></span>
    ${highSignals ? `<span class="x-count x-count-high">${highSignals} high signal${highSignals !== 1 ? 's' : ''}</span>` : ''}
    ${watchSignals ? `<span class="x-count x-count-watch">${watchSignals} watch signal${watchSignals !== 1 ? 's' : ''}</span>` : ''}
    ${!highSignals && !watchSignals ? '<span class="x-count x-count-quiet">No active signals</span>' : ''}
  `;
}

function renderXWatched(accounts = []) {
  const el = document.getElementById('x-watched');
  if (!accounts.length) {
    el.innerHTML = emptyState('No watched accounts.');
    return;
  }

  el.innerHTML = accounts.map(acct => `
    <div class="x-account ${acct.status === 'DORMANT' ? 'x-account-dormant' : ''}">
      <div class="x-account-header">
        <span class="x-handle">${escapeHtml(acct.handle)}</span>
        ${badge(acct.status)}
      </div>
      <p class="x-account-reason">${escapeHtml(acct.reason || '')}</p>
      ${acct.recentSignal ? `<p class="x-recent-signal">${escapeHtml(acct.recentSignal)}</p>` : ''}
      <span class="timestamp">Checked: ${escapeHtml(formatTimestamp(acct.lastChecked))}</span>
    </div>
  `).join('');
}

function renderXTrump(posts = []) {
  const el = document.getElementById('x-trump');
  if (!posts.length) {
    el.innerHTML = emptyState('No Trump/policy posts loaded.');
    return;
  }

  el.innerHTML = posts.map(post => `
    <article class="x-post ${post.signalLevel === 'HIGH' ? 'x-post-high' : ''}">
      <div class="x-post-header">
        <span class="x-post-content">${escapeHtml(post.content)}</span>
        ${signalBadge(post.signalLevel)}
      </div>
      <p class="x-post-impact">${escapeHtml(post.whyItMatters || '')}</p>
      ${post.recommendedAction ? `<p class="action-hint">Action: ${escapeHtml(post.recommendedAction)}</p>` : ''}
      <div class="x-post-meta">
        <span class="timestamp-relative">${escapeHtml(relativeTime(post.timestamp))}</span>
        <span class="timestamp">${escapeHtml(formatTimestamp(post.timestamp))}</span>
      </div>
    </article>
  `).join('');
}

function renderXSignals(items = []) {
  const el = document.getElementById('x-signals');
  if (!items.length) {
    el.innerHTML = emptyState('No signal items flagged.');
    return;
  }

  const sorted = [...items].sort((a, b) => {
    const order = { HIGH: 0, WATCH: 1, LOW: 2 };
    return (order[a.signalLevel] ?? 3) - (order[b.signalLevel] ?? 3);
  });

  el.innerHTML = sorted.map(item => `
    <article class="x-signal-row ${item.signalLevel === 'LOW' ? 'x-signal-quiet' : ''}">
      <div class="x-signal-body">
        <div class="x-signal-header">
          <span class="x-handle">${escapeHtml(item.source)}</span>
          ${item.tag ? `<span class="x-tag">${escapeHtml(item.tag)}</span>` : ''}
          ${signalBadge(item.signalLevel)}
        </div>
        <p class="x-signal-content">${escapeHtml(item.content)}</p>
        <p class="x-signal-impact">${escapeHtml(item.whyItMatters || '')}</p>
      </div>
      <div class="alert-time">
        <span class="timestamp-relative">${escapeHtml(relativeTime(item.timestamp))}</span>
        <span class="timestamp">${escapeHtml(formatTimestamp(item.timestamp))}</span>
      </div>
    </article>
  `).join('');
}

function renderXFeed(xFeed = {}) {
  renderXSummary(xFeed);
  renderXWatched(xFeed.watchedAccounts);
  renderXTrump(xFeed.trumpFeed);
  renderXSignals(xFeed.signalItems);
}

// --- News feed rendering ---
function renderNewsFeed(items = []) {
  const el = document.getElementById('news-feed');
  if (!items.length) {
    el.innerHTML = emptyState('No global news items loaded.');
    return;
  }

  const sorted = [...items]
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
    .slice(0, 8);

  const groups = sorted.reduce((acc, item) => {
    const key = item.source || 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const sourceOrder = Object.keys(groups).sort((a, b) => {
    if (a === 'The Rundown AI') return -1;
    if (b === 'The Rundown AI') return 1;
    return a.localeCompare(b);
  });

  el.innerHTML = sourceOrder.map(source => {
    const groupItems = groups[source];
    return `
      <section class="news-source-group">
        <div class="news-source-group-head">
          <h3>${escapeHtml(source)}</h3>
          <span class="news-group-count">${groupItems.length} item${groupItems.length === 1 ? '' : 's'}</span>
        </div>
        ${groupItems.map((item, i) => `
          <article class="status-row news-item${i === 0 || item.impact === 'HIGH' ? ' news-item-lead' : ''}">
            <div>
              <h3>${escapeHtml(item.headline)}</h3>
              ${item.summary ? `<p>${escapeHtml(item.summary)}</p>` : ''}
              ${item.whyItMatters ? `<p class="action-hint">Why it matters: ${escapeHtml(item.whyItMatters)}</p>` : ''}
              <div class="news-meta">
                ${item.region ? `<span class="news-category">${escapeHtml(item.region)}</span>` : ''}
                ${item.category ? `<span class="news-category">${escapeHtml(item.category)}</span>` : ''}
                <span class="news-source">${escapeHtml(item.source || 'Unknown')}</span>
                <span class="timestamp">${escapeHtml(relativeTime(item.timestamp))}</span>
                ${item.link ? `<a class="source-link" href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">Source</a>` : ''}
              </div>
            </div>
            ${item.impact ? badge(item.impact) : ''}
          </article>
        `).join('')}
      </section>
    `;
  }).join('');
}

// --- AI News rendering ---
function renderAiTopStories(items = []) {
  const el = document.getElementById('ai-top-stories');
  if (!items.length) { el.innerHTML = emptyState('No AI news loaded.'); return; }

  el.innerHTML = items.slice(0, 6).map((item, i) => `
    <article class="status-row ai-story${i === 0 ? ' ai-story-lead' : ''}">
      <div>
        <h3>${escapeHtml(item.headline)}</h3>
        ${item.summary ? `<p>${escapeHtml(item.summary)}</p>` : ''}
        ${item.whyItMatters ? `<p class="action-hint">${escapeHtml(item.whyItMatters)}</p>` : ''}
        <div class="news-meta">
          <span class="news-source">${escapeHtml(item.source || 'Unknown')}</span>
          <span class="timestamp">${escapeHtml(relativeTime(item.timestamp))}</span>
        </div>
      </div>
      ${item.impact ? badge(item.impact) : ''}
    </article>
  `).join('');
}

function renderAiWhyMatters(items = []) {
  const el = document.getElementById('ai-why-matters');
  if (!items.length) { el.innerHTML = emptyState('No impact assessments loaded.'); return; }

  el.innerHTML = items.map(item => `
    <article class="status-row ai-impact">
      <div>
        <h3>${escapeHtml(item.topic)}</h3>
        <p>${escapeHtml(item.assessment)}</p>
        ${item.recommendedAction ? `<p class="action-hint">Action: ${escapeHtml(item.recommendedAction)}</p>` : ''}
      </div>
      ${item.urgency ? badge(item.urgency) : ''}
    </article>
  `).join('');
}

function renderAiWatchlist(items = []) {
  const el = document.getElementById('ai-watchlist');
  if (!items.length) { el.innerHTML = emptyState('No watchlist items.'); return; }

  el.innerHTML = items.map(item => `
    <div class="ai-watch-item${item.status === 'DORMANT' ? ' ai-watch-dormant' : ''}">
      <div class="ai-watch-header">
        <span class="ai-watch-name">${escapeHtml(item.name)}</span>
        ${badge(item.status)}
      </div>
      ${item.note ? `<p class="ai-watch-note">${escapeHtml(item.note)}</p>` : ''}
    </div>
  `).join('');
}

function renderAiNews(aiNews = {}) {
  renderAiTopStories(aiNews.topStories);
  renderAiWhyMatters(aiNews.whyItMatters);
  renderAiWatchlist(aiNews.watchlist);
}

function renderCostMantras() {
  const el = document.getElementById('cost-mantras');
  if (!el) return;

  const mantras = [
    'Value comes from clarity and fast scanning, not engineering weight.',
    'Keep the first pass static/lightweight until the information model is stable.',
    'Manual high-signal inputs are currently more valuable than noisy automation.',
    'Automate only after recurring manual pain is obvious.'
  ];

  el.innerHTML = mantras.map((text, index) => `
    <article class="status-row mantra-row">
      <h3>Mantra ${index + 1}</h3>
      <p>${escapeHtml(text)}</p>
    </article>
  `).join('');
}

// --- Macro calendar rendering ---
function renderMacroCalendar(items = []) {
  const el = document.getElementById('macro-calendar');
  if (!items.length) {
    el.innerHTML = emptyState('No economic events loaded.');
    return;
  }

  el.innerHTML = `
    <div class="macro-table">
      <div class="macro-header">
        <span class="macro-col-time">Time</span>
        <span class="macro-col-ccy">Ccy</span>
        <span class="macro-col-event">Event</span>
        <span class="macro-col-impact">Impact</span>
        <span class="macro-col-data">Prev</span>
        <span class="macro-col-data">Fcst</span>
        <span class="macro-col-data">Actual</span>
      </div>
      ${items.slice(0, 12).map(item => {
        const released = item.actual != null;
        return `
        <div class="macro-row${released ? ' macro-released' : ''}">
          <span class="macro-col-time">${escapeHtml(formatTimestamp(item.timestamp))}</span>
          <span class="macro-col-ccy macro-ccy">${escapeHtml(item.currency || '')}</span>
          <span class="macro-col-event">${escapeHtml(item.event)}</span>
          <span class="macro-col-impact">${item.impact ? badge(item.impact) : ''}</span>
          <span class="macro-col-data macro-data">${escapeHtml(item.previous ?? '\u2014')}</span>
          <span class="macro-col-data macro-data">${escapeHtml(item.forecast ?? '\u2014')}</span>
          <span class="macro-col-data macro-data${released ? ' macro-actual' : ''}">${escapeHtml(item.actual ?? '\u2014')}</span>
        </div>`;
      }).join('')}
    </div>
  `;
}

async function loadGeneratedGlobalNews() {
  try {
    const response = await fetch('./data/global-news.generated.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload?.newsFeed) || !payload.newsFeed.length) return null;
    return payload;
  } catch {
    return null;
  }
}

async function loadGeneratedTasks() {
  try {
    const response = await fetch('./data/tasks.generated.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (!payload?.dashboard || typeof payload.dashboard !== 'object') return null;
    return payload;
  } catch {
    return null;
  }
}

async function loadDashboard() {
  try {
    const response = await fetch('./sample-data.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    try {
      const generatedAiResponse = await fetch('../data/ai-news.generated.json', { cache: 'no-store' });
      if (generatedAiResponse.ok) {
        const generatedAi = await generatedAiResponse.json();
        if (Array.isArray(generatedAi.newsFeed)) data.newsFeed = generatedAi.newsFeed;
        if (generatedAi.aiNews && typeof generatedAi.aiNews === 'object') data.aiNews = generatedAi.aiNews;
        data.meta = {
          ...data.meta,
          lastUpdated: generatedAi.meta?.generatedAt || data.meta?.lastUpdated
        };
      }
    } catch (error) {
      console.warn('AI news generated feed unavailable, using bundled sample data.', error);
    }

    const generatedGlobalNews = await loadGeneratedGlobalNews();
    if (generatedGlobalNews?.newsFeed?.length) {
      data.newsFeed = generatedGlobalNews.newsFeed;
      data.meta = {
        ...data.meta,
        lastUpdated: generatedGlobalNews.meta?.generatedAt || data.meta?.lastUpdated
      };
    }

    const generatedTasks = await loadGeneratedTasks();
    if (generatedTasks?.dashboard) {
      if (Array.isArray(generatedTasks.dashboard.projects)) data.projects = generatedTasks.dashboard.projects;
      if (Array.isArray(generatedTasks.dashboard.commsQueue)) data.commsQueue = generatedTasks.dashboard.commsQueue;
      if (Array.isArray(generatedTasks.dashboard.intelligenceQueue)) data.intelligenceQueue = generatedTasks.dashboard.intelligenceQueue;
      data.meta = {
        ...data.meta,
        lastUpdated: generatedTasks.meta?.generatedAt || data.meta?.lastUpdated
      };
    }

    setMeta(data.meta);
    renderOperationalPulse(data);
    renderAttentionNow(data);
    renderPriorityStack(data.priorityStack);
    renderDecisionQueue(data.decisionQueue);
    renderOrg(data.org);
    renderStatusList('ops-health', data.opsHealth, {
      emptyMessage: 'No ops risks loaded.',
      descriptionField: 'issue',
      actionField: 'recommendedNextStep',
      timeField: 'lastChecked',
      quietStatuses: ['HEALTHY'],
      allClearMessage: 'All systems nominal.'
    });
    renderStatusList('cost-watch', data.costWatch, {
      emptyMessage: 'No cost concerns loaded.',
      descriptionField: 'utilizationNote',
      actionField: 'actionRecommendation',
      quietStatuses: ['LEAN', 'HEALTHY'],
      allClearMessage: 'No cost exceptions.'
    });
    renderCostMantras();
    renderAlerts(data.alerts);
    renderCompactPreview('projects-preview', data.projects, {
      emptyMessage: 'No active projects.',
      renderItem: item => `
        <div class="compact-row">
          <span class="compact-stat">${escapeHtml(item.name)}</span>
          ${item.status ? badge(item.status) : ''}
        </div>
        <p class="compact-note">${escapeHtml(item.phase || '')}${item.owner ? ' \u00b7 ' + escapeHtml(item.owner) : ''}</p>
        ${item.blockerSummary ? `<p class="compact-note compact-blocker">Blocker: ${escapeHtml(item.blockerSummary)}</p>` : ''}
      `
    });
    renderCompactPreview('comms-preview', data.commsQueue, {
      emptyMessage: 'No outbound obligations.',
      renderItem: item => `
        <div class="compact-row">
          <span class="compact-stat">${escapeHtml(item.item)}</span>
          ${item.status ? badge(item.status) : ''}
        </div>
        <p class="compact-note">${escapeHtml(item.context || '')}${item.dueTiming ? ' \u00b7 ' + escapeHtml(item.dueTiming) : ''}</p>
      `
    });
    renderCompactPreview('intelligence-preview', data.intelligenceQueue, {
      emptyMessage: 'No monitoring topics.',
      renderItem: item => `
        <div class="compact-row">
          <span class="compact-stat">${escapeHtml(item.topic)}</span>
          ${item.status ? badge(item.status) : ''}
        </div>
        <p class="compact-note">${escapeHtml(item.cadence || '')}</p>
      `
    });
    renderXFeed(data.xFeed || {});
    renderNewsFeed(data.newsFeed || []);
    renderAiNews(data.aiNews || {});
    renderMacroCalendar(data.macroCalendar || []);
  } catch (error) {
    console.error(error);
    document.getElementById('operational-pulse').innerHTML = emptyState('Failed to load sample-data.json.');
    document.getElementById('attention-now').innerHTML = emptyState('Failed to load sample-data.json.');
    document.getElementById('priority-stack').innerHTML = emptyState('Failed to load sample-data.json.');
    document.getElementById('decision-queue').innerHTML = emptyState('Failed to load sample-data.json.');
    document.getElementById('org-chart').innerHTML = emptyState('Failed to load sample-data.json.');
    document.getElementById('ops-health').innerHTML = emptyState('Failed to load sample-data.json.');
    document.getElementById('cost-watch').innerHTML = emptyState('Failed to load sample-data.json.');
    document.getElementById('alerts').innerHTML = emptyState('Failed to load sample-data.json.');
    document.getElementById('projects-preview').innerHTML = emptyState('Failed to load sample-data.json.');
    document.getElementById('comms-preview').innerHTML = emptyState('Failed to load sample-data.json.');
    document.getElementById('intelligence-preview').innerHTML = emptyState('Failed to load sample-data.json.');
  }
}

// --- Trade Journal Dashboard ---
const TradeCalendar = (() => {
  const STORAGE_KEY = 'tradovate_trades';
  const JOURNAL_KEY = 'trade_journal';
  let trades = [];
  let journals = {};
  let currentMonth = new Date().getMonth();
  let currentYear = new Date().getFullYear();
  let activeRange = 'all';
  let selectedDateKey = null;
  let charts = { radar: null, cumPnl: null, drawdown: null, pnl: null };

  // --- Storage ---
  function loadFromStorage() {
    try { trades = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { trades = []; }
    try { journals = JSON.parse(localStorage.getItem(JOURNAL_KEY) || '{}'); } catch { journals = {}; }
  }
  function saveToStorage() { localStorage.setItem(STORAGE_KEY, JSON.stringify(trades)); }
  function saveJournals() { localStorage.setItem(JOURNAL_KEY, JSON.stringify(journals)); }

  // --- CSV Parsing ---
  function parseCSVRow(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
        else if (ch === '"') inQuotes = false;
        else current += ch;
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ',') { result.push(current); current = ''; }
        else current += ch;
      }
    }
    result.push(current);
    return result;
  }

  function detectColumns(headers) {
    const map = {};
    const find = (...candidates) => {
      for (const c of candidates) {
        const idx = headers.findIndex(h => h.includes(c));
        if (idx !== -1) return idx;
      }
      return null;
    };
    map.timestamp = find('fill time', 'timestamp', 'date/time', 'datetime', 'time', 'date', 'filltime');
    map.contract = find('contract', 'contractspec', 'symbol', 'instrument');
    map.product = find('product description', 'product', 'productdescription');
    map.action = find('b/s', 'action', 'side', 'buy/sell', 'buysell');
    map.qty = find('qty', 'fillqty', 'fill qty', 'quantity', 'filled qty');
    map.price = find('price', 'tradeprice', 'trade price', 'fill price', 'fillprice');
    map.pnl = find('net p/l', 'p/l', 'p&l', 'pnl', 'net p&l', 'profit/loss', 'realized p/l', 'bought p/l', 'sold p/l');
    map.commission = find('commission', 'comm');
    map.fees = find('fee', 'fees');
    return map;
  }

  function parseDate(str) {
    if (!str) return null;
    try { const d = new Date(str); if (!isNaN(d.getTime())) return d; } catch {}
    const parts = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s*(.*)?/);
    if (parts) {
      const [, m, d, y, time] = parts;
      try { const p = new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}${time ? 'T' + time.trim() : ''}`); if (!isNaN(p.getTime())) return p; } catch {}
    }
    return null;
  }

  function formatDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }

  function parseTradovateCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = parseCSVRow(lines[0]).map(h => h.trim().toLowerCase());
    const colMap = detectColumns(headers);
    if (!colMap.timestamp) return [];
    const parsed = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVRow(lines[i]);
      if (cols.length < headers.length - 2) continue;
      const get = (key) => key != null ? (cols[key] || '').trim() : '';
      const timestamp = get(colMap.timestamp);
      if (!timestamp) continue;
      const date = parseDate(timestamp);
      if (!date) continue;
      const trade = {
        date: date.toISOString(), dateKey: formatDateKey(date),
        contract: get(colMap.contract) || get(colMap.product) || 'Unknown',
        action: get(colMap.action) || '',
        qty: parseFloat(get(colMap.qty)) || 0,
        price: parseFloat(get(colMap.price)) || 0,
        pnl: parseFloat(get(colMap.pnl)) || 0,
        commission: parseFloat(get(colMap.commission)) || 0,
        fees: parseFloat(get(colMap.fees)) || 0,
      };
      trade.netPnl = trade.pnl - trade.commission - trade.fees;
      parsed.push(trade);
    }
    return parsed;
  }

  // --- Data helpers ---
  function getFilteredTrades() {
    const now = new Date();
    return trades.filter(t => {
      const d = new Date(t.date);
      if (activeRange === 'week') {
        const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
        return d >= weekAgo;
      }
      if (activeRange === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (activeRange === 'year') return d.getFullYear() === now.getFullYear();
      return true;
    });
  }

  function aggregateByDay(tradeList) {
    const days = {};
    for (const t of (tradeList || trades)) {
      if (!days[t.dateKey]) days[t.dateKey] = { trades: [], totalPnl: 0, totalCommission: 0, totalFees: 0, netPnl: 0 };
      const d = days[t.dateKey];
      d.trades.push(t); d.totalPnl += t.pnl; d.totalCommission += t.commission; d.totalFees += t.fees; d.netPnl += t.netPnl;
    }
    return days;
  }

  function computeStats(tradeList) {
    const days = aggregateByDay(tradeList);
    const dayEntries = Object.values(days);
    let totalPnl = 0, winDays = 0, lossDays = 0, totalTrades = 0, grossWins = 0, grossLosses = 0;
    let winTrades = 0, lossTrades = 0;
    for (const day of dayEntries) {
      totalPnl += day.netPnl; totalTrades += day.trades.length;
      if (day.netPnl > 0) { winDays++; grossWins += day.netPnl; }
      else if (day.netPnl < 0) { lossDays++; grossLosses += Math.abs(day.netPnl); }
      for (const t of day.trades) { if (t.netPnl > 0) winTrades++; else if (t.netPnl < 0) lossTrades++; }
    }
    const tradingDays = winDays + lossDays;
    const totalDecided = winTrades + lossTrades;
    return {
      totalPnl, winDays, lossDays, tradingDays, totalTrades, grossWins, grossLosses,
      winTrades, lossTrades,
      winRate: totalDecided ? (winTrades / totalDecided * 100) : 0,
      dayWinRate: tradingDays ? (winDays / tradingDays * 100) : 0,
      profitFactor: grossLosses > 0 ? grossWins / grossLosses : (grossWins > 0 ? Infinity : 0),
      days,
    };
  }

  function formatCurrency(val) {
    const sign = val >= 0 ? '+' : '-';
    return sign + '$' + Math.abs(val).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function formatShortCurrency(val) {
    const sign = val >= 0 ? '+' : '-';
    const abs = Math.abs(val);
    if (abs >= 1000) return sign + '$' + (abs / 1000).toFixed(1) + 'k';
    return sign + '$' + abs.toFixed(0);
  }

  // --- Stat Cards ---
  function renderStatCards() {
    const filtered = getFilteredTrades();
    const stats = computeStats(filtered);
    const pnlClass = stats.totalPnl >= 0 ? 'tj-positive' : 'tj-negative';

    document.getElementById('tj-pnl-value').textContent = formatCurrency(stats.totalPnl);
    document.getElementById('tj-pnl-value').className = `tj-stat-value ${pnlClass}`;
    document.getElementById('tj-pnl-sub').textContent = `${stats.totalTrades} trades`;

    const pf = stats.profitFactor === Infinity ? '\u221E' : stats.profitFactor.toFixed(2);
    document.getElementById('tj-pf-value').textContent = pf;
    document.getElementById('tj-pf-sub').textContent = stats.totalTrades ? `${stats.grossWins.toFixed(0)} / ${stats.grossLosses.toFixed(0)}` : 'No data';

    document.getElementById('tj-wr-value').textContent = stats.winRate.toFixed(1) + '%';
    document.getElementById('tj-wr-sub').textContent = `${stats.winTrades}W - ${stats.lossTrades}L`;

    document.getElementById('tj-dw-value').textContent = stats.dayWinRate.toFixed(1) + '%';
    document.getElementById('tj-dw-sub').textContent = `${stats.winDays}W - ${stats.lossDays}L`;

    // Win/loss bar
    const total = stats.winDays + stats.lossDays;
    const winPct = total ? (stats.winDays / total * 100) : 50;
    document.getElementById('tj-winloss-bar').innerHTML = `
      <div class="tj-wl-track">
        <div class="tj-wl-win" style="width:${winPct}%"></div>
        <div class="tj-wl-loss" style="width:${100 - winPct}%"></div>
      </div>
      <div class="tj-wl-labels"><span class="tj-positive">${stats.winDays} win</span><span class="tj-negative">${stats.lossDays} loss</span></div>
    `;
  }

  // --- Charts ---
  function chartDefaults() {
    return {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#7c8597', font: { size: 10 } } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#7c8597', font: { size: 10 } } },
      }
    };
  }

  function renderCharts() {
    const filtered = getFilteredTrades();
    const stats = computeStats(filtered);
    const dayKeys = Object.keys(stats.days).sort();

    renderRadarChart(stats);
    renderCumPnlChart(dayKeys, stats.days);
    renderDrawdownChart(dayKeys, stats.days);
    renderPnlChart(dayKeys, stats.days);
  }

  function renderRadarChart(stats) {
    const ctx = document.getElementById('tj-radar-chart');
    if (charts.radar) charts.radar.destroy();

    // Normalize values to 0-100 scale
    const winPct = Math.min(stats.winRate, 100);
    const wlRatio = stats.lossTrades > 0 ? stats.winTrades / stats.lossTrades : stats.winTrades > 0 ? 3 : 0;
    const wlScore = Math.min(wlRatio / 3 * 100, 100);
    const pfScore = Math.min((stats.profitFactor === Infinity ? 3 : stats.profitFactor) / 3 * 100, 100);

    const overallScore = Math.round((winPct + wlScore + pfScore) / 3);
    document.querySelector('.tj-score-num').textContent = overallScore;
    document.getElementById('tj-score-fill').style.width = overallScore + '%';

    charts.radar = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['Win %', 'Win/Loss', 'Profit Factor'],
        datasets: [{
          data: [winPct, wlScore, pfScore],
          backgroundColor: 'rgba(79, 209, 139, 0.15)',
          borderColor: 'rgba(79, 209, 139, 0.6)',
          pointBackgroundColor: 'rgba(79, 209, 139, 0.8)',
          borderWidth: 2, pointRadius: 3,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          r: {
            beginAtZero: true, max: 100,
            grid: { color: 'rgba(255,255,255,0.08)' },
            angleLines: { color: 'rgba(255,255,255,0.08)' },
            pointLabels: { color: '#a3adb8', font: { size: 11 } },
            ticks: { display: false },
          }
        }
      }
    });
  }

  function renderCumPnlChart(dayKeys, days) {
    const ctx = document.getElementById('tj-cum-pnl-chart');
    if (charts.cumPnl) charts.cumPnl.destroy();
    let cum = 0;
    const data = dayKeys.map(k => { cum += days[k].netPnl; return cum; });
    const labels = dayKeys.map(k => { const d = new Date(k + 'T12:00:00'); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); });

    charts.cumPnl = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data, fill: true,
          borderColor: cum >= 0 ? '#4fd18b' : '#d86d6d',
          backgroundColor: cum >= 0 ? 'rgba(79,209,139,0.08)' : 'rgba(216,109,109,0.08)',
          borderWidth: 2, tension: 0.3, pointRadius: 0,
        }]
      },
      options: { ...chartDefaults(), plugins: { legend: { display: false } } }
    });
  }

  function renderDrawdownChart(dayKeys, days) {
    const ctx = document.getElementById('tj-drawdown-chart');
    if (charts.drawdown) charts.drawdown.destroy();
    let cum = 0, peak = 0;
    const data = dayKeys.map(k => {
      cum += days[k].netPnl;
      if (cum > peak) peak = cum;
      return cum - peak;
    });
    const labels = dayKeys.map(k => { const d = new Date(k + 'T12:00:00'); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); });
    const currentDD = data.length ? data[data.length - 1] : 0;

    document.getElementById('tj-drawdown-footer').innerHTML = `Current: <span class="tj-dd-value ${currentDD < 0 ? 'tj-negative' : ''}">${formatCurrency(currentDD)}</span>`;

    charts.drawdown = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data, fill: true,
          borderColor: '#d86d6d', backgroundColor: 'rgba(216,109,109,0.1)',
          borderWidth: 2, tension: 0.3, pointRadius: 0,
        }]
      },
      options: { ...chartDefaults(), plugins: { legend: { display: false } } }
    });
  }

  function renderPnlChart(dayKeys, days) {
    const ctx = document.getElementById('tj-pnl-chart');
    if (charts.pnl) charts.pnl.destroy();
    const data = dayKeys.map(k => days[k].netPnl);
    const colors = data.map(v => v >= 0 ? '#4fd18b' : '#d86d6d');
    const labels = dayKeys.map(k => { const d = new Date(k + 'T12:00:00'); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); });

    charts.pnl = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ data, backgroundColor: colors, borderRadius: 3, barPercentage: 0.7 }]
      },
      options: {
        ...chartDefaults(),
        plugins: {
          legend: { display: false },
          annotation: { annotations: { zero: { type: 'line', yMin: 0, yMax: 0, borderColor: 'rgba(255,255,255,0.15)', borderDash: [4,4] } } }
        }
      }
    });
  }

  // --- Calendar ---
  function renderCalendar() {
    const el = document.getElementById('trade-calendar');
    const label = document.getElementById('trade-month-label');
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    label.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    const days = aggregateByDay();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Build weeks for weekly summary
    const weeks = [];
    let weekDays = [];
    for (let i = 0; i < firstDay; i++) weekDays.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      weekDays.push(d);
      if (weekDays.length === 7) { weeks.push(weekDays); weekDays = []; }
    }
    if (weekDays.length) { while (weekDays.length < 7) weekDays.push(null); weeks.push(weekDays); }

    let html = '<div class="tj-cal-grid">';
    // Header row with Weekly
    html += ['Sun','Mon','Tue','Wed','Thu','Fri','Sat','Weekly']
      .map(d => `<div class="tj-cal-hdr">${d}</div>`).join('');

    for (const week of weeks) {
      let weekPnl = 0;
      let hasTradesInWeek = false;
      for (const d of week) {
        if (d == null) {
          html += '<div class="tj-cal-cell tj-cal-empty"></div>';
          continue;
        }
        const key = formatDateKey(new Date(currentYear, currentMonth, d));
        const dayData = days[key];
        const journal = journals[key];
        let cls = 'tj-cal-cell';
        let inner = `<span class="tj-cal-day">${d}</span>`;

        if (dayData) {
          const pnl = dayData.netPnl;
          weekPnl += pnl;
          hasTradesInWeek = true;
          cls += pnl > 0 ? ' tj-cal-win' : pnl < 0 ? ' tj-cal-loss' : ' tj-cal-flat';
          inner += `<span class="tj-cal-pnl ${pnl >= 0 ? 'tj-positive' : 'tj-negative'}">${formatShortCurrency(pnl)}</span>`;
          inner += `<span class="tj-cal-count">${dayData.trades.length} trade${dayData.trades.length !== 1 ? 's' : ''}</span>`;
        }
        if (journal) {
          inner += '<span class="tj-cal-journal-dot"></span>';
        }
        html += `<div class="${cls}" data-date="${escapeHtml(key)}">${inner}</div>`;
      }
      // Weekly summary cell
      const wpClass = weekPnl >= 0 ? 'tj-positive' : 'tj-negative';
      html += `<div class="tj-cal-cell tj-cal-weekly">${hasTradesInWeek ? `<span class="${wpClass}">${formatShortCurrency(weekPnl)}</span>` : ''}</div>`;
    }

    html += '</div>';
    el.innerHTML = html;

    el.querySelectorAll('.tj-cal-cell[data-date]').forEach(cell => {
      cell.addEventListener('click', () => openDayDetail(cell.dataset.date));
    });
  }

  // --- Day detail / Journal overlay ---
  function openDayDetail(dateKey) {
    selectedDateKey = dateKey;
    const overlay = document.getElementById('tj-detail-overlay');
    overlay.style.display = 'flex';

    const date = new Date(dateKey + 'T12:00:00');
    document.getElementById('trade-detail-title').textContent =
      date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    // Show trades tab by default
    switchDetailTab('trades');
    renderTradesTab(dateKey);
    loadJournalForDay(dateKey);
  }

  function closeDetail() {
    document.getElementById('tj-detail-overlay').style.display = 'none';
    selectedDateKey = null;
  }

  function switchDetailTab(tab) {
    document.querySelectorAll('.tj-dtab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.getElementById('tj-detail-trades').style.display = tab === 'trades' ? '' : 'none';
    document.getElementById('tj-detail-journal').style.display = tab === 'journal' ? '' : 'none';
  }

  function renderTradesTab(dateKey) {
    const el = document.getElementById('tj-detail-trades');
    const days = aggregateByDay();
    const dayData = days[dateKey];

    if (!dayData || !dayData.trades.length) {
      el.innerHTML = '<div class="empty-state">No trades on this day.</div>';
      return;
    }

    const pnlClass = dayData.netPnl >= 0 ? 'tj-positive' : 'tj-negative';
    el.innerHTML = `
      <div class="tj-day-summary">
        <span>Gross P&L: ${formatCurrency(dayData.totalPnl)}</span>
        <span>Commission: -$${dayData.totalCommission.toFixed(2)}</span>
        <span>Fees: -$${dayData.totalFees.toFixed(2)}</span>
        <span>Net: <strong class="${pnlClass}">${formatCurrency(dayData.netPnl)}</strong></span>
      </div>
      <div class="trade-table">
        <div class="trade-table-header">
          <span class="trade-col-time">Time</span>
          <span class="trade-col-contract">Contract</span>
          <span class="trade-col-action">Side</span>
          <span class="trade-col-qty">Qty</span>
          <span class="trade-col-price">Price</span>
          <span class="trade-col-pnl">P&L</span>
          <span class="trade-col-net">Net</span>
        </div>
        ${dayData.trades.sort((a, b) => new Date(a.date) - new Date(b.date)).map(t => {
          const time = new Date(t.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
          const isBuy = (t.action || '').toLowerCase().startsWith('b');
          return `
            <div class="trade-table-row">
              <span class="trade-col-time">${escapeHtml(time)}</span>
              <span class="trade-col-contract">${escapeHtml(t.contract)}</span>
              <span class="trade-col-action ${isBuy ? 'trade-buy' : 'trade-sell'}">${isBuy ? 'BUY' : 'SELL'}</span>
              <span class="trade-col-qty">${t.qty}</span>
              <span class="trade-col-price">${t.price.toFixed(2)}</span>
              <span class="trade-col-pnl ${t.pnl >= 0 ? 'tj-positive' : 'tj-negative'}">${formatCurrency(t.pnl)}</span>
              <span class="trade-col-net ${t.netPnl >= 0 ? 'tj-positive' : 'tj-negative'}">${formatCurrency(t.netPnl)}</span>
            </div>`;
        }).join('')}
      </div>`;
  }

  function loadJournalForDay(dateKey) {
    const journal = journals[dateKey] || { notes: '', tags: [], screenshots: [] };
    document.getElementById('tj-journal-notes').value = journal.notes;

    document.querySelectorAll('.tj-tag').forEach(btn => {
      btn.classList.toggle('active', journal.tags.includes(btn.dataset.tag));
    });

    renderScreenshots(journal.screenshots || []);
  }

  function renderScreenshots(screenshots) {
    const gallery = document.getElementById('tj-screenshot-gallery');
    if (!screenshots.length) { gallery.innerHTML = ''; return; }
    gallery.innerHTML = screenshots.map((src, i) => `
      <div class="tj-ss-item">
        <img src="${escapeHtml(src)}" class="tj-ss-img" />
        <button class="tj-ss-remove" data-idx="${i}">&times;</button>
      </div>
    `).join('');
    gallery.querySelectorAll('.tj-ss-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        const journal = journals[selectedDateKey] || { notes: '', tags: [], screenshots: [] };
        journal.screenshots.splice(idx, 1);
        journals[selectedDateKey] = journal;
        saveJournals();
        renderScreenshots(journal.screenshots);
      });
    });
  }

  function saveJournal() {
    if (!selectedDateKey) return;
    const notes = document.getElementById('tj-journal-notes').value;
    const tags = [];
    document.querySelectorAll('.tj-tag.active').forEach(b => tags.push(b.dataset.tag));
    const existing = journals[selectedDateKey] || {};
    journals[selectedDateKey] = { notes, tags, screenshots: existing.screenshots || [] };
    saveJournals();
    renderCalendar();
  }

  function handleScreenshotUpload(e) {
    const files = Array.from(e.target.files);
    if (!files.length || !selectedDateKey) return;
    const journal = journals[selectedDateKey] || { notes: '', tags: [], screenshots: [] };

    let loaded = 0;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        journal.screenshots.push(ev.target.result);
        loaded++;
        if (loaded === files.length) {
          journals[selectedDateKey] = journal;
          saveJournals();
          renderScreenshots(journal.screenshots);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }

  // --- File Upload ---
  function handleFileUpload(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    let totalNew = 0;
    let loaded = 0;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const newTrades = parseTradovateCSV(ev.target.result);
        totalNew += newTrades.length;
        trades = trades.concat(newTrades);
        loaded++;
        if (loaded === files.length) {
          if (!totalNew) { alert('No trades found. Check CSV format.'); return; }
          saveToStorage();
          const firstDate = new Date(trades[trades.length - 1].date);
          currentMonth = firstDate.getMonth();
          currentYear = firstDate.getFullYear();
          renderAll();
        }
      };
      reader.readAsText(file);
    });
    e.target.value = '';
  }

  // --- Render all ---
  function renderAll() {
    renderStatCards();
    renderCharts();
    renderCalendar();
  }

  // --- Init ---
  function init() {
    loadFromStorage();

    document.getElementById('trade-file-input').addEventListener('change', handleFileUpload);
    document.getElementById('trade-clear-btn').addEventListener('click', () => {
      if (!trades.length || confirm('Clear all trade data and journals?')) {
        trades = []; journals = {};
        localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(JOURNAL_KEY);
        closeDetail(); renderAll();
      }
    });

    // Time filters
    document.querySelectorAll('.tj-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tj-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeRange = btn.dataset.range;
        renderStatCards(); renderCharts();
      });
    });

    // Month nav
    document.getElementById('trade-prev-month').addEventListener('click', () => {
      currentMonth--; if (currentMonth < 0) { currentMonth = 11; currentYear--; }
      renderCalendar();
    });
    document.getElementById('trade-next-month').addEventListener('click', () => {
      currentMonth++; if (currentMonth > 11) { currentMonth = 0; currentYear++; }
      renderCalendar();
    });

    // Detail overlay
    document.getElementById('tj-detail-close').addEventListener('click', closeDetail);
    document.getElementById('tj-detail-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeDetail();
    });

    // Detail tabs
    document.querySelectorAll('.tj-dtab').forEach(btn => {
      btn.addEventListener('click', () => switchDetailTab(btn.dataset.tab));
    });

    // Journal
    document.querySelectorAll('.tj-tag').forEach(btn => {
      btn.addEventListener('click', () => btn.classList.toggle('active'));
    });
    document.getElementById('tj-journal-save').addEventListener('click', saveJournal);
    document.getElementById('tj-screenshot-input').addEventListener('change', handleScreenshotUpload);

    // Journal card button opens journal for today
    document.getElementById('tj-journal-btn').addEventListener('click', () => {
      const today = formatDateKey(new Date());
      openDayDetail(today);
      switchDetailTab('journal');
    });

    renderAll();
  }

  return { init };
})();

initViewNav();
loadDashboard();
TradeCalendar.init();
