import ccxt from "ccxt";
import { Candle } from "./types.js";

export const exchange = new ccxt.binance({
  enableRateLimit: true,
  options: {
    defaultType: "spot",
  },
});

/**
 * Get top USDT spot symbols by quote volume.
 * Maximum 500 symbols.
 */
export async function getSymbols(limit = 500): Promise<string[]> {
  const markets = await exchange.loadMarkets();

  return Object.values(markets)
    .filter(
      (market: any) =>
        market.active === true &&
        market.spot === true &&
        market.quote === "USDT"
    )
    .sort(
      (a: any, b: any) =>
        Number(b.info?.quoteVolume ?? 0) -
        Number(a.info?.quoteVolume ?? 0)
    )
    .slice(0, Math.min(500, Math.max(1, limit)))
    .map((market: any) => market.symbol);
}

/**
 * Get ticker information.
 */
export async function getTicker(symbol: string) {
  return exchange.fetchTicker(symbol);
}

/**
 * Get OHLCV candles and convert them to our Candle type.
 */
export async function getCandles(
  symbol: string,
  timeframe = "15m",
  limit = 300
): Promise<Candle[]> {
  const safeLimit = Math.min(1000, Math.max(50, limit));

  const rows = await exchange.fetchOHLCV(
    symbol,
    timeframe,
    undefined,
    safeLimit
  );

  return rows
    .filter((row) => Array.isArray(row) && row.length >= 6)
    .map((row): Candle => ({
      timestamp: Number(row[0]),
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
      volume: Number(row[5]),
    }));
}
