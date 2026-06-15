/**
 * server.js - Node.js Express Backend Proxy Server
 */

const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 3000;

// 靜態檔案託管：將專案目錄下的所有檔案設為靜態資源
app.use(express.static(path.join(__dirname)));

// 根據事件標題與指標判斷比較屬性 (CompareType)
function getCompareType(title, indicator) {
  const t = (title || "").toLowerCase();
  const ind = (indicator || "").toLowerCase();
  
  if (t.includes("nonfarm") || t.includes("non-farm") || t.includes("employment change") || ind.includes("non farm") || ind.includes("nfp")) {
    return "higher-better";
  }
  if (t.includes("cpi") || t.includes("consumer price") || ind.includes("cpi") || ind.includes("inflation rate")) {
    return "lower-better";
  }
  if (t.includes("ppi") || t.includes("producer price") || ind.includes("ppi")) {
    return "lower-better";
  }
  if (t.includes("retail sales") || ind.includes("retail sales")) {
    return "higher-better";
  }
  if (t.includes("interest rate") || t.includes("fed") || t.includes("fomc") || ind.includes("interest rate") || ind.includes("fomc")) {
    return "equal-neutral";
  }
  if (t.includes("jobless claims") || t.includes("initial claims") || ind.includes("claims")) {
    return "lower-better";
  }
  return "equal-neutral";
}

