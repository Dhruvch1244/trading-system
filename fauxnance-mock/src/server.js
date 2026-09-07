'use strict';

const express = require('express');
const { INSTRUMENTS, getQuote } = require('./data');

const PORT = process.env.PORT || 5000;
const API_KEY = process.env.FAUXNANCE_API_KEY || 'dev-fauxnance-key';
const DAILY_LIMIT = parseInt(process.env.FAUXNANCE_DAILY_LIMIT || '2000', 10);

const app = express();

// --- Rate limiting: 2000 requests/day per the documented contract, reset at UTC midnight. ---
let requestCount = 0;
let windowStartDay = new Date().toISOString().slice(0, 10);

function resetWindowIfNewDay() {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== windowStartDay) {
    windowStartDay = today;
    requestCount = 0;
  }
}

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use((req, res, next) => {
  if (req.path === '/health') return next();

  const providedKey = req.header('X-Api-Key');
  if (!providedKey || providedKey !== API_KEY) {
    return res.status(401).json({ error: 'unauthorized', message: 'missing or invalid X-Api-Key' });
  }

  resetWindowIfNewDay();
  requestCount += 1;
  res.set('X-RateLimit-Limit', String(DAILY_LIMIT));
  res.set('X-RateLimit-Remaining', String(Math.max(0, DAILY_LIMIT - requestCount)));

  if (requestCount > DAILY_LIMIT) {
    return res.status(429).json({
      error: 'rate_limit_exceeded',
      message: `daily limit of ${DAILY_LIMIT} requests exceeded`,
    });
  }

  next();
});

app.get('/quotes/:symbol', (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const result = getQuote(symbol);
  if (!result) {
    return res.status(404).json({ error: 'not_found', message: `unknown symbol ${symbol}` });
  }
  res.json(result);
});

app.get('/quotes', (req, res) => {
  const symbolsParam = req.query.symbols;
  if (!symbolsParam) {
    return res.status(400).json({ error: 'bad_request', message: 'symbols query param is required' });
  }

  const symbols = String(symbolsParam).split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
  const response = {};
  const unknown = [];

  for (const symbol of symbols) {
    const result = getQuote(symbol);
    if (result) {
      response[symbol] = result;
    } else {
      unknown.push(symbol);
    }
  }

  res.json({ quotes: response, unknownSymbols: unknown });
});

app.listen(PORT, () => {
  console.log(`fauxnance-mock listening on :${PORT}`);
  console.log(`known symbols: ${Object.keys(INSTRUMENTS).join(', ')}`);
});
