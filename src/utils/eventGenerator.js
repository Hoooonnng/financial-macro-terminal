/**
 * eventGenerator.js - 動態計算並產生各個月份的財經要事日期 (Global Version - Upgraded Fields)
 */

function getFirstDayOfWeekday(year, month, dayOfWeek) {
  const date = new Date(year, month - 1, 1);
  const startDay = date.getDay();
  let day = 1 + (dayOfWeek - startDay + 7) % 7;
  return day;
}

function getNthDayOfWeekday(year, month, dayOfWeek, n) {
  const firstDay = getFirstDayOfWeekday(year, month, dayOfWeek);
  return firstDay + (n - 1) * 7;
}

function formatDate(year, month, day) {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

window.generateMacroEvents = function(year, month) {
  const events = [];
  const daysInMonth = getDaysInMonth(year, month);
  
  // 基準時間為 2026-06-15，在此日期之前的事件才有實際值 (Actual)
  const baseDateStr = "2026-06-15";

  // 1. NFP (非農就業數據) - 第一個週五
  const nfpDay = getFirstDayOfWeekday(year, month, 5);
  if (nfpDay <= daysInMonth) {
    const dateStr = formatDate(year, month, nfpDay);
    const isPast = dateStr <= baseDateStr;
    events.push({
      id: `macro-nfp-${year}-${month}`,
      title: "非農就業人口數據 (NFP)",
      type: "macro",
      date: dateStr,
      time: "20:30",
      consensus: "180K",
      actual: isPast ? "195K" : "",
      previous: "175K",
      compareType: "higher-better", // 越高越好
      description: "美國非農就業人數及失業率，評估勞動力市場健康度與聯準會政策走向的最重要指標之一。",
      importance: 3
    });
  }

  // 2. CPI (消費者物價指數) - 第二個週三
  const cpiDay = getNthDayOfWeekday(year, month, 3, 2);
  if (cpiDay <= daysInMonth) {
    const dateStr = formatDate(year, month, cpiDay);
    const isPast = dateStr <= baseDateStr;
    events.push({
      id: `macro-cpi-${year}-${month}`,
      title: "消費者物價指數 (CPI)",
      type: "macro",
      date: dateStr,
      time: "20:30",
      consensus: "3.1%",
      actual: isPast ? "3.3%" : "",
      previous: "3.0%",
      compareType: "lower-better", // 越低越好 (通膨降溫)
      description: "美國通膨核心數據，衡量消費者物價變動幅度，對降息/升息決策有極大影響力。",
      importance: 3
    });

    // 3. PPI (生產者物價指數) - CPI 隔日 (第二個週四)
    const ppiDay = cpiDay + 1;
    if (ppiDay <= daysInMonth) {
      const ppiDateStr = formatDate(year, month, ppiDay);
      const isPpiPast = ppiDateStr <= baseDateStr;
      events.push({
        id: `macro-ppi-${year}-${month}`,
        title: "生產者物價指數 (PPI)",
        type: "macro",
        date: ppiDateStr,
        time: "20:30",
        consensus: "0.2%",
        actual: isPpiPast ? "0.1%" : "",
        previous: "0.3%",
        compareType: "lower-better", // 越低越好
        description: "衡量生產者交易的商品價格變動，為 CPI 的領先指標之一。",
        importance: 1
      });
    }
  }

  // 4. 零售銷售 (Retail Sales) - 第三個週二
  const retailDay = getNthDayOfWeekday(year, month, 2, 3);
  if (retailDay <= daysInMonth) {
    const dateStr = formatDate(year, month, retailDay);
    const isPast = dateStr <= baseDateStr;
    events.push({
      id: `macro-retail-${year}-${month}`,
      title: "零售銷售數據 (Retail Sales)",
      type: "macro",
      date: dateStr,
      time: "20:30",
      consensus: "0.4%",
      actual: isPast ? "0.6%" : "",
      previous: "0.3%",
      compareType: "higher-better", // 越高越好
      description: "美國消費市道晴雨表，衡量零售商店的總營業額，佔美國 GDP 佔比極大。",
      importance: 2
    });
  }

  // 5. FOMC 利率決策 - 第三個週三 (部分月份)
  const fomcMonths = [1, 3, 5, 6, 7, 9, 11, 12];
  if (fomcMonths.includes(month)) {
    const fomcDay = getNthDayOfWeekday(year, month, 3, 3);
    if (fomcDay <= daysInMonth) {
      const dateStr = formatDate(year, month, fomcDay);
      const isPast = dateStr <= baseDateStr;
      events.push({
        id: `macro-fomc-${year}-${month}`,
        title: "FOMC 利率決策會議 (FOMC)",
        type: "macro",
        date: dateStr,
        time: "02:00",
        consensus: "5.25%",
        actual: isPast ? "5.25%" : "",
        previous: "5.25%",
        compareType: "equal-neutral", // 一致為中性
        description: "美國聯邦公開市場委員會公佈利率決策、聲明及經濟預測(季度會議)，隨後舉行記者會。",
        importance: 3
      });
    }
  }

  // 6. 每週初請失業金人數 - 每週四
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    if (date.getDay() === 4) {
      const dateStr = formatDate(year, month, day);
      const isPast = dateStr <= baseDateStr;
      
      // 為每週的失業金生成稍微變動的 mock 數字
      const seed = day + month + year;
      const prevVal = 210 + (seed % 15); // 210K ~ 225K
      const consVal = prevVal + (seed % 5 - 2); // prev ±2K
      const actVal = isPast ? consVal - (seed % 4 - 2) : ""; // consensus ±2K

      events.push({
        id: `macro-claims-${year}-${month}-${day}`,
        title: "每週初請失業金人數",
        type: "macro",
        date: dateStr,
        time: "20:30",
        consensus: `${consVal}K`,
        actual: isPast ? `${actVal}K` : "",
        previous: `${prevVal}K`,
        compareType: "lower-better", // 人數越低就業越好
        description: "每週公佈一次的就業市場短期領先指標，反映失業及申領救濟金人數變化。",
        importance: 1
      });
    }
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
};
