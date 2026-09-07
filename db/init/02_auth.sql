-- Owned by auth-service. No other service should read/write this schema.
-- 1:1 with public.accounts - account_id is both PK and FK, per the ER diagram
-- (an account is provisioned first, then a user's credentials are attached to it).

CREATE TABLE auth.users (
    account_id      BIGINT PRIMARY KEY REFERENCES accounts(id),
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    phone_no        VARCHAR(20),
    password_hash   VARCHAR(255) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE auth.refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id      BIGINT NOT NULL REFERENCES auth.users(account_id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) NOT NULL UNIQUE,
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_account_id ON auth.refresh_tokens(account_id);
