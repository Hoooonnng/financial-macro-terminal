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

    this.init();
  }

  init() {
    this.store.subscribe((state) => {
      this.updateApiStatusUI(state);
      this.calendar.render();
      this.sidebar.render();
    });

    this.startClock();

    this.store.init();
    
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  updateApiStatusUI(state) {
    const statusText = this.apiStatusEl.querySelector('.status-text');
    
    this.apiStatusEl.classList.remove('connected', 'limit-reached', 'offline');

    if (state.isSimulating) {
      this.apiStatusEl.classList.add('limit-reached');
      statusText.textContent = "Finnhub API: 限額降級 (模擬跳動中)";
      this.apiStatusEl.title = "已達 Finnhub 免費版每分鐘 60 次呼叫上限，系統自動無縫降級為高品質股價模擬跳動，避免畫面報錯或中斷。";
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
