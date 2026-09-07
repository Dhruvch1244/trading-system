"""Minimal read-side dashboard over the star schema DuckDB file.

Run after main.py has loaded data: `python src/dashboard.py`. Prints the
metrics a real dashboard (Streamlit, Metabase, etc.) would visualize -
this keeps the read path honest without pulling in a UI dependency here.
"""

import os

import duckdb


def main() -> None:
    db_path = os.environ.get("DUCKDB_PATH", "/data/analytics.duckdb")
    con = duckdb.connect(db_path, read_only=True)

    print("=== Orders by status ===")
    print(con.execute("SELECT status, COUNT(*) AS n FROM fact_orders GROUP BY status ORDER BY n DESC").df())

    print("\n=== Volume by symbol (filled orders) ===")
    print(
        con.execute(
            """
            SELECT symbol, SUM(qty) AS total_qty, COUNT(*) AS order_count
            FROM fact_orders
            WHERE status = 'FILLED'
            GROUP BY symbol
            ORDER BY total_qty DESC
            """
        ).df()
    )

    print("\n=== Gross traded value by day ===")
    print(
        con.execute(
            """
            SELECT d.date, SUM(f.gross_amount) AS gross_value
            FROM fact_executions f
            JOIN dim_date d ON d.date_key = f.date_key
            GROUP BY d.date
            ORDER BY d.date
            """
        ).df()
    )

    con.close()


if __name__ == "__main__":
    main()
