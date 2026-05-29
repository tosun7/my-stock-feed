// Vercel Serverless Function
// Yahoo Finance API의 CORS 우회 프록시
//
// 호출 방식:
//   /api/yahoo?endpoint=chart&ticker=NVDA&range=5d
//   /api/yahoo?endpoint=quoteSummary&ticker=NVDA
//
// 응답: Yahoo Finance의 JSON 그대로 반환

export default async function handler(req, res) {
  // CORS 헤더 (브라우저 호출 허용)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  // 쿼리 파라미터 파싱
  const { endpoint, ticker, range, interval } = req.query;

  if (!ticker) {
    return res.status(400).json({ error: 'ticker parameter required' });
  }

  // Yahoo Finance URL 조립
  let yahooUrl;
  if (endpoint === 'chart') {
    const rangeParam = range || '5d';
    const intervalParam = interval || '1d';
    yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=${intervalParam}&range=${rangeParam}&includePrePost=true`;
  } else if (endpoint === 'quoteSummary') {
    yahooUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=price,summaryDetail`;
  } else {
    return res.status(400).json({ error: 'invalid endpoint. use "chart" or "quoteSummary"' });
  }

  try {
    // Yahoo Finance 호출 (서버 간 호출이라 CORS 무관)
    const response = await fetch(yahooUrl, {
      headers: {
        // Yahoo가 일부 봇 요청 차단하므로 User-Agent 설정
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Yahoo Finance returned ${response.status}`,
        ticker
      });
    }

    const data = await response.json();

    // 캐싱 (브라우저 + Vercel CDN에서 60초 캐시)
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

    return res.status(200).json(data);
  } catch (error) {
    console.error('Yahoo fetch error:', error);
    return res.status(500).json({
      error: error.message,
      ticker
    });
  }
}
