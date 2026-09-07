"""Batch job: extract from Postgres (read-only), transform into a star schema, load into DuckDB.

Run once per container invocation - schedule it externally (cron, a one-shot
`docker compose run analytics-service`, or an EventBridge-triggered ECS task
once this moves off local Docker) rather than looping in-process.
"""

import logging
import os

from extract import build_engine, extract_all
from load import load_star_schema
from transform import (
    build_dim_account,
    build_dim_date,
    build_dim_instrument,
    build_fact_executions,
    build_fact_orders,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("analytics-service")


def main() -> None:
    db_path = os.environ.get("DUCKDB_PATH", "/data/analytics.duckdb")

    log.info("connecting to Postgres as analytics_reader")
    engine = build_engine()
    raw = extract_all(engine)
    log.info("extracted %s", {name: len(df) for name, df in raw.items()})

    star = {
        "dim_account": build_dim_account(raw["accounts"]),
        "dim_instrument": build_dim_instrument(raw["instruments"]),
        "dim_date": build_dim_date(raw["orders"]["created_on"], raw["executions"]["executed_at"]),
        "fact_orders": build_fact_orders(raw["orders"]),
        "fact_executions": build_fact_executions(raw["executions"], raw["orders"]),
    }
    log.info("transformed %s", {name: len(df) for name, df in star.items()})

    load_star_schema(db_path, star)
    log.info("loaded star schema into %s", db_path)


if __name__ == "__main__":
    main()