// 總經詞彙中英文對照翻譯字典
const translationDictionary = [
  { 
    key: "durable goods orders ex transportation mom", 
    title: "核心耐久財訂單月增率 (扣除運輸)", 
    desc: "扣除運輸部門後的耐久財訂單月度百分比變動，反映核心製造業訂單的健康狀況。" 
  },
  { 
    key: "average hourly earnings mom", 
    title: "平均每小時薪資月增率", 
    desc: "員工平均薪資的月度變動，是衡量薪資成本增加與工資通膨螺旋的領先指標。" 
  },
  { 
    key: "average hourly earnings yoy", 
    title: "平均每小時薪資年增率", 
    desc: "員工平均薪資的年度變動率，反映薪資增幅與就業市場緊俏度。" 
  },
  { 
    key: "michigan consumer sentiment final", 
    title: "密西根大學消費者信心指數終值", 
    desc: "密西根大學公佈的消費者信心終值，反映消費者對財務狀況與總體經濟的態度。" 
  },
  { 
    key: "michigan consumer sentiment prel", 
    title: "密西根大學消費者信心指數初值", 
    desc: "密西根大學消費者信心的初步評估值，因時效性高而常引起市場較大波動。" 
  },
  { 
    key: "michigan 5-year inflation expectations", 
    title: "密西根大學5年期通膨預期指數", 
    desc: "密西根大學針對消費者對未來5年通膨預期的調查指數。" 
  },
  { 
    key: "jobless claims 4-week average", 
    title: "初請失業金四周均值", 
    desc: "初請失業金人數的四週移動平均值，能有效平滑週與週之間的波動，更準確地反映就業市場趨勢。" 
  },
  { 
    key: "core pce price index mom", 
    title: "核心 PCE 物價指數月增率", 
    desc: "排除食品與能源後的個人消費支出物價月增率，為聯準會最看重的核心通膨指標。" 
  },
  { 
    key: "core pce price index yoy", 
    title: "核心 PCE 物價指數年增率", 
    desc: "排除食品與能源後的個人消費支出物價年增率，直接左右聯準會的中長期利率方針。" 
  },
  { 
    key: "durable goods orders mom", 
    title: "耐久財訂單月增率", 
    desc: "耐久財訂單月度百分比變動，反映製造業生產與擴張意願。" 
  },
  { 
    key: "durable goods orders yoy", 
    title: "耐久財訂單年增率", 
    desc: "耐久財訂單年度百分比變動。" 
  },
  { 
    key: "goods trade balance adv", 
    title: "商品貿易帳初值", 
    desc: "商品出口總額與進口總額的差額初值，赤字擴大對 GDP 會產生負面拖累。" 
  },
  { 
    key: "retail sales ex autos mom", 
    title: "核心零售銷售月增率 (扣除汽車)", 
    desc: "排除汽車銷售後的零售額月度變動率，更能反映核心消費支出趨勢。" 
  },
  { 
    key: "existing home sales mom", 
    title: "成屋銷售月增率", 
    desc: "成屋銷售總數的月度百分比變動。" 
  },
  { 
    key: "existing home sales yoy", 
    title: "成屋銷售年增率", 
    desc: "成屋銷售總數的年度百分比變動。" 
  },
  { 
    key: "pending home sales mom", 
    title: "待過戶成屋銷售月增率", 
    desc: "已簽訂合約但尚未完成過戶登記的成屋銷售月度百分比變動。" 
  },
  { 
    key: "pending home sales yoy", 
    title: "待過戶成屋銷售年增率", 
    desc: "已簽訂合約但尚未完成過戶登記的成屋銷售年度百分比變動。" 
  },
  { 
    key: "richmond fed manufacturing", 
    title: "里奇蒙聯邦製造業指數", 
    desc: "里奇蒙聯準銀行轄區內製造業活動的衡量指標，反映中大西洋地區製造業景氣。" 
  },
  { 
    key: "kansas fed manufacturing", 
    title: "堪薩斯聯邦製造業指數", 
    desc: "堪薩斯聯準銀行轄區內製造業活動的衡量指標。" 
  },
  { 
    key: "dallas fed manufacturing", 
    title: "達拉斯聯邦製造業指數", 
    desc: "達拉斯聯準銀行轄區內製造業活動的衡量指標。" 
  },
  { 
    key: "factory orders mom", 
    title: "工廠訂單月增率", 
    desc: "衡量製造商新訂單總額的月度百分比變動。" 
  },
  { 
    key: "factory orders yoy", 
    title: "工廠訂單年增率", 
    desc: "衡量製造商新訂單總額的年度百分比變動。" 
  },
  { 
    key: "building permits mom", 
    title: "營建許可月增率", 
    desc: "新住宅建設許可總數的月度百分比變動。" 
  },
  { 
    key: "building permits yoy", 
    title: "營建許可年增率", 
    desc: "新住宅建設許可總數的年度百分比變動。" 
  },
  { 
    key: "wholesale inventories mom", 
    title: "批發庫存月增率", 
    desc: "批發商庫存價值的月度變動，庫存增加若因銷量好則為正面，反之為負面。" 
  },
  { 
    key: "eia crude oil stocks change", 
    title: "EIA 原油庫存變動", 
    desc: "美國能源資訊管理局公佈的每週原油庫存增減量，直接左右原油價格走勢。" 
  },
  { 
    key: "eia gasoline stocks change", 
    title: "EIA 汽油庫存變動", 
    desc: "每週汽油庫存增減量，反映終端汽油消費需求。" 
  },
  { 
    key: "eia distillate stocks change", 
    title: "EIA 蒸餾油庫存變動", 
    desc: "每週柴油和取暖油等蒸餾油的庫存變動量。" 
  },
  { 
    key: "eia natural gas storage change", 
    title: "EIA 天然氣庫存變動", 
    desc: "每週天然氣庫存的增減量。" 
  },
  { 
    key: "api crude oil stock", 
    title: "API 原油庫存變動", 
    desc: "美國石油學會公佈的每週原油庫存數據，為 EIA 庫存的領先預測指標。" 
  },
  { 
    key: "mba mortgage applications", 
    title: "MBA 抵押貸款申請指數", 
    desc: "每週房貸申請量變動，反映房屋買氣與信貸環境的鬆緊度。" 
  },
  { 
    key: "existing home sales", 
    title: "成屋銷售總數", 
    desc: "美國成屋（二手房）銷售的年化總數，佔房地產交易大宗，反映房市主力狀況。" 
  },
  { 
    key: "pending home sales", 
    title: "待過戶成屋銷售指數", 
    desc: "衡量簽約待過戶成屋數量的領先指標，約領先成屋銷售總數 1~2 個月。" 
  },
  { 
    key: "new home sales mom", 
    title: "新屋銷售月增率", 
    desc: "新單戶住宅銷售的月度變動率。" 
  },
  { 
    key: "new home sales yoy", 
    title: "新屋銷售年增率", 
    desc: "新單戶住宅銷售的年度變動率。" 
  },
  { 
    key: "new home sales", 
    title: "新屋銷售總數", 
    desc: "美國新屋銷售年化總數，為房地產市場與營建業的晴雨表。" 
  },
  { 
    key: "initial jobless claims", 
    title: "每週初請失業金人數", 
    desc: "每週公佈一次的就業市場短期領先指標，反映失業及申領救濟金人數變化。" 
  },
  { 
    key: "continuing jobless claims", 
    title: "續請失業金人數", 
    desc: "續請失業金人數是指連續申請失業救濟福利的人數，用以評估勞動力市場的長期健康狀態。" 
  },
  { 
    key: "nonfarm payrolls private", 
    title: "私營部門非農就業人口", 
    desc: "衡量私營企業在過去一個月內所創造的就業崗位變動，排除政府部門的就業人口。" 
  },
  { 
    key: "nonfarm payrolls", 
    title: "非農就業人口數據 (NFP)", 
    desc: "美國非農就業人數及失業率，評估勞動力市場健康度與聯準會政策走向的最重要指標之一。" 
  },
  { 
    key: "non-farm payrolls", 
    title: "非農就業人口數據 (NFP)", 
    desc: "美國非農就業人數及失業率，評估勞動力市場健康度與聯準會政策走向的最重要指標之一。" 
  },
  { 
    key: "unemployment rate", 
    title: "失業率", 
    desc: "美國失業勞動力佔總勞動人口的百分比，是判斷勞動力市場緊縮程度與景氣循環的核心指標。" 
  },
  { 
    key: "core cpi mom", 
    title: "核心 CPI 月增率", 
    desc: "排除食品與能源等高波動性項目後的消費者物價月度變動率，是聯準會評估核心通膨趨勢的主要指標。" 
  },
  { 
    key: "core cpi yoy", 
    title: "核心 CPI 年增率", 
    desc: "排除食品與能源後消費者物價的年度變動率，反映中長期且穩定的通膨趨勢。" 
  },
  { 
    key: "cpi mom", 
    title: "CPI 月增率", 
    desc: "消費者物價指數的月度百分比變動，衡量消費者購買商品和服務的價格變動，代表通膨的短期變動。" 
  },
  { 
    key: "cpi yoy", 
    title: "消費者物價指數 (CPI) 年增率", 
    desc: "美國通膨核心數據，衡量消費者物價變動幅度，對降息/升息決策有極大影響力。" 
  },
  { 
    key: "consumer price index", 
    title: "消費者物價指數 (CPI)", 
    desc: "美國通膨核心數據，衡量消費者物價變動幅度，對降息/升息決策有極大影響力。" 
  },
  { 
    key: "core inflation rate yoy", 
    title: "核心通膨率 (年增率)", 
    desc: "排除食品與能源後的消費者物價年度變動率，反映中長期且穩定的通膨趨勢。" 
  },
  { 
    key: "core inflation rate mom", 
    title: "核心通膨率 (月增率)", 
    desc: "排除食品與能源後的消費者物價月度變動率，是衡量核心通膨強度的關鍵指標。" 
  },
  { 
    key: "inflation rate yoy", 
    title: "通膨率 (年增率)", 
    desc: "消費者物價指數的年度變動率，是衡量美國整體通膨水準的核心指標。" 
  },
  { 
    key: "inflation rate mom", 
    title: "通膨率 (月增率)", 
    desc: "消費者物價指數的月度變動率，反映物價變動的短期速度。" 
  },
  { 
    key: "core ppi mom", 
    title: "核心 PPI 月增率", 
    desc: "扣除食品與能源後，生產者所面臨的商品和服務出廠價格的月度變動率。" 
  },
  { 
    key: "core ppi yoy", 
    title: "核心 PPI 年增率", 
    desc: "扣除食品與能源後，生產者出廠價格的年度變動率，為通膨的領先指標。" 
  },
  { 
    key: "ppi mom", 
    title: "PPI 月增率", 
    desc: "生產者物價指數 of 相比上月的百分比變動，反映生產者端面臨的批發通膨動向。" 
  },
  { 
    key: "ppi yoy", 
    title: "生產者物價指數 (PPI) 年增率", 
    desc: "衡量生產者交易的商品價格變動，為 CPI 的領先指標之一。" 
  },
  { 
    key: "producer price index", 
    title: "生產者物價指數 (PPI)", 
    desc: "衡量生產者交易的商品價格變動，為 CPI 的領先指標之一。" 
  },
  { 
    key: "retail sales mom", 
    title: "零售銷售月增率", 
    desc: "零售商店總營業額的月度變動率，是衡量消費者支出強度的關鍵經濟指標。" 
  },
  { 
    key: "retail sales yoy", 
    title: "零售銷售年增率", 
    desc: "零售商店總營業額的年度變動率，反映消費者支出長期的增長動能。" 
  },
  { 
    key: "retail sales", 
    title: "零售銷售數據", 
    desc: "美國消費市道晴雨表，衡量零售商店的總營業額，佔美國 GDP 佔比極大。" 
  },
  { 
    key: "fed interest rate decision", 
    title: "聯準會利率決策 (FOMC)", 
    desc: "美國聯邦公開市場委員會公佈利率決策、聲明及經濟預測(季度會議)，隨後舉行記者會。" 
  },
  { 
    key: "federal funds rate", 
    title: "聯邦基金利率目標", 
    desc: "美國商業銀行之間進行隔夜拆借的利率目標，是全球金融市場最重要的基準利率。" 
  },
  { 
    key: "fomc economic projections", 
    title: "FOMC 經濟預測", 
    desc: "FOMC 委員對未來 GDP、通膨、失業率以及利率路徑(點陣圖)的預測。" 
  },
  { 
    key: "fomc statement", 
    title: "FOMC 會後聲明", 
    desc: "聯準會政策會議後發布的正式書面聲明，闡述對經濟前景的看法及貨幣政策立場。" 
  },
  { 
    key: "fomc minutes", 
    title: "FOMC 會議紀錄", 
    desc: "聯準會政策會議的詳細會議紀錄，揭示委員們的討論細節與政策傾向的分歧。" 
  },
  { 
    key: "interest rate decision", 
    title: "基準利率決策", 
    desc: "央行公佈的基準利率決策，直接決定市場資金成本與貨幣緊縮/寬鬆方向。" 
  },
  { 
    key: "manufacturing production mom", 
    title: "製造業產出月增率", 
    desc: "製造業部門生產活動的月度百分比變動，反映核心工廠產出水準。" 
  },
  { 
    key: "manufacturing production yoy", 
    title: "製造業產出年增率", 
    desc: "製造業部門生產活動的年度百分比變動。" 
  },
  { 
    key: "manufacturing pmi final", 
    title: "製造業 PMI 終值", 
    desc: "衡量製造業健康度的最終採購經理人指數，高於 50 代表擴張，低於 50 代表收縮。" 
  },
  { 
    key: "services pmi final", 
    title: "服務業 PMI 終值", 
    desc: "衡量服務業商業活動的最終指數，反映佔美國經濟大宗的服務業景氣。" 
  },
  { 
    key: "composite pmi final", 
    title: "綜合 PMI 終值", 
    desc: "製造業與服務業採購經理人指數的加權綜合指標，反映整體私營部門的擴張或收縮。" 
  },
  { 
    key: "manufacturing pmi flash", 
    title: "製造業 PMI 初值", 
    desc: "根據當月大部分問卷調查結果估算出的製造業經理人指數，具備極高的時效性。" 
  },
  { 
    key: "services pmi flash", 
    title: "服務業 PMI 初值", 
    desc: "根據當月問卷估算出的服務業 PMI 初值，是市場關注的領先指標。" 
  },
  { 
    key: "composite pmi flash", 
    title: "綜合 PMI 初值", 
    desc: "當月製造業與服務業 PMI 的初步加權綜合指標。" 
  },
  { 
    key: "s&p global manufacturing pmi", 
    title: "S&P 全球製造業 PMI", 
    desc: "由 S&P Global 編製的製造業採購經理人指數，衡量新訂單、產出、就業與交貨時間等指標。" 
  },
  { 
    key: "s&p global services pmi", 
    title: "S&P 全球服務業 PMI", 
    desc: "由 S&P Global 編製的服務業採購經理人指數，是衡量美國非製造業景氣的重點數據。" 
  },
  { 
    key: "s&p global composite pmi", 
    title: "S&P 全球綜合 PMI", 
    desc: "S&P 全球針對製造業與服務業產出的綜合評估指標。" 
  },
  { 
    key: "ism manufacturing pmi", 
    title: "ISM 製造業 PMI", 
    desc: "美國供應管理協會 (ISM) 發布的製造業採購經理人指數，是衡量美國實體製造景氣的最權威指標。" 
  },
  { 
    key: "ism services pmi", 
    title: "ISM 服務業 PMI", 
    desc: "美國供應管理協會 (ISM) 發布的非製造業採購經理人指數，反映服務業商業活動與就業狀況。" 
  },
  { 
    key: "capacity utilization", 
    title: "產能利用率", 
    desc: "衡量美國工廠、礦場與公用事業的產能使用百分比，反映經濟體內的閒置產能。" 
  },
  { 
    key: "gdp growth rate qoq", 
    title: "GDP 季增率", 
    desc: "國內生產總值年化季增率，是衡量美國整體經濟擴張或衰退的最全面指標。" 
  },
  { 
    key: "gdp growth rate yoy", 
    title: "GDP 年增率", 
    desc: "國內生產總值較上年同期的變動率，反映經濟增長的長期趨勢。" 
  },
  { 
    key: "building permits", 
    title: "營建許可", 
    desc: "政府向開發商發放的新住宅建設許可總數，為房市供需與景氣的極佳領先指標。" 
  },
  { 
    key: "housing starts", 
    title: "新屋開工率", 
    desc: "新住宅項目開始動工興建的年化總數，反映房市上游景氣。" 
  },
  { 
    key: "core pce price index", 
    title: "核心 PCE 物價指數", 
    desc: "排除食品與能源後的個人消費支出物價指數，為聯準會最看重的核心通膨指標。" 
  },
  { 
    key: "pce price index", 
    title: "PCE 物價指數", 
    desc: "個人消費支出物價指數，為聯準會衡量中長期通膨目標的基準數據。" 
  },
  { 
    key: "personal spending mom", 
    title: "個人支出月增率", 
    desc: "個人在商品和服務上支出的金額變動，占美國 GDP 超過三分之二，反映消費動能。" 
  },
  { 
    key: "personal income mom", 
    title: "個人所得月增率", 
    desc: "個人來自薪資、租金、利息等多重管道所得總額的月度變動率。" 
  },
  { 
    key: "consumer confidence", 
    title: "CB 消費者信心指數", 
    desc: "美國諮商會 (Conference Board) 發布的消費者信心指數，反映消費者對就業與景氣的樂觀程度。" 
  },
  { 
    key: "jolts job openings", 
    title: "JOLTs 職缺人數", 
    desc: "勞工統計局公佈的非農職缺總數，用以衡量勞動力供需缺口與市場熱度。" 
  },
  { 
    key: "adp employment change", 
    title: "ADP 就業人數變動 (小非農)", 
    desc: "ADP 研究所發布的私營部門就業人數變動，通常比官方非農就業數據早兩天公佈。" 
  },
  { 
    key: "trade balance", 
    title: "貿易收支", 
    desc: "美國出口商品/服務與進口商品/服務之間的差額，赤字擴大對 GDP 會產生負面拖累。" 
  },
  { 
    key: "ny empire state manufacturing index", 
    title: "紐約帝國製造業指數", 
    desc: "紐約聯準銀行對該轄區製造業景氣的評估指標，是每月最早公佈的地區性製造業指數。" 
  },
  { 
    key: "philadelphia fed manufacturing index", 
    title: "費城聯邦製造業指數", 
    desc: "費城聯準銀行轄區內製造業活動的衡量指標，大於 0 表示行業擴張。" 
  },
  { 
    key: "michigan consumer sentiment", 
    title: "密西根大學消費者信心指數", 
    desc: "反映消費者對當前與未來經濟環境的信心水準，進而預示未來的零售消費趨勢。" 
  },
  { 
    key: "industrial production mom", 
    title: "工業產出月增率", 
    desc: "衡量工廠、礦場與公用事業實際產出的月度變動率，反映實體生產端熱度。" 
  },
  { 
    key: "industrial production yoy", 
    title: "工業產出年增率", 
    desc: "工業產出相較於上一年度的變動率。" 
  },
  { 
    key: "business inventories", 
    title: "商業庫存", 
    desc: "製造商、批發商與零售商所持有的庫存價值，庫存堆積可能暗示消費需求降溫。" 
  },
  { 
    key: "redbook", 
    title: "紅皮書商業零售銷售指數", 
    desc: "紅皮書商業零售銷售指數衡量大型零售商的連鎖店銷售額變動。" 
  },
  { 
    key: "chicago pmi", 
    title: "芝加哥 PMI", 
    desc: "芝加哥採購經理人指數，衡量芝加哥地區製造與商業活動景氣。" 
  },
  { 
    key: "3-month bill auction", 
    title: "3個月期國債拍賣利率", 
    desc: "美國財政部拍賣3個月期短期國債的得標利率。" 
  },
  { 
    key: "6-month bill auction", 
    title: "6個月期國債拍賣利率", 
    desc: "美國財政部拍賣6個月期短期國債的得標利率。" 
  },
  { 
    key: "52-week bill auction", 
    title: "52週期國債拍賣利率", 
    desc: "美國財政部拍賣52週期短期國債的得標利率。" 
  },
  { 
    key: "2-year note auction", 
    title: "2年期國債拍賣利率", 
    desc: "美國財政部拍賣2年期國債的得標利率。" 
  },
  { 
    key: "3-year note auction", 
    title: "3年期國債拍賣利率", 
    desc: "美國財政部拍賣3年期國債的得標利率。" 
  },
  { 
    key: "5-year note auction", 
    title: "5年期國債拍賣利率", 
    desc: "美國財政部拍賣5年期國債的得標利率。" 
  },
  { 
    key: "7-year note auction", 
    title: "7年期國債拍賣利率", 
    desc: "美國財政部拍賣7年期國債的得標利率。" 
  },
  { 
    key: "10-year note auction", 
    title: "10年期國債拍賣利率", 
    desc: "美國財政部拍賣10年期國債的得標利率。" 
  },
  { 
    key: "20-year bond auction", 
    title: "20年期國債拍賣利率", 
    desc: "美國財政部拍賣20年期國債的得標利率。" 
  },
  { 
    key: "30-year bond auction", 
    title: "30年期國債拍賣利率", 
    desc: "美國財政部拍賣30年期國債的得標利率。" 
  },
  { 
    key: "10-year tips auction", 
    title: "10年期抗通膨國債 (TIPS) 拍賣利率", 
    desc: "美國財政部拍賣10年期抗通膨國債的得標利率。" 
  },
  { 
    key: "5-year tips auction", 
    title: "5年期抗通膨國債 (TIPS) 拍賣利率", 
    desc: "美國財政部拍賣5年期抗通膨國債的得標利率。" 
  }
];

