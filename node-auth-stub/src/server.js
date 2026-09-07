'use strict';

// Fixture auth service for Sprints 6-7 - issues JWTs with the same claim shape
// (sub, email, firstName, lastName) as auth-service, signed with the same shared
// secret, but with no real credential store: any password is accepted for a
// known fixture user, and unknown emails 401.

const express = require('express');
const jwt = require('jsonwebtoken');

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '15m';

const FIXTURE_USERS = {
  'demo@trading.local': { sub: '1', firstName: 'Demo', lastName: 'Trader' },
};

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/auth/login', (req, res) => {
  const { email } = req.body || {};
  const fixture = email && FIXTURE_USERS[email];
  if (!fixture) {
    return res.status(401).json({ error: 'unauthorized', message: 'unknown fixture user' });
  }

  const claims = { sub: fixture.sub, email, firstName: fixture.firstName, lastName: fixture.lastName };
  const accessToken = jwt.sign(claims, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  res.json({ accessToken, refreshToken: `stub-${fixture.sub}`, tokenType: 'Bearer' });
});

app.get('/auth/me', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  try {
    const claims = jwt.verify(authHeader.slice('Bearer '.length), JWT_SECRET);
    res.json({ accountId: claims.sub, email: claims.email, firstName: claims.firstName, lastName: claims.lastName });
  } catch {
    res.status(401).json({ error: 'invalid or expired token' });
  }
});

app.listen(PORT, () => {
  console.log(`node-auth-stub listening on :${PORT}`);
});
