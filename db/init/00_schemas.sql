-- System of record: PostgreSQL 16.
-- `auth` schema is owned/used exclusively by auth-service (users, refresh tokens).
-- `public` schema holds accounts, instruments, orders, positions, trade events.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS auth;
