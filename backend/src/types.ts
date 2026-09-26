// src/types.ts

export type Direction =
  | "LONG"
  | "SHORT"
  | "NO_TRADE";

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Signal {
  signal_id: string;
  symbol: string;
  direction: Direction;
  status: string;

  long_score: number;
  short_score: number;

  confidence: number;
  probability_estimate: number;

  entry: {
    low: number;
    high: number;
    preferred: number;
    type: string;
  };

  stop_loss: {
    price: number;
    distance_percent: number;
    reason: string;
  };

  take_profit: {
    tp1: number;
    tp2: number;
    tp3: number;
  };

  risk_reward: {
    tp1: number;
    tp2: number;
    tp3: number;
  };

  position: {
    risk_percent: number;
    risk_amount: number;
    quantity: number;
    leverage: number;
  };

  market_regime: string;

  reasons: string[];

  warnings: string[];

  created_at: string;

  expires_at: string;
}
