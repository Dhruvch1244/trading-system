package com.trading.tradeapi.mapper;

import com.trading.tradeapi.domain.WatchlistEntry;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface WatchlistMapper {

    @Select("SELECT account_id, symbol, added_on FROM watchlist WHERE account_id = #{accountId} ORDER BY added_on DESC")
    List<WatchlistEntry> findByAccountId(@Param("accountId") Long accountId);

    @Insert("INSERT INTO watchlist (account_id, symbol) VALUES (#{accountId}, #{symbol}) ON CONFLICT DO NOTHING")
    int insert(@Param("accountId") Long accountId, @Param("symbol") String symbol);

    @Delete("DELETE FROM watchlist WHERE account_id = #{accountId} AND symbol = #{symbol}")
    int delete(@Param("accountId") Long accountId, @Param("symbol") String symbol);
}
