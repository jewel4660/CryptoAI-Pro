import ccxt from "ccxt";

export type Candle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

const exchange = new ccxt.binance({
  enableRateLimit: true,
  options: {
    defaultType: "future",
  },
});

export async function getCandles(
  symbol: string,
  timeframe: string = "15m",
  limit: number = 200
): Promise<Candle[]> {
  const rows = await exchange.fetchOHLCV(
    symbol,
    timeframe,
    undefined,
    limit
  );

  return rows
    .filter((r) => r.length >= 6)
    .map((r) => ({
      timestamp: Number(r[0]),
      open: Number(r[1]),
      high: Number(r[2]),
      low: Number(r[3]),
      close: Number(r[4]),
      volume: Number(r[5]),
    }));
}

export async function getTicker(symbol: string) {
  const ticker = await exchange.fetchTicker(symbol);

  return {
    symbol,
    last: Number(ticker.last ?? 0),
    bid: Number(ticker.bid ?? 0),
    ask: Number(ticker.ask ?? 0),
    high: Number(ticker.high ?? 0),
    low: Number(ticker.low ?? 0),
    volume: Number(ticker.baseVolume ?? 0),
  };
}

export async function getPrice(symbol: string): Promise<number> {
  const ticker = await exchange.fetchTicker(symbol);
  return Number(ticker.last ?? 0);
}

export default exchange;
