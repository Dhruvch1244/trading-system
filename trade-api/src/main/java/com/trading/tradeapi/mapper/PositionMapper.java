package com.trading.tradeapi.mapper;

import com.trading.tradeapi.domain.Position;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface PositionMapper {

    @Select("SELECT account_id, symbol, qty, avg_cost FROM positions WHERE account_id = #{accountId} ORDER BY symbol")
    List<Position> findByAccountId(@Param("accountId") Long accountId);
}
