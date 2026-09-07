"""Read-only extract from Postgres via the analytics_reader role."""

import os

import pandas as pd
from sqlalchemy import create_engine


def build_engine():
    user = os.environ.get("POSTGRES_ANALYTICS_USER", "analytics_reader")
    password = os.environ["POSTGRES_ANALYTICS_READER_PASSWORD"]
    host = os.environ.get("POSTGRES_HOST", "localhost")
    port = os.environ.get("POSTGRES_PORT", "5432")
    db = os.environ.get("POSTGRES_DB", "trading")
    url = f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{db}"
    return create_engine(url)


def extract_all(engine) -> dict[str, pd.DataFrame]:
    tables = ["accounts", "instruments", "orders", "executions", "positions", "balance_history"]
    return {name: pd.read_sql_table(name, engine) for name in tables}
