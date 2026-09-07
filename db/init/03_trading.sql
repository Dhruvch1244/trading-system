-- Owned by trade-api (read/write) and trade-executor (read/write, one transaction per order).

CREATE TABLE positions (
    account_id      BIGINT NOT NULL REFERENCES accounts(id),
    symbol          VARCHAR(16) NOT NULL REFERENCES instruments(symbol),
    qty             INT NOT NULL DEFAULT 0,
    avg_cost        NUMERIC(18,4) NOT NULL DEFAULT 0,
    PRIMARY KEY (account_id, symbol)
);

CREATE TABLE watchlist (
    account_id      BIGINT NOT NULL REFERENCES accounts(id),
    symbol          VARCHAR(16) NOT NULL REFERENCES instruments(symbol),
    added_on        TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (account_id, symbol)
);

CREATE TABLE orders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id          BIGINT NOT NULL REFERENCES accounts(id),
    symbol              VARCHAR(16) NOT NULL REFERENCES instruments(symbol),
    side                VARCHAR(4) NOT NULL CHECK (side IN ('BUY', 'SELL')),
    order_type          VARCHAR(8) NOT NULL CHECK (order_type IN ('MARKET', 'LIMIT')),
    qty                 INT NOT NULL CHECK (qty > 0),
    price               NUMERIC(18,4),
    status              VARCHAR(16) NOT NULL DEFAULT 'PENDING'
                            CHECK (status IN ('PENDING', 'FILLED', 'REJECTED', 'CANCELLED')),
    idempotency_key     VARCHAR(64) NOT NULL UNIQUE,
    created_on          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_account_id ON orders(account_id);
CREATE INDEX idx_orders_status ON orders(status);

CREATE TABLE executions (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id        UUID NOT NULL REFERENCES orders(id),
    quantity        INT NOT NULL CHECK (quantity > 0),
    price           NUMERIC(18,4) NOT NULL,
    executed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_executions_order_id ON executions(order_id);

CREATE TABLE balance_history (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_id          BIGINT NOT NULL REFERENCES accounts(id),
    type                VARCHAR(24) NOT NULL
                            CHECK (type IN ('DEPOSIT', 'WITHDRAWAL', 'TRADE_SETTLEMENT', 'FEE', 'ADJUSTMENT')),
    amount              NUMERIC(18,2) NOT NULL,
    related_order_id    UUID REFERENCES orders(id),
    created_on          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_balance_history_account_id ON balance_history(account_id);
