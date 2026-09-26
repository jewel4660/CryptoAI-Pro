// src/exchange.ts

const BINANCE_BASE_URL = "https://api.binance.com";

/* =========================================================
   TYPES
========================================================= */

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Ticker {
  symbol: string;

  price: number;
  last: number;

  bid: number;
  ask: number;

  high: number;
  low: number;

  percentage: number;
  quoteVolume: number;

  timestamp: number;
}

/* =========================================================
   HELPERS
========================================================= */

function normalizeBinanceSymbol(symbol: string): string {
  return String(symbol)
    .trim()
    .toUpperCase()
    .replace("/", "");
}

/* =========================================================
   SYMBOLS
========================================================= */

export async function getSymbols(
  limit?: number
): Promise<string[]> {
  const response = await fetch(
    `${BINANCE_BASE_URL}/api/v3/exchangeInfo`
  );

  if (!response.ok) {
    throw new Error(
      `Binance exchangeInfo error: ${response.status}`
    );
  }

  const data = (await response.json()) as {
    symbols?: Array<{
      symbol: string;
      status: string;
      quoteAsset: string;
      isSpotTradingAllowed?: boolean;
    }>;
  };

  let symbols = (data.symbols ?? [])
    .filter(
      (item) =>
        item.status === "TRADING" &&
        item.quoteAsset === "USDT" &&
        item.isSpotTradingAllowed !== false
    )
    .map((item) => item.symbol);

  /*
   * Apply limit only when supplied.
   */
  if (
    typeof limit === "number" &&
    Number.isFinite(limit) &&
    limit > 0
  ) {
    symbols = symbols.slice(0, Math.floor(limit));
  }

  return symbols;
}

/* =========================================================
   TICKER
========================================================= */

export async function getTicker(
  symbol: string
): Promise<Ticker> {
  const binanceSymbol =
    normalizeBinanceSymbol(symbol);

  if (!binanceSymbol) {
    throw new Error(
      "Symbol is required"
    );
  }

  const response = await fetch(
    `${BINANCE_BASE_URL}/api/v3/ticker/24hr?symbol=${encodeURIComponent(
      binanceSymbol
    )}`
  );

  if (!response.ok) {
    throw new Error(
      `Binance ticker error: ${response.status}`
    );
  }

  const data = (await response.json()) as {
    symbol: string;
    lastPrice: string;
    bidPrice: string;
    askPrice: string;
    highPrice: string;
    lowPrice: string;
    priceChangePercent: string;
    quoteVolume: string;
    closeTime: number;
  };

  const last = Number(
    data.lastPrice
  );

  return {
    symbol: data.symbol,

    price: last,
    last,

    bid: Number(data.bidPrice),
    ask: Number(data.askPrice),

    high: Number(data.highPrice),
    low: Number(data.lowPrice),

    percentage: Number(
      data.priceChangePercent
    ),

    quoteVolume: Number(
      data.quoteVolume
    ),

    timestamp: Number(
      data.closeTime
    ),
  };
}

/* =========================================================
   CANDLES
========================================================= */

export async function getCandles(
  symbol: string,
  interval = "15m",
  limit = 200
): Promise<Candle[]> {
  const binanceSymbol =
    normalizeBinanceSymbol(symbol);

  if (!binanceSymbol) {
    throw new Error(
      "Symbol is required"
    );
  }

  const safeLimit = Math.min(
    1000,
    Math.max(
      1,
      Math.floor(
        Number(limit) || 200
      )
    )
  );

  const url =
    `${BINANCE_BASE_URL}/api/v3/klines` +
    `?symbol=${encodeURIComponent(
      binanceSymbol
    )}` +
    `&interval=${encodeURIComponent(
      interval
    )}` +
    `&limit=${safeLimit}`;

  const response =
    await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Binance candles error: ${response.status}`
    );
  }

  const data =
    (await response.json()) as unknown[];

  return data.map((row) => {
    const kline = row as [
      number,
      string,
      string,
      string,
      string,
      string,
      number,
      string,
      number,
      string,
      string,
      string
    ];

    return {
      timestamp: Number(
        kline[0]
      ),

      open: Number(
        kline[1]
      ),

      high: Number(
        kline[2]
      ),

      low: Number(
        kline[3]
      ),

      close: Number(
        kline[4]
      ),

      volume: Number(
        kline[5]
      ),
    };
  });
}
