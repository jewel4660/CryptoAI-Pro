const BINANCE_BASE_URL =
  "https://data-api.binance.vision";

export type Candle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type TickerData = {
  symbol: string;
  timestamp: number;
  last: number;
  bid: number;
  ask: number;
  high: number;
  low: number;
  volume: number;
  percentage: number;
  quoteVolume: number;
};

/* ================================
   HELPERS
================================ */

function normalizeSymbol(symbol: string): string {
  return symbol
    .replace("/", "")
    .replace("-", "")
    .replace("_", "")
    .toUpperCase();
}

async function binanceRequest<T>(
  endpoint: string
): Promise<T> {
  const response = await fetch(
    `${BINANCE_BASE_URL}${endpoint}`
  );

  if (!response.ok) {
    const text = await response.text();

    throw new Error(
      `Binance API error ${response.status}: ${text}`
    );
  }

  return (await response.json()) as T;
}

/* ================================
   GET SYMBOLS
================================ */

export async function getSymbols(
  limit: number = 100
): Promise<string[]> {
  type ExchangeInfo = {
    symbols?: Array<{
      symbol?: string;
      status?: string;
      quoteAsset?: string;
      isSpotTradingAllowed?: boolean;
    }>;
  };

  const data =
    await binanceRequest<ExchangeInfo>(
      "/api/v3/exchangeInfo"
    );

  const symbols = (data.symbols ?? [])
    .filter((item) => {
      return (
        item.status === "TRADING" &&
        item.quoteAsset === "USDT"
      );
    })
    .map((item) => item.symbol)
    .filter(
      (symbol): symbol is string =>
        typeof symbol === "string"
    );

  return symbols.slice(
    0,
    Math.max(1, limit)
  );
}

/* ================================
   GET CANDLES
================================ */

export async function getCandles(
  symbol: string,
  timeframe: string = "15m",
  limit: number = 200
): Promise<Candle[]> {
  const cleanSymbol =
    normalizeSymbol(symbol);

  const safeLimit = Math.min(
    Math.max(1, limit),
    1000
  );

  type Kline = [
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

  const rows =
    await binanceRequest<Kline[]>(
      `/api/v3/klines?symbol=${encodeURIComponent(
        cleanSymbol
      )}&interval=${encodeURIComponent(
        timeframe
      )}&limit=${safeLimit}`
    );

  return rows.map((row) => ({
    timestamp: Number(row[0]),
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: Number(row[5]),
  }));
}

/* ================================
   GET TICKER
================================ */

export async function getTicker(
  symbol: string
): Promise<TickerData> {
  const cleanSymbol =
    normalizeSymbol(symbol);

  type BinanceTicker = {
    symbol?: string;
    priceChangePercent?: string;
    lastPrice?: string;
    bidPrice?: string;
    askPrice?: string;
    highPrice?: string;
    lowPrice?: string;
    volume?: string;
    quoteVolume?: string;
    closeTime?: number;
  };

  const ticker =
    await binanceRequest<BinanceTicker>(
      `/api/v3/ticker/24hr?symbol=${encodeURIComponent(
        cleanSymbol
      )}`
    );

  return {
    symbol:
      ticker.symbol ?? cleanSymbol,

    timestamp: Number(
      ticker.closeTime ?? Date.now()
    ),

    last: Number(
      ticker.lastPrice ?? 0
    ),

    bid: Number(
      ticker.bidPrice ?? 0
    ),

    ask: Number(
      ticker.askPrice ?? 0
    ),

    high: Number(
      ticker.highPrice ?? 0
    ),

    low: Number(
      ticker.lowPrice ?? 0
    ),

    volume: Number(
      ticker.volume ?? 0
    ),

    percentage: Number(
      ticker.priceChangePercent ?? 0
    ),

    quoteVolume: Number(
      ticker.quoteVolume ?? 0
    ),
  };
}

/* ================================
   GET CURRENT PRICE
================================ */

export async function getPrice(
  symbol: string
): Promise<number> {
  const cleanSymbol =
    normalizeSymbol(symbol);

  type PriceResponse = {
    symbol?: string;
    price?: string;
  };

  const data =
    await binanceRequest<PriceResponse>(
      `/api/v3/ticker/price?symbol=${encodeURIComponent(
        cleanSymbol
      )}`
    );

  return Number(
    data.price ?? 0
  );
}
