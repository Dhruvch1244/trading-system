"""Load the star schema DataFrames into a DuckDB file for the dashboard to read."""

import duckdb
import pandas as pd


def load_star_schema(db_path: str, tables: dict[str, pd.DataFrame]) -> None:
    con = duckdb.connect(db_path)
    try:
        for name, df in tables.items():
            con.register("staging_df", df)
            con.execute(f"CREATE OR REPLACE TABLE {name} AS SELECT * FROM staging_df")
            con.unregister("staging_df")
    finally:
        con.close()
