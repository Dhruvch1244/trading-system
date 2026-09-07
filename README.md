# Fauxnance trading platform — local deployment

A small trading platform: Angular frontend, NestJS auth, Spring Boot trade API,
a Kafka-driven trade executor, a mocked external quote API, and a Postgres
system of record with a DuckDB/Streamlit analytics side-car. Everything runs
in Docker; Kafka runs as its own compose stack to simulate living on a
separate EC2 box.

## Architecture

```
Angular (4200) --HTTPS--> auth-service (3000, NestJS)   [signs/verifies JWT, owns credentials]
     |                         |
     '--HTTPS Bearer JWT--> trade-api (8080, Spring Boot/MyBatis)
                                 |  \
                        produces 'orders'   reads accounts/positions/orders
                                 |
                          Kafka (kafka-ec2, simulated EC2 host)
                                 |
                     consumes 'orders', group=trade-executor
                                 |
                        trade-executor (8082) --HTTPS X-Api-Key--> fauxnance-mock (5000)
                                 |
                     one JDBC transaction: order + cash + position
                                 v
                            Postgres (5432)
                                 |
                     analytics_reader (read-only) --batch ETL-->
                          analytics-service (one-shot) --> DuckDB file
                                 |
                       analytics-dashboard (8501, Streamlit)
```

## Quick start

```bash
git clone https://github.com/Dhruvch1244/trading-system.git
cd trading-system
cp .env.example .env
# At minimum rotate JWT_SECRET, POSTGRES_PASSWORD, POSTGRES_ANALYTICS_READER_PASSWORD,
# and FAUXNANCE_API_KEY in .env before this touches anything shared or long-lived.

docker compose -f infra/docker-compose.kafka.yml up -d   # Kafka first - see why below
docker compose up -d --build                              # everything else
```

First boot takes a few minutes (Maven/npm/pip installs happen inside the build).
Open **http://localhost:4200** and either sign in with the seeded demo account
(`demo@trading.local` / `password123`) or register a new one.

## Prerequisites

- Docker Desktop running (WSL2 backend on Windows)
- Nothing else — every service builds from source in its own container

## First-time setup

```bash
cp .env.example .env
# Edit .env: at minimum rotate JWT_SECRET, POSTGRES_PASSWORD,
# POSTGRES_ANALYTICS_READER_PASSWORD, FAUXNANCE_API_KEY before anything
# resembling a shared or long-lived environment.
```

## Start it

Kafka is a **separate compose stack** standing in for a separate EC2 machine —
bring it up first, since the main stack attaches to its network:

```bash
docker compose -f infra/docker-compose.kafka.yml up -d
docker compose up -d --build
```

First boot takes a few minutes (Maven/npm/pip installs). Subsequent
`docker compose up -d --build` calls are much faster thanks to layer caching.

## URLs

| Service              | URL                              | Notes |
|----------------------|-----------------------------------|-------|
| Frontend             | http://localhost:4200            | Login `demo@trading.local`/`password123`, or register a new account |
| Auth service          | http://localhost:3000/health     | `/auth/login`, `/auth/signup`, `/auth/refresh`, `/auth/logout`, `/auth/me` |
| Node auth stub        | http://localhost:3001/health     | Fixture only — accepts `demo@trading.local` with any password |
| Trade REST API        | http://localhost:8080/health     | JWT-protected under `/api/v1/**` |
| Trade executor        | http://localhost:8082/actuator/health | No other endpoints exposed, by design |
| Fauxnance mock        | http://localhost:5000/health     | `X-Api-Key: dev-fauxnance-key` (or your `.env` value) |
| Analytics dashboard   | http://localhost:8501            | Click "Refresh from Postgres" on first load |
| Postgres              | localhost:5432                   | `trading_app` / your `.env` password |
| Kafka (simulated EC2) | localhost:9092                   | Internal advertised listener: `kafka-ec2:29092` |

## Features

- **Registration & login** — self-service signup on top of a NestJS auth-service that's the
  only thing that ever touches a password (bcrypt-hashed, never logged).
- **~250-instrument universe** — real, recognizable tickers across equities/ETFs/REITs
  (`db/init/05_instruments_universe.sql`); the Fauxnance mock synthesizes a deterministic quote
  for any symbol it doesn't have curated data for, so growing the universe never requires
  touching the mock.
