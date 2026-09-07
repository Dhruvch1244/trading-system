package com.trading.tradeapi.mapper;

import com.trading.tradeapi.domain.Execution;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;
import java.util.UUID;

@Mapper
public interface ExecutionMapper {

    @Select("SELECT id, order_id, quantity, price, executed_at FROM executions WHERE order_id = #{orderId, jdbcType=OTHER} ORDER BY executed_at")
    List<Execution> findByOrderId(@Param("orderId") UUID orderId);
}
