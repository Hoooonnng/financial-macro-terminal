/**
 * mockData.js - 提供 20 檔指定美股的備用基本資訊與財報日期生成邏輯 (Global Version)
 */

window.PRELOADED_TICKERS = [
  "TSLA", "TSLL", "SPCX", "OUST", "SOFI", 
  "GRAB", "CRCL", "NVDA", "GOOG", "MSFT", 
  "AAPL", "ONDS", "SNOW", "AMZN", "COHR", 
  "AAOI", "LAC", "MP", "ORCL", "USAR"
];

window.MOCK_STOCK_PROFILES = {
  TSLA: { name: "Tesla, Inc.", price: 406.43, change: 7.28, pct: 1.82, earningsMonths: [1, 4, 7, 10] },
  TSLL: { name: "Direxion Daily TSLA 1.5x", price: 13.59, change: 0.47, pct: 3.58, earningsMonths: [3, 6, 9, 12] },
  SPCX: { name: "Collaborative SPAC ETF", price: 16.00, change: -0.95, pct: -5.61, earningsMonths: [] }, 
  OUST: { name: "Ouster, Inc.", price: 39.80, change: 0.19, pct: 0.48, earningsMonths: [2, 5, 8, 11] },
  SOFI: { name: "SoFi Technologies", price: 16.58, change: -0.09, pct: -0.54, earningsMonths: [1, 4, 7, 10] },
  GRAB: { name: "Grab Holdings Limited", price: 3.30, change: -0.05, pct: -1.49, earningsMonths: [2, 5, 8, 11] },
  CRCL: { name: "Cercano Acquisition Corp", price: 77.84, change: -4.79, pct: -5.80, earningsMonths: [3, 6, 9, 12] },
  NVDA: { name: "NVIDIA Corporation", price: 205.19, change: 0.32, pct: 0.16, earningsMonths: [2, 5, 8, 11] },
  GOOG: { name: "Alphabet Inc.", price: 359.68, change: 1.91, pct: 0.53, earningsMonths: [1, 4, 7, 10] },
  MSFT: { name: "Microsoft Corporation", price: 390.74, change: 0.40, pct: 0.10, earningsMonths: [1, 4, 7, 10] },
  AAPL: { name: "Apple Inc.", price: 291.13, change: -4.50, pct: -1.52, earningsMonths: [1, 4, 7, 10] },
  ONDS: { name: "Ondas Holdings Inc.", price: 9.33, change: -0.50, pct: -5.09, earningsMonths: [3, 6, 9, 12] },
  SNOW: { name: "Snowflake Inc.", price: 232.78, change: -7.61, pct: -3.17, earningsMonths: [3, 6, 9, 12] },
  AMZN: { name: "Amazon.com, Inc.", price: 238.55, change: -2.96, pct: -1.23, earningsMonths: [1, 4, 7, 10] },
  COHR: { name: "Coherent Corp.", price: 385.03, change: 21.45, pct: 5.90, earningsMonths: [2, 5, 8, 11] },
  AAOI: { name: "Applied Optoelectronics", price: 169.05, change: -3.73, pct: -2.16, earningsMonths: [2, 5, 8, 11] },
  LAC: { name: "Lithium Americas Corp.", price: 4.55, change: 0.14, pct: 3.17, earningsMonths: [2, 5, 8, 11] },
  MP: { name: "MP Materials Corp.", price: 18.50, change: 0.35, pct: 1.93, earningsMonths: [2, 5, 8, 11] },
  ORCL: { name: "Oracle Corporation", price: 140.20, change: 1.22, pct: 0.88, earningsMonths: [3, 6, 9, 12] },
  USAR: { name: "USA Compression Partners", price: 22.40, change: -0.15, pct: -0.67, earningsMonths: [2, 5, 8, 11] }
};

/**
 * 產生確定性的財報日期 (配合閹割虛假數據規範：直接返回 null，不允許自行生成虛構財報)
 */
window.getMockEarningsDate = function(ticker, year, month) {
  return null;
};

/**
 * 取得股票的基本名稱與股價
 */
