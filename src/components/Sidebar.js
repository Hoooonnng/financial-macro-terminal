/**
 * Sidebar.js - 處理側邊欄區塊 A (時間軸) 與 區塊 B (即時美股行情) (Global Version - Upgraded Fields)
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

function isWithinProximity(levelOrZone, currentPrice) {
  if (!levelOrZone) return false;
  if (typeof levelOrZone === 'number') {
    return Math.abs(levelOrZone - currentPrice) / currentPrice <= 0.03;
  }
  const { top, bottom } = levelOrZone;
  if (currentPrice >= bottom && currentPrice <= top) return true;
  if (currentPrice > top) return (currentPrice - top) / currentPrice <= 0.03;
  return (bottom - currentPrice) / currentPrice <= 0.03;
}

class SidebarComponent {
  constructor(store, calendarComponent) {
    this.store = store;
    this.calendar = calendarComponent;

    this.timelineContainer = document.getElementById('upcoming-events-timeline');
    this.watchlistContainer = document.getElementById('watchlist-cards-container');
    this.watchlistCountBadge = document.getElementById('watchlist-count-badge');

    this.baseDate = new Date('2026-06-15T00:00:00');
    this.timelineEvents = [];

    // 讀取/設定 SMC 與經典圖層顯示狀態 (LocalStorage)
    this.showSMC = localStorage.getItem('layer_smc') !== 'false';
    this.showClassic = localStorage.getItem('layer_classic') !== 'false';

    this.initToggles();
    
    // 初始化獲取時間軸數據
    this.fetchTimelineEvents().then(() => this.render());
  }

  initToggles() {
    const toggleSMC = document.getElementById('toggle-smc');
    const toggleClassic = document.getElementById('toggle-classic');
    const btnSMC = document.getElementById('btn-toggle-smc');
    const btnClassic = document.getElementById('btn-toggle-classic');

    if (toggleSMC && btnSMC) {
      toggleSMC.checked = this.showSMC;
      if (this.showSMC) btnSMC.classList.add('active');
      else btnSMC.classList.remove('active');

      toggleSMC.addEventListener('change', () => {
        this.showSMC = toggleSMC.checked;
        localStorage.setItem('layer_smc', this.showSMC);
        if (this.showSMC) btnSMC.classList.add('active');
        else btnSMC.classList.remove('active');
        this.renderWatchlist(this.store.getState());
      });
    }

    if (toggleClassic && btnClassic) {
      toggleClassic.checked = this.showClassic;
      if (this.showClassic) btnClassic.classList.add('active');
      else btnClassic.classList.remove('active');

      toggleClassic.addEventListener('change', () => {
        this.showClassic = toggleClassic.checked;
        localStorage.setItem('layer_classic', this.showClassic);
        if (this.showClassic) btnClassic.classList.add('active');
        else btnClassic.classList.remove('active');
        this.renderWatchlist(this.store.getState());
      });
    }
  }

  async fetchTimelineEvents() {
    const fromStr = "2026-06-15T00:00:00Z";
    const toStr = "2026-07-15T23:59:59Z";
    try {
      const res = await fetch(`/api/economic-calendar?from=${fromStr}&to=${toStr}`);
      this.timelineEvents = await res.json();
    } catch (err) {
      console.error("Failed to fetch timeline macro events:", err);
      // 容錯降級：若 API 連線失敗，改由本地 Mock 生成
      const currentYear = this.baseDate.getFullYear();
      const currentMonth = this.baseDate.getMonth() + 1;
      const m1 = window.generateMacroEvents(currentYear, currentMonth);
      const m2 = window.generateMacroEvents(currentMonth === 12 ? currentYear + 1 : currentYear, currentMonth === 12 ? 1 : currentMonth + 1);
      this.timelineEvents = [...m1, ...m2];
    }
  }

  render() {
    const state = this.store.getState();
    this.renderTimeline(state);
    this.renderWatchlist(state);
  }

  renderTimeline(state) {
    this.timelineContainer.innerHTML = '';

    let allEvents = [...(this.timelineEvents || [])];

    // 顯示所有總經事件，不做重要性過濾

    Object.entries(state.earnings).forEach(([ticker, dateStr]) => {
      if (!dateStr) return;
      const stockProfile = state.stocks[ticker] || { name: ticker };
      
      allEvents.push({
        id: `timeline-earnings-${ticker}-${dateStr}`,
        title: `${ticker} 財報日`,
        type: "earnings",
        date: dateStr,
        time: "美股收盤後 / 開盤前",
        description: `${stockProfile.name} (${ticker}) 預計公佈最新季度財務報告。`
      });
    });

    const thirtyDaysLater = new Date(this.baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const todayStr = this.baseDate.toISOString().split('T')[0];
    const maxDateStr = thirtyDaysLater.toISOString().split('T')[0];

    const upcomingEvents = allEvents
      .filter(e => e.date >= todayStr && e.date <= maxDateStr)
      .sort((a, b) => a.date.localeCompare(b.date) || window.getEventWeight(b) - window.getEventWeight(a) || a.time.localeCompare(b.time));

    if (upcomingEvents.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'timeline-empty';
      empty.textContent = '未來 30 天內無重大事件';
      this.timelineContainer.appendChild(empty);
      return;
    }

    upcomingEvents.forEach(event => {
      const item = document.createElement('div');
      if (event.type === 'macro') {
        let impactClass = 'low';
        if (event.importance === 3) {
          impactClass = 'high';
        } else if (event.importance === 2) {
          impactClass = 'medium';
        }
        item.className = `timeline-item macro ${impactClass}`;
      } else {
        item.className = `timeline-item ${event.type}`;
      }

      const dot = document.createElement('div');
      dot.className = 'timeline-dot';
      item.appendChild(dot);

      const content = document.createElement('div');
      content.className = 'timeline-content';
      
      content.addEventListener('click', () => {
        const [eYear, eMonth] = event.date.split('-').map(Number);
        
        this.calendar.setViewMode('grid');
        this.calendar.setYearMonth(eYear, eMonth);
        this.calendar.selectedDate = event.date;
        
        setTimeout(() => {
          const cell = document.querySelector(`.date-cell[data-date="${event.date}"]`);
          if (cell) {
            cell.scrollIntoView({ behavior: 'smooth', block: 'center' });
            cell.click();
          }
        }, 150);
      });

      const dateRow = document.createElement('div');
      dateRow.className = 'timeline-date-row';

      const dateText = document.createElement('span');
      const [, mStr, dStr] = event.date.split('-');
      dateText.textContent = `${Number(mStr)}/${Number(dStr)} (${event.time})`;

      const daysLeft = document.createElement('span');
      daysLeft.className = 'timeline-days-left';
      
      const eventDate = new Date(event.date + 'T00:00:00');
      const diffTime = eventDate - this.baseDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        daysLeft.textContent = '今日';
      } else if (diffDays === 1) {
        daysLeft.textContent = '明日';
      } else {
        daysLeft.textContent = `${diffDays} 天後`;
      }

      dateRow.appendChild(dateText);
      dateRow.appendChild(daysLeft);

      const title = document.createElement('div');
      title.className = 'timeline-title';
      title.textContent = event.title;

      const desc = document.createElement('div');
      desc.className = 'timeline-desc';
      desc.textContent = event.description;

      content.appendChild(dateRow);
      content.appendChild(title);
      content.appendChild(desc);

      // 新增預測/實際值數值在 Timeline 顯示
      if (event.type === 'macro' && event.consensus) {
        const valDiv = document.createElement('div');
        valDiv.className = 'timeline-data-preview';
        valDiv.style.fontFamily = 'var(--font-mono)';
        valDiv.style.fontSize = '0.7rem';
        valDiv.style.color = 'var(--text-secondary)';
        valDiv.style.marginTop = '0.35rem';
        valDiv.style.background = 'rgba(0,0,0,0.15)';
        valDiv.style.padding = '0.15rem 0.4rem';
        valDiv.style.borderRadius = '4px';
        valDiv.style.display = 'inline-block';

        const actClass = getCompareClass(event.actual, event.consensus, event.compareType);
        const actText = event.actual || '--';
        valDiv.innerHTML = `預測: ${event.consensus} | 實際: <span class="${actClass}">${actText}</span> | 前值: ${event.previous}`;
        content.appendChild(valDiv);
      }

      item.appendChild(content);
      this.timelineContainer.appendChild(item);
    });
  }

  renderWatchlist(state) {
    this.watchlistContainer.innerHTML = '';
    this.watchlistCountBadge.textContent = `${state.tickers.length} 檔`;

    if (state.tickers.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'timeline-empty';
      empty.textContent = '目前無訂閱的股票，請於上方新增。';
      this.watchlistContainer.appendChild(empty);
      return;
    }

    state.tickers.forEach(ticker => {
      const stock = state.stocks[ticker];
      if (!stock) return;

      const card = document.createElement('div');
      card.className = 'stock-card';
      card.dataset.ticker = ticker;
      
      if (stock.flashType === 'up') {
        card.classList.add('flash-up');
      } else if (stock.flashType === 'down') {
        card.classList.add('flash-down');
      }

      const leftDiv = document.createElement('div');
      leftDiv.className = 'stock-info-left';

      const avatar = document.createElement('div');
      avatar.className = 'stock-avatar';
      avatar.textContent = ticker.slice(0, 3);
      leftDiv.appendChild(avatar);

      const nameWrapper = document.createElement('div');
      nameWrapper.className = 'stock-name-wrapper';
      
      const tickerSpan = document.createElement('span');
      tickerSpan.className = 'stock-ticker';
      tickerSpan.textContent = ticker;
      
      const nameSpan = document.createElement('span');
      nameSpan.className = 'stock-name';
      nameSpan.textContent = stock.name;
      nameSpan.title = stock.name;

      nameWrapper.appendChild(tickerSpan);
      nameWrapper.appendChild(nameSpan);
      leftDiv.appendChild(nameWrapper);

      const rightDiv = document.createElement('div');
      rightDiv.className = 'stock-price-right';

      const numbersDiv = document.createElement('div');
      numbersDiv.className = 'stock-numbers';

      const priceSpan = document.createElement('span');
      priceSpan.className = 'stock-price';
      priceSpan.textContent = `$${stock.price.toFixed(2)}`;

      const changeSpan = document.createElement('span');
      const isUp = stock.change > 0;
      const isDown = stock.change < 0;
      
      changeSpan.className = `stock-change ${isUp ? 'up' : isDown ? 'down' : 'neutral'}`;
      
      const sign = isUp ? '+' : '';
      const arrow = isUp ? '▲' : isDown ? '▼' : '';
      changeSpan.textContent = `${arrow} ${sign}${stock.change.toFixed(2)} (${sign}${stock.pct.toFixed(2)}%)`;

      numbersDiv.appendChild(priceSpan);
      numbersDiv.appendChild(changeSpan);
      rightDiv.appendChild(numbersDiv);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'stock-delete-btn';
      deleteBtn.innerHTML = '<i data-lucide="trash-2"></i>';
      deleteBtn.title = `移除 ${ticker}`;
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`確定要從看板中移除 ${ticker} 嗎？`)) {
          this.store.removeStock(ticker);
        }
      });
      rightDiv.appendChild(deleteBtn);

      const cardMain = document.createElement('div');
      cardMain.className = 'stock-card-main';
      cardMain.appendChild(leftDiv);
      cardMain.appendChild(rightDiv);
      card.appendChild(cardMain);

      // 戰術圖層與降噪過濾
      if (stock.technicalLevels) {
        const techDiv = document.createElement('div');
        techDiv.className = 'stock-tech-levels';
        let hasVisibleLevels = false;

        // SMC 系統圖層
        if (this.showSMC) {
          const smcGroup = document.createElement('div');
          smcGroup.className = 'tech-group smc-group';

          // 公允價值跳空 (FVG)
          if (stock.technicalLevels.fvgs) {
            stock.technicalLevels.fvgs.forEach(fvg => {
              if (isWithinProximity(fvg, stock.price)) {
                hasVisibleLevels = true;
                const fvgEl = document.createElement('span');
                fvgEl.className = `tech-level fvg ${fvg.type} ${fvg.mitigated ? 'mitigated' : ''}`;
                fvgEl.innerHTML = `🛡️ FVG (${fvg.type === 'bullish' ? '多' : '空'})${fvg.mitigated ? ' [已緩解]' : ''}: $${fvg.bottom.toFixed(2)}-$${fvg.top.toFixed(2)}`;
                smcGroup.appendChild(fvgEl);
              }
            });
          }

          // 訂單塊 (OB)
          if (stock.technicalLevels.obs) {
            stock.technicalLevels.obs.forEach(ob => {
              if (isWithinProximity(ob, stock.price)) {
                hasVisibleLevels = true;
                const obEl = document.createElement('span');
                obEl.className = `tech-level ob ${ob.type}`;
                obEl.innerHTML = `📦 OB (${ob.type === 'bullish' ? '支' : '壓'}): $${ob.bottom.toFixed(2)}-$${ob.top.toFixed(2)}`;
                smcGroup.appendChild(obEl);
              }
            });
          }

          if (smcGroup.children.length > 0) {
            techDiv.appendChild(smcGroup);
          }
        }

        // 經典系統圖層
        if (this.showClassic) {
          const classicGroup = document.createElement('div');
          classicGroup.className = 'tech-group classic-group';

          // PDH (昨日最高點)
          if (isWithinProximity(stock.technicalLevels.pdh, stock.price)) {
            hasVisibleLevels = true;
            const pdhEl = document.createElement('span');
            pdhEl.className = 'tech-level pdh';
            pdhEl.textContent = `📈 PDH: $${stock.technicalLevels.pdh.toFixed(2)}`;
            classicGroup.appendChild(pdhEl);
          }

          // Open (當日開盤價)
          if (isWithinProximity(stock.technicalLevels.open, stock.price)) {
            hasVisibleLevels = true;
            const openEl = document.createElement('span');
            openEl.className = 'tech-level open';
            openEl.textContent = `🔔 開盤: $${stock.technicalLevels.open.toFixed(2)}`;
            classicGroup.appendChild(openEl);
          }

          // PDL (昨日最低點)
          if (isWithinProximity(stock.technicalLevels.pdl, stock.price)) {
            hasVisibleLevels = true;
            const pdlEl = document.createElement('span');
            pdlEl.className = 'tech-level pdl';
            pdlEl.textContent = `📉 PDL: $${stock.technicalLevels.pdl.toFixed(2)}`;
            classicGroup.appendChild(pdlEl);
          }

          if (classicGroup.children.length > 0) {
            techDiv.appendChild(classicGroup);
          }
        }

        if (hasVisibleLevels) {
          card.appendChild(techDiv);
        }
      }

      card.addEventListener('click', () => {
        const earningsDate = state.earnings[ticker];
        if (earningsDate) {
          const [eYear, eMonth] = earningsDate.split('-').map(Number);
          this.calendar.setViewMode('grid');
          this.calendar.setYearMonth(eYear, eMonth);
          this.calendar.selectedDate = earningsDate;

          setTimeout(() => {
            const cell = document.querySelector(`.date-cell[data-date="${earningsDate}"]`);
            if (cell) {
              cell.scrollIntoView({ behavior: 'smooth', block: 'center' });
              cell.click();
            }
          }, 150);
        } else {
          if (state.isSimulating) {
            alert("API 流量達到上限，請稍後刷新");
          } else {
            alert(`${ticker} 暫無公開的財報發布日期`);
          }
        }
      });

      this.watchlistContainer.appendChild(card);
    });

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }
}

window.SidebarComponent = SidebarComponent;
