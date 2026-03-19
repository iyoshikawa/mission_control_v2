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

// --- Trade Calendar ---
const TradeCalendar = (() => {
  const STORAGE_KEY = 'tradovate_trades';
  let trades = [];
  let currentMonth = new Date().getMonth();
  let currentYear = new Date().getFullYear();

  function loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) trades = JSON.parse(stored);
    } catch { trades = []; }
  }

  function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
  }

  function parseTradovateCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];

    const headerLine = lines[0];
    const headers = parseCSVRow(headerLine).map(h => h.trim().toLowerCase());

    // Auto-detect column mappings for common Tradovate export formats
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
        date: date.toISOString(),
        dateKey: formatDateKey(date),
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
    // Handle various Tradovate date formats
    // "MM/DD/YYYY HH:MM:SS", "YYYY-MM-DDTHH:MM:SS", "MM/DD/YYYY", etc.
    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) return d;
    } catch { /* fall through */ }
    // Try MM/DD/YYYY HH:MM:SS AM/PM
    const parts = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s*(.*)?/);
    if (parts) {
      const [, m, d, y, time] = parts;
      const dateStr = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}${time ? 'T' + time.trim() : ''}`;
      try {
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) return parsed;
      } catch { /* fall through */ }
    }
    return null;
  }

  function formatDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }

  function aggregateByDay() {
    const days = {};
    for (const t of trades) {
      if (!days[t.dateKey]) {
        days[t.dateKey] = { trades: [], totalPnl: 0, totalCommission: 0, totalFees: 0, netPnl: 0 };
      }
      const d = days[t.dateKey];
      d.trades.push(t);
      d.totalPnl += t.pnl;
      d.totalCommission += t.commission;
      d.totalFees += t.fees;
      d.netPnl += t.netPnl;
    }
    return days;
  }

  function getMonthStats() {
    const days = aggregateByDay();
    const monthDays = Object.entries(days).filter(([key]) => {
      const [y, m] = key.split('-').map(Number);
      return y === currentYear && m === currentMonth + 1;
    });

    let totalPnl = 0, winDays = 0, lossDays = 0, totalTrades = 0;
    let grossWins = 0, grossLosses = 0;

    for (const [, day] of monthDays) {
      totalPnl += day.netPnl;
      totalTrades += day.trades.length;
      if (day.netPnl > 0) { winDays++; grossWins += day.netPnl; }
      else if (day.netPnl < 0) { lossDays++; grossLosses += day.netPnl; }
    }

    const tradingDays = winDays + lossDays;
    return {
      totalPnl,
      winDays,
      lossDays,
      tradingDays,
      totalTrades,
      winRate: tradingDays ? ((winDays / tradingDays) * 100).toFixed(1) : '0.0',
      avgWin: winDays ? grossWins / winDays : 0,
      avgLoss: lossDays ? grossLosses / lossDays : 0,
      profitFactor: grossLosses !== 0 ? Math.abs(grossWins / grossLosses) : grossWins > 0 ? Infinity : 0,
    };
  }

  function formatCurrency(val) {
    const sign = val >= 0 ? '+' : '';
    return sign + '$' + Math.abs(val).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function renderSummary() {
    const el = document.getElementById('trade-summary');
    if (!trades.length) {
      el.innerHTML = emptyState('No trades imported. Upload a Tradovate CSV to get started.');
      return;
    }

    const stats = getMonthStats();
    const pnlClass = stats.totalPnl >= 0 ? 'good' : 'issue';
    const pf = stats.profitFactor === Infinity ? '\u221E' : stats.profitFactor.toFixed(2);

    el.innerHTML = `
      <div class="trade-stats-grid">
        <div class="trade-stat">
          <span class="trade-stat-label">Month P&L</span>
          <span class="trade-stat-value ${pnlClass}">${formatCurrency(stats.totalPnl)}</span>
        </div>
        <div class="trade-stat">
          <span class="trade-stat-label">Trading Days</span>
          <span class="trade-stat-value">${stats.tradingDays}</span>
        </div>
        <div class="trade-stat">
          <span class="trade-stat-label">Win Rate</span>
          <span class="trade-stat-value">${escapeHtml(stats.winRate)}%</span>
        </div>
        <div class="trade-stat">
          <span class="trade-stat-label">Total Trades</span>
          <span class="trade-stat-value">${stats.totalTrades}</span>
        </div>
        <div class="trade-stat">
          <span class="trade-stat-label">Avg Win Day</span>
          <span class="trade-stat-value good">${formatCurrency(stats.avgWin)}</span>
        </div>
        <div class="trade-stat">
          <span class="trade-stat-label">Avg Loss Day</span>
          <span class="trade-stat-value issue">${formatCurrency(stats.avgLoss)}</span>
        </div>
        <div class="trade-stat">
          <span class="trade-stat-label">Profit Factor</span>
          <span class="trade-stat-value">${escapeHtml(pf)}</span>
        </div>
        <div class="trade-stat">
          <span class="trade-stat-label">Win/Loss</span>
          <span class="trade-stat-value"><span class="good">${stats.winDays}W</span> / <span class="issue">${stats.lossDays}L</span></span>
        </div>
      </div>
    `;
  }

  function renderCalendar() {
    const el = document.getElementById('trade-calendar');
    const label = document.getElementById('trade-month-label');
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    label.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    const days = aggregateByDay();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    let html = '<div class="cal-grid">';
    html += ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
      .map(d => `<div class="cal-header">${d}</div>`).join('');

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      html += '<div class="cal-cell cal-empty"></div>';
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const key = formatDateKey(new Date(currentYear, currentMonth, d));
      const dayData = days[key];
      let cellClass = 'cal-cell';
      let content = `<span class="cal-day">${d}</span>`;

      if (dayData) {
        const pnl = dayData.netPnl;
        cellClass += pnl > 0 ? ' cal-win' : pnl < 0 ? ' cal-loss' : ' cal-flat';
        content += `<span class="cal-pnl ${pnl >= 0 ? 'cal-pnl-pos' : 'cal-pnl-neg'}">${formatCurrency(pnl)}</span>`;
        content += `<span class="cal-trades">${dayData.trades.length} trade${dayData.trades.length !== 1 ? 's' : ''}</span>`;
      }

      html += `<div class="${cellClass}" data-date="${escapeHtml(key)}">${content}</div>`;
    }

    html += '</div>';
    el.innerHTML = html;

    // Click handlers
    el.querySelectorAll('.cal-cell[data-date]').forEach(cell => {
      cell.addEventListener('click', () => {
        const dateKey = cell.dataset.date;
        renderDayDetail(dateKey, days[dateKey]);
      });
    });
  }

  function renderDayDetail(dateKey, dayData) {
    const section = document.getElementById('trade-detail-section');
    const titleEl = document.getElementById('trade-detail-title');
    const noteEl = document.getElementById('trade-detail-note');
    const el = document.getElementById('trade-detail');

    if (!dayData || !dayData.trades.length) {
      section.style.display = 'none';
      return;
    }

    section.style.display = '';
    const date = new Date(dateKey + 'T12:00:00');
    titleEl.textContent = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const pnlClass = dayData.netPnl >= 0 ? 'good' : 'issue';
    noteEl.innerHTML = `Day P&L: <span class="snapshot-value ${pnlClass}" style="font-size:1rem;">${formatCurrency(dayData.netPnl)}</span>`;

    // Group trades by contract
    const byContract = {};
    for (const t of dayData.trades) {
      if (!byContract[t.contract]) byContract[t.contract] = [];
      byContract[t.contract].push(t);
    }

    el.innerHTML = `
      <div class="trade-day-summary">
        <span>Gross P&L: ${formatCurrency(dayData.totalPnl)}</span>
        <span>Commissions: -$${dayData.totalCommission.toFixed(2)}</span>
        <span>Fees: -$${dayData.totalFees.toFixed(2)}</span>
        <span>Net P&L: <strong class="${pnlClass}">${formatCurrency(dayData.netPnl)}</strong></span>
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
        ${dayData.trades
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .map(t => {
            const time = new Date(t.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
            const actionClass = (t.action || '').toLowerCase().startsWith('b') ? 'trade-buy' : 'trade-sell';
            const actionLabel = (t.action || '').toLowerCase().startsWith('b') ? 'BUY' : 'SELL';
            const pnlCls = t.netPnl >= 0 ? 'cal-pnl-pos' : 'cal-pnl-neg';
            return `
              <div class="trade-table-row">
                <span class="trade-col-time">${escapeHtml(time)}</span>
                <span class="trade-col-contract">${escapeHtml(t.contract)}</span>
                <span class="trade-col-action ${actionClass}">${actionLabel}</span>
                <span class="trade-col-qty">${t.qty}</span>
                <span class="trade-col-price">${t.price.toFixed(2)}</span>
                <span class="trade-col-pnl ${pnlCls}">${formatCurrency(t.pnl)}</span>
                <span class="trade-col-net ${pnlCls}">${formatCurrency(t.netPnl)}</span>
              </div>`;
          }).join('')}
      </div>
    `;

    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const newTrades = parseTradovateCSV(ev.target.result);
      if (!newTrades.length) {
        alert('No trades found in CSV. Check that the file is a Tradovate export.');
        return;
      }
      trades = trades.concat(newTrades);
      saveToStorage();

      // Navigate to the month of the first imported trade
      const firstDate = new Date(newTrades[0].date);
      currentMonth = firstDate.getMonth();
      currentYear = firstDate.getFullYear();

      renderSummary();
      renderCalendar();
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function init() {
    loadFromStorage();

    document.getElementById('trade-file-input').addEventListener('change', handleFileUpload);

    document.getElementById('trade-clear-btn').addEventListener('click', () => {
      if (!trades.length || confirm('Clear all trade data?')) {
        trades = [];
        localStorage.removeItem(STORAGE_KEY);
        document.getElementById('trade-detail-section').style.display = 'none';
        renderSummary();
        renderCalendar();
      }
    });

    document.getElementById('trade-prev-month').addEventListener('click', () => {
      currentMonth--;
      if (currentMonth < 0) { currentMonth = 11; currentYear--; }
      renderSummary();
      renderCalendar();
      document.getElementById('trade-detail-section').style.display = 'none';
    });

    document.getElementById('trade-next-month').addEventListener('click', () => {
      currentMonth++;
      if (currentMonth > 11) { currentMonth = 0; currentYear++; }
      renderSummary();
      renderCalendar();
      document.getElementById('trade-detail-section').style.display = 'none';
    });

    renderSummary();
    renderCalendar();
  }

  return { init };
})();

initViewNav();
loadDashboard();
TradeCalendar.init();
