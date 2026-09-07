package com.trading.tradeapi.mapper;

import com.trading.tradeapi.domain.PriceAlert;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface PriceAlertMapper {

    @Insert("INSERT INTO price_alerts (account_id, symbol, target_price, direction) " +
            "VALUES (#{accountId}, #{symbol}, #{targetPrice}, #{direction})")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(PriceAlert alert);

    @Select("SELECT id, account_id, symbol, target_price, direction, triggered_at, seen_at, created_at " +
            "FROM price_alerts WHERE account_id = #{accountId} ORDER BY created_at DESC")
    List<PriceAlert> findByAccountId(@Param("accountId") Long accountId);

    @Select("SELECT id, account_id, symbol, target_price, direction, triggered_at, seen_at, created_at " +
            "FROM price_alerts WHERE symbol = #{symbol} AND triggered_at IS NULL")
    List<PriceAlert> findActiveBySymbol(@Param("symbol") String symbol);

    @Delete("DELETE FROM price_alerts WHERE id = #{id} AND account_id = #{accountId}")
    int delete(@Param("id") Long id, @Param("accountId") Long accountId);

    @Update("UPDATE price_alerts SET triggered_at = now() WHERE id = #{id}")
    int markTriggered(@Param("id") Long id);

    @Update("UPDATE price_alerts SET seen_at = now() WHERE account_id = #{accountId} AND triggered_at IS NOT NULL AND seen_at IS NULL")
    int markAllSeen(@Param("accountId") Long accountId);

    @Select("SELECT count(*) FROM price_alerts WHERE account_id = #{accountId} AND triggered_at IS NOT NULL AND seen_at IS NULL")
    int countUnseen(@Param("accountId") Long accountId);
}
