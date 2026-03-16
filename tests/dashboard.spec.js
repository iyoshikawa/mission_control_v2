const { test, expect } = require('@playwright/test');

// --- App loads ---

test('page loads with correct title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Mission Control');
});

test('command band shows dashboard title and status', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#dashboard-title')).toHaveText('Mission Control');
  await expect(page.locator('#dashboard-status')).toBeVisible();
  await expect(page.locator('#dashboard-updated')).not.toHaveText('Loading…');
});

// --- Nav tabs exist and work ---

test('nav tabs are visible', async ({ page }) => {
  await page.goto('/');
  const tabs = page.locator('.view-tab');
  await expect(tabs).toHaveCount(5);
  await expect(tabs.nth(0)).toHaveText('Mission Control');
  await expect(tabs.nth(1)).toHaveText('X');
  await expect(tabs.nth(2)).toHaveText('News');
  await expect(tabs.nth(3)).toHaveText('AI News');
  await expect(tabs.nth(4)).toHaveText('Macro');
});

test('Mission Control tab is active by default', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.view-tab[data-view="mission-control"]')).toHaveClass(/active/);
  await expect(page.locator('#view-mission-control')).toBeVisible();
  await expect(page.locator('#view-x')).not.toBeVisible();
  await expect(page.locator('#view-news')).not.toBeVisible();
  await expect(page.locator('#view-ai-news')).not.toBeVisible();
  await expect(page.locator('#view-macro')).not.toBeVisible();
});

test('clicking X tab switches to X view', async ({ page }) => {
  await page.goto('/');
  await page.click('.view-tab[data-view="x"]');
  await expect(page.locator('#view-x')).toBeVisible();
  await expect(page.locator('#view-mission-control')).not.toBeVisible();
  await expect(page.locator('.view-tab[data-view="x"]')).toHaveClass(/active/);
});

test('clicking News tab switches to News view', async ({ page }) => {
  await page.goto('/');
  await page.click('.view-tab[data-view="news"]');
  await expect(page.locator('#view-news')).toBeVisible();
  await expect(page.locator('#view-mission-control')).not.toBeVisible();
});

test('clicking Macro tab switches to Macro view', async ({ page }) => {
  await page.goto('/');
  await page.click('.view-tab[data-view="macro"]');
  await expect(page.locator('#view-macro')).toBeVisible();
  await expect(page.locator('#view-mission-control')).not.toBeVisible();
});

test('switching back to Mission Control works', async ({ page }) => {
  await page.goto('/');
  await page.click('.view-tab[data-view="news"]');
  await page.click('.view-tab[data-view="mission-control"]');
  await expect(page.locator('#view-mission-control')).toBeVisible();
  await expect(page.locator('#view-news')).not.toBeVisible();
});

// --- Dashboard sections render from sample data ---

test('priority stack renders items', async ({ page }) => {
  await page.goto('/');
  const items = page.locator('#priority-stack .list-item');
  await expect(items).toHaveCount(3);
  await expect(items.first()).toContainText('Mission Control v1 build review');
});

test('priority stack shows rank numbers', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#priority-stack .rank').first()).toHaveText('#1');
});

test('priority stack shows blocker when present', async ({ page }) => {
  await page.goto('/');
  const blockerItem = page.locator('#priority-stack .list-item').nth(1);
  await expect(blockerItem).toContainText('Not started yet');
  await expect(blockerItem.locator('.blocker-bar')).toBeVisible();
});

test('decision queue renders items', async ({ page }) => {
  await page.goto('/');
  const items = page.locator('#decision-queue .decision-item');
  await expect(items).toHaveCount(2);
  await expect(items.first()).toContainText('markdown-to-JSON sync pipeline');
});

test('decision queue shows option chips', async ({ page }) => {
  await page.goto('/');
  const chips = page.locator('#decision-queue .option-chip');
  await expect(chips.first()).toBeVisible();
});

test('org chart renders leader and child nodes', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#org-chart .org-leader')).toHaveCount(2);
  await expect(page.locator('#org-chart .org-child')).toHaveCount(6);
});

