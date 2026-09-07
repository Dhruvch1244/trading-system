package com.trading.tradeapi.mapper;

import com.trading.tradeapi.domain.Account;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.math.BigDecimal;

@Mapper
public interface AccountMapper {

    @Select("SELECT id, account_reference, cash_balance, buying_power, status, version, last_updated " +
            "FROM accounts WHERE id = #{id}")
    Account findById(@Param("id") Long id);

    // Deposits add to both cash_balance and buying_power (a deposit is immediately available
    // to trade with, same as it would be after a real bank transfer clears).
    @Update("UPDATE accounts SET cash_balance = cash_balance + #{amount}, buying_power = buying_power + #{amount}, " +
            "version = version + 1, last_updated = now() WHERE id = #{accountId}")
    int addToBalance(@Param("accountId") Long accountId, @Param("amount") BigDecimal amount);
}
