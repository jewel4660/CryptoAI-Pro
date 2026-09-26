import ccxt from "ccxt";

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

const exchange = new ccxt.binance({
  enableRateLimit: true,
  options: {
    defaultType: "future",
  },
});

export async function getSymbols(
  limit: number = 100
): Promise<string[]> {
  await exchange.loadMarkets();

  const markets = Object.values(exchange.markets);

  const symbols = markets
    .filter((market: any) => {
      return (
        market.active !== false &&
        market.quote === "USDT" &&
        (
          market.type === "swap" ||
          market.contract === true ||
          market.linear === true
        )
      );
    })
    .map((market: any) => market.symbol)
    .filter(
      (symbol): symbol is string => Boolean(symbol)
    );

  return [...new Set(symbols)].slice(
    0,
    Math.max(1, limit)
  );
}

export async function getCandles(
  symbol: string,
  timeframe: string = "15m",
  limit: number = 200
): Promise<Candle[]> {
  const rows = await exchange.fetchOHLCV(
    symbol,
    timeframe,
    undefined,
    limit,
    {}
  );

  return rows
    .filter((row) => row.length >= 6)
    .map((row) => ({
      timestamp: Number(row[0]),
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
      volume: Number(row[5]),
    }));
}

export async function getTicker(
  symbol: string
): Promise<TickerData> {
  const ticker = await exchange.fetchTicker(
    symbol,
    {}
  );

  return {
    symbol,

    timestamp: Number(
      ticker.timestamp ?? Date.now()
    ),

    last: Number(
      ticker.last ?? 0
    ),

    bid: Number(
      ticker.bid ?? 0
    ),

    ask: Number(
      ticker.ask ?? 0
    ),

    high: Number(
      ticker.high ?? 0
    ),

    low: Number(
      ticker.low ?? 0
    ),

    volume: Number(
      ticker.baseVolume ?? 0
    ),

    percentage: Number(
      ticker.percentage ?? 0
    ),

    quoteVolume: Number(
      ticker.quoteVolume ?? 0
    ),
  };
}

export async function getPrice(
  symbol: string
): Promise<number> {
  const ticker = await exchange.fetchTicker(
    symbol,
    {}
  );

  return Number(
    ticker.last ?? 0
  );
}

export default exchange;
