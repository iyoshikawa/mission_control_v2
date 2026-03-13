const STATUS_CLASS_MAP = {
  ACTIVE: 'badge-active',
  DORMANT: 'badge-dormant',
  PROPOSED: 'badge-proposed',
  HEALTHY: 'badge-healthy',
  WATCH: 'badge-watch',
  ISSUE: 'badge-issue',
  BLOCKED: 'badge-issue',
  NEEDS_DECISION: 'badge-decision',
  READY: 'badge-dormant',
  NEXT: 'badge-watch',
  SOON: 'badge-watch',
  LEAN: 'badge-healthy',
  REFERENCE: 'badge-healthy'
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

function setMeta(meta = {}) {
  document.getElementById('dashboard-title').textContent = meta.title || 'Mission Control';
  const statusEl = document.getElementById('dashboard-status');
  const status = meta.status || 'REFERENCE';
  statusEl.textContent = status.replaceAll('_', ' ');
  statusEl.className = `badge ${STATUS_CLASS_MAP[status] || 'badge-dormant'}`;
  document.getElementById('dashboard-updated').textContent = meta.lastUpdated || 'Unknown';
}

function renderPriorityStack(items = []) {
  const el = document.getElementById('priority-stack');
  if (!items.length) {
    el.innerHTML = emptyState('No priorities loaded.');
    return;
  }

  el.innerHTML = items.slice(0, 5).map(item => `
    <article class="list-item">
      <div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.summary || 'No summary provided.')}</p>
      </div>
      <div class="item-meta">
        ${badge(item.status)}
        ${item.owner ? `<span>Owner: ${escapeHtml(item.owner)}</span>` : ''}
        ${item.nextAction ? `<span>Next: ${escapeHtml(item.nextAction)}</span>` : ''}
        ${item.blocker ? `<span>Blocked: ${escapeHtml(item.blocker)}</span>` : ''}
      </div>
    </article>
  `).join('');
}

function renderDecisionQueue(items = []) {
  const el = document.getElementById('decision-queue');
  if (!items.length) {
    el.innerHTML = emptyState('No pending Owner decisions loaded.');
    return;
  }

  el.innerHTML = items.slice(0, 5).map(item => `
    <article class="decision-item">
      <h3>${escapeHtml(item.decision)}</h3>
      <p>${escapeHtml(item.whyItMatters || 'No context provided.')}</p>
      <div class="item-meta">
        ${badge(item.status || 'NEEDS_DECISION')}
        ${item.recommendation ? `<span>Recommendation: ${escapeHtml(item.recommendation)}</span>` : ''}
        ${item.urgency ? `<span>Urgency: ${escapeHtml(item.urgency)}</span>` : ''}
      </div>
    </article>
  `).join('');
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

  const renderNode = (node, extraClass = '') => `
    <div class="org-node ${extraClass} ${node.status === 'DORMANT' ? 'dormant' : ''}">
      ${badge(node.status)}
      <h3>${escapeHtml(node.label)}</h3>
      <p>${escapeHtml(node.summary || '')}</p>
      ${node.activationTrigger ? `<p class="node-meta"><strong>Trigger:</strong> ${escapeHtml(node.activationTrigger)}</p>` : ''}
    </div>
  `;

  el.innerHTML = `
    ${owner ? renderNode(owner, 'node-owner') : ''}
    ${owner && saidee ? '<div class="org-line vertical"></div>' : ''}
    ${saidee ? renderNode(saidee, 'node-ceo') : ''}
    <div class="org-children">
      ${children.map(node => renderNode(node)).join('')}
    </div>
  `;
}

function renderStatusList(targetId, items = [], config = {}) {
  const el = document.getElementById(targetId);
  if (!items.length) {
    el.innerHTML = emptyState(config.emptyMessage || 'No items loaded.');
    return;
  }

  el.innerHTML = items.map(item => `
    <article class="status-row">
      <div>
        <h3>${escapeHtml(item.name || item.summary || item.title || 'Untitled')}</h3>
        <p>${escapeHtml(item.issue || item.utilizationNote || item.whyItMatters || item.recommendedNextStep || 'No detail provided.')}</p>
      </div>
      ${item.status ? badge(item.status) : `<span class="timestamp">${escapeHtml(item.timestamp || '')}</span>`}
    </article>
  `).join('');
}

function renderAlerts(items = []) {
  const el = document.getElementById('alerts');
  if (!items.length) {
    el.innerHTML = emptyState('No material alerts loaded.');
    return;
  }

  el.innerHTML = items.map(item => `
    <article class="status-row">
      <div>
        <h3>${escapeHtml(item.summary)}</h3>
        <p>${escapeHtml(item.whyItMatters || 'No impact note provided.')}</p>
      </div>
      <span class="timestamp">${escapeHtml(item.timestamp || '')}</span>
    </article>
  `).join('');
}

function renderCompactPreview(targetId, items = [], labels = {}) {
  const el = document.getElementById(targetId);
  if (!items.length) {
    el.innerHTML = `
      <p class="compact-stat">${escapeHtml(labels.emptyTitle || 'No items loaded')}</p>
      <p class="compact-note">${escapeHtml(labels.emptyNote || 'Waiting for source data')}</p>
    `;
    return;
  }

  const first = items[0];
  el.innerHTML = `
    <p class="compact-stat">${escapeHtml(labels.countPrefix || items.length + ' item(s)')} </p>
    <p class="compact-note">${escapeHtml(first.name || first.item || first.topic || first.title || 'Top item loaded')}</p>
  `;
}

async function loadDashboard() {
  try {
    const response = await fetch('./sample-data.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    setMeta(data.meta);
    renderPriorityStack(data.priorityStack);
    renderDecisionQueue(data.decisionQueue);
    renderOrg(data.org);
    renderStatusList('ops-health', data.opsHealth, { emptyMessage: 'No ops risks loaded.' });
    renderStatusList('cost-watch', data.costWatch, { emptyMessage: 'No cost concerns loaded.' });
    renderAlerts(data.alerts);
    renderCompactPreview('projects-preview', data.projects, {
      countPrefix: `${data.projects?.length || 0} active project(s)`,
      emptyTitle: 'No projects loaded',
      emptyNote: 'Add active initiatives here'
    });
    renderCompactPreview('comms-preview', data.commsQueue, {
      countPrefix: `${data.commsQueue?.length || 0} queued item(s)`,
      emptyTitle: 'No current outbound obligations loaded',
      emptyNote: 'Manual data source pending'
    });
    renderCompactPreview('intelligence-preview', data.intelligenceQueue, {
      countPrefix: `${data.intelligenceQueue?.length || 0} topic(s) loaded`,
      emptyTitle: 'No monitoring topics loaded',
      emptyNote: 'Add once recurring research exists'
    });
  } catch (error) {
    console.error(error);
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

loadDashboard();
