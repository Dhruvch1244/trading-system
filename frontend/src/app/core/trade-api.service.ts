import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Account,
  AlertDirection,
  BalanceHistoryEntry,
  Candle,
  Execution,
  Instrument,
  MarketDataTick,
  Mover,
  Order,
  PlaceOrderRequest,
  Position,
  PriceAlert,
  WatchlistEntry,
} from './models';

@Injectable({ providedIn: 'root' })
export class TradeApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.tradeApiUrl;

  getAccount(): Observable<Account> {
    return this.http.get<Account>(`${this.baseUrl}/api/v1/accounts/me`);
  }

  getPositions(): Observable<Position[]> {
    return this.http.get<Position[]>(`${this.baseUrl}/api/v1/accounts/me/positions`);
  }

  getBalanceHistory(limit = 50): Observable<BalanceHistoryEntry[]> {
    return this.http.get<BalanceHistoryEntry[]>(`${this.baseUrl}/api/v1/accounts/me/balance-history?limit=${limit}`);
  }

  deposit(amount: number): Observable<Account> {
    return this.http.post<Account>(`${this.baseUrl}/api/v1/accounts/me/deposit`, { amount });
  }

  /** Instrument universe is ~250 names - always search/page, never assume "all" fits one screen. */
  searchInstruments(search = '', limit = 50, offset = 0): Observable<Instrument[]> {
    const params = new HttpParams().set('search', search).set('limit', limit).set('offset', offset);
    return this.http.get<Instrument[]>(`${this.baseUrl}/api/v1/instruments`, { params });
  }

  getQuote(symbol: string): Observable<MarketDataTick> {
    return this.http.get<MarketDataTick>(`${this.baseUrl}/api/v1/instruments/${symbol}/quote`);
  }

  getCandles(symbol: string): Observable<Candle[]> {
    return this.http.get<Candle[]>(`${this.baseUrl}/api/v1/instruments/${symbol}/candles`);
  }

  placeOrder(request: PlaceOrderRequest): Observable<Order> {
    return this.http.post<Order>(`${this.baseUrl}/api/v1/orders`, request);
  }

  getOrderHistory(limit = 50): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.baseUrl}/api/v1/orders?limit=${limit}`);
  }

  getOrderDetail(orderId: string): Observable<{ order: Order; executions: Execution[] }> {
    return this.http.get<{ order: Order; executions: Execution[] }>(`${this.baseUrl}/api/v1/orders/${orderId}`);
  }

  cancelOrder(orderId: string): Observable<Order> {
    return this.http.patch<Order>(`${this.baseUrl}/api/v1/orders/${orderId}/cancel`, {});
  }

  getWatchlist(): Observable<WatchlistEntry[]> {
    return this.http.get<WatchlistEntry[]>(`${this.baseUrl}/api/v1/watchlist`);
  }

  addToWatchlist(symbol: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/api/v1/watchlist`, { symbol });
  }

  removeFromWatchlist(symbol: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/v1/watchlist/${symbol}`);
  }

  getMovers(limit = 10): Observable<{ gainers: Mover[]; losers: Mover[] }> {
    return this.http.get<{ gainers: Mover[]; losers: Mover[] }>(`${this.baseUrl}/api/v1/market/movers?limit=${limit}`);
  }

  getAlerts(): Observable<PriceAlert[]> {
    return this.http.get<PriceAlert[]>(`${this.baseUrl}/api/v1/alerts`);
  }

  createAlert(symbol: string, targetPrice: number, direction: AlertDirection): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/api/v1/alerts`, { symbol, targetPrice, direction });
  }

  deleteAlert(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/v1/alerts/${id}`);
  }

  getUnseenAlertCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.baseUrl}/api/v1/alerts/unseen-count`);
  }

  markAlertsSeen(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/api/v1/alerts/mark-seen`, {});
  }
}
