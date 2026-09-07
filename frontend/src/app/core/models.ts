export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface CurrentUser {
  accountId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNo?: string | null;
}

export interface Account {
  id: number;
  accountReference: string;
  cashBalance: number;
  buyingPower: number;
  status: string;
  version: number;
  lastUpdated: string;
}

export interface Position {
  accountId: number;
  symbol: string;
  qty: number;
  avgCost: number;
  lastPrice: number;
  marketValue: number;
  unrealizedPnl: number;
}

export interface WatchlistEntry {
  accountId: number;
  symbol: string;
  addedOn: string;
}

export type BalanceHistoryType = 'DEPOSIT' | 'WITHDRAWAL' | 'TRADE_SETTLEMENT' | 'FEE' | 'ADJUSTMENT';

export interface BalanceHistoryEntry {
  id: number;
  accountId: number;
  type: BalanceHistoryType;
  amount: number;
  relatedOrderId: string | null;
  createdOn: string;
}

export interface Instrument {
  symbol: string;
  name: string;
  assetClass: string;
  currency: string;
  tradable: boolean;
}

export interface MarketDataTick {
  symbol: string;
  price: number;
  asOf: string;
}

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT';
export type OrderStatus = 'PENDING' | 'FILLED' | 'REJECTED' | 'CANCELLED';

export interface Order {
  id: string;
  accountId: number;
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  qty: number;
  price: number | null;
  status: OrderStatus;
  idempotencyKey: string;
  createdOn: string;
}

export interface Execution {
  id: number;
  orderId: string;
  quantity: number;
  price: number;
  executedAt: string;
}

export interface PlaceOrderRequest {
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  qty: number;
  price?: number;
  idempotencyKey: string;
}

export interface DepositRequest {
  amount: number;
}

export interface SignupRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNo?: string;
}