// 翻譯標題與說明文字
function translateEvent(e) {
  const title = e.title || "";
  const lowTitle = title.toLowerCase();
  
  // 1. 優先匹配手動定義的精確詞典
  for (const item of translationDictionary) {
    if (lowTitle.includes(item.key)) {
      return {
        title: item.title,
        description: item.desc
      };
    }
  }
  
  // 2. 進行智慧分詞與片語替換翻譯
  let translatedTitle = title;
  
  // 先進行常見短語的替換，避免單字替換打碎片語
  const phrases = [
    { en: "Initial Jobless Claims", zh: "每週初請失業金人數" },
    { en: "Continuing Jobless Claims", zh: "續請失業金人數" },
    { en: "Jobless Claims 4-Week Average", zh: "初請失業金四週均值" },
    { en: "Jobless Claims", zh: "失業金人數" },
    { en: "Fed Chair Powell Speaks", zh: "聯準會主席鮑爾發表演講" },
    { en: "FOMC Press Conference", zh: "FOMC 會後記者會" },
    { en: "FOMC Meeting Minutes", zh: "FOMC 會議紀錄" },
    { en: "Federal Budget Balance", zh: "聯邦政府預算收支" },
    { en: "Case-Shiller Home Price Index", zh: "凱斯-席勒房價指數" },
    { en: "FHFA House Price Index", zh: "FHFA 房價指數" }
  ];
  
  for (const p of phrases) {
    const reg = new RegExp(p.en, "gi");
    translatedTitle = translatedTitle.replace(reg, p.zh);
  }
  
  // 單字或短詞替換
  const glossary = {
    // 聯準會官員與演講
    "Fed Chair": "聯準會主席",
    "Fed": "聯準會",
    "Speaks": "發表演講",
    "Speech": "演講",
    "Powell": "鮑爾",
    "Bowman": "鮑曼",
    "Williams": "威廉斯",
    "Waller": "沃勒",
    "Jefferson": "傑佛遜",
    "Barr": "巴爾",
    "Cook": "庫克",
    "Kugler": "庫格勒",
    "Barkin": "巴爾金",
    "Bostic": "波斯蒂克",
    "Daly": "戴莉",
    "Mester": "梅斯特",
    "Musalem": "穆薩萊姆",
    "Schmid": "施密德",
    "Harker": "哈克",
    "Kashkari": "卡什卡里",
    "Goolsbee": "古爾斯比",
    "Logan": "洛根",
    
    // 期限與拍賣
    "4-Week": "4週期",
    "8-Week": "8週期",
    "17-Week": "17週期",
    "52-Week": "52週期",
    "3-Month": "3個月期",
    "6-Month": "6個月期",
    "2-Year": "2年期",
    "3-Year": "3年期",
    "5-Year": "5年期",
    "7-Year": "7年期",
    "10-Year": "10年期",
    "20-Year": "20年期",
    "30-Year": "30年期",
    "Bill Auction": "短期國債拍賣",
    "Note Auction": "中期國債拍賣",
    "Bond Auction": "長期國債拍賣",
    "TIPS Auction": "抗通膨國債拍賣",
    "Auction": "拍賣",
    
    // 總經指標與方向
    "Consumer Price Index": "消費者物價指數",
    "Producer Price Index": "生產者物價指數",
    "Price Index": "物價指數",
    "Prices": "價格",
    "Import": "進口",
    "Export": "出口",
    "Manufacturing": "製造業",
    "Production": "產出",
    "Industrial": "工業",
    "Retail Sales": "零售銷售",
    "Sales": "銷售",
    "Retail": "零售",
    "Inventories": "庫存",
    "Business": "商業",
    "Wholesale": "批發",
    "Optimism Index": "樂觀指數",
    "Optimism": "樂觀",
    "Consumer Confidence": "消費者信心",
    "Confidence": "信心",
    "Sentiment": "情緒",
    "Consumer": "消費者",
    "Employment": "就業",
    "Unemployment Rate": "失業率",
    "Unemployment": "失業",
    "New Home": "新屋",
    "Existing Home": "成屋",
    "Pending Home": "待過戶成屋",
    "Housing Starts": "新屋開工",
    "Building Permits": "營建許可",
    "Construction": "營建",
    "Spending": "支出",
    "Income": "所得",
    "Personal": "個人",
    "Real": "實際",
    "Budget": "預算",
    "Balance": "收支",
    "Trade Balance": "貿易收支",
    "Trade": "貿易",
    "Deficit": "赤字",
    "Surplus": "盈餘",
    
    // 能源與每週指標
    "EIA": "EIA",
    "API": "API",
    "Crude Oil": "原油",
    "Gasoline": "汽油",
    "Distillate": "蒸餾油",
    "Natural Gas": "天然氣",
    "Stocks Change": "庫存變動",
    "Stock Change": "庫存變動",
    "Stocks": "庫存",
    "Stock": "庫存",
    "Weekly": "每週",
    "Average": "平均",
    "Earnings": "薪資",
    "Hourly": "每小時",
    "Hours": "工時",
    "Rate": "率",
    "Decision": "決策",
    "Interest": "利率",
    "Federal Funds": "聯邦基金",
    
    // 年增率/月增率/季增率
    "YoY": "年增率",
    "MoM": "月增率",
    "QoQ": "季增率",
    "y/y": "年增率",
    "m/m": "月增率",
    "q/q": "季增率"
  };

  for (const [en, zh] of Object.entries(glossary)) {
    const reg = new RegExp("\\b" + en + "\\b", "gi");
    translatedTitle = translatedTitle.replace(reg, zh);
  }
  
  // 為了防止單詞被 word-boundary 匹配遺漏（例如帶有連字元或緊貼符號），
  // 針對一些無邊界的關鍵詞進行二次替換
  const nonBoundaryGlossary = {
    "yoy": "年增率",
    "mom": "月增率",
    "qoq": "季增率",
    "y/y": "年增率",
    "m/m": "月增率",
    "q/q": "季增率"
  };
  for (const [en, zh] of Object.entries(nonBoundaryGlossary)) {
    const reg = new RegExp(en, "gi");
    translatedTitle = translatedTitle.replace(reg, zh);
  }

  // 清理多餘空格
  translatedTitle = translatedTitle.replace(/\s+/g, ' ').trim();

  // 若標題翻譯後，Description 仍為英文或空，可嘗試對 indicator 進行簡單漢化
  let finalDesc = e.comment || e.indicator || '';
  if (finalDesc && finalDesc === e.indicator) {
    // 說明文字就是指標名，直接使用翻譯後的標題作為描述，對用戶更友善
    finalDesc = `美國發布最新之${translatedTitle}數據。`;
  }

  return {
    title: translatedTitle,
    description: finalDesc
  };
}

