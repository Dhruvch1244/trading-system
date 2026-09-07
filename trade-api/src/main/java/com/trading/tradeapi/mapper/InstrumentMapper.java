package com.trading.tradeapi.mapper;

import com.trading.tradeapi.domain.Instrument;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface InstrumentMapper {

    @Select("SELECT symbol, name, asset_class, currency, tradable FROM instruments WHERE symbol = #{symbol}")
    Instrument findBySymbol(@Param("symbol") String symbol);

    @Select("SELECT symbol, name, asset_class, currency, tradable FROM instruments WHERE tradable = true ORDER BY symbol")
    List<Instrument> findAllTradable();

    @Select("SELECT symbol, name, asset_class, currency, tradable FROM instruments " +
            "WHERE tradable = true AND (symbol ILIKE CONCAT('%', #{search}, '%') OR name ILIKE CONCAT('%', #{search}, '%')) " +
            "ORDER BY symbol LIMIT #{limit} OFFSET #{offset}")
    List<Instrument> search(@Param("search") String search, @Param("limit") int limit, @Param("offset") int offset);
}
