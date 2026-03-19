// === Trade Journal Module ===
// Tradovate CSV import, PNL tracking (daily/weekly/monthly), journaling with screenshots
// Data persisted in localStorage (trades/journals) and IndexedDB (screenshots)

const TradeJournal = (() => {
  const STORAGE_KEY = 'tradeJournal_trades';
  const JOURNAL_KEY = 'tradeJournal_entries';
  const DB_NAME = 'TradeJournalDB';
  const DB_VERSION = 1;
  const SCREENSHOT_STORE = 'screenshots';
  const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

  let trades = [];
  let journalEntries = {};
  let currentView = 'daily';
  let currentDate = new Date();
  let db = null;

  // --- IndexedDB for screenshots ---
  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(SCREENSHOT_STORE)) {
          db.createObjectStore(SCREENSHOT_STORE, { keyPath: 'id' });
        }
      };
      request.onsuccess = (e) => { db = e.target.result; resolve(db); };
      request.onerror = (e) => reject(e.target.error);
    });
  }

  function saveScreenshot(dateKey, dataUrl) {
    return new Promise((resolve, reject) => {
      if (!db) { reject(new Error('DB not open')); return; }
      const tx = db.transaction(SCREENSHOT_STORE, 'readwrite');
      const store = tx.objectStore(SCREENSHOT_STORE);
      // Get existing entry to append
      const getReq = store.get(dateKey);
      getReq.onsuccess = () => {
        const existing = getReq.result;
        const images = existing ? existing.images : [];
        images.push(dataUrl);
        store.put({ id: dateKey, images });
      };
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  function getScreenshots(dateKey) {
    return new Promise((resolve, reject) => {
      if (!db) { resolve([]); return; }
      const tx = db.transaction(SCREENSHOT_STORE, 'readonly');
      const store = tx.objectStore(SCREENSHOT_STORE);
      const request = store.get(dateKey);
      request.onsuccess = () => resolve(request.result?.images || []);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  function deleteScreenshot(dateKey, index) {
    return new Promise((resolve, reject) => {
      if (!db) { reject(new Error('DB not open')); return; }
      const tx = db.transaction(SCREENSHOT_STORE, 'readwrite');
      const store = tx.objectStore(SCREENSHOT_STORE);
      const request = store.get(dateKey);
      request.onsuccess = () => {
        const existing = request.result;
        if (existing && existing.images) {
          existing.images.splice(index, 1);
          store.put(existing);
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  // --- LocalStorage ---
  function saveTrades() {
    const cutoff = Date.now() - ONE_YEAR_MS;
    const filtered = trades.filter(t => new Date(t.date).getTime() > cutoff);
    trades = filtered;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
    } catch (e) {
      console.warn('Trade storage full, pruning oldest trades');
      trades = trades.slice(Math.floor(trades.length / 4));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
    }
  }

  function loadTrades() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      trades = raw ? JSON.parse(raw) : [];
    } catch { trades = []; }
  }

  function saveJournalEntries() {
    try {
      localStorage.setItem(JOURNAL_KEY, JSON.stringify(journalEntries));
    } catch (e) {
      console.warn('Journal storage issue', e);
    }
  }

  function loadJournalEntries() {
    try {
      const raw = localStorage.getItem(JOURNAL_KEY);
      journalEntries = raw ? JSON.parse(raw) : {};
    } catch { journalEntries = {}; }
  }

  // --- Tradovate CSV Parsing ---
  function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];

    const headerLine = lines[0];
    const headers = parseCSVRow(headerLine).map(h => h.trim().toLowerCase());

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVRow(lines[i]);
      if (values.length < headers.length / 2) continue;
      const row = {};
      headers.forEach((h, idx) => { row[h] = (values[idx] || '').trim(); });
      rows.push(row);
    }
    return rows;
  }

  function parseCSVRow(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          result.push(current);
          current = '';
        } else {
          current += ch;
        }
      }
    }
    result.push(current);
    return result;
  }

  function normalizeTradovateData(rows) {
    const newTrades = [];

    for (const row of rows) {
      const trade = {};

      // Try various Tradovate CSV column name formats
      trade.date = row['date/time'] || row['datetime'] || row['date'] || row['filltime'] || row['timestamp'] || '';
      trade.contract = row['contract'] || row['product'] || row['symbol'] || row['instrument'] || '';
      trade.side = row['b/s'] || row['side'] || row['action'] || row['buysell'] || row['buy/sell'] || '';
      trade.qty = parseFloat(row['qty'] || row['quantity'] || row['filledqty'] || row['filled qty'] || '0');
      trade.price = parseFloat(row['price'] || row['avgfillprice'] || row['avg fill price'] || row['avgprice'] || row['fill price'] || '0');
      trade.pnl = parseFloat(row['p&l'] || row['pnl'] || row['p/l'] || row['profit/loss'] || row['realized p/l'] || row['realized p&l'] || '0');
      trade.commission = parseFloat(row['commission'] || row['fees'] || row['fee'] || '0');
      trade.account = row['account'] || row['acct'] || '';
      trade.orderId = row['orderid'] || row['order id'] || row['id'] || '';

      // Validate minimum fields
      if (!trade.date && !trade.contract) continue;

      // Normalize date
      if (trade.date) {
        try {
          const d = new Date(trade.date);
          if (!isNaN(d.getTime())) {
            trade.date = d.toISOString();
          }
        } catch { /* keep original */ }
      }

      // Net PNL (subtract commission if pnl doesn't already include it)
      trade.netPnl = isNaN(trade.pnl) ? 0 : trade.pnl;
      if (!isNaN(trade.commission) && trade.commission > 0) {
        trade.netPnl = trade.pnl - Math.abs(trade.commission);
      }

      trade.id = `${trade.date}_${trade.contract}_${trade.orderId}_${Math.random().toString(36).slice(2, 8)}`;
      newTrades.push(trade);
    }

    return newTrades;
  }

  function importCSV(text) {
    const rows = parseCSV(text);
    const newTrades = normalizeTradovateData(rows);
    if (!newTrades.length) return 0;

    trades = trades.concat(newTrades);
    trades.sort((a, b) => new Date(a.date) - new Date(b.date));
    saveTrades();
    return newTrades.length;
  }

  // --- PNL Calculations ---
  function dateKey(d) {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  }

  function weekKey(d) {
    const dt = new Date(d);
    const startOfWeek = new Date(dt);
    startOfWeek.setDate(dt.getDate() - dt.getDay());
    return dateKey(startOfWeek);
  }

  function monthKey(d) {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
  }

  function groupTradesBy(keyFn) {
    const groups = {};
    for (const t of trades) {
      if (!t.date) continue;
      const key = keyFn(t.date);
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    }
    return groups;
  }

  function calcStats(tradeGroup) {
    let totalPnl = 0;
    let wins = 0;
    let losses = 0;
    let grossWin = 0;
    let grossLoss = 0;
    let totalCommission = 0;
    let totalQty = 0;

    for (const t of tradeGroup) {
      const pnl = t.netPnl || 0;
      totalPnl += pnl;
      totalCommission += Math.abs(t.commission || 0);
      totalQty += t.qty || 0;
      if (pnl > 0) { wins++; grossWin += pnl; }
      else if (pnl < 0) { losses++; grossLoss += Math.abs(pnl); }
    }

    const totalTrades = tradeGroup.length;
    const winRate = totalTrades > 0 ? (wins / totalTrades * 100) : 0;
    const profitFactor = grossLoss > 0 ? (grossWin / grossLoss) : grossWin > 0 ? Infinity : 0;
    const avgWin = wins > 0 ? grossWin / wins : 0;
    const avgLoss = losses > 0 ? grossLoss / losses : 0;

    return {
      totalPnl, wins, losses, totalTrades, winRate, profitFactor,
      grossWin, grossLoss, avgWin, avgLoss, totalCommission, totalQty
    };
  }

  function getOverallStats() {
    return calcStats(trades);
  }

  function getDailyPnl() {
    const groups = groupTradesBy(dateKey);
    const result = {};
    for (const [key, group] of Object.entries(groups)) {
      result[key] = calcStats(group);
    }
    return result;
  }

  function getWeeklyPnl() {
    const groups = groupTradesBy(weekKey);
    const result = {};
    for (const [key, group] of Object.entries(groups)) {
      result[key] = calcStats(group);
    }
    return result;
  }

  function getMonthlyPnl() {
    const groups = groupTradesBy(monthKey);
    const result = {};
    for (const [key, group] of Object.entries(groups)) {
      result[key] = calcStats(group);
    }
    return result;
  }

  // --- Formatting ---
  function fmtCurrency(val) {
    const num = parseFloat(val) || 0;
    const prefix = num >= 0 ? '+' : '';
    return `${prefix}$${Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function fmtPct(val) {
    return `${parseFloat(val || 0).toFixed(1)}%`;
  }

  function pnlClass(val) {
    if (val > 0) return 'tj-pnl-pos';
    if (val < 0) return 'tj-pnl-neg';
    return 'tj-pnl-zero';
  }

  // --- Rendering ---
  function renderSummaryBand() {
    const stats = getOverallStats();
    return `
      <section class="card span-12 snapshot-band">
        <div class="card-head">
          <h2>Trade Journal</h2>
          <span class="card-note">Tradovate PNL Tracker</span>
        </div>
        <div class="snapshot-grid">
          <article class="snapshot-tile">
            <div class="snapshot-label">Total PNL</div>
            <div class="snapshot-value ${stats.totalPnl >= 0 ? 'good' : 'issue'}">${fmtCurrency(stats.totalPnl)}</div>
            <p class="snapshot-note">${stats.totalTrades} total trades</p>
          </article>
          <article class="snapshot-tile">
            <div class="snapshot-label">Win Rate</div>
            <div class="snapshot-value ${stats.winRate >= 50 ? 'good' : 'watch'}">${fmtPct(stats.winRate)}</div>
            <p class="snapshot-note">${stats.wins}W - ${stats.losses}L</p>
          </article>
          <article class="snapshot-tile">
            <div class="snapshot-label">Profit Factor</div>
            <div class="snapshot-value ${stats.profitFactor >= 1 ? 'good' : 'issue'}">${stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}</div>
            <p class="snapshot-note">Avg W: ${fmtCurrency(stats.avgWin)} / Avg L: -${fmtCurrency(stats.avgLoss).replace('+', '')}</p>
          </article>
          <article class="snapshot-tile">
            <div class="snapshot-label">Commissions</div>
            <div class="snapshot-value watch">$${stats.totalCommission.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            <p class="snapshot-note">${stats.totalQty} contracts traded</p>
          </article>
        </div>
      </section>
    `;
  }

  function renderViewToggle() {
    return `
      <section class="card span-12 tj-controls">
        <div class="tj-controls-row">
          <div class="tj-view-toggle">
            <button class="tj-toggle-btn ${currentView === 'daily' ? 'active' : ''}" data-view="daily">Daily</button>
            <button class="tj-toggle-btn ${currentView === 'weekly' ? 'active' : ''}" data-view="weekly">Weekly</button>
            <button class="tj-toggle-btn ${currentView === 'monthly' ? 'active' : ''}" data-view="monthly">Monthly</button>
          </div>
          <div class="tj-actions">
            <label class="tj-upload-btn" title="Import Tradovate CSV">
              <input type="file" accept=".csv" id="tj-csv-input" style="display:none" />
              Import CSV
            </label>
            <button class="tj-clear-btn" id="tj-clear-data">Clear Data</button>
          </div>
        </div>
      </section>
    `;
  }

  function renderDailyView() {
    const dailyPnl = getDailyPnl();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    let calendarHTML = `
      <section class="card span-8">
        <div class="card-head">
          <h2>Daily PNL Calendar</h2>
          <div class="tj-month-nav">
            <button class="tj-nav-btn" id="tj-prev-month">&lt;</button>
            <span class="tj-month-label">${escapeHtml(monthName)}</span>
            <button class="tj-nav-btn" id="tj-next-month">&gt;</button>
          </div>
        </div>
        <div class="tj-calendar">
          <div class="tj-cal-header">
            <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
          </div>
          <div class="tj-cal-grid">
    `;

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      calendarHTML += '<div class="tj-cal-cell tj-cal-empty"></div>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dk = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const stats = dailyPnl[dk];
      const hasJournal = journalEntries[dk];
      const isToday = dk === dateKey(new Date());

      calendarHTML += `
        <div class="tj-cal-cell ${stats ? (stats.totalPnl >= 0 ? 'tj-cal-win' : 'tj-cal-loss') : ''} ${isToday ? 'tj-cal-today' : ''} ${hasJournal ? 'tj-cal-has-journal' : ''}"
             data-date="${dk}">
          <span class="tj-cal-day">${day}</span>
          ${stats ? `<span class="tj-cal-pnl ${pnlClass(stats.totalPnl)}">${fmtCurrency(stats.totalPnl)}</span>
                     <span class="tj-cal-trades">${stats.totalTrades}t</span>` : ''}
          ${hasJournal ? '<span class="tj-cal-journal-dot"></span>' : ''}
        </div>
      `;
    }

    calendarHTML += '</div></div></section>';

    // Daily breakdown list
    const sortedDays = Object.entries(dailyPnl)
      .filter(([key]) => key.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`))
      .sort(([a], [b]) => b.localeCompare(a));

    let listHTML = `
      <section class="card span-4">
        <div class="card-head">
          <h2>Day Breakdown</h2>
          <span class="card-note">${sortedDays.length} trading days</span>
        </div>
        <div class="tj-day-list">
    `;

    if (!sortedDays.length) {
      listHTML += '<div class="empty-state">No trades this month. Import a Tradovate CSV to get started.</div>';
    }

    for (const [day, stats] of sortedDays) {
      const d = new Date(day + 'T12:00:00');
      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      listHTML += `
        <div class="tj-day-row" data-date="${day}">
          <div>
            <h3>${escapeHtml(label)}</h3>
            <span class="tj-day-meta">${stats.totalTrades} trades | ${stats.wins}W ${stats.losses}L</span>
          </div>
          <span class="tj-day-pnl ${pnlClass(stats.totalPnl)}">${fmtCurrency(stats.totalPnl)}</span>
        </div>
      `;
    }

    listHTML += '</div></section>';

    return calendarHTML + listHTML;
  }

  function renderWeeklyView() {
    const weeklyPnl = getWeeklyPnl();
    const sorted = Object.entries(weeklyPnl).sort(([a], [b]) => b.localeCompare(a));

    let cumulativePnl = 0;
    const withCumulative = sorted.reverse().map(([key, stats]) => {
      cumulativePnl += stats.totalPnl;
      return [key, stats, cumulativePnl];
    }).reverse();

    let html = `
      <section class="card span-12">
        <div class="card-head">
          <h2>Weekly PNL</h2>
          <span class="card-note">${sorted.length} weeks with trades</span>
        </div>
        <div class="tj-weekly-table">
          <div class="tj-weekly-header">
            <span>Week Starting</span>
            <span>Trades</span>
            <span>Win Rate</span>
            <span>Gross Win</span>
            <span>Gross Loss</span>
            <span>Net PNL</span>
            <span>Cumulative</span>
          </div>
    `;

    for (const [key, stats, cumPnl] of withCumulative) {
      const d = new Date(key + 'T12:00:00');
      const endDate = new Date(d);
      endDate.setDate(d.getDate() + 6);
      const label = `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

      html += `
        <div class="tj-weekly-row">
          <span>${escapeHtml(label)}</span>
          <span>${stats.totalTrades}</span>
          <span>${fmtPct(stats.winRate)}</span>
          <span class="tj-pnl-pos">${fmtCurrency(stats.grossWin)}</span>
          <span class="tj-pnl-neg">-$${stats.grossLoss.toFixed(2)}</span>
          <span class="${pnlClass(stats.totalPnl)}">${fmtCurrency(stats.totalPnl)}</span>
          <span class="${pnlClass(cumPnl)}">${fmtCurrency(cumPnl)}</span>
        </div>
      `;
    }

    html += '</div></section>';
    return html;
  }

  function renderMonthlyView() {
    const monthlyPnl = getMonthlyPnl();
    const sorted = Object.entries(monthlyPnl).sort(([a], [b]) => b.localeCompare(a));

    let cumulativePnl = 0;
    const withCumulative = sorted.reverse().map(([key, stats]) => {
      cumulativePnl += stats.totalPnl;
      return [key, stats, cumulativePnl];
    }).reverse();

    let html = `
      <section class="card span-12">
        <div class="card-head">
          <h2>Monthly PNL</h2>
          <span class="card-note">${sorted.length} months with trades</span>
        </div>
        <div class="tj-monthly-grid">
    `;

    for (const [key, stats, cumPnl] of withCumulative) {
      const [y, m] = key.split('-');
      const monthName = new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      html += `
        <div class="tj-month-card ${stats.totalPnl >= 0 ? 'tj-month-win' : 'tj-month-loss'}">
          <h3>${escapeHtml(monthName)}</h3>
          <div class="tj-month-pnl ${pnlClass(stats.totalPnl)}">${fmtCurrency(stats.totalPnl)}</div>
          <div class="tj-month-stats">
            <span>${stats.totalTrades} trades</span>
            <span>${fmtPct(stats.winRate)} WR</span>
            <span>PF: ${stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}</span>
          </div>
          <div class="tj-month-detail">
            <span class="tj-pnl-pos">W: ${fmtCurrency(stats.grossWin)}</span>
            <span class="tj-pnl-neg">L: -$${stats.grossLoss.toFixed(2)}</span>
          </div>
          <div class="tj-month-cumulative">
            <span class="tj-month-cum-label">Cumulative:</span>
            <span class="${pnlClass(cumPnl)}">${fmtCurrency(cumPnl)}</span>
          </div>
        </div>
      `;
    }

    if (!sorted.length) {
      html += '<div class="empty-state" style="grid-column:span 3">No monthly data. Import a Tradovate CSV to get started.</div>';
    }

    html += '</div></section>';
    return html;
  }

  function renderJournalPanel(dateStr) {
    const entry = journalEntries[dateStr] || {};
    const d = new Date(dateStr + 'T12:00:00');
    const label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    return `
      <div class="tj-journal-overlay" id="tj-journal-overlay">
        <div class="tj-journal-modal">
          <div class="tj-journal-header">
            <h2>Journal: ${escapeHtml(label)}</h2>
            <button class="tj-journal-close" id="tj-journal-close">&times;</button>
          </div>
          <div class="tj-journal-body">
            <div class="tj-journal-section">
              <label>Pre-Market Notes</label>
              <textarea id="tj-premarket" placeholder="Market outlook, levels to watch, plan for the day...">${escapeHtml(entry.premarket || '')}</textarea>
            </div>
            <div class="tj-journal-section">
              <label>Trade Notes</label>
              <textarea id="tj-notes" placeholder="What happened during the session, key decisions, emotions...">${escapeHtml(entry.notes || '')}</textarea>
            </div>
            <div class="tj-journal-section">
              <label>Post-Session Review</label>
              <textarea id="tj-review" placeholder="What went well, what to improve, lessons learned...">${escapeHtml(entry.review || '')}</textarea>
            </div>
            <div class="tj-journal-section">
              <label>Screenshots</label>
              <label class="tj-screenshot-btn">
                <input type="file" accept="image/*" id="tj-screenshot-input" multiple style="display:none" />
                Upload Screenshots
              </label>
              <div id="tj-screenshots-grid" class="tj-screenshots-grid"></div>
            </div>
          </div>
          <div class="tj-journal-footer">
            <button class="tj-save-btn" id="tj-journal-save" data-date="${dateStr}">Save Journal</button>
          </div>
        </div>
      </div>
    `;
  }

  async function renderScreenshots(dateStr) {
    const grid = document.getElementById('tj-screenshots-grid');
    if (!grid) return;
    const images = await getScreenshots(dateStr);
    grid.innerHTML = images.map((img, i) => `
      <div class="tj-screenshot-item">
        <img src="${img}" alt="Screenshot ${i + 1}" class="tj-screenshot-img" data-index="${i}" />
        <button class="tj-screenshot-delete" data-date="${dateStr}" data-index="${i}">&times;</button>
      </div>
    `).join('') || '<span class="tj-no-screenshots">No screenshots uploaded</span>';

    // Screenshot click to expand
    grid.querySelectorAll('.tj-screenshot-img').forEach(img => {
      img.addEventListener('click', () => {
        const expanded = document.createElement('div');
        expanded.className = 'tj-screenshot-expanded';
        expanded.innerHTML = `<img src="${img.src}" /><button class="tj-screenshot-expanded-close">&times;</button>`;
        document.body.appendChild(expanded);
        expanded.addEventListener('click', (e) => {
          if (e.target === expanded || e.target.classList.contains('tj-screenshot-expanded-close')) {
            expanded.remove();
          }
        });
      });
    });

    // Delete buttons
    grid.querySelectorAll('.tj-screenshot-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const dk = btn.dataset.date;
        const idx = parseInt(btn.dataset.index);
        await deleteScreenshot(dk, idx);
        await renderScreenshots(dk);
      });
    });
  }

  function render() {
    const el = document.getElementById('tj-content');
    if (!el) return;

    let html = renderSummaryBand();
    html += renderViewToggle();

    if (currentView === 'daily') {
      html += renderDailyView();
    } else if (currentView === 'weekly') {
      html += renderWeeklyView();
    } else if (currentView === 'monthly') {
      html += renderMonthlyView();
    }

    el.innerHTML = html;
    bindEvents();
  }

  function bindEvents() {
    // View toggle
    document.querySelectorAll('.tj-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentView = btn.dataset.view;
        render();
      });
    });

    // CSV import
    const csvInput = document.getElementById('tj-csv-input');
    if (csvInput) {
      csvInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const count = importCSV(ev.target.result);
          if (count > 0) {
            render();
            showToast(`Imported ${count} trades from ${file.name}`);
          } else {
            showToast('No valid trades found in CSV. Check the format.', true);
          }
        };
        reader.readAsText(file);
      });
    }

    // Clear data
    const clearBtn = document.getElementById('tj-clear-data');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('Clear all trade data and journal entries? This cannot be undone.')) {
          trades = [];
          journalEntries = {};
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(JOURNAL_KEY);
          if (db) {
            const tx = db.transaction(SCREENSHOT_STORE, 'readwrite');
            tx.objectStore(SCREENSHOT_STORE).clear();
          }
          render();
          showToast('All data cleared');
        }
      });
    }

    // Month navigation
    const prevBtn = document.getElementById('tj-prev-month');
    const nextBtn = document.getElementById('tj-next-month');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        render();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        render();
      });
    }

    // Calendar cell click (open journal)
    document.querySelectorAll('.tj-cal-cell[data-date]').forEach(cell => {
      cell.addEventListener('click', () => {
        openJournal(cell.dataset.date);
      });
    });

    // Day list row click
    document.querySelectorAll('.tj-day-row[data-date]').forEach(row => {
      row.addEventListener('click', () => {
        openJournal(row.dataset.date);
      });
    });
  }

  async function openJournal(dateStr) {
    // Insert journal modal
    const existing = document.getElementById('tj-journal-overlay');
    if (existing) existing.remove();

    document.body.insertAdjacentHTML('beforeend', renderJournalPanel(dateStr));
    await renderScreenshots(dateStr);

    // Close
    document.getElementById('tj-journal-close').addEventListener('click', () => {
      document.getElementById('tj-journal-overlay').remove();
    });

    document.getElementById('tj-journal-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'tj-journal-overlay') {
        document.getElementById('tj-journal-overlay').remove();
      }
    });

    // Save
    document.getElementById('tj-journal-save').addEventListener('click', () => {
      const dk = dateStr;
      journalEntries[dk] = {
        premarket: document.getElementById('tj-premarket').value,
        notes: document.getElementById('tj-notes').value,
        review: document.getElementById('tj-review').value,
        updatedAt: new Date().toISOString()
      };
      saveJournalEntries();
      showToast('Journal saved');
      render();
    });

    // Screenshot upload
    const ssInput = document.getElementById('tj-screenshot-input');
    if (ssInput) {
      ssInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        for (const file of files) {
          if (file.size > 5 * 1024 * 1024) {
            showToast(`${file.name} is too large (max 5MB)`, true);
            continue;
          }
          const dataUrl = await readFileAsDataURL(file);
          // Compress image before storing
          const compressed = await compressImage(dataUrl, 1200, 0.7);
          await saveScreenshot(dateStr, compressed);
        }
        await renderScreenshots(dateStr);
        showToast(`${files.length} screenshot(s) uploaded`);
      });
    }
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function compressImage(dataUrl, maxWidth, quality) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = (h * maxWidth) / w;
          w = maxWidth;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  function showToast(message, isError = false) {
    const existing = document.querySelector('.tj-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = `tj-toast ${isError ? 'tj-toast-error' : ''}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('tj-toast-visible'), 10);
    setTimeout(() => {
      toast.classList.remove('tj-toast-visible');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // --- Init ---
  async function init() {
    await openDB();
    loadTrades();
    loadJournalEntries();
    render();
  }

  return { init, render };
})();
