const axios = require('axios');

async function test() {
  const url = "https://economic-calendar.tradingview.com/events?from=2026-06-01T00:00:00Z&to=2026-06-30T23:59:59Z&countries=US";
  console.log("Fetching from:", url);
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.tradingview.com/',
        'Origin': 'https://www.tradingview.com',
        'Accept': 'application/json',
        'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8'
      }
    });
    console.log("Success! Status:", res.status);
    console.log("Type of data:", typeof res.data);
    console.log("Data keys:", Object.keys(res.data));
    
    // If it has a custom property like "result" or "events"
    if (res.data.result) {
      console.log("result type:", typeof res.data.result);
      console.log("result length:", res.data.result.length);
      console.log("Sample result event:", JSON.stringify(res.data.result[0], null, 2));
    } else {
      console.log("Truncated res.data:", JSON.stringify(res.data).substring(0, 1000));
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

test();
