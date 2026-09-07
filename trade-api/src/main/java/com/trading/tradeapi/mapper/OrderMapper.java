package com.trading.tradeapi.mapper;

import com.trading.tradeapi.domain.Order;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;
import java.util.UUID;

@Mapper
public interface OrderMapper {

    @Insert("INSERT INTO orders (id, account_id, symbol, side, order_type, qty, price, status, idempotency_key) " +
            "VALUES (#{id, jdbcType=OTHER}, #{accountId}, #{symbol}, #{side}, #{orderType}, #{qty}, #{price}, #{status}, #{idempotencyKey})")
    int insert(Order order);

    @Select("SELECT id, account_id, symbol, side, order_type, qty, price, status, idempotency_key, created_on " +
            "FROM orders WHERE id = #{id, jdbcType=OTHER}")
    Order findById(@Param("id") UUID id);

    @Select("SELECT id, account_id, symbol, side, order_type, qty, price, status, idempotency_key, created_on " +
            "FROM orders WHERE account_id = #{accountId} ORDER BY created_on DESC LIMIT #{limit}")
    List<Order> findByAccountId(@Param("accountId") Long accountId, @Param("limit") int limit);

    @Select("SELECT id, account_id, symbol, side, order_type, qty, price, status, idempotency_key, created_on " +
            "FROM orders WHERE idempotency_key = #{idempotencyKey}")
    Order findByIdempotencyKey(@Param("idempotencyKey") String idempotencyKey);

    // Conditional on current status: only ever cancels an order still PENDING, so this can
    // never clobber a fill/reject that trade-executor already wrote. Returns 0 rows affected
    // if the order was already resolved by the time this runs - that race is surfaced to the
    // caller as "could not cancel" rather than silently overwriting a real fill.
    @Update("UPDATE orders SET status = 'CANCELLED' WHERE id = #{id, jdbcType=OTHER} AND account_id = #{accountId} AND status = 'PENDING'")
    int cancelIfPending(@Param("id") UUID id, @Param("accountId") Long accountId);
}