- **Order lifecycle** — place (MARKET/LIMIT), fill-or-reject via Kafka + trade-executor,
  cancel while still PENDING, full blotter with execution detail.
- **Watchlist** — add/remove symbols via a searchable typeahead, live quotes.
- **Portfolio** — positions enriched with live last price, market value, and unrealized P&L;
  balance history of every cash movement.
- **Analytics** — batch ETL from Postgres into a DuckDB star schema, read via a Streamlit
  dashboard with an on-demand refresh button.

## Security notes

- JWT (HS256) issued by auth-service, verified independently by trade-api on every
  `/api/v1/**` request; the shared secret lives only in `.env`.
- Refresh tokens are stored as SHA-256 hashes (never in plaintext), rotate on every use, and
  are revoked server-side on logout (`POST /auth/logout`).
- Login is rate-limited (5 failed attempts → 60s lockout per email) and timing-safe (a bcrypt
  compare always runs, even for an unknown email, so response time can't be used to enumerate
  registered accounts).
- Idempotency keys on order placement are checked against the *requesting* account before
  ever returning a cached order — a key collision from a different account is rejected with
  409, not silently handed someone else's order data.
- CORS on trade-api is restricted to `CORS_ALLOWED_ORIGINS` (defaults to
  `http://localhost:4200`) rather than a wildcard.
- Before deploying this anywhere shared: rotate every secret in `.env`, and note that
  trade-api/trade-executor currently share one Postgres role rather than least-privilege
  per-service roles — fine at this scale, worth revisiting before production.

## Common operations

Rebuild and restart one service after a code change:
```bash
docker compose up -d --build trade-api
```

Tail logs:
```bash
docker compose logs -f trade-executor
```

Run the analytics batch job on demand (also triggerable from the dashboard's sidebar):
```bash
docker compose run --rm analytics-service
```

Inspect Kafka directly:
```bash
docker exec kafka-ec2 /opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:29092 --list
docker exec kafka-ec2 /opt/kafka/bin/kafka-consumer-groups.sh --bootstrap-server localhost:29092 --describe --group trade-executor
```

Tear down (keeps volumes: Postgres data, Kafka logs, DuckDB file):
```bash
docker compose down
docker compose -f infra/docker-compose.kafka.yml down
```

Tear down and wipe all data:
```bash
docker compose down -v
docker compose -f infra/docker-compose.kafka.yml down -v
```

## Cutting Kafka over to a real EC2 instance

The app services never talk to Kafka directly by container name in a way
that's hardcoded — everything goes through `KAFKA_BOOTSTRAP_SERVERS` in `.env`.

1. Launch an EC2 instance (Amazon Linux 2023 or similar), install Docker.
2. Copy `infra/docker-compose.kafka.yml` to the instance.
3. Edit its `KAFKA_ADVERTISED_LISTENERS` — replace `EXTERNAL://localhost:9092`
   with `EXTERNAL://<ec2-public-or-private-ip>:9092`.
4. `docker compose -f docker-compose.kafka.yml up -d` on the instance.
5. In the EC2 security group, open port 9092 **only** to the trade-api/
   trade-executor host's IP — never `0.0.0.0/0`.
6. In the main stack's `.env`, set `KAFKA_BOOTSTRAP_SERVERS=<ec2-ip>:9092`.
7. Remove the `kafka-ec2-net` external network block from `docker-compose.yml`
   (trade-api and trade-executor services) since they no longer share a
   Docker network with Kafka.
8. `docker compose up -d --build trade-api trade-executor`.

No application code changes are needed — the bootstrap address is the only
thing that moves.

## Known rough edges

- `../leapDay2Docker` is an unrelated older scaffold (different services,
  placeholder registry image names, a hardcoded RDS password) — not part of
  this stack, left untouched.
- If you ever recreate the `kafka-ec2` container without its named volume
  (`docker compose -f infra/docker-compose.kafka.yml down -v`), all topics
  and any in-flight PENDING orders referencing them are gone. Re-run the
  topic-init step (`docker compose -f infra/docker-compose.kafka.yml up -d`)
  and restart `trade-api`/`trade-executor` so their consumers rejoin cleanly.
- The demo seed data (`db/init/04_seed.sql`) only runs once, on an empty
  Postgres volume. To reseed, `docker compose down -v` first (destroys all
  Postgres data) then `docker compose up -d`.
