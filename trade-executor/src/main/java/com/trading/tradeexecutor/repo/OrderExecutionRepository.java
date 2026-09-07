package com.trading.tradeexecutor.repo;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

@Repository
public class OrderExecutionRepository {

    private final JdbcTemplate jdbc;

    public OrderExecutionRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record OrderRow(UUID id, Long accountId, String symbol, String side, String orderType,
                            Integer qty, BigDecimal price, String status) {}

    public record AccountRow(Long id, BigDecimal cashBalance, BigDecimal buyingPower) {}

    public record PositionRow(Long accountId, String symbol, Integer qty, BigDecimal avgCost) {}

    public Optional<OrderRow> findOrderById(UUID orderId) {
        return jdbc.query(
                "SELECT id, account_id, symbol, side, order_type, qty, price, status FROM orders WHERE id = ?",
                (rs, rowNum) -> new OrderRow(
                        UUID.fromString(rs.getString("id")),
                        rs.getLong("account_id"),
                        rs.getString("symbol"),
                        rs.getString("side"),
                        rs.getString("order_type"),
                        rs.getInt("qty"),
                        rs.getBigDecimal("price"),
                        rs.getString("status")),
                orderId
        ).stream().findFirst();
    }

    /** Locks the account row for the duration of the enclosing transaction. */
    public AccountRow findAccountForUpdate(Long accountId) {
        return jdbc.queryForObject(
                "SELECT id, cash_balance, buying_power FROM accounts WHERE id = ? FOR UPDATE",
                (rs, rowNum) -> new AccountRow(rs.getLong("id"), rs.getBigDecimal("cash_balance"), rs.getBigDecimal("buying_power")),
                accountId
        );
    }

    public Optional<PositionRow> findPositionForUpdate(Long accountId, String symbol) {
        return jdbc.query(
                "SELECT account_id, symbol, qty, avg_cost FROM positions WHERE account_id = ? AND symbol = ? FOR UPDATE",
                (rs, rowNum) -> new PositionRow(rs.getLong("account_id"), rs.getString("symbol"), rs.getInt("qty"), rs.getBigDecimal("avg_cost")),
                accountId, symbol
        ).stream().findFirst();
    }

    public void updateOrderStatus(UUID orderId, String status) {
        jdbc.update("UPDATE orders SET status = ? WHERE id = ?", status, orderId);
    }

    public void insertExecution(UUID orderId, int quantity, BigDecimal price) {
        jdbc.update("INSERT INTO executions (order_id, quantity, price) VALUES (?, ?, ?)", orderId, quantity, price);
    }

    public void updateAccountBalances(Long accountId, BigDecimal newCashBalance, BigDecimal newBuyingPower) {
        jdbc.update(
                "UPDATE accounts SET cash_balance = ?, buying_power = ?, version = version + 1, last_updated = now() WHERE id = ?",
                newCashBalance, newBuyingPower, accountId
        );
    }

    public void insertBalanceHistory(Long accountId, String type, BigDecimal amount, UUID relatedOrderId) {
        jdbc.update(
                "INSERT INTO balance_history (account_id, type, amount, related_order_id) VALUES (?, ?, ?, ?)",
                accountId, type, amount, relatedOrderId
        );
    }

    public void upsertPositionBuy(Long accountId, String symbol, int qty, BigDecimal fillPrice) {
        jdbc.update("""
                INSERT INTO positions (account_id, symbol, qty, avg_cost)
                VALUES (?, ?, ?, ?)
                ON CONFLICT (account_id, symbol) DO UPDATE SET
                    avg_cost = ((positions.qty * positions.avg_cost) + (EXCLUDED.qty * EXCLUDED.avg_cost))
                               / NULLIF((positions.qty + EXCLUDED.qty), 0),
                    qty = positions.qty + EXCLUDED.qty
                """, accountId, symbol, qty, fillPrice);
    }

    public void reducePositionSell(Long accountId, String symbol, int qty) {
        jdbc.update(
                "UPDATE positions SET qty = qty - ? WHERE account_id = ? AND symbol = ?",
                qty, accountId, symbol
        );
    }
}
