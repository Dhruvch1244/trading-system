"""Transform the raw extract into a small star schema for the dashboard."""

import pandas as pd


def build_dim_account(accounts: pd.DataFrame) -> pd.DataFrame:
    return accounts.rename(columns={"id": "account_id"})[
        ["account_id", "account_reference", "status", "cash_balance", "buying_power"]
    ]


def build_dim_instrument(instruments: pd.DataFrame) -> pd.DataFrame:
    return instruments[["symbol", "name", "asset_class", "currency", "tradable"]]


def build_dim_date(*date_series: pd.Series) -> pd.DataFrame:
    all_dates = pd.concat([s.dt.date for s in date_series if not s.empty], ignore_index=True).dropna().unique()
    dim = pd.DataFrame({"date": pd.to_datetime(all_dates)})
    dim["date_key"] = dim["date"].dt.strftime("%Y%m%d").astype(int)
    dim["year"] = dim["date"].dt.year
    dim["month"] = dim["date"].dt.month
    dim["day"] = dim["date"].dt.day
    dim["day_of_week"] = dim["date"].dt.day_name()
    return dim.sort_values("date_key").reset_index(drop=True)


def build_fact_orders(orders: pd.DataFrame) -> pd.DataFrame:
    fact = orders.rename(columns={"id": "order_id"}).copy()
    fact["date_key"] = pd.to_datetime(fact["created_on"]).dt.strftime("%Y%m%d").astype(int)
    return fact[
        ["order_id", "account_id", "symbol", "date_key", "side", "order_type", "qty", "price", "status"]
    ]


def build_fact_executions(executions: pd.DataFrame, orders: pd.DataFrame) -> pd.DataFrame:
    orders_lookup = orders.rename(columns={"id": "order_id"})[["order_id", "account_id", "symbol"]]
    fact = executions.merge(orders_lookup, on="order_id", how="left")
    fact["date_key"] = pd.to_datetime(fact["executed_at"]).dt.strftime("%Y%m%d").astype(int)
    fact["gross_amount"] = fact["quantity"] * fact["price"]
    return fact[
        ["id", "order_id", "account_id", "symbol", "date_key", "quantity", "price", "gross_amount"]
    ].rename(columns={"id": "execution_id"})
