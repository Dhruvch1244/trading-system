-- Owned by trade-api. Checked against every market-data tick (see the Kafka listener), so a
-- crossed alert fires within one poll cycle of the price actually moving.
CREATE TABLE price_alerts (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_id      BIGINT NOT NULL REFERENCES accounts(id),
    symbol          VARCHAR(16) NOT NULL REFERENCES instruments(symbol),
    target_price    NUMERIC(18,4) NOT NULL,
    direction       VARCHAR(6) NOT NULL CHECK (direction IN ('ABOVE', 'BELOW')),
    triggered_at    TIMESTAMPTZ,
    seen_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_price_alerts_account_id ON price_alerts(account_id);
CREATE INDEX idx_price_alerts_symbol_active ON price_alerts(symbol) WHERE triggered_at IS NULL;
