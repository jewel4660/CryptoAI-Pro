# CryptoAI Pro — Online Build Package

This is a mobile-friendly source package for an online/cloud build workflow.

Included:
- Android Studio project
- Node.js TypeScript backend
- Binance public market data through CCXT
- 1–500 market scanner API
- LONG / SHORT / NO TRADE signal engine
- EMA, RSI, ATR, MACD, Bollinger, VWAP-style calculations
- Market structure basics: HH/HL/LH/LL and breakout/breakdown
- Dynamic entry, SL, TP1/TP2/TP3 and R:R
- Risk/position sizing
- Signal history schema
- Paper-trading-ready architecture
- Docker deployment
- GitHub Actions Android debug APK build workflow

## Important
The system does not guarantee profit or 100% accuracy. It never fabricates unavailable market data.

## Easiest mobile workflow

1. Upload this ZIP to a GitHub repository.
2. GitHub Actions will build the Android debug APK.
3. Open the Actions run and download the `cryptoai-debug-apk` artifact.
4. Deploy `backend/` to a Node/Docker host.
5. Set the Android backend URL in `ApiConfig.kt` (HTTPS recommended).
6. Push the change and rebuild the APK.

## Backend
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

## Scanner
`GET /api/v1/scanner?limit=500&timeframe=15m`

The scanner is rate-limit aware and sequential by default. For production, add a queue/worker pool and Redis cache rather than firing 500 requests simultaneously.

## Live market data
Public Binance market data does not require API keys. Private trading/account keys, if added later, must remain server-side.
