package com.trading.tradeapi.web;

import com.trading.tradeapi.domain.Instrument;
import com.trading.tradeapi.domain.PriceAlert;
import com.trading.tradeapi.dto.CreateAlertRequest;
import com.trading.tradeapi.mapper.InstrumentMapper;
import com.trading.tradeapi.mapper.PriceAlertMapper;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/alerts")
public class AlertController {

    private final PriceAlertMapper priceAlertMapper;
    private final InstrumentMapper instrumentMapper;

    public AlertController(PriceAlertMapper priceAlertMapper, InstrumentMapper instrumentMapper) {
        this.priceAlertMapper = priceAlertMapper;
        this.instrumentMapper = instrumentMapper;
    }

    @GetMapping
    public List<PriceAlert> list(@CurrentAccount Long accountId) {
        return priceAlertMapper.findByAccountId(accountId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public void create(@CurrentAccount Long accountId, @Valid @RequestBody CreateAlertRequest request) {
        Instrument instrument = instrumentMapper.findBySymbol(request.getSymbol());
        if (instrument == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "unknown instrument");
        }

        PriceAlert alert = new PriceAlert();
        alert.setAccountId(accountId);
        alert.setSymbol(request.getSymbol());
        alert.setTargetPrice(request.getTargetPrice());
        alert.setDirection(request.getDirection());
        priceAlertMapper.insert(alert);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@CurrentAccount Long accountId, @PathVariable Long id) {
        priceAlertMapper.delete(id, accountId);
    }

    @GetMapping("/unseen-count")
    public Map<String, Integer> unseenCount(@CurrentAccount Long accountId) {
        return Map.of("count", priceAlertMapper.countUnseen(accountId));
    }

    @PostMapping("/mark-seen")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markSeen(@CurrentAccount Long accountId) {
        priceAlertMapper.markAllSeen(accountId);
    }
}
