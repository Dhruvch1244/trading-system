package com.trading.tradeapi.mapper;

import com.trading.tradeapi.domain.Account;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface AccountMapper {

    @Select("SELECT id, account_reference, cash_balance, buying_power, status, version, last_updated " +
            "FROM accounts WHERE id = #{id}")
    Account findById(@Param("id") Long id);
}
