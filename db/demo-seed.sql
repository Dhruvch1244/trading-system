-- On-demand demo data generator - NOT part of db/init (those only run once on an empty
-- volume). Run manually against a live database when you want realistic analytics data:
--
--   docker exec -i postgres psql -U trading_app -d trading < db/demo-seed.sql
--
-- Creates 40 accounts + users with 5-15 orders each, randomly spread across the last 20
-- days, ~85% filled (with matching executions + balance_history), the rest rejected/pending.
-- Safe to re-run - each run adds another 40 accounts, it doesn't touch existing data.

DO $$
DECLARE
    symbols TEXT[];
    acct_id BIGINT;
    order_id UUID;
    sym TEXT;
    side TEXT;
    qty INT;
    price NUMERIC(18,4);
    status TEXT;
    ts TIMESTAMPTZ;
    i INT;
    j INT;
    order_count INT;
BEGIN
    SELECT array_agg(symbol) INTO symbols FROM instruments WHERE tradable = true;

    FOR i IN 1..40 LOOP
        INSERT INTO accounts (account_reference, cash_balance, buying_power, status)
        VALUES (
            'DEMO-SEED-' || lpad(i::text, 4, '0'),
            round((80000 + random() * 70000)::numeric, 2),
            round((80000 + random() * 70000)::numeric, 2),
            'ACTIVE'
        )
        RETURNING id INTO acct_id;

        INSERT INTO auth.users (account_id, first_name, last_name, email, password_hash)
        VALUES (
            acct_id, 'Demo', 'Trader ' || i, 'demo-seed-' || i || '@trading.local',
            -- bcrypt("password123") - same as the primary demo account, for consistency
            '$2b$10$vrEClnRWXpjxv5kRk3a83.7oXZB1GKeSnB.2GtwnGtzjOzmSZzUH6'
        );

        order_count := 5 + floor(random() * 11)::int; -- 5-15

        FOR j IN 1..order_count LOOP
            sym := symbols[1 + floor(random() * array_length(symbols, 1))];
            side := CASE WHEN random() < 0.5 THEN 'BUY' ELSE 'SELL' END;
            qty := 1 + floor(random() * 20)::int;
            price := round((10 + random() * 490)::numeric, 2);
            ts := now() - (floor(random() * 20) || ' days')::interval
                        - (floor(random() * 86400) || ' seconds')::interval;
            status := CASE
                WHEN random() < 0.85 THEN 'FILLED'
                WHEN random() < 0.5 THEN 'REJECTED'
                ELSE 'PENDING'
            END;

            INSERT INTO orders (account_id, symbol, side, order_type, qty, price, status, idempotency_key, created_on)
            VALUES (
                acct_id, sym, side, 'MARKET', qty,
                CASE WHEN status = 'FILLED' THEN price ELSE NULL END,
                status,
                'seed-' || acct_id || '-' || j || '-' || extract(epoch FROM ts)::text,
                ts
            )
            RETURNING id INTO order_id;

            IF status = 'FILLED' THEN
                INSERT INTO executions (order_id, quantity, price, executed_at)
                VALUES (order_id, qty, price, ts + interval '1 second');

                INSERT INTO balance_history (account_id, type, amount, related_order_id, created_on)
                VALUES (
                    acct_id, 'TRADE_SETTLEMENT',
                    CASE WHEN side = 'BUY' THEN -(qty * price) ELSE (qty * price) END,
                    order_id, ts + interval '1 second'
                );
            END IF;
        END LOOP;
    END LOOP;
END $$;
