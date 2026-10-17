/**
 * app.js - 應用程式核心協調器 (Global Entry Orchestrator - Upgraded Tabs)
 */

class App {
  constructor() {
    this.store = window.finnhubStore;
    
    // 初始化元件
    this.calendar = new window.CalendarComponent(this.store, {
      onMonthChange: (year, month) => {
        this.sidebar.render();
      }
    });
    
    this.sidebar = new window.SidebarComponent(this.store, this.calendar);
    this.addStock = new window.AddStockComponent(this.store);

    this.localTimeEl = document.getElementById('local-time');
    this.estTimeEl = document.getElementById('est-time');
    this.apiStatusEl = document.getElementById('api-status');
    this.quotaEl = document.getElementById('finnhub-quota');
    this.quotaFillEl = document.getElementById('quota-fill');
    this.quotaTextEl = document.getElementById('quota-text');

    this.init();
  }

  init() {
    this.store.subscribe((state) => {
      this.updateApiStatusUI(state);
      this.calendar.render();
      this.sidebar.render();
    });

    this.startClock();
    this.startQuotaPolling(); // 【2026-10-17】右上角額度水位計

    this.store.init();
    
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // 【2026-10-17】Finnhub 額度水位輪詢：每 30 秒讀 /api/health 更新右上角水位計
  // 綠 <30、黃 30–49、紅 ≥50；file:// 或離線時靜默跳過
  startQuotaPolling() {
    const update = async () => {
      try {
        const res = await fetch('/api/health');
        if (!res.ok) return;
        const h = await res.json();
        const used = h.finnhubCallsLastMin ?? 0;
        const limit = h.finnhubLimitPerMin ?? 60;
        const pct = Math.min(100, Math.round(used / limit * 100));
        this.quotaFillEl.style.width = pct + '%';
        this.quotaTextEl.textContent = `${used}/${limit}`;
        this.quotaEl.classList.remove('warn', 'danger');
        if (used >= 50) this.quotaEl.classList.add('danger');
        else if (used >= 30) this.quotaEl.classList.add('warn');
      } catch (err) { /* 靜默跳過 */ }
    };
    update();
    setInterval(update, 30000);
  }

  updateApiStatusUI(state) {
    const statusText = this.apiStatusEl.querySelector('.status-text');
    
    this.apiStatusEl.classList.remove('connected', 'limit-reached', 'offline');

    if (state.isSimulating) {
      this.apiStatusEl.classList.add('limit-reached');
      statusText.textContent = "Finnhub API: 限額降級 (延遲顯示中)";
      this.apiStatusEl.title = "已達 Finnhub 免費版每分鐘 60 次呼叫上限，暫用最後已知報價並標示「延遲」，60 秒後自動恢復。";
    } else if (state.apiStatus === 'connected') {
      this.apiStatusEl.classList.add('connected');
      statusText.textContent = "Finnhub API: 連線成功 (即時數據)";
      this.apiStatusEl.title = "成功串接您的 Finnhub API 金鑰，股價與公司資訊為即時市場數據。";
    } else {
      this.apiStatusEl.classList.add('offline');
      statusText.textContent = "Finnhub API: 離線狀態";
      this.apiStatusEl.title = "網路連線中斷，已切換至離線模擬狀態。";
    }
  }

  startClock() {
    const updateTime = () => {
      const now = new Date();
      
      const localStr = now.toLocaleTimeString('zh-TW', { hour12: false });
      this.localTimeEl.textContent = localStr;

      try {
        const estStr = now.toLocaleTimeString('en-US', {
          timeZone: 'America/New_York',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        this.estTimeEl.textContent = estStr;
      } catch (err) {
        this.estTimeEl.textContent = localStr;
      }
    };

    updateTime();
    setInterval(updateTime, 1000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
