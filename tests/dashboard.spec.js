const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const sampleData = require('../views/sample-data.json');

function cloneSampleData() {
  return JSON.parse(JSON.stringify(sampleData));
}

async function loadWithLivePayload(page, payload) {
  await page.route('**/sample-data.json', async route => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(payload)
    });
  });

  await page.goto('/');
}

async function routeGeneratedTasks(page, payloadFactory) {
  await page.route('**/data/tasks.generated.json', async route => {
    const payload = typeof payloadFactory === 'function' ? payloadFactory() : payloadFactory;
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(payload)
    });
  });
}

test.describe('live dashboard news connections', () => {
  test('AI News view renders a live payload returned over the dashboard data request', async ({ page }) => {
    const payload = cloneSampleData();
    payload.meta.lastUpdated = '2026-03-16T18:00:00Z';
    payload.aiNews.topStories = [
      {
        headline: 'Live model launch from routed payload',
        source: 'Live Feed',
        timestamp: '2026-03-16T17:55:00Z',
        impact: 'HIGH',
        summary: 'This story only exists in the intercepted live payload.',
        whyItMatters: 'Proves the AI News surface is rendering fetched data, not bundled defaults.'
      },
      {
        headline: 'Second live AI item',
        source: 'Lab Notes',
        timestamp: '2026-03-16T17:40:00Z',
        impact: 'WATCH',
        summary: 'A second item confirms list rendering on the live path.',
        whyItMatters: 'The view should show multiple fetched stories cleanly.'
      }
    ];
    payload.aiNews.whyItMatters = [
      {
        topic: 'Inference cost shift',
        assessment: 'Live payload changed the assessment block too.',
        urgency: 'WATCH',
        recommendedAction: 'Verify this section updates from fetched data.'
      }
    ];
    payload.aiNews.watchlist = [
      { name: 'Live Vendor', status: 'ACTIVE', note: 'Watchlist is coming from the same live payload.' }
    ];

    await loadWithLivePayload(page, payload);
    await page.click('.view-tab[data-view="ai-news"]');

    await expect(page.locator('#dashboard-updated')).toContainText('Mar');
    await expect(page.locator('#ai-top-stories .ai-story')).toHaveCount(2);
    await expect(page.locator('#ai-top-stories')).toContainText('Live model launch from routed payload');
    await expect(page.locator('#ai-top-stories')).not.toContainText('Anthropic releases Claude 4.5');
    await expect(page.locator('#ai-why-matters')).toContainText('Inference cost shift');
    await expect(page.locator('#ai-watchlist')).toContainText('Live Vendor');
  });

  test('News view renders a live global news payload and preserves lead-story styling for urgent items', async ({ page }) => {
    const payload = cloneSampleData();
    payload.newsFeed = [
      {
        headline: 'Live tariff shock hits hardware imports',
        source: 'Reuters',
        timestamp: '2026-03-16T18:20:00Z',
        impact: 'HIGH',
        region: 'US',
        category: 'trade',
        summary: 'Urgent trade move delivered through the live payload.',
        whyItMatters: 'The first live card should render as the lead story.',
        link: 'https://example.com/live-tariffs'
      },
      {
        headline: 'Central bank guidance cools rate-cut hopes',
        source: 'Bloomberg',
        timestamp: '2026-03-16T18:10:00Z',
        impact: 'MEDIUM',
        region: 'Europe',
        category: 'central-banks',
        summary: 'Second live item keeps the feed multi-source.',
        whyItMatters: 'Confirms the News surface handles a fresh global feed.',
        link: 'https://example.com/rates'
      }
    ];

    await loadWithLivePayload(page, payload);
    await page.click('.view-tab[data-view="news"]');

    const items = page.locator('#news-feed .news-item');
    await expect(items).toHaveCount(2);
    await expect(items.first()).toContainText('Live tariff shock hits hardware imports');
    await expect(items.first()).toHaveClass(/news-item-lead/);
    await expect(page.locator('#news-feed')).not.toContainText('Red Sea shipping disruptions');
    await expect(page.locator('#news-feed .badge').first()).toHaveText('HIGH');
    await expect(page.locator('#news-feed .source-link').first()).toHaveAttribute('href', 'https://example.com/live-tariffs');
  });

  test('reloading with a newer payload updates both dashboard timestamp and live news content', async ({ page }) => {
    const firstPayload = cloneSampleData();
    firstPayload.meta.lastUpdated = '2026-03-16T17:00:00Z';
    firstPayload.newsFeed = [
      {
        headline: 'First live cycle headline',
        source: 'Cycle One',
        timestamp: '2026-03-16T16:55:00Z',
        impact: 'MEDIUM',
        region: 'Global',
        category: 'macro',
        summary: 'Initial scheduler cycle payload.',
        whyItMatters: 'Baseline content before refresh.'
      }
    ];
    firstPayload.aiNews.topStories = [
      {
        headline: 'First AI cycle headline',
        source: 'Cycle One',
        timestamp: '2026-03-16T16:50:00Z',
        impact: 'WATCH',
        summary: 'Initial AI payload.',
        whyItMatters: 'Baseline AI content before refresh.'
      }
    ];

    const secondPayload = cloneSampleData();
    secondPayload.meta.lastUpdated = '2026-03-16T18:00:00Z';
    secondPayload.newsFeed = [
      {
        headline: 'Second live cycle headline',
        source: 'Cycle Two',
        timestamp: '2026-03-16T17:55:00Z',
        impact: 'HIGH',
        region: 'Global',
        category: 'macro',
        summary: 'Updated scheduler cycle payload.',
        whyItMatters: 'Confirms the page reflects a refreshed fetch after reload.'
      }
    ];
    secondPayload.aiNews.topStories = [
      {
        headline: 'Second AI cycle headline',
        source: 'Cycle Two',
        timestamp: '2026-03-16T17:50:00Z',
        impact: 'HIGH',
        summary: 'Updated AI payload.',
        whyItMatters: 'AI surface should reflect the newest fetched content too.'
      }
    ];

    let requestCount = 0;
    await page.route('**/sample-data.json', async route => {
      requestCount += 1;
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(requestCount === 1 ? firstPayload : secondPayload)
      });
    });

    await page.goto('/');
    await page.click('.view-tab[data-view="news"]');
    await expect(page.locator('#dashboard-updated')).toContainText('5:00');
    await expect(page.locator('#news-feed')).toContainText('First live cycle headline');

    await page.reload();
    await page.click('.view-tab[data-view="news"]');
    await expect(page.locator('#dashboard-updated')).toContainText('6:00');
    await expect(page.locator('#news-feed')).toContainText('Second live cycle headline');
    await expect(page.locator('#news-feed')).not.toContainText('First live cycle headline');

    await page.click('.view-tab[data-view="ai-news"]');
    await expect(page.locator('#ai-top-stories')).toContainText('Second AI cycle headline');
    await expect(page.locator('#ai-top-stories')).not.toContainText('First AI cycle headline');
  });
});

