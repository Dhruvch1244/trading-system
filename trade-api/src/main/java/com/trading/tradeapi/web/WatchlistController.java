package com.trading.tradeapi.web;

import com.trading.tradeapi.domain.Instrument;
import com.trading.tradeapi.domain.WatchlistEntry;
import com.trading.tradeapi.dto.AddWatchlistRequest;
import com.trading.tradeapi.mapper.InstrumentMapper;
import com.trading.tradeapi.mapper.WatchlistMapper;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/v1/watchlist")
public class WatchlistController {

    private final WatchlistMapper watchlistMapper;
    private final InstrumentMapper instrumentMapper;

    public WatchlistController(WatchlistMapper watchlistMapper, InstrumentMapper instrumentMapper) {
        this.watchlistMapper = watchlistMapper;
        this.instrumentMapper = instrumentMapper;
    }

    @GetMapping
    public List<WatchlistEntry> list(@CurrentAccount Long accountId) {
        return watchlistMapper.findByAccountId(accountId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public void add(@CurrentAccount Long accountId, @Valid @RequestBody AddWatchlistRequest request) {
        Instrument instrument = instrumentMapper.findBySymbol(request.getSymbol());
        if (instrument == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "unknown instrument");
        }
        watchlistMapper.insert(accountId, request.getSymbol());
    }

    @DeleteMapping("/{symbol}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@CurrentAccount Long accountId, @PathVariable String symbol) {
        watchlistMapper.delete(accountId, symbol);
    }
}
