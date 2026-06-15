/**
 * Calendar.js - 月曆與列表檢視元件 (Global Version - Upgraded Fields)
 */

function getCompareClass(actual, consensus, compareType) {
  if (!actual || !consensus) return 'val-neutral';
  
  const actNum = parseFloat(actual.replace(/[^0-9.-]/g, ''));
  const consNum = parseFloat(consensus.replace(/[^0-9.-]/g, ''));
  
  if (isNaN(actNum) || isNaN(consNum)) return 'val-neutral';
  
  if (compareType === 'higher-better') {
    return actNum > consNum ? 'val-positive' : (actNum < consNum ? 'val-negative' : 'val-neutral');
  } else if (compareType === 'lower-better') {
    return actNum < consNum ? 'val-positive' : (actNum > consNum ? 'val-negative' : 'val-neutral');
  }
  return 'val-neutral';
}

class CalendarComponent {
  constructor(store, callbacks = {}) {
    this.store = store;
    this.callbacks = callbacks;
    
    this.year = 2026;
    this.month = 6;
    this.selectedDate = null;
    this.viewMode = 'grid';
    this.macroEvents = [];

    this.gridBody = document.getElementById('calendar-grid-body');
    this.listBody = document.getElementById('calendar-list-body');
    this.yearSpan = document.getElementById('calendar-year');
    this.monthSpan = document.getElementById('calendar-month');
    this.monthsBar = document.getElementById('months-navigation-bar');
    this.detailsPanel = document.getElementById('date-details-panel');
    this.detailsTitle = document.getElementById('details-date-title');
    this.detailsBody = document.getElementById('details-list-body');
    
    this.prevBtn = document.getElementById('prev-month-btn');
    this.nextBtn = document.getElementById('next-month-btn');
    this.viewGridBtn = document.getElementById('view-grid-btn');
    this.viewListBtn = document.getElementById('view-list-btn');
    this.closeDetailsBtn = document.getElementById('close-details-btn');
    this.showAllChk = document.getElementById('show-all-events-chk');

    this.initEventListeners();
    this.renderMonthsBar();
    
    if (this.showAllChk) {
      this.showAllChk.addEventListener('change', (e) => {
        this.store.setShowAllEvents(e.target.checked);
      });
    }
    
    this.fetchEventsForMonth().then(() => this.render());
  }

  async fetchEventsForMonth() {
    try {
      const res = await fetch(`/api/economic-calendar?year=${this.year}&month=${this.month}`);
      this.macroEvents = await res.json();
    } catch (err) {
      console.error("Failed to fetch macro events:", err);
      // 容錯降級：若 API 連線失敗，改由本地 Mock 生成
      if (window.generateMacroEvents) {
        this.macroEvents = window.generateMacroEvents(this.year, this.month);
      } else {
        this.macroEvents = [];
      }
    }
  }

  initEventListeners() {
    this.prevBtn.addEventListener('click', () => this.changeMonth(-1));
    this.nextBtn.addEventListener('click', () => this.changeMonth(1));
    this.viewGridBtn.addEventListener('click', () => this.setViewMode('grid'));
    this.viewListBtn.addEventListener('click', () => this.setViewMode('list'));
    this.closeDetailsBtn.addEventListener('click', () => {
      this.detailsPanel.classList.add('hidden');
      this.selectedDate = null;
      this.updateSelectedCellHighlight();
    });
    this.detailsPanel.addEventListener('click', (e) => {
      if (e.target === this.detailsPanel) {
        this.detailsPanel.classList.add('hidden');
        this.selectedDate = null;
        this.updateSelectedCellHighlight();
      }
    });
  }

  changeMonth(delta) {
    this.month += delta;
    if (this.month > 12) {
      this.month = 1;
      this.year += 1;
    } else if (this.month < 1) {
      this.month = 12;
      this.year -= 1;
    }
    
    this.selectedDate = null;
    this.detailsPanel.classList.add('hidden');
    this.fetchEventsForMonth().then(() => {
      this.render();
      if (this.callbacks.onMonthChange) {
        this.callbacks.onMonthChange(this.year, this.month);
      }
    });
  }

  setYearMonth(year, month) {
    this.year = year;
    this.month = month;
    this.selectedDate = null;
    this.detailsPanel.classList.add('hidden');
    this.fetchEventsForMonth().then(() => {
      this.render();
      if (this.callbacks.onMonthChange) {
        this.callbacks.onMonthChange(this.year, this.month);
      }
    });
  }