test('org chart shows active/dormant counts', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#org-chart .org-count-active')).toContainText('2 active');
  await expect(page.locator('#org-chart .org-count-dormant')).toContainText('6 dormant');
});

test('ops health renders status rows', async ({ page }) => {
  await page.goto('/');
  const rows = page.locator('#ops-health .status-row');
  await expect(rows).toHaveCount(3);
});

test('cost watch renders status rows', async ({ page }) => {
  await page.goto('/');
  const rows = page.locator('#cost-watch .status-row');
  await expect(rows).toHaveCount(2);
});

test('alerts render with timestamps', async ({ page }) => {
  await page.goto('/');
  const rows = page.locator('#alerts .status-row');
  await expect(rows).toHaveCount(3);
  await expect(rows.first()).toContainText('parallel worktrees');
});

test('compact previews render', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#projects-preview')).toContainText('Mission Control v1');
  await expect(page.locator('#comms-preview')).toContainText('No outbound obligations');
  await expect(page.locator('#intelligence-preview')).toContainText('Lightweight dashboard');
});

// --- X view renders ---

test('X view renders watched accounts', async ({ page }) => {
  await page.goto('/');
  await page.click('.view-tab[data-view="x"]');
  const accounts = page.locator('#x-watched .x-account');
  await expect(accounts).toHaveCount(4);
  await expect(accounts.first()).toContainText('@realDonaldTrump');
});

test('X view renders trump feed posts', async ({ page }) => {
  await page.goto('/');
  await page.click('.view-tab[data-view="x"]');
  const posts = page.locator('#x-trump .x-post');
  await expect(posts).toHaveCount(3);
});

test('X view HIGH signal gets high class', async ({ page }) => {
  await page.goto('/');
  await page.click('.view-tab[data-view="x"]');
  await expect(page.locator('#x-trump .x-post-high').first()).toBeVisible();
});

test('X view renders signal items sorted HIGH first', async ({ page }) => {
  await page.goto('/');
  await page.click('.view-tab[data-view="x"]');
  const firstSignal = page.locator('#x-signals .x-signal-row').first();
  await expect(firstSignal.locator('.signal-high')).toBeVisible();
});

test('X summary shows counts', async ({ page }) => {
  await page.goto('/');
  await page.click('.view-tab[data-view="x"]');
  await expect(page.locator('#x-summary')).toContainText('active source');
});

// --- News view renders ---

test('News view renders grouped news items', async ({ page }) => {
  await page.goto('/');
  await page.click('.view-tab[data-view="news"]');
  const items = page.locator('#news-feed .news-item');
  await expect(items).toHaveCount(10);
  await expect(page.locator('#news-feed .news-source-group').first()).toBeVisible();
});

test('News view shows must-have source groups from generated feed', async ({ page }) => {
  await page.goto('/');
  await page.click('.view-tab[data-view="news"]');
  await expect(page.locator('#news-feed')).toContainText('Anthropic');
  await expect(page.locator('#news-feed')).toContainText('OpenAI');
  await expect(page.locator('#news-feed')).toContainText('Microsoft Azure AI');
});

test('News items show headline and source link only', async ({ page }) => {
  await page.goto('/');
  await page.click('.view-tab[data-view="news"]');
  const first = page.locator('#news-feed .news-item').first();
  await expect(first.locator('h3')).not.toHaveText('');
  await expect(first.locator('.source-link')).toHaveText('Source');
});

test('News items show impact badges', async ({ page }) => {
  await page.goto('/');
  await page.click('.view-tab[data-view="news"]');
  const badges = page.locator('#news-feed .badge');
  await expect(badges.first()).toBeVisible();
});

// --- AI News view renders ---

test('AI News tab switches to AI News view', async ({ page }) => {
  await page.goto('/');
  await page.click('.view-tab[data-view="ai-news"]');
  await expect(page.locator('#view-ai-news')).toBeVisible();
  await expect(page.locator('#view-mission-control')).not.toBeVisible();
});

