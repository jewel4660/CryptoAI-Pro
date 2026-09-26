// src/api/Exchange.ts
// CryptoAI Pro - Live Render API

const API_BASE_URL =
  "https://cryptoai-pro-hux0.onrender.com";

export type Direction =
  | "LONG"
  | "SHORT"
  | "NO_TRADE";

export interface HealthResponse {
  ok: boolean;
  service: string;
  time: string;
}

export interface MarketResponse {
  ok: boolean;
  data: string[];
  count: number;
}

export interface TickerData {
  symbol: string;
  last: number | null;
  bid: number | null;
  ask: number | null;
  high: number | null;
  low: number | null;
  percentage: number | null;
  quoteVolume: number | null;
  timestamp: number | null;
}

export interface TickerResponse {
  ok: boolean;
  data: TickerData;
}

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CandlesResponse {
  ok: boolean;
  data: Candle[];
  symbol: string;
  timeframe: string;
  count: number;
}

export interface AnalysisResult {
  signal_id?: string;
  symbol: string;
  direction: Direction;
  status?: string;

  long_score?: number;
  short_score?: number;
  confidence?: number;
  probability_estimate?: number;

  entry?: number;
  entry_low?: number;
  entry_high?: number;

  stop_loss?: {
    price?: number;
    distance_percent?: number;
    reason?: string;
  };

  take_profit?: {
    tp1?: number;
    tp2?: number;
    tp3?: number;
  };

  risk_reward?: number;
  risk_amount?: number;
  position_size?: number;
  leverage?: number;

  market_regime?: string;

  reasoning?: string;
  reasons?: string[];
  warnings?: string[];

  created_at?: string;
  expires_at?: string;

  [key: string]: unknown;
}

export interface AnalysisResponse {
  ok: boolean;
  data: AnalysisResult;
}

export interface ScannerResponse {
  ok: boolean;
  requested: number;
  scanned: number;
  timeframe: string;
  data: AnalysisResult[];
}

/* =========================================================
   API ERROR
========================================================= */

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(
    message: string,
    status: number,
    details?: unknown
  ) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

/* =========================================================
   HELPERS
========================================================= */

function normalizeSymbol(symbol: string): string {
  let value = symbol.trim().toUpperCase();

  if (value.includes("/")) {
    return value;
  }

  if (value.endsWith("USDT")) {
    return value.replace(/USDT$/, "/USDT");
  }

  return `${value}/USDT`;
}

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const controller =
    new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 30000);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(options?.headers ?? {}),
      },
      signal: controller.signal,
    });

    const text =
      await response.text();

    let json: unknown = null;

    try {
      json = text
        ? JSON.parse(text)
        : null;
    } catch {
      json = null;
    }

    if (!response.ok) {
      const message =
        typeof json === "object" &&
        json !== null &&
        "message" in json &&
        typeof (
          json as { message?: unknown }
        ).message === "string"
          ? (json as { message: string })
              .message
          : `API request failed (${response.status})`;

      throw new ApiError(
        message,
        response.status,
        json
      );
    }

    return json as T;
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw new ApiError(
        "Request timeout. Render server may be waking up.",
        408
      );
    }

    if (error instanceof Error) {
      throw new ApiError(
        error.message,
        0
      );
    }

    throw new ApiError(
      "Network request failed",
      0,
      error
    );
  } finally {
    clearTimeout(timeout);
  }
}

/* =========================================================
   HEALTH
========================================================= */

export async function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>(
    "/health"
  );
}

/* =========================================================
   MARKETS
========================================================= */

export async function getMarkets(
  limit = 100
): Promise<MarketResponse> {
  const safeLimit = Math.min(
    500,
    Math.max(1, Math.floor(limit))
  );

  return request<MarketResponse>(
    `/api/v1/markets?limit=${safeLimit}`
  );
}

/* =========================================================
   TICKER
========================================================= */

export async function getTicker(
  symbol: string
): Promise<TickerResponse> {
  const normalized =
    normalizeSymbol(symbol);

  return request<TickerResponse>(
    `/api/v1/ticker/${encodeURIComponent(
      normalized
    )}`
  );
}

/* =========================================================
   CANDLES
========================================================= */

export async function getCandles(
  symbol: string,
  timeframe = "15m",
  limit = 200
): Promise<CandlesResponse> {
  const normalized =
    normalizeSymbol(symbol);

  const safeLimit = Math.min(
    1000,
    Math.max(1, Math.floor(limit))
  );

  return request<CandlesResponse>(
    `/api/v1/candles/${encodeURIComponent(
      normalized
    )}?timeframe=${encodeURIComponent(
      timeframe
    )}&limit=${safeLimit}`
  );
}

/* =========================================================
   ANALYSIS
========================================================= */

export async function getAnalysis(
  symbol: string,
  timeframe = "15m",
  balance = 1000,
  riskPercent = 1
): Promise<AnalysisResponse> {
  const normalized =
    normalizeSymbol(symbol);

  const params = new URLSearchParams({
    timeframe,
    balance: String(balance),
    riskPercent: String(riskPercent),
  });

  return request<AnalysisResponse>(
    `/api/v1/analysis/${encodeURIComponent(
      normalized
    )}?${params.toString()}`
  );
}

/* =========================================================
   SCANNER
========================================================= */

export async function getScanner(
  limit = 50,
  timeframe = "15m"
): Promise<ScannerResponse> {
  const safeLimit = Math.min(
    500,
    Math.max(1, Math.floor(limit))
  );

  const params = new URLSearchParams({
    limit: String(safeLimit),
    timeframe,
  });

  return request<ScannerResponse>(
    `/api/v1/scanner?${params.toString()}`
  );
}

/* =========================================================
   CONNECTION TEST
========================================================= */

export async function testConnection(): Promise<boolean> {
  try {
    const result =
      await getHealth();

    return result.ok === true;
  } catch {
    return false;
  }
}

/* =========================================================
   DEFAULT EXPORT
========================================================= */

const Exchange = {
  getHealth,
  getMarkets,
  getTicker,
  getCandles,
  getAnalysis,
  getScanner,
  testConnection,
};

export default Exchange;