  setViewMode(mode) {
    this.viewMode = mode;
    if (mode === 'grid') {
      this.viewGridBtn.classList.add('active');
      this.viewListBtn.classList.remove('active');
      this.gridBody.classList.remove('hidden');
      this.listBody.classList.add('hidden');
      document.getElementById('calendar-weekdays').style.display = 'grid';
    } else {
      this.viewGridBtn.classList.remove('active');
      this.viewListBtn.classList.add('active');
      this.gridBody.classList.add('hidden');
      this.listBody.classList.remove('hidden');
      document.getElementById('calendar-weekdays').style.display = 'none';
      this.detailsPanel.classList.add('hidden');
    }
    this.render();
  }

  renderMonthsBar() {
    this.monthsBar.innerHTML = '';
    for (let m = 1; m <= 12; m++) {
      const btn = document.createElement('button');
      btn.className = `month-bar-btn ${m === this.month ? 'active' : ''}`;
      btn.id = `month-bar-btn-${m}`;
      btn.textContent = `${m}月`;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.month-bar-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.setYearMonth(this.year, m);
      });
      this.monthsBar.appendChild(btn);
    }
  }

  getEventsForMonth(state) {
    let events = [...(this.macroEvents || [])];
    
    // 顯示所有總經事件，不做重要性過濾

    Object.entries(state.earnings).forEach(([ticker, dateStr]) => {
      if (!dateStr) return;
      const [eYear, eMonth] = dateStr.split('-').map(Number);
      
      if (eYear === this.year && eMonth === this.month) {
        const stockProfile = state.stocks[ticker] || { name: ticker };
        events.push({
          id: `earnings-${ticker}-${dateStr}`,
          title: `${ticker} 財報日`,
          type: "earnings",
          date: dateStr,
          time: "美股收盤後 / 開盤前",
          description: `${stockProfile.name} (${ticker}) 預計公佈最新季度財務報告。`
        });
      }
    });

    return events.sort((a, b) => {
      const cmpDate = a.date.localeCompare(b.date);
      if (cmpDate !== 0) return cmpDate;
      return window.getEventWeight(b) - window.getEventWeight(a) || a.time.localeCompare(b.time);
    });
  }

  render() {
    const state = this.store.getState();
    const events = this.getEventsForMonth(state);

    if (this.showAllChk) {
      this.showAllChk.checked = state.showAllEvents;
    }

    this.yearSpan.textContent = this.year;
    this.monthSpan.textContent = String(this.month).padStart(2, '0');

    for (let m = 1; m <= 12; m++) {
      const btn = document.getElementById(`month-bar-btn-${m}`);
      if (btn) {
        if (m === this.month) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      }
    }

    if (this.viewMode === 'grid') {
      this.renderGrid(events);
    } else {
      this.renderList(events);
    }
    
    if (this.selectedDate) {
      this.renderDetailsPanel(events);
    }
  }

  renderGrid(events) {
    this.gridBody.innerHTML = '';

    const firstDayInstance = new Date(this.year, this.month - 1, 1);
    const startWeekday = firstDayInstance.getDay();

    const daysInMonth = new Date(this.year, this.month, 0).getDate();
    const daysInPrevMonth = new Date(this.year, this.month - 1, 0).getDate();

    for (let i = startWeekday - 1; i >= 0; i--) {
      const prevDay = daysInPrevMonth - i;
      const prevMonth = this.month === 1 ? 12 : this.month - 1;
      const prevYear = this.month === 1 ? this.year - 1 : this.year;
      const dateStr = formatDateStr(prevYear, prevMonth, prevDay);
      
      const cell = this.createDateCell(prevDay, dateStr, true, false, events);
      this.gridBody.appendChild(cell);
    }

    const today = new Date();
    const todayStr = formatDateStr(today.getFullYear(), today.getMonth() + 1, today.getDate());

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateStr(this.year, this.month, day);
      const isToday = dateStr === todayStr;
      
      const cell = this.createDateCell(day, dateStr, false, isToday, events);
      this.gridBody.appendChild(cell);
    }

    const currentCellsCount = this.gridBody.children.length;
    const nextMonthCellsNeeded = (7 - (currentCellsCount % 7)) % 7;
    const cellsWithNextMonth = currentCellsCount + nextMonthCellsNeeded;
    const minCells = 35; // 限制最少 5 週 (35格)
    const finalCellsNeeded = cellsWithNextMonth < minCells ? minCells - currentCellsCount : nextMonthCellsNeeded;

    for (let day = 1; day <= finalCellsNeeded; day++) {
      const nextMonth = this.month === 12 ? 1 : this.month + 1;
      const nextYear = this.month === 12 ? this.year + 1 : this.year;
      const dateStr = formatDateStr(nextYear, nextMonth, day);
      
      const cell = this.createDateCell(day, dateStr, true, false, events);
      this.gridBody.appendChild(cell);
    }

    // 依據產生的總單元格數，完美等分 row 高度 (5 或是 6 行)
    const totalCells = this.gridBody.children.length;
    const rowCount = totalCells / 7;
    this.gridBody.style.gridTemplateRows = `repeat(${rowCount}, 1fr)`;
  }

  createDateCell(dayNum, dateStr, isOtherMonth, isToday, events) {
    const cell = document.createElement('div');
    cell.className = `date-cell ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`;
    cell.dataset.date = dateStr;

    if (this.selectedDate === dateStr) {
      cell.classList.add('selected');
    }

    const numWrapper = document.createElement('div');
    numWrapper.className = 'date-number-wrapper';
    
    const numSpan = document.createElement('span');
    numSpan.className = 'date-number';
    numSpan.textContent = dayNum;
    numWrapper.appendChild(numSpan);
    
    cell.appendChild(numWrapper);

    const dayEvents = events.filter(e => e.date === dateStr);
    dayEvents.sort((a, b) => window.getEventWeight(b) - window.getEventWeight(a) || a.time.localeCompare(b.time));
    
    const eventsContainer = document.createElement('div');
    eventsContainer.className = 'cell-events';

    const maxVisible = 2;
    dayEvents.slice(0, maxVisible).forEach(event => {
      const badge = document.createElement('div');
      if (event.type === 'earnings') {
        badge.className = `event-badge ${event.type}`;
        const ticker = event.title.split(' ')[0];
        badge.textContent = `[財報] ${ticker}`;
      } else {
        let impactClass = 'low';
        if (event.importance === 3) {
          impactClass = 'high';
        } else if (event.importance === 2) {
          impactClass = 'medium';
        }
        badge.className = `event-badge macro ${impactClass}`;
        badge.textContent = `[總經] ${event.title}`;
      }
      badge.title = `${event.title} (${event.time})`;
      badge.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showEventModal(event);
      });
      eventsContainer.appendChild(badge);
    });

    if (dayEvents.length > maxVisible) {
      const more = document.createElement('div');
      more.className = 'cell-more-badge';
      more.textContent = `+${dayEvents.length - maxVisible} 項`;
      eventsContainer.appendChild(more);
    }

    cell.appendChild(eventsContainer);

    cell.addEventListener('click', () => {
      this.selectedDate = dateStr;
      this.updateSelectedCellHighlight();
      
      if (dayEvents.length > 0) {
        this.renderDetailsPanel(events);
        this.detailsPanel.classList.remove('hidden');
      } else {
        this.detailsPanel.classList.add('hidden');
      }
    });

    return cell;
  }

  updateSelectedCellHighlight() {
    document.querySelectorAll('.date-cell').forEach(cell => {
      if (cell.dataset.date === this.selectedDate) {
        cell.classList.add('selected');
      } else {
        cell.classList.remove('selected');
      }
    });
  }

  renderDetailsPanel(allEvents) {
    this.detailsTitle.textContent = this.selectedDate;
    this.detailsBody.innerHTML = '';
    
    const dayEvents = allEvents.filter(e => e.date === this.selectedDate);
    dayEvents.sort((a, b) => window.getEventWeight(b) - window.getEventWeight(a) || a.time.localeCompare(b.time));
    
    dayEvents.forEach(event => {
      const item = document.createElement('div');
      
      let detailClass = 'low';
      if (event.type === 'earnings') {
        detailClass = 'earnings';
      } else if (event.type === 'macro') {
        if (event.importance === 3) {
          detailClass = 'high';
        } else if (event.importance === 2) {
          detailClass = 'medium';
        }
      }
      
      item.className = `details-item-wrapper ${event.type} ${detailClass}`;
      item.style.display = 'flex';
      item.style.flexDirection = 'column';
      item.style.gap = '0.5rem';
      item.style.padding = '0.75rem 1rem';
      item.style.borderRadius = '8px';
      item.style.marginBottom = '0.5rem';

      const mainRow = document.createElement('div');
      mainRow.className = 'details-item-main';
      mainRow.style.display = 'flex';
      mainRow.style.alignItems = 'center';
      mainRow.style.gap = '0.75rem';
      mainRow.style.width = '100%';

      const typeBadge = document.createElement('span');
      typeBadge.className = `details-item-type ${event.type}`;
      typeBadge.textContent = event.type === 'macro' ? '財經要事' : '美股財報';
      
      const infoDiv = document.createElement('div');
      infoDiv.className = 'details-item-info';
      infoDiv.style.flexGrow = '1';
      
      const name = document.createElement('div');
      name.className = 'details-item-name';
      name.textContent = event.title;
      name.style.fontWeight = '600';
      
      const desc = document.createElement('div');
      desc.className = 'details-item-desc';
      desc.textContent = event.description;
      
      infoDiv.appendChild(name);
      infoDiv.appendChild(desc);
      
      const time = document.createElement('div');
      time.className = 'details-item-time';
      time.textContent = event.time;
      
      mainRow.appendChild(typeBadge);
      mainRow.appendChild(infoDiv);
      mainRow.appendChild(time);
      item.appendChild(mainRow);

      // 新增預測值/實際值/前值區塊
      if (event.type === 'macro' && event.consensus) {
        const grid = document.createElement('div');
        grid.className = 'event-data-grid';
        
        const actualClass = getCompareClass(event.actual, event.consensus, event.compareType);
        const actualText = event.actual || '未公佈';

        grid.innerHTML = `
          <div class="data-field">
            <span class="data-field-label">實際值</span>
            <span class="data-field-value ${actualClass}">${actualText}</span>
          </div>
          <div class="data-field">
            <span class="data-field-label">預測值</span>
            <span class="data-field-value">${event.consensus}</span>
          </div>
          <div class="data-field">
            <span class="data-field-label">前值</span>
            <span class="data-field-value">${event.previous}</span>
          </div>
        `;
        item.appendChild(grid);
      }

      // 新增 Google 搜尋按鈕
      const searchBtnRow = document.createElement('div');
      searchBtnRow.className = 'details-item-actions';
      searchBtnRow.style.display = 'flex';
      searchBtnRow.style.justifyContent = 'flex-end';
      searchBtnRow.style.marginTop = '0.5rem';
      
      const searchBtn = document.createElement('button');
      searchBtn.className = 'modal-search-btn';
      searchBtn.style.padding = '0.4rem 0.8rem';
      searchBtn.style.fontSize = '0.75rem';
      searchBtn.innerHTML = `<i data-lucide="search" style="width: 12px; height: 12px;"></i> 在 Google 搜尋此事件`;
      
      const searchQuery = event.type === 'earnings' ? event.title.split(' ')[0] : event.title;
      searchBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.open('https://www.google.com/search?q=' + encodeURIComponent(searchQuery));
      });
      
      searchBtnRow.appendChild(searchBtn);
      item.appendChild(searchBtnRow);
      
      this.detailsBody.appendChild(item);
    });

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  renderList(events) {
    this.listBody.innerHTML = '';

    if (events.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'timeline-empty';
      empty.textContent = '本月無任何重大財經事件';
      this.listBody.appendChild(empty);
      return;
    }

    events.forEach(event => {
      const row = document.createElement('div');
      row.className = 'list-event-row';
      row.addEventListener('click', () => {
        this.setViewMode('grid');
        this.selectedDate = event.date;
        const [eYear, eMonth] = event.date.split('-').map(Number);
        this.setYearMonth(eYear, eMonth);
        
        setTimeout(() => {
          const cell = document.querySelector(`.date-cell[data-date="${event.date}"]`);
          if (cell) {
            cell.scrollIntoView({ behavior: 'smooth', block: 'center' });
            cell.click();
          }
        }, 100);
      });

      const dateBadge = document.createElement('div');
      dateBadge.className = 'list-date-badge';
      dateBadge.textContent = event.date;

      const typeBadge = document.createElement('span');
      typeBadge.className = `list-event-type ${event.type}`;
      typeBadge.textContent = event.type === 'macro' ? '宏觀' : '財報';

      const title = document.createElement('div');
      title.className = 'list-event-title';
      title.textContent = event.title;

      row.appendChild(dateBadge);
      row.appendChild(typeBadge);
      row.appendChild(title);

      // 在列表檢視中渲染數據小徽章
      if (event.type === 'macro' && event.consensus) {
        const dataBadge = document.createElement('div');
        dataBadge.className = 'list-event-data';
        const actualClass = getCompareClass(event.actual, event.consensus, event.compareType);
        const actualVal = event.actual || '--';
        dataBadge.innerHTML = `預測: ${event.consensus} | <span class="${actualClass}">實際: ${actualVal}</span> | 前值: ${event.previous}`;
        row.appendChild(dataBadge);
      }

      const time = document.createElement('div');
      time.className = 'list-event-time';
      time.textContent = event.time;

      row.appendChild(time);

      this.listBody.appendChild(row);
    });
  }

  showEventModal(event) {
    // 移除已存在的彈出視窗
    const existing = document.getElementById('event-detail-modal');
    if (existing) existing.remove();

    // 建立 Modal 遮罩
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'event-detail-modal';
    modalOverlay.className = 'modal-overlay';

    // 建立 Modal 容器
    const modalContainer = document.createElement('div');
    
    let detailClass = 'low';
    if (event.type === 'earnings') {
      detailClass = 'earnings';
    } else if (event.type === 'macro') {
      if (event.importance === 3) {
        detailClass = 'high';
      } else if (event.importance === 2) {
        detailClass = 'medium';
      }
    }
    modalContainer.className = `modal-container ${event.type} ${detailClass}`;

    // 標頭與關閉按鈕
    const header = document.createElement('div');
    header.className = 'modal-header';
    
    const title = document.createElement('h2');
    title.textContent = event.title;
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close-btn';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => modalOverlay.remove());

    header.appendChild(title);
    header.appendChild(closeBtn);
    modalContainer.appendChild(header);

    // 內容主體
    const body = document.createElement('div');
    body.className = 'modal-body';

    // 時間
    const timeRow = document.createElement('div');
    timeRow.className = 'modal-time-row';
    timeRow.innerHTML = `
      <span class="modal-label">發布時間：</span>
      <span class="modal-value">${event.date} ${event.time}</span>
    `;
    body.appendChild(timeRow);

    // 預測/實際/前值數值區塊
    if (event.type === 'macro' && event.consensus) {
      const dataGrid = document.createElement('div');
      dataGrid.className = 'modal-data-grid';
      
      const actualClass = getCompareClass(event.actual, event.consensus, event.compareType);
      const actualText = event.actual || '未公佈';

      dataGrid.innerHTML = `
        <div class="modal-data-field">
          <span class="modal-field-label">實際值</span>
          <span class="modal-field-value ${actualClass}">${actualText}</span>
        </div>
        <div class="modal-data-field">
          <span class="modal-field-label">預測值</span>
          <span class="modal-field-value">${event.consensus}</span>
        </div>
        <div class="modal-data-field">
          <span class="modal-field-label">前值</span>
          <span class="modal-field-value">${event.previous}</span>
        </div>
      `;
      body.appendChild(dataGrid);
    } else if (event.type === 'earnings') {
      const dataRow = document.createElement('div');
      dataRow.className = 'modal-data-row-single';
      dataRow.innerHTML = `
        <span class="modal-label">事件類型：</span>
        <span class="modal-value" style="color: var(--accent-purple); font-weight: 600;">美股財報公佈日</span>
      `;
      body.appendChild(dataRow);
    }

    // 事件詳細介紹
    const descRow = document.createElement('div');
    descRow.className = 'modal-desc-row';
    descRow.innerHTML = `
      <p class="modal-desc-title">事件詳情</p>
      <p class="modal-desc-content">${event.description || '暫無詳細說明'}</p>
    `;
    body.appendChild(descRow);

    // Google 搜尋按鈕
    const actionsRow = document.createElement('div');
    actionsRow.className = 'modal-actions-row';
    
    const searchBtn = document.createElement('button');
    searchBtn.className = 'modal-search-btn';
    searchBtn.innerHTML = `<i data-lucide="search"></i> 在 Google 搜尋此事件`;
    
    const searchQuery = event.type === 'earnings' ? event.title.split(' ')[0] : event.title;
    searchBtn.addEventListener('click', () => {
      window.open('https://www.google.com/search?q=' + encodeURIComponent(searchQuery));
    });
    
    actionsRow.appendChild(searchBtn);
    body.appendChild(actionsRow);

    modalContainer.appendChild(body);
    modalOverlay.appendChild(modalContainer);
    document.body.appendChild(modalOverlay);

    // 點擊遮罩關閉視窗
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        modalOverlay.remove();
      }
    });

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }
}

function formatDateStr(year, month, day) {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

window.CalendarComponent = CalendarComponent;
