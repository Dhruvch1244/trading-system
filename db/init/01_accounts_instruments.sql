-- Owned by trade-api (read/write) and trade-executor (read/write, one transaction per order).

CREATE TABLE accounts (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_reference   VARCHAR(32) NOT NULL UNIQUE,
    cash_balance        NUMERIC(18,2) NOT NULL DEFAULT 0,
    buying_power        NUMERIC(18,2) NOT NULL DEFAULT 0,
    status              VARCHAR(16) NOT NULL DEFAULT 'ACTIVE'
                            CHECK (status IN ('ACTIVE', 'SUSPENDED', 'CLOSED')),
    version             INT NOT NULL DEFAULT 0,
    last_updated        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE instruments (
    symbol              VARCHAR(16) PRIMARY KEY,
    name                VARCHAR(255) NOT NULL,
    asset_class         VARCHAR(32) NOT NULL DEFAULT 'EQUITY',
    currency            CHAR(3) NOT NULL DEFAULT 'USD',
    tradable            BOOLEAN NOT NULL DEFAULT true
);