test('AI News view renders top stories from generated feed', async ({ page }) => {
  await page.goto('/');
  await page.click('.view-tab[data-view="ai-news"]');
  const stories = page.locator('#ai-top-stories .ai-story');
  await expect(stories).toHaveCount(6);
  await expect(stories.first().locator('h3')).not.toHaveText('');
  await expect(stories.first().locator('.source-link')).toHaveText('Source');
});

test('AI News view shows source-only links and supporting references when present', async ({ page }) => {
  await page.goto('/');
  await page.click('.view-tab[data-view="ai-news"]');
  const firstStory = page.locator('#ai-top-stories .ai-story').first();
  await expect(firstStory.locator('.news-source')).toBeVisible();
  await expect(firstStory.locator('.source-link')).toHaveText('Source');
});

test('AI News view prefers generated JSON when available', async ({ page }) => {
  await page.route('**/data/ai-news.generated.json', async route => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        meta: { generatedAt: '2026-03-15T09:00:00-07:00', refreshCadence: 'hourly' },
        newsFeed: [],
        aiNews: {
          topStories: [{
            headline: 'Generated story from scheduler',
            source: 'OpenAI',
            timestamp: '2026-03-15T09:00:00-07:00',
            impact: 'HIGH',
            summary: 'Freshly generated payload.',
            whyItMatters: 'Confirms separate generated JSON read-path.',
            link: 'https://openai.com/'
          }],
          whyItMatters: [],
          watchlist: []
        }
      })
    });
  });

  await page.goto('/');
  await page.click('.view-tab[data-view="ai-news"]');
  await expect(page.locator('#ai-top-stories')).toContainText('Generated story from scheduler');
  await expect(page.locator('#ai-top-stories')).toContainText('Confirms separate generated JSON read-path.');
});

test('AI News view falls back to embedded sample data when generated JSON fails', async ({ page }) => {
  await page.route('**/data/ai-news.generated.json', route => route.abort());
  await page.goto('/');
  await page.click('.view-tab[data-view="ai-news"]');
  await expect(page.locator('#ai-top-stories .ai-story').first()).toBeVisible();
});

test('AI News view renders why-it-matters and watchlist', async ({ page }) => {
  await page.goto('/');
  await page.click('.view-tab[data-view="ai-news"]');
  await expect(page.locator('#ai-why-matters .ai-impact')).toHaveCount(4);
  await expect(page.locator('#ai-watchlist .ai-watch-item')).toHaveCount(5);
});

// --- Macro view renders ---

test('Macro view renders calendar table', async ({ page }) => {
  await page.goto('/');
  await page.click('.view-tab[data-view="macro"]');
  await expect(page.locator('.macro-header')).toBeVisible();
  const rows = page.locator('.macro-row');
  await expect(rows).toHaveCount(6);
});

test('Macro view shows released and upcoming events', async ({ page }) => {
  await page.goto('/');
  await page.click('.view-tab[data-view="macro"]');
  await expect(page.locator('.macro-released')).toHaveCount(2);
  const upcoming = page.locator('.macro-row:not(.macro-released)');
  await expect(upcoming).toHaveCount(4);
});

test('Macro view shows column headers', async ({ page }) => {
  await page.goto('/');
  await page.click('.view-tab[data-view="macro"]');
  const header = page.locator('.macro-header');
  await expect(header).toContainText('Event');
  await expect(header).toContainText('Prev');
  await expect(header).toContainText('Actual');
});

// --- Error / fallback behavior ---

test('shows error state when data fails to load', async ({ page }) => {
  await page.route('**/sample-data.json', route => route.abort());
  await page.goto('/');
  await expect(page.locator('#priority-stack .empty-state')).toContainText('Failed to load');
  await expect(page.locator('#decision-queue .empty-state')).toContainText('Failed to load');
});

// --- Badges render correctly ---

test('badges show readable status text', async ({ page }) => {
  await page.goto('/');
  const activeBadge = page.locator('#priority-stack .badge-active').first();
  await expect(activeBadge).toHaveText('ACTIVE');
  const decisionBadge = page.locator('#decision-queue .badge-decision').first();
  await expect(decisionBadge).toHaveText('NEEDS DECISION');
});