window.getFallbackProfile = function(ticker) {
  const upper = ticker.toUpperCase();
  if (window.MOCK_STOCK_PROFILES[upper]) {
    return { ...window.MOCK_STOCK_PROFILES[upper], symbol: upper };
  }
  
  let hash = 0;
  for (let i = 0; i < upper.length; i++) {
    hash += upper.charCodeAt(i);
  }
  
  const mockPrice = 10 + (hash % 490);
  const mockChange = ((hash % 100) / 10) - 5;
  const mockPct = parseFloat((mockChange / mockPrice * 100).toFixed(2));
  
  const monthsGroup = [
    [1, 4, 7, 10],
    [2, 5, 8, 11],
    [3, 6, 9, 12]
  ];
  const earningsMonths = monthsGroup[hash % 3];

  return {
    symbol: upper,
    name: `${upper} International Inc.`,
    price: parseFloat(mockPrice.toFixed(2)),
    change: parseFloat(mockChange.toFixed(2)),
    pct: mockPct,
    earningsMonths
  };
};

window.getEventWeight = function(event) {
  if (!event) return 0;
  if (event.type === 'earnings') return 4;
  if (event.type === 'macro') {
    if (event.importance === 3) return 3;
    if (event.importance === 2) return 2;
    return 1;
  }
  return 0;
};

window.getTickerHash = function(ticker) {
  const upper = ticker.toUpperCase();
  let hash = 0;
  for (let i = 0; i < upper.length; i++) {
    hash += upper.charCodeAt(i);
  }
  return hash;
};

window.generateTechnicalLevels = function(ticker, refPrice, actualOpen) {
  const hash = window.getTickerHash(ticker);
  
  // 經典系統關卡偏移 (昨日最高 PDH/昨日最低 PDL/今日開盤 Open)
  const pdhOffset = 0.012 + (hash % 25) / 1000;   // 1.2% - 3.7%
  const pdlOffset = 0.012 + ((hash * 3) % 25) / 1000;
  const openOffset = -0.008 + ((hash * 7) % 16) / 1000; // -0.8% - +0.8%
  
  const pdh = parseFloat((refPrice * (1 + pdhOffset)).toFixed(2));
  const pdl = parseFloat((refPrice * (1 - pdlOffset)).toFixed(2));
  const open = actualOpen ? parseFloat(actualOpen.toFixed(2)) : parseFloat((refPrice * (1 + openOffset)).toFixed(2));
  
  // SMC 系統關卡偏移 (FVG 公允價值跳空 / OB 訂單塊)
  const fvgOffsetBull = 0.006 + ((hash * 11) % 15) / 1000; // 0.6% - 2.1%
  const fvgOffsetBear = 0.006 + ((hash * 13) % 15) / 1000;
  
  const obOffsetBull = 0.018 + ((hash * 17) % 20) / 1000; // 1.8% - 3.8%
  const obOffsetBear = 0.018 + ((hash * 19) % 20) / 1000;

  const fvgBullBottom = refPrice * (1 - fvgOffsetBull - 0.012);
  const fvgBullTop = refPrice * (1 - fvgOffsetBull);
  
  const fvgBearBottom = refPrice * (1 + fvgOffsetBear);
  const fvgBearTop = refPrice * (1 + fvgOffsetBear + 0.012);

  const obBullBottom = refPrice * (1 - obOffsetBull - 0.015);
  const obBullTop = refPrice * (1 - obOffsetBull);

  const obBearBottom = refPrice * (1 + obOffsetBear);
  const obBearTop = refPrice * (1 + obOffsetBear + 0.015);

  return {
    pdh,
    pdl,
    open,
    fvgs: [
      {
        type: 'bullish',
        bottom: parseFloat(fvgBullBottom.toFixed(2)),
        top: parseFloat(fvgBullTop.toFixed(2)),
        mitigated: false
      },
      {
        type: 'bearish',
        bottom: parseFloat(fvgBearBottom.toFixed(2)),
        top: parseFloat(fvgBearTop.toFixed(2)),
        mitigated: false
      }
    ],
    obs: [
      {
        type: 'bullish',
        bottom: parseFloat(obBullBottom.toFixed(2)),
        top: parseFloat(obBullTop.toFixed(2))
      },
      {
        type: 'bearish',
        bottom: parseFloat(obBearBottom.toFixed(2)),
        top: parseFloat(obBearTop.toFixed(2))
      }
    ]
  };
};