test.describe('generated task view connections', () => {
  test('Tasks view renders the generated task payload from the canonical source output', async ({ page }) => {
    const payload = cloneSampleData();
    payload.meta.lastUpdated = '2026-03-16T17:00:00Z';

    await routeGeneratedTasks(page, {
      meta: {
        generatedAt: '2026-03-16T18:05:00Z',
        sourcePath: 'data/tasks.json',
        taskCount: 2,
        statuses: ['active', 'blocked', 'backlog', 'done']
      },
      tasks: [
        {
          id: 'live-active',
          title: 'Live generated task item',
          status: 'active',
          summary: 'This task only exists in the generated payload.',
          owner: 'Automation',
          nextAction: 'Verify generated task rendering.',
          updatedAt: '2026-03-16T18:04:00Z'
        },
        {
          id: 'live-blocked',
          title: 'Blocked generated task item',
          status: 'blocked',
          summary: 'Second generated task confirms multi-row rendering.',
          owner: 'Automation',
          blocker: 'Waiting on review',
          updatedAt: '2026-03-16T18:03:00Z'
        }
      ]
    });

    await loadWithLivePayload(page, payload);
    await page.click('.view-tab[data-view="tasks"]');

    await expect(page.locator('#dashboard-updated')).toContainText('6:05');
    await expect(page.locator('#tasks-view .status-row')).toHaveCount(2);
    await expect(page.locator('#tasks-view')).toContainText('Live generated task item');
    await expect(page.locator('#tasks-view')).toContainText('Waiting on review');
    await expect(page.locator('#tasks-view')).not.toContainText('Review Mission Control sample task view');
  });

  test('reloading the page picks up the newest generated task view payload', async ({ page }) => {
    const payload = cloneSampleData();
    let requestCount = 0;

    await routeGeneratedTasks(page, () => {
      requestCount += 1;
      return requestCount === 1
        ? {
            meta: {
              generatedAt: '2026-03-16T18:10:00Z',
              sourcePath: 'data/tasks.json',
              taskCount: 1,
              statuses: ['active', 'blocked', 'backlog', 'done']
            },
            tasks: [
              {
                id: 'cycle-one',
                title: 'First generated cycle task',
                status: 'backlog',
                summary: 'Initial generated task payload.',
                owner: 'Automation',
                updatedAt: '2026-03-16T18:09:00Z'
              }
            ]
          }
        : {
            meta: {
              generatedAt: '2026-03-16T19:20:00Z',
              sourcePath: 'data/tasks.json',
              taskCount: 1,
              statuses: ['active', 'blocked', 'backlog', 'done']
            },
            tasks: [
              {
                id: 'cycle-two',
                title: 'Second generated cycle task',
                status: 'done',
                summary: 'Updated generated task payload after refresh.',
                owner: 'Automation',
                updatedAt: '2026-03-16T19:19:00Z'
              }
            ]
          };
    });

    await loadWithLivePayload(page, payload);
    await page.click('.view-tab[data-view="tasks"]');
    await expect(page.locator('#dashboard-updated')).toContainText('6:10');
    await expect(page.locator('#tasks-view')).toContainText('First generated cycle task');

    await page.reload();
    await page.click('.view-tab[data-view="tasks"]');
    await expect(page.locator('#dashboard-updated')).toContainText('7:20');
    await expect(page.locator('#tasks-view')).toContainText('Second generated cycle task');
    await expect(page.locator('#tasks-view')).not.toContainText('First generated cycle task');
  });
});

