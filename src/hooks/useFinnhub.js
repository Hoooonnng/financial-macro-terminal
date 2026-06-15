/**
 * useFinnhub.js - 處理股票快取輪詢與本地伺服器狀態中轉 (Simplified Store Version)
 */

class FinnhubStore {
  constructor() {
    this.apiKey = "d5ba1epr01qq0hq2kao0d5ba1epr01qq0hq2kaog"; // 預設 API 金鑰 (本機中轉用)
    
    // 從 localStorage 讀取已訂閱的股票列表（多用戶完全隔離，儲存於用戶端瀏覽器中）
    let saved = null;
    try {
      const stored = localStorage.getItem('watchlist_tickers');
      if (stored) {
        saved = JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Failed to parse watchlist_tickers from localStorage", e);
    }
    
    // 若本地儲存為空或不存在，則載入預設的初始股票，並同步寫入本地儲存
    if (saved && Array.isArray(saved) && saved.length > 0) {
      this.tickers = saved;
    } else {
      this.tickers = [...window.PRELOADED_TICKERS];
      localStorage.setItem('watchlist_tickers', JSON.stringify(this.tickers));
    }
    
    this.stocks = {}; // 存放股票行情資訊 { TSLA: { symbol, name, price, change, pct, status } }
    this.earnings = {}; // 存放財報日期 { TSLA: "YYYY-MM-DD" }
    
    this.subscribers = [];
    this.apiStatus = 'connected'; 
    this.isSimulating = false; // 是否降級模擬，此狀態由後端快取決定
    
    this.pollingTimer = null;

    // 載入初始 mock 結構防止首頁空白
    this.loadCachedData();
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    callback(this.getState());
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  notify() {
    const state = this.getState();
    this.subscribers.forEach(callback => callback(state));
  }

  getState() {
    return {
      tickers: this.tickers,
      stocks: this.stocks,
      earnings: this.earnings,
      apiStatus: this.apiStatus,
      isSimulating: this.isSimulating
    };
  }

  saveTickers() {
    localStorage.setItem('watchlist_tickers', JSON.stringify(this.tickers));
  }

  loadCachedData() {
    this.tickers.forEach(ticker => {
      const fallback = window.getFallbackProfile(ticker);
      this.stocks[ticker] = {
        symbol: ticker,
        name: fallback.name,
        price: fallback.price,
        change: fallback.change,
        pct: fallback.pct,
        lastUpdated: 0,
        flashType: null
      };

      const cachedEarnings = localStorage.getItem(`earnings_${ticker}`);
      if (cachedEarnings) {
        this.earnings[ticker] = cachedEarnings;
      }
    });
  }

  // 初始化並啟動後端靜默中轉數據的輪詢
  async init() {
    await this.fetchWatchlistData();
    this.startPolling();
  }

  async fetchWatchlistData() {
    if (this.tickers.length === 0) return;
    try {
      const res = await fetch(`/api/watchlist?tickers=${encodeURIComponent(this.tickers.join(','))}`);
      if (!res.ok) throw new Error("HTTP error");
      const data = await res.json();
      
      if (data && typeof data.isSimulating === 'boolean') {
        this.isSimulating = data.isSimulating;
      }
      
      this.tickers.forEach(ticker => {
        const cached = data[ticker];
        if (cached) {
          const prevPrice = this.stocks[ticker] ? this.stocks[ticker].price : 0;
          const newPrice = cached.price;
          
          let flashType = null;
          if (prevPrice !== newPrice && prevPrice !== 0) {
            flashType = newPrice > prevPrice ? 'up' : 'down';
          }

          this.stocks[ticker] = {
            symbol: ticker,
            name: cached.name,
            price: newPrice,
            change: cached.change,
            pct: cached.pct,
            lastUpdated: Date.now(),
            flashType: flashType
          };
          this.earnings[ticker] = cached.earningsDate;

          // 緩存財報日期到本地
          if (cached.earningsDate) {
            localStorage.setItem(`earnings_${ticker}`, cached.earningsDate);
          } else {
            localStorage.removeItem(`earnings_${ticker}`);
          }

          if (flashType) {
            setTimeout(() => {
              if (this.stocks[ticker]) {
                this.stocks[ticker].flashType = null;
                this.notify();
              }
            }, 800);
          }
        }
      });
      this.notify();
    } catch (err) {
      // 靜默降級，不拋出錯誤
    }
  }

  startPolling() {
    if (this.pollingTimer) clearInterval(this.pollingTimer);
    this.pollingTimer = setInterval(() => {
      this.fetchWatchlistData();
    }, 60000); // 輪詢頻率拉長至 60 秒以減輕 Finnhub API 負載
  }

  async addStock(ticker) {
    const symbol = ticker.trim().toUpperCase();
    if (!symbol) return { success: false, message: "請輸入股票代號" };
    if (this.tickers.includes(symbol)) {
      return { success: false, message: "該股票已在看板中" };
    }

    this.tickers.unshift(symbol);
    this.saveTickers();

    const fallback = window.getFallbackProfile(symbol);
    this.stocks[symbol] = {
      symbol,
      name: fallback.name,
      price: fallback.price,
      change: fallback.change,
      pct: fallback.pct,
      lastUpdated: 0,
      flashType: null
    };

    this.notify();

    // 立即向後台請求一次更新
    await this.fetchWatchlistData();
    return { success: true };
  }

  removeStock(ticker) {
    const symbol = ticker.toUpperCase();
    this.tickers = this.tickers.filter(t => t !== symbol);
    this.saveTickers();
    
    delete this.stocks[symbol];
    delete this.earnings[symbol];
    
    localStorage.removeItem(`earnings_${symbol}`);
    this.notify();
  }

  updateApiKey(newKey) {
    // 預留介面，不進行外部直接請求
  }

  toggleSimulation(enable) {
    // 預留介面，交由後端處理
  }
}

window.finnhubStore = new FinnhubStore();
