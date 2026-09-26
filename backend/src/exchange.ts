// src/exchange.ts

const BINANCE_BASE_URL = "https://api.binance.com";

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
}

export async function getSymbols(): Promise<string[]> {
  const response = await fetch(
    `${BINANCE_BASE_URL}/api/v3/exchangeInfo`
  );

  if (!response.ok) {
    throw new Error(
      `Binance exchangeInfo error: ${response.status}`
    );
  }

  const data = await response.json() as {
    symbols?: Array<{
      symbol: string;
      status: string;
      quoteAsset: string;
      isSpotTradingAllowed?: boolean;
    }>;
  };

  return (data.symbols ?? [])
    .filter(
      (item) =>
        item.status === "TRADING" &&
        item.quoteAsset === "USDT" &&
        item.isSpotTradingAllowed !== false
    )
    .map((item) => item.symbol);
}

export async function getTicker(
  symbol: string
): Promise<Ticker> {
  const response = await fetch(
    `${BINANCE_BASE_URL}/api/v3/ticker/price?symbol=${encodeURIComponent(
      symbol
    )}`
  );

  if (!response.ok) {
    throw new Error(
      `Binance ticker error: ${response.status}`
    );
  }

  const data = await response.json() as {
    symbol: string;
    price: string;
  };

  return {
    symbol: data.symbol,
    price: Number(data.price),
  };
}

export async function getCandles(
  symbol: string,
  interval = "15m",
  limit = 200
): Promise<Candle[]> {
  const url =
    `${BINANCE_BASE_URL}/api/v3/klines` +
    `?symbol=${encodeURIComponent(symbol)}` +
    `&interval=${encodeURIComponent(interval)}` +
    `&limit=${limit}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Binance candles error: ${response.status}`
    );
  }

  const data = await response.json() as unknown[];

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
      timestamp: Number(kline[0]),
      open: Number(kline[1]),
      high: Number(kline[2]),
      low: Number(kline[3]),
      close: Number(kline[4]),
      volume: Number(kline[5]),
    };
  });
}
