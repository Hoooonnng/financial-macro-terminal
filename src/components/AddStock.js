/**
 * AddStock.js - 新增美股代號輸入元件 (Global Version)
 */
class AddStockComponent {
  constructor(store) {
    this.store = store;
    this.container = document.getElementById('add-stock-form-root');
    this.render();
    this.initEventListeners();
  }

  render() {
    this.container.innerHTML = `
      <form class="add-stock-form" id="add-stock-form">
        <div class="add-stock-input-wrapper">
          <i data-lucide="search"></i>
          <input 
            type="text" 
            class="add-stock-input" 
            placeholder="新增股票代號 (例如 NVDA, TSLA)..." 
            id="add-stock-input" 
            maxlength="10"
            required
            autocomplete="off"
          >
        </div>
        <button type="submit" class="add-stock-btn">
          <i data-lucide="plus"></i> 新增
        </button>
      </form>
    `;

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  initEventListeners() {
    const form = document.getElementById('add-stock-form');
    const input = document.getElementById('add-stock-input');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const ticker = input.value.trim().toUpperCase();
      if (!ticker) return;

      const tickerRegex = /^[A-Z0-9.-]+$/;
      if (!tickerRegex.test(ticker)) {
        alert("股票代號格式不正確，僅能包含英文字母、數字、點(.)或橫槓(-)。");
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> 載入中...';
      if (window.lucide) window.lucide.createIcons();

      const result = await this.store.addStock(ticker);
      
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
      if (window.lucide) window.lucide.createIcons();

      if (result.success) {
        input.value = '';
        if (result.warning) {
          alert(`${ticker} 新增成功！但提示: ${result.warning}`);
        }
      } else {
        alert(result.message);
      }
    });

    input.addEventListener('input', (e) => {
      const cursorStart = input.selectionStart;
      const cursorEnd = input.selectionEnd;
      const upperVal = input.value.toUpperCase().replace(/\s/g, '');
      
      if (input.value !== upperVal) {
        input.value = upperVal;
        input.setSelectionRange(cursorStart, cursorEnd);
      }
    });
  }
}

window.AddStockComponent = AddStockComponent;
