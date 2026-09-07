"""The read-side dashboard - a real web link over the star schema in DuckDB.

Run with: streamlit run src/webapp.py --server.address=0.0.0.0 --server.port=8501

Separate from main.py's batch ETL: this process only reads the DuckDB file (or
triggers the ETL on demand via the sidebar button) - it never talks to
Postgres directly except when the user asks for a refresh.
"""

import os

import duckdb
import pandas as pd
import plotly.express as px
import streamlit as st

DB_PATH = os.environ.get("DUCKDB_PATH", "/data/analytics.duckdb")

# Streamlit's native st.bar_chart/st.line_chart render through a Vega-Lite iframe whose theme
# is resolved at the browser's render time - in practice this occasionally comes out as an
# empty black box regardless of the .streamlit/config.toml theme (a known Streamlit/Vega
# quirk, not a config mistake). Plotly renders its own SVG/canvas with colors baked directly
# into the figure, so it can't inherit a broken theme - explicit colors below, not templates.
ACCENT = "#0e8b96"
CHART_LAYOUT = dict(
    paper_bgcolor="white",
    plot_bgcolor="white",
    font_color="#14151a",
    margin=dict(l=10, r=10, t=10, b=10),
)

st.set_page_config(page_title="Fauxnance Analytics", layout="wide")


def run_etl() -> None:
    from main import main as run_batch

    run_batch()


def load_table(con: duckdb.DuckDBPyConnection, name: str) -> pd.DataFrame:
    try:
        return con.execute(f"SELECT * FROM {name}").df()
    except duckdb.CatalogException:
        return pd.DataFrame()


st.sidebar.title("Fauxnance Analytics")
st.sidebar.caption("Star schema over accounts, orders, executions, positions.")
if st.sidebar.button("Refresh from Postgres", type="primary"):
    with st.spinner("Extracting, transforming, loading..."):
        run_etl()
    st.sidebar.success("Refreshed.")

if not os.path.exists(DB_PATH):
    st.warning("No data loaded yet - click **Refresh from Postgres** in the sidebar.")
    st.stop()

con = duckdb.connect(DB_PATH, read_only=True)

dim_account = load_table(con, "dim_account")
fact_orders = load_table(con, "fact_orders")
fact_executions = load_table(con, "fact_executions")
dim_date = load_table(con, "dim_date")

st.title("Trading activity")

if not dim_account.empty:
    cols = st.columns(len(dim_account))
    for col, (_, row) in zip(cols, dim_account.iterrows()):
        col.metric(row["account_reference"], f"${row['cash_balance']:,.2f}", row["status"])

st.divider()

left, right = st.columns(2)

with left:
    st.subheader("Orders by status")
    if not fact_orders.empty:
        counts = fact_orders["status"].value_counts().reset_index()
        counts.columns = ["status", "count"]
        fig = px.bar(counts, x="status", y="count", color_discrete_sequence=[ACCENT])
        fig.update_layout(**CHART_LAYOUT)
        st.plotly_chart(fig, use_container_width=True)
    else:
        st.caption("No orders yet.")

with right:
    st.subheader("Filled volume by symbol")
    filled = fact_orders[fact_orders["status"] == "FILLED"] if not fact_orders.empty else fact_orders
    if not filled.empty:
        volume = filled.groupby("symbol")["qty"].sum().reset_index()
        fig = px.bar(volume, x="symbol", y="qty", color_discrete_sequence=[ACCENT])
        fig.update_layout(**CHART_LAYOUT)
        st.plotly_chart(fig, use_container_width=True)
    else:
        st.caption("No fills yet.")

st.subheader("Gross traded value by day")
if not fact_executions.empty and not dim_date.empty:
    merged = fact_executions.merge(dim_date, on="date_key")
    daily = merged.groupby("date")["gross_amount"].sum().sort_index().reset_index()
    fig = px.line(daily, x="date", y="gross_amount", markers=True, color_discrete_sequence=[ACCENT])
    fig.update_layout(**CHART_LAYOUT)
    st.plotly_chart(fig, use_container_width=True)
else:
    st.caption("No executions yet.")

st.subheader("Recent orders")
if not fact_orders.empty:
    st.dataframe(fact_orders.sort_values("date_key", ascending=False).head(20), use_container_width=True)
else:
    st.caption("Nothing to show.")

con.close()