// 格式化數值，拼接 scale (如 K, M) 與 unit (如 %)
function formatValue(val, scale, unit) {
  if (val === null || val === undefined) return '';
  let str = val.toString();
  if (scale) {
    str += scale;
  }
  if (unit) {
    str += unit;
  }
  return str;
}

// 備用生成邏輯 (同 eventGenerator.js) 確保 API 不通時仍有高品質模擬數據
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

function generateMockMacroEvents(year, month) {
  const events = [];
  const daysInMonth = getDaysInMonth(year, month);
  const baseDateStr = "2026-06-15";

  // 1. NFP
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
      compareType: "higher-better",
      description: "美國非農就業人數及失業率，評估勞動力市場健康度與聯準會政策走向的最重要指標之一。",
      importance: 3
    });
  }

  // 2. CPI
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
      compareType: "lower-better",
      description: "美國通膨核心數據，衡量消費者物價變動幅度，對降息/升息決策有極大影響力。",
      importance: 3
    });

    // 3. PPI
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
        compareType: "lower-better",
        description: "衡量生產者交易的商品價格變動，為 CPI 的領先指標之一。",
        importance: 1
      });
    }
  }

  // 4. Retail Sales
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
      compareType: "higher-better",
      description: "美國消費市道晴雨表，衡量零售商店的總營業額，佔美國 GDP 佔比極大。",
      importance: 2
    });
  }

  // 5. FOMC
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
        compareType: "equal-neutral",
        description: "美國聯邦公開市場委員會公佈利率決策、聲明及經濟預測(季度會議)，隨後舉行記者會。",
        importance: 3
      });
    }
  }

  // 6. 每週初請失業金人數
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    if (date.getDay() === 4) {
      const dateStr = formatDate(year, month, day);
      const isPast = dateStr <= baseDateStr;
      const seed = day + month + year;
      const prevVal = 210 + (seed % 15);
      const consVal = prevVal + (seed % 5 - 2);
      const actVal = isPast ? consVal - (seed % 4 - 2) : "";

      events.push({
        id: `macro-claims-${year}-${month}-${day}`,
        title: "每週初請失業金人數",
        type: "macro",
        date: dateStr,
        time: "20:30",
        consensus: `${consVal}K`,
        actual: isPast ? `${actVal}K` : "",
        previous: `${prevVal}K`,
        compareType: "lower-better",
        description: "每週公佈一次的就業市場短期領先指標，反映失業及申領救濟金人數變化。",
        importance: 1
      });
    }
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

