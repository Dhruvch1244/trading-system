package com.trading.tradeexecutor.repo;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class InstrumentRepository {

    private final JdbcTemplate jdbc;

    public InstrumentRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Drives the market-data poller - reflects whatever's tradable right now, no static list to keep in sync. */
    public List<String> findTradableSymbols() {
        return jdbc.queryForList("SELECT symbol FROM instruments WHERE tradable = true ORDER BY symbol", String.class);
    }
}