test.describe('scheduler and update wiring', () => {
  test('scheduled refresh workflow runs hourly, validates output, and only commits the generated AI feed file', async () => {
    const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'ai-news-refresh.yml');
    const workflow = fs.readFileSync(workflowPath, 'utf8');

    expect(workflow).toContain("cron: '0 * * * *'");
    expect(workflow).toContain('group: ai-news-refresh');
    expect(workflow).toContain('cancel-in-progress: true');
    expect(workflow).toContain('run: npm run generate:ai-news');
    expect(workflow).toContain('run: npm run validate:ai-news');
    expect(workflow).toContain('git add data/ai-news.generated.json');
    expect(workflow).toContain('git push origin HEAD:dev');
  });

  test('task refresh workflow regenerates and validates generated task data from the canonical task source', async () => {
    const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'tasks-refresh.yml');
    const workflow = fs.readFileSync(workflowPath, 'utf8');

    expect(workflow).toContain("paths:");
    expect(workflow).toContain("- 'data/tasks.json'");
    expect(workflow).toContain('group: tasks-refresh');
    expect(workflow).toContain('run: npm run generate:tasks');
    expect(workflow).toContain('run: npm run validate:tasks');
    expect(workflow).toContain('git add views/data/tasks.generated.json');
    expect(workflow).toContain('git push origin HEAD:dev');
  });

  test('CI workflow validates generated AI news and generated tasks before running browser coverage', async () => {
    const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'test.yml');
    const workflow = fs.readFileSync(workflowPath, 'utf8');

    const validateAiIndex = workflow.indexOf('run: npm run validate:ai-news');
    const validateTasksIndex = workflow.indexOf('run: npm run validate:tasks');
    const installBrowserIndex = workflow.indexOf('run: npx playwright install --with-deps chromium');
    const runTestsIndex = workflow.indexOf('run: npm run test:ci');

    expect(validateAiIndex).toBeGreaterThan(-1);
    expect(validateTasksIndex).toBeGreaterThan(validateAiIndex);
    expect(installBrowserIndex).toBeGreaterThan(validateTasksIndex);
    expect(runTestsIndex).toBeGreaterThan(installBrowserIndex);
  });
});