// 判斷事件重要性：3 (高/紅色), 2 (中/藍色), 1 (低/灰色)
function getStrictImportance(title, indicator) {
  const t = ((title || "") + " " + (indicator || "")).toLowerCase();
  
  const isHigh =
    t.includes("fomc") ||
    t.includes("cpi") ||
    t.includes("consumer price") ||
    t.includes("nonfarm") ||
    t.includes("non-farm") ||
    t.includes("unemployment");
    
  if (isHigh) return 3;
  
  const isMedium =
    t.includes("gdp") ||
    t.includes("pmi") ||
    t.includes("retail sales") ||
    t.includes("retail sale");
    
  if (isMedium) return 2;
  
  return 1;
}

// ==========================================
// 美股行情/財報背景靜默輪詢與本地快取系統
// ==========================================

const MOCK_STOCK_PROFILES = {
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

// 重要重磅數據指標家族分類，同一天同一時間只能保留一個核心指標，區分指標類型與核心/非核心以避免誤殺
function getEventFamily(title) {
  const t = (title || "").toLowerCase();
  const isCore = t.includes("core") || t.includes("核心");
  const suffix = isCore ? "-core" : "-headline";
  
  // PCE Family
  if (t.includes("pce") || t.includes("個人消費支出")) {
    if (t.includes("yoy") || t.includes("年增率")) return "pce-yoy" + suffix;
    if (t.includes("mom") || t.includes("月增率")) return "pce-mom" + suffix;
    return "pce-other" + suffix;
  }
  
  // CPI Family (Exclude inflation expectations like Michigan Inflation Expectations)
  if ((t.includes("cpi") || t.includes("消費者物價指數") || t.includes("inflation") || t.includes("通膨")) &&
      !(t.includes("expectation") || t.includes("預期") || t.includes("michigan") || t.includes("密西根"))) {
    if (t.includes("yoy") || t.includes("年增率")) return "cpi-yoy" + suffix;
    if (t.includes("mom") || t.includes("月增率")) return "cpi-mom" + suffix;
    return "cpi-index" + suffix;
  }
  
  // Unemployment Family (Distinguish standard from U-6)
  if (t.includes("unemployment") || t.includes("失業率")) {
    if (t.includes("u-6") || t.includes("u6")) return "unemployment-u6";
    return "unemployment-standard";
  }
  
  // Nonfarm Family (Distinguish standard headline from private NFP)
  if (t.includes("nonfarm") || t.includes("non-farm") || t.includes("非農")) {
    if (t.includes("private") || t.includes("私營") || t.includes("私人")) return "nonfarm-private";
    return "nonfarm-headline";
  }
  
  // GDP Family (Distinguish growth rate, price index, sales)
  if (t.includes("gdp") || t.includes("國內生產總值")) {
    if (t.includes("growth") || t.includes("rate") || t.includes("成長") || t.includes("增速")) return "gdp-growth";
    if (t.includes("price") || t.includes("物價") || t.includes("平減") || t.includes("deflator")) return "gdp-price";
    if (t.includes("sales") || t.includes("銷售")) return "gdp-sales";
    return "gdp-other";
  }
  
  // PMI Family (Distinguish services, manufacturing, composite)
  if (t.includes("pmi") || t.includes("採購經理人指數")) {
    if (t.includes("services") || t.includes("服務業")) return "pmi-services";
    if (t.includes("manufacturing") || t.includes("製造業")) return "pmi-manufacturing";
    return "pmi-other";
  }
  
  // Retail Sales Family (Distinguish MoM, YoY, ex autos, ex gas, control group)
  if (t.includes("retail sales") || t.includes("零售銷售")) {
    if (t.includes("yoy") || t.includes("年增率")) return "retail-yoy";
    if (t.includes("mom") || t.includes("月增率")) {
      if (t.includes("ex autos") || t.includes("扣除汽車")) return "retail-mom-ex-autos";
      if (t.includes("ex gas") || t.includes("扣除燃料")) return "retail-mom-ex-gas";
      if (t.includes("control") || t.includes("對照")) return "retail-mom-control";
      return "retail-mom-headline";
    }
    return "retail-other";
  }
  
  return null;
}

function getFallbackProfile(ticker) {
  const upper = ticker.toUpperCase();
  if (MOCK_STOCK_PROFILES[upper]) {
    return { ...MOCK_STOCK_PROFILES[upper], symbol: upper };
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
}

const earningsCache = {};
const EARNINGS_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

async function getRealEarningsDate(ticker) {
  const upperTicker = ticker.toUpperCase();
  const cached = earningsCache[upperTicker];
  
  if (cached && (Date.now() - cached.timestamp < EARNINGS_CACHE_DURATION)) {
    return cached.data;
  }

  // If rate limit is active, don't call
  if (isSimulating) {
    return cached ? cached.data : null; // fallback to old cached value or null
  }

  try {
    const today = new Date();
    // Use precise transaction range: from today - 15 days to today + 90 days
    const fromDate = new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const url = `https://finnhub.io/api/v1/calendar/earnings?from=${fromDate}&to=${toDate}&symbol=${upperTicker}&token=${finnhubToken}`;
    const response = await axios.get(url, { timeout: 4000 });
    const list = response.data.earningsCalendar || [];
    
    let earningsDate = null;
    if (list.length > 0) {
      // Sort to find the upcoming or closest future earnings date
      // We look for dates >= today's date
      const todayStr = today.toISOString().split('T')[0];
      const futureEarnings = list
        .filter(item => item.date >= todayStr)
        .sort((a, b) => a.date.localeCompare(b.date));
        
      if (futureEarnings.length > 0) {
        earningsDate = futureEarnings[0].date;
      } else {
        // If no future earnings, get the most recent past one
        const pastEarnings = list
          .filter(item => item.date < todayStr)
          .sort((a, b) => b.date.localeCompare(a.date));
        if (pastEarnings.length > 0) {
          earningsDate = pastEarnings[0].date;
        }
      }
    }

    // Cache the result (even if it's null, so we don't spam the API)
    earningsCache[upperTicker] = {
      timestamp: Date.now(),
      data: earningsDate
    };

    return earningsDate;
  } catch (error) {
    if (error.response && error.response.status === 429) {
      isSimulating = true;
      setTimeout(() => {
        isSimulating = false;
      }, 60000);
    }
    // Return old cached data if exists, otherwise null
    return cached ? cached.data : null;
  }
}

// 行情快取與訂閱列表 (集中式集中快取系統，完全杜絕多用戶連線消耗 API 額度)
const globalStockCache = {};
const activeTickers = new Set([
  "TSLA", "TSLL", "SPCX", "OUST", "SOFI", 
  "GRAB", "CRCL", "NVDA", "GOOG", "MSFT", 
  "AAPL", "ONDS", "SNOW", "AMZN", "COHR", 
  "AAOI", "LAC", "MP", "ORCL", "USAR"
]);

let isSimulating = false;
const finnhubToken = "d5ba1epr01qq0hq2kao0d5ba1epr01qq0hq2kaog";

// 初始化快取 (不產生任何虛假 mock 財報日期，初始值設為 null，等待背景輪詢異步填充)
for (const ticker of activeTickers) {
  const prof = getFallbackProfile(ticker);
  globalStockCache[ticker] = {
    name: prof.name,
    price: prof.price,
    change: prof.change,
    pct: prof.pct,
    earningsDate: null
  };
}

// 股價跳動模擬輔助
function simulateStockTick(ticker) {
  const cached = globalStockCache[ticker];
  if (!cached) return;
  
  const pctChange = (Math.random() * 0.4 - 0.2) / 100; // -0.2% ~ +0.2%
  const oldPrice = cached.price;
  const newPrice = parseFloat((oldPrice * (1 + pctChange)).toFixed(2));
  
  const baseProfile = getFallbackProfile(ticker);
  const totalChange = parseFloat((newPrice - baseProfile.price).toFixed(2));
  const totalPct = parseFloat((totalChange / baseProfile.price * 100).toFixed(2));
  
  cached.price = newPrice;
  cached.change = totalChange;
  cached.pct = totalPct;
}

// 背景輪詢定時任務 (集中式背景查詢，不依賴任何用戶的前端請求，每 60 秒統一撈取所有 active 股票數據)
async function pollWatchlistData() {
  const tickersArray = Array.from(activeTickers);
  for (const ticker of tickersArray) {
    if (isSimulating) {
      simulateStockTick(ticker);
      continue;
    }
    
    try {
      const url = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${finnhubToken}`;
      const response = await axios.get(url, { timeout: 3000 });
      const data = response.data;
      
      // 取得真實財報日期 (15分鐘快取保護)
      const earningsDate = await getRealEarningsDate(ticker);
      
      if (data && typeof data.c === 'number' && data.c > 0) {
        const cached = globalStockCache[ticker] || {};
        cached.price = data.c;
        cached.change = data.d || 0;
        cached.pct = data.dp || 0;
        cached.earningsDate = earningsDate;
        const baseProfile = getFallbackProfile(ticker);
        cached.name = baseProfile.name;
        globalStockCache[ticker] = cached;
      } else {
        simulateStockTick(ticker);
      }
      // 間隔 100ms 避免過快連發 API
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      if (error.response && error.response.status === 429) {
        isSimulating = true;
        // 1分鐘後嘗試恢復
        setTimeout(() => {
          isSimulating = false;
        }, 60000);
      }
      simulateStockTick(ticker);
    }
  }
}

// 立即執行一次，以在此端點被請求前，先異步抓取好真實行情與財報
pollWatchlistData();
// 背景輪詢定時器 (間隔拉長至 60 秒以減輕 Finnhub API 負載)
setInterval(pollWatchlistData, 60000);

// 額外的微幅隨機跳動，使 UI 更加靈動
setInterval(() => {
  for (const ticker of activeTickers) {
    if (Math.random() < 0.3) {
      simulateStockTick(ticker);
    }
  }
}, 5000);

// API Endpoint - 取得美股行情自選看板 (多用戶隔離設計：前端一律只讀取集中快取，不觸發任何即時 API 呼叫)
app.get('/api/watchlist', (req, res) => {
  const tickersStr = req.query.tickers || "";
  const tickers = tickersStr.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  
  const responseData = {};
  for (const ticker of tickers) {
    activeTickers.add(ticker);
    if (!globalStockCache[ticker]) {
      const prof = getFallbackProfile(ticker);
      globalStockCache[ticker] = {
        name: prof.name,
        price: prof.price,
        change: prof.change,
        pct: prof.pct,
        earningsDate: null
      };
    }
    responseData[ticker] = globalStockCache[ticker];
  }
  
  responseData.isSimulating = isSimulating;
  res.json(responseData);
});

// API Endpoint - 集中式股票數據快取回傳 (無條件直接回傳 globalStockCache)
app.get('/api/stocks', (req, res) => {
  res.json(globalStockCache);
});

// ==========================================
// 數據清洗、去重合併核心處理模組 (processRawEvents)
// ==========================================

// STRICT deduplication check: only duplicate if identical names after normalizing punctuation and s.a. tags
function areTitlesDuplicate(t1, t2) {
  const normalize = (title) => {
    return (title || "")
      .toLowerCase()
      .replace(/[\(\)\-\,\.\/]/g, " ")
      .replace(/\b(s\.?a\.?|seasonally adjusted|季調|調整|adjusted)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  };
  const n1 = normalize(t1);
  const n2 = normalize(t2);
  if (n1 === "" || n2 === "") return false;
  return n1 === n2;
}

function getPrimaryScore(title) {
  const t = (title || "").toLowerCase();
  let score = 0;
  if (t.includes("pmi")) score += 10;
  if (t.includes("index")) score += 8;
  if (t.includes("orders")) score += 5;
  score -= t.length * 0.1;
  return score;
}

// 智慧去重計分，優先保留數據完整、非s.a.調整的常規/重磅事件
function getEventPriorityScore(item) {
  let score = 0;
  const t = (item.title || "").toLowerCase();
  
  if (t.includes("年增率") || t.includes("yoy")) score += 5;
  if (t.includes("月增率") || t.includes("mom")) score += 3;
  if (t.includes("s.a") || t.includes("seasonally adjusted") || t.includes("季調") || t.includes("調整")) score -= 15;
  
  // 資料完整度得分 (實際值、預測值、前值)
  if (item.actual && item.actual.toString().trim() !== "") score += 10;
  if (item.consensus && item.consensus.toString().trim() !== "") score += 5;
  if (item.previous && item.previous.toString().trim() !== "") score += 2;
  
  return score;
}

// 判斷兩個事件是否為高度相似的同時間重複事件
function isDuplicateEvent(e1, e2) {
  if (e1.date !== e2.date || e1.time !== e2.time) return false;
  
  const f1 = getEventFamily(e1.title);
  const f2 = getEventFamily(e2.title);
  
  if (f1 || f2) {
    return f1 === f2; // If either has a family, they must belong to the exact same family metric to be duplicates
  }
  
  if (e1.title === e2.title) return true;
  return areTitlesDuplicate(e1.title, e2.title);
}

function processRawEvents(tvResult) {
  // 1. 黑名單過濾：排除國債、Redbook、Mortgage、鑽井數、非鮑爾演講等低指引事件
  const filteredResult = tvResult.filter(e => {
    const title = (e.title || "").toLowerCase();
    const indicator = (e.indicator || "").toLowerCase();
    const t = title + " " + indicator;
    
    // 特例排除：主席鮑威爾演講保留
    if (t.includes("speech") || t.includes("speaks") || t.includes("speak")) {
      return t.includes("powell");
    }
    
    const blacklist = ['auction', 'note', 'bill', 'bond', 'redbook', 'mortgage', 'rig count'];
    for (const keyword of blacklist) {
      if (t.includes(keyword)) {
        return false;
      }
    }
    return true;
  });

  // 2. 第一階段：同時間英文標題相似去重
  const uniqueResult = [];
  for (const event of filteredResult) {
    const dupIndex = uniqueResult.findIndex(ue => 
      ue.date === event.date && 
      areTitlesDuplicate(ue.title, event.title)
    );
    
    if (dupIndex !== -1) {
      const existingEvent = uniqueResult[dupIndex];
      const scoreExisting = getPrimaryScore(existingEvent.title);
      const scoreNew = getPrimaryScore(event.title);
      if (scoreNew > scoreExisting) {
        uniqueResult[dupIndex] = event;
      }
    } else {
      uniqueResult.push(event);
    }
  }

  // 3. 資料欄位轉換與中文化翻譯
  const transformed = uniqueResult.map(e => {
    const dateObj = new Date(e.date);
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    
    const hh = String(dateObj.getHours()).padStart(2, '0');
    const mm = String(dateObj.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}:${mm}`;

    const translated = translateEvent(e);

    return {
      id: `macro-tv-${e.id}`,
      title: translated.title,
      type: "macro",
      date: dateStr,
      time: timeStr,
      consensus: formatValue(e.forecast, e.scale, e.unit),
      actual: formatValue(e.actual, e.scale, e.unit),
      previous: formatValue(e.previous, e.scale, e.unit),
      compareType: getCompareType(e.title, e.indicator),
      description: translated.description,
      importance: getStrictImportance(e.title, e.indicator)
    };
  });

  // 4. 第二階段：智慧型去重與合併過濾器 (帶白名單防誤殺保護，精準比對與保留)
  const finalResult = [];
  for (const item of transformed) {
    const tLower = (item.title || "").toLowerCase().trim();
    
    // 白名單防禦線：如果事件名稱完全等於 "CPI" 或 "消費者物價指數"、"非農就業人口"、"聯準會利率決策"，不論如何都絕對不允許被 filter 剔除
    const isWhitelisted = (
      tLower === "cpi" ||
      tLower === "消費者物價指數" ||
      tLower === "消費者物價指數 (cpi)" ||
      tLower === "非農就業人口" ||
      tLower === "非農就業人口數據 (nfp)" ||
      tLower === "聯準會利率決策" ||
      tLower === "聯準會利率決策 (fomc)" ||
      tLower.includes("非農就業人口") ||
      tLower.includes("聯準會利率決策")
    ) && !(tLower.includes("s.a") || tLower.includes("季調") || tLower.includes("調整") || tLower.includes("adjusted"));

    const dupIndex = finalResult.findIndex(fi => isDuplicateEvent(fi, item));
    
    if (dupIndex !== -1) {
      const existingItem = finalResult[dupIndex];
      
      // 白名單優先級邏輯
      const existingWhitelisted = (
        (existingItem.title || "").toLowerCase().trim() === "cpi" ||
        (existingItem.title || "").toLowerCase().trim() === "消費者物價指數" ||
        (existingItem.title || "").toLowerCase().trim() === "消費者物價指數 (cpi)" ||
        (existingItem.title || "").toLowerCase().trim() === "非農就業人口" ||
        (existingItem.title || "").toLowerCase().trim() === "非農就業人口數據 (nfp)" ||
        (existingItem.title || "").toLowerCase().trim() === "聯準會利率決策" ||
        (existingItem.title || "").toLowerCase().trim() === "聯準會利率決策 (fomc)" ||
        (existingItem.title || "").toLowerCase().includes("非農就業人口") ||
        (existingItem.title || "").toLowerCase().includes("聯準會利率決策")
      );
      
      if (isWhitelisted && !existingWhitelisted) {
        // 新項目是主體白名單，直接覆蓋舊的非白名單重複項 (例如 CPI 覆蓋 CPI s.a)
        finalResult[dupIndex] = item;
      } else if (!isWhitelisted && existingWhitelisted) {
        // 舊項目是主體白名單，保留舊項目 (丟棄新項目，如 s.a 雜訊項)
        // Do nothing (keeps existingItem)
      } else {
        // 否則，進行常規分數比較去重
        const scoreExisting = getEventPriorityScore(existingItem);
        const scoreNew = getEventPriorityScore(item);
        if (scoreNew > scoreExisting) {
          finalResult[dupIndex] = item;
        }
      }
    } else {
      finalResult.push(item);
    }
  }

  return finalResult;
}

const economicCalendarCache = {};
const ECONOMIC_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

async function fetchEconomicEvents(from, to) {
  const cacheKey = `${from}_${to}`;
  const cached = economicCalendarCache[cacheKey];
  if (cached && (Date.now() - cached.timestamp < ECONOMIC_CACHE_DURATION)) {
    return cached.data;
  }

  try {
    const url = `https://economic-calendar.tradingview.com/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&countries=US`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.tradingview.com/',
        'Origin': 'https://www.tradingview.com',
        'Accept': 'application/json',
        'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8'
      },
      timeout: 10000
    });

    const tvResult = response.data.result || [];
    const finalResult = processRawEvents(tvResult);
    
    economicCalendarCache[cacheKey] = {
      timestamp: Date.now(),
      data: finalResult
    };

    return finalResult;
  } catch (error) {
    const parsedEvents = [];
    try {
      const startDate = new Date(from);
      const endDate = new Date(to);
      
      let currYear = startDate.getFullYear();
      let currMonth = startDate.getMonth() + 1;
      const endYear = endDate.getFullYear();
      const endMonth = endDate.getMonth() + 1;
      
      while (currYear < endYear || (currYear === endYear && currMonth <= endMonth)) {
        const mockEvents = generateMockMacroEvents(currYear, currMonth);
        parsedEvents.push(...mockEvents);
        
        currMonth++;
        if (currMonth > 12) {
          currMonth = 1;
          currYear++;
        }
      }
      
      const startStr = from.substring(0, 10);
      const endStr = to.substring(0, 10);
      return parsedEvents.filter(e => e.date >= startStr && e.date <= endStr);
    } catch (fallbackError) {
      return [];
    }
  }
}

