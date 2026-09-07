package com.trading.tradeapi.mapper;

import com.trading.tradeapi.domain.BalanceHistoryEntry;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.math.BigDecimal;
import java.util.List;

@Mapper
public interface BalanceHistoryMapper {

    @Select("SELECT id, account_id, type, amount, related_order_id, created_on " +
            "FROM balance_history WHERE account_id = #{accountId} ORDER BY created_on DESC LIMIT #{limit}")
    List<BalanceHistoryEntry> findByAccountId(@Param("accountId") Long accountId, @Param("limit") int limit);

    @Insert("INSERT INTO balance_history (account_id, type, amount) VALUES (#{accountId}, #{type}, #{amount})")
    int insert(@Param("accountId") Long accountId, @Param("type") String type, @Param("amount") BigDecimal amount);
}
