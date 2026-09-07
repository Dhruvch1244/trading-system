package com.trading.tradeapi.web;

import com.trading.tradeapi.domain.Account;
import com.trading.tradeapi.mapper.AccountMapper;
import com.trading.tradeapi.mapper.BalanceHistoryMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;

@Service
public class AccountService {

    private final AccountMapper accountMapper;
    private final BalanceHistoryMapper balanceHistoryMapper;

    public AccountService(AccountMapper accountMapper, BalanceHistoryMapper balanceHistoryMapper) {
        this.accountMapper = accountMapper;
        this.balanceHistoryMapper = balanceHistoryMapper;
    }

    @Transactional
    public Account deposit(Long accountId, BigDecimal amount) {
        Account account = accountMapper.findById(accountId);
        if (account == null || !"ACTIVE".equals(account.getStatus())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "account not active");
        }

        accountMapper.addToBalance(accountId, amount);
        balanceHistoryMapper.insert(accountId, "DEPOSIT", amount);

        return accountMapper.findById(accountId);
    }
}