// API Endpoint - 取得總經事件數據 (整合 15 分鐘記憶體快取)
app.get('/api/economic-calendar', async (req, res) => {
  let { from, to, year, month } = req.query;

  // 處理參數缺省：若未提供 from/to 則利用 year/month 計算
  if (!from || !to) {
    if (year && month) {
      const y = parseInt(year);
      const m = parseInt(month);
      const lastDay = getDaysInMonth(y, m);
      from = `${y}-${String(m).padStart(2, '0')}-01T00:00:00Z`;
      to = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59Z`;
    } else {
      // 預設為目前時間開始的未來 30 天
      const start = new Date();
      const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
      from = start.toISOString();
      to = end.toISOString();
    }
  }

  const finalResult = await fetchEconomicEvents(from, to);
  return res.json(finalResult);
});

// ==========================================
// LINE Bot 整合系統與即時推播/晨報排程
// ==========================================

const line = require('@line/bot-sdk');

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || ''
};

// 只有當密鑰設定齊全時才初始化 LINE 客戶端，避免本地測試無變數時報錯
const lineClient = lineConfig.channelAccessToken && lineConfig.channelSecret ? new line.Client(lineConfig) : null;

// LINE Webhook 路由 (安全防空指引：若密鑰未設定，則使用 dummy 中間件避免伺服器啟動崩潰)
const lineWebhookMiddleware = (req, res, next) => {
  if (lineConfig.channelSecret && lineConfig.channelAccessToken) {
    try {
      return line.middleware(lineConfig)(req, res, next);
    } catch (err) {
      console.error("LINE middleware configuration error:", err.message);
      return res.status(500).send("LINE Bot Configuration Error");
    }
  } else {
    return res.status(200).send("LINE Bot is not configured. Please set environment variables.");
  }
};

app.post('/api/line-webhook', lineWebhookMiddleware, (req, res) => {
  if (!lineClient) {
    return res.json([]);
  }
  Promise
    .all(req.body.events.map(handleLineEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      res.status(500).end();
    });
});

app.post('/webhook', lineWebhookMiddleware, (req, res) => {
  if (!lineClient) {
    return res.json([]);
  }
  Promise
    .all(req.body.events.map(handleLineEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      res.status(500).end();
    });
});



async function handleLineEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }
  
  const userText = event.message.text.trim();
  
  if (userText.includes("晨報") || userText.includes("今日") || userText.includes("要事")) {
    const reportText = await generateDailyReportText();
    return lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: reportText
    });
  }
  
  return lineClient.replyMessage(event.replyToken, {
    type: 'text',
    text: `您好！我是財經終端機 Bot。🤖\n\n輸入「今日要事」或「晨報」可獲取今日重大數據與高衝擊總經指標預報！`
  });
}

// 產生晨報文字
async function generateDailyReportText() {
  const now = new Date();
  const taipeiTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Taipei" }));
  const dateStr = taipeiTime.toISOString().split('T')[0];
  
  const fromStr = `${dateStr}T00:00:00Z`;
  const toStr = `${dateStr}T23:59:59Z`;
  
  const events = await fetchEconomicEvents(fromStr, toStr);
  
  const highImpactEvents = events.filter(e => e.importance === 3);
  
  let reportText = `📢 財經終端機晨報 (${dateStr})\n`;
  reportText += `----------------------------\n`;
  
  if (highImpactEvents.length === 0) {
    reportText += `今天無重大高衝擊總經事件。`;
  } else {
    reportText += `今日高衝擊核心要事預告：\n\n`;
    highImpactEvents.forEach((e, idx) => {
      reportText += `${idx + 1}. 【${e.title}】\n`;
      reportText += `   ⏱️ 時間: ${e.time}\n`;
      reportText += `   📊 預測值: ${e.consensus || '無'}\n`;
      reportText += `   📉 前值: ${e.previous || '無'}\n\n`;
    });
  }
  
  reportText += `💡 提示：輸入「今日要事」可隨時查詢即時狀態。`;
  return reportText;
}

// 定時晨報發送機制 (每天台灣時間早上 08:00)
let lastMorningReportDate = "";

async function checkMorningReportSchedule() {
  const now = new Date();
  const taipeiTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Taipei" }));
  const dateStr = taipeiTime.toISOString().split('T')[0];
  
  if (taipeiTime.getHours() === 8 && taipeiTime.getMinutes() === 0 && lastMorningReportDate !== dateStr) {
    lastMorningReportDate = dateStr;
    if (lineClient) {
      try {
        const reportText = await generateDailyReportText();
        const targetId = process.env.LINE_USER_ID || process.env.LINE_GROUP_ID;
        if (targetId) {
          await lineClient.pushMessage(targetId, {
            type: 'text',
            text: reportText
          });
        }
      } catch (err) {
        // 靜默容錯
      }
    }
  }
}
setInterval(checkMorningReportSchedule, 30000); // 每30秒檢測一次時間

// 即時數據發布捷報 (每30秒背景輪詢今日數據發布狀態)
const liveActualCache = {};
let isFirstLiveLoad = true;

async function checkLiveEventActuals() {
  try {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const fromStr = `${dateStr}T00:00:00Z`;
    const toStr = `${dateStr}T23:59:59Z`;
    
    const processed = await fetchEconomicEvents(fromStr, toStr);
    
    for (const event of processed) {
      if (event.importance === 3 && event.type === 'macro') {
        const cacheKey = event.id;
        const currentActual = event.actual || "";
        
        if (currentActual !== "") {
          const cachedActual = liveActualCache[cacheKey];
          if (cachedActual === undefined || cachedActual === "") {
            liveActualCache[cacheKey] = currentActual;
            if (!isFirstLiveLoad) {
              await sendLiveDataFlash(event);
            }
          }
        } else {
          if (liveActualCache[cacheKey] === undefined) {
            liveActualCache[cacheKey] = "";
          }
        }
      }
    }
    
    if (isFirstLiveLoad) {
      isFirstLiveLoad = false;
    }
  } catch (err) {
    // 靜默容錯
  }
}

async function sendLiveDataFlash(event) {
  if (!lineClient) return;
  try {
    const targetId = process.env.LINE_USER_ID || process.env.LINE_GROUP_ID;
    if (!targetId) return;
    
    let impactText = "📊 數據公佈分析中...";
    if (event.consensus && event.actual) {
      const actVal = parseFloat(event.actual.replace(/[^0-9.-]/g, ''));
      const consVal = parseFloat(event.consensus.replace(/[^0-9.-]/g, ''));
      if (!isNaN(actVal) && !isNaN(consVal)) {
        if (event.compareType === 'higher-better') {
          impactText = actVal > consVal ? "🟢 數據優於預期 (利多)" : (actVal < consVal ? "🔴 數據遜於預期 (利空)" : "⚪ 數據符合預期 (中性)");
        } else if (event.compareType === 'lower-better') {
          impactText = actVal < consVal ? "🟢 數據優於預期 (通膨降溫 / 利多)" : (actVal > consVal ? "🔴 數據遜於預期 (通膨升溫 / 利空)" : "⚪ 數據符合預期 (中性)");
        }
      }
    }
    
    let text = `⚡ 財經即時快訊 ⚡\n`;
    text += `----------------------------\n`;
    text += `📢 指標：${event.title}\n`;
    text += `⏱️ 時間：${event.time}\n`;
    text += `📌 最新實際值：${event.actual}\n`;
    text += `📊 市場預測值：${event.consensus || '無'}\n`;
    text += `📉 歷史前值：${event.previous || '無'}\n`;
    text += `----------------------------\n`;
    text += `💡 影響：${impactText}`;
    
    await lineClient.pushMessage(targetId, {
      type: 'text',
      text: text
    });
  } catch (err) {
    // 靜默容錯
  }
}
// 啟動即時發布檢測
setInterval(checkLiveEventActuals, 30000);

app.listen(PORT, () => {
  console.log(`伺服器正在運行: http://localhost:${PORT}`);
});
