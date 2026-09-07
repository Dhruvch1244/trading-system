-- Dev-only seed data so the frontend has something to show immediately.

INSERT INTO instruments (symbol, name, asset_class, currency, tradable) VALUES
    ('AAPL', 'Apple Inc.', 'EQUITY', 'USD', true),
    ('MSFT', 'Microsoft Corp.', 'EQUITY', 'USD', true),
    ('GOOGL', 'Alphabet Inc.', 'EQUITY', 'USD', true)
ON CONFLICT (symbol) DO NOTHING;

INSERT INTO accounts (account_reference, cash_balance, buying_power, status) VALUES
    ('DEMO-0001', 100000.00, 100000.00, 'ACTIVE')
ON CONFLICT (account_reference) DO NOTHING;

-- password_hash below is bcrypt("password123") - dev-only, auth-service will overwrite via real signup.
INSERT INTO auth.users (account_id, first_name, last_name, email, phone_no, password_hash)
SELECT id, 'Demo', 'Trader', 'demo@trading.local', NULL,
       '$2b$10$vrEClnRWXpjxv5kRk3a83.7oXZB1GKeSnB.2GtwnGtzjOzmSZzUH6'
FROM accounts WHERE account_reference = 'DEMO-0001'
ON CONFLICT (account_id) DO NOTHING;
