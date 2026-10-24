"""
Data processing utilities for wind forecast accuracy analysis.
All metrics, filters, and summaries refer strictly to January 2026 delivery.
"""

from __future__ import annotations

import logging
from typing import Any

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

JAN_START = "2026-01-01"
JAN_END = "2026-01-31"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _to_utc_datetime(series: pd.Series) -> pd.Series:
    """Parse a string series to UTC-aware datetimes."""
    return pd.to_datetime(series, utc=True, errors="coerce")


def _load_forecasts(
    forecasts: list[dict],
    start_date: str | None = JAN_START,
    end_date: str | None = JAN_END,
) -> pd.DataFrame:
    """
    Load forecasts into a DataFrame and filter by target delivery period (startTime).
    """
    df = pd.DataFrame(forecasts)
    if df.empty:
        return df
    df["startTime"] = _to_utc_datetime(df["startTime"])
    df["publishTime"] = _to_utc_datetime(df["publishTime"])
    df["generation"] = pd.to_numeric(df["generation"], errors="coerce")
    df = df.dropna(subset=["startTime", "publishTime", "generation"])

    if start_date:
        start_ts = pd.Timestamp(f"{start_date}T00:00:00Z")
        df = df[df["startTime"] >= start_ts]
    if end_date:
        end_ts = pd.Timestamp(f"{end_date}T23:59:59Z")
        df = df[df["startTime"] <= end_ts]

    return df


def _load_actuals(
    actuals: list[dict],
    start_date: str | None = JAN_START,
    end_date: str | None = JAN_END,
) -> pd.DataFrame:
    """
    Load actuals into a DataFrame and filter by target delivery period (startTime).
    """
    df = pd.DataFrame(actuals)
    if df.empty:
        return df
    df["startTime"] = _to_utc_datetime(df["startTime"])
    df["generation"] = pd.to_numeric(df["generation"], errors="coerce")
    df = df.dropna(subset=["startTime", "generation"]).rename(
        columns={"generation": "actual_generation"}
    )

    if start_date:
        start_ts = pd.Timestamp(f"{start_date}T00:00:00Z")
        df = df[df["startTime"] >= start_ts]
    if end_date:
        end_ts = pd.Timestamp(f"{end_date}T23:59:59Z")
        df = df[df["startTime"] <= end_ts]

    return df


def _match(
    forecasts_df: pd.DataFrame,
    actuals_df: pd.DataFrame,
    decision_lead_hours: float | None = None,
) -> pd.DataFrame:
    """
    For each delivery slot, pick the latest forecast available by its decision cutoff.
    When decision_lead_hours is set, the cutoff is that many hours before delivery.
    """
    if forecasts_df.empty or actuals_df.empty:
        return pd.DataFrame()

    decision_time = forecasts_df["startTime"]
    if decision_lead_hours is not None:
        decision_time = decision_time - pd.to_timedelta(decision_lead_hours, unit="h")
    pre_delivery = forecasts_df[forecasts_df["publishTime"] <= decision_time]
    if pre_delivery.empty:
        return pd.DataFrame()

    latest = (
        pre_delivery
        .sort_values("publishTime")
        .groupby("startTime", as_index=False)
        .last()
    )

    merged = latest.merge(actuals_df, on="startTime", how="inner")
    merged["error"] = merged["generation"] - merged["actual_generation"]
    merged["lead_time_hours"] = (
        (merged["startTime"] - merged["publishTime"])
        .dt.total_seconds()
        / 3600
    )
    return merged


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def compute_accuracy_metrics(
    forecasts: list[dict], actuals: list[dict]
) -> dict[str, Any]:
    """
    Compute overall forecast accuracy metrics for the January 2026 evaluation dataset.

    Returns:
        dict with keys: mae, rmse, bias, count
    """
    # Backtest the forecast available 24 hours before each delivery period, matching
    # the assignment's day-ahead purchasing decision horizon.
    merged = _match(_load_forecasts(forecasts), _load_actuals(actuals), decision_lead_hours=24)

    if merged.empty:
        return {"mae": None, "rmse": None, "bias": None, "count": 0}

    errors = merged["error"].values
    return {
        "mae": float(np.mean(np.abs(errors))),
        "rmse": float(np.sqrt(np.mean(errors**2))),
        "bias": float(np.mean(errors)),
        "count": int(len(errors)),
    }


def compute_accuracy_by_leadtime(
    forecasts: list[dict], actuals: list[dict]
) -> list[dict[str, Any]]:
    """
    Compute accuracy metrics broken down by lead-time bucket across January 2026.
    For each delivery slot and bucket window, the latest forecast issued in that
    window is matched against actual generation.

    Returns:
        List of dicts: {bucket, mae, rmse, bias, count}
    """
    fcst_df = _load_forecasts(forecasts)
    act_df = _load_actuals(actuals)

    if fcst_df.empty or act_df.empty:
        return []

    fcst_df["lead_time_hours"] = (
        (fcst_df["startTime"] - fcst_df["publishTime"]).dt.total_seconds() / 3600
    )
    # Valid pre-delivery forecasts
    fcst_valid = fcst_df[fcst_df["lead_time_hours"] >= 0]
    if fcst_valid.empty:
        return []

    merged = fcst_valid.merge(act_df, on="startTime", how="inner")
    merged["error"] = merged["generation"] - merged["actual_generation"]

    buckets = [
        ("0-6h", 0, 6),
        ("6-12h", 6, 12),
        ("12-24h", 12, 24),
        ("24-36h", 24, 36),
        ("36h+", 36, float("inf")),
    ]

    results = []
    for label, lo, hi in buckets:
        mask = (merged["lead_time_hours"] >= lo) & (merged["lead_time_hours"] < hi)
        subset = merged[mask]
        if subset.empty:
            results.append({"bucket": label, "mae": None, "rmse": None, "bias": None, "count": 0})
        else:
            # Latest forecast per slot in this bucket window
            latest_in_bucket = (
                subset.sort_values("publishTime")
                .groupby("startTime", as_index=False)
                .last()
            )
            errors = latest_in_bucket["error"].values
            results.append(
                {
                    "bucket": label,
                    "mae": float(np.mean(np.abs(errors))),
                    "rmse": float(np.sqrt(np.mean(errors**2))),
                    "bias": float(np.mean(errors)),
                    "count": int(len(errors)),
                }
            )
    return results


def get_actuals_vs_forecast_points(
    forecasts: list[dict], actuals: list[dict], max_points: int = 200
) -> list[dict[str, Any]]:
    """
    Return matched (forecast, actual) pairs for scatter plot visualisation,
    sampled evenly to at most max_points.
    """
    merged = _match(_load_forecasts(forecasts), _load_actuals(actuals), decision_lead_hours=24)
    if merged.empty:
        return []

    if len(merged) > max_points:
        merged = merged.sample(n=max_points, random_state=42)

    merged = merged.sort_values("startTime")

    return [
        {
            "startTime": row["startTime"].isoformat(),
            "forecast": float(row["generation"]),
            "actual": float(row["actual_generation"]),
            "error": float(row["error"]),
        }
        for _, row in merged.iterrows()
    ]


def get_latest_forecast(
    forecasts: list[dict], target_date: str
) -> list[dict[str, Any]]:
    """
    Return per-slot latest pre-delivery forecast and D-1 (day-ahead) forecast for *target_date*.

    Returns:
        List of {startTime, latest_generation, da_generation} sorted by startTime.
    """
    df = _load_forecasts(forecasts, start_date=None, end_date=None)
    if df.empty:
        return []

    # Filter to slots on the target date
    target = pd.Timestamp(target_date, tz="UTC").date()
    day_df = df[df["startTime"].dt.date == target]
    if day_df.empty:
        return []

    records = []
    for slot_time, group in day_df.groupby("startTime"):
        group_sorted = group.sort_values("publishTime")

        # Never present a post-delivery forecast as if it had been available beforehand.
        pre_candidates = group_sorted[group_sorted["publishTime"] <= slot_time]
        latest_row = pre_candidates.iloc[-1] if not pre_candidates.empty else None

        # Day-ahead forecast: latest publication available at the 24-hour decision cutoff.
        cutoff = slot_time - pd.Timedelta(hours=24)
        da_candidates = group_sorted[group_sorted["publishTime"] <= cutoff]
        da_generation = float(da_candidates.iloc[-1]["generation"]) if not da_candidates.empty else None

        records.append(
            {
                "startTime": slot_time.isoformat(),
                "latest_generation": float(latest_row["generation"]) if latest_row is not None else None,
                "da_generation": da_generation,
            }
        )

    records.sort(key=lambda r: r["startTime"])
    return records


def get_data_summary(
    forecasts: list[dict],
    actuals: list[dict],
    metrics: dict[str, Any],
    leadtime_buckets: list[dict[str, Any]] | None = None,
    selected_date: str | None = None,
) -> str:
    """
    Return a comprehensive plain-text data summary suitable for LLM context injection.
    Strictly scoped to the January 2026 delivery dataset.
    """
    forecast_df = _load_forecasts(forecasts)
    actuals_df = _load_actuals(actuals)

    if forecast_df.empty or actuals_df.empty:
        return "No wind forecast or actual generation data available for January 2026."

    start = forecast_df["startTime"].min()
    end = forecast_df["startTime"].max()
    date_range = f"{start.strftime('%d %B %Y')} to {end.strftime('%d %B %Y')}"

    forecast_count = len(forecast_df)
    actual_count = len(actuals_df)
    matched_count = metrics.get("count", 0)

    mae = metrics.get("mae")
    rmse = metrics.get("rmse")
    bias = metrics.get("bias")

    mae_str = f"{mae:.0f} MW" if mae is not None else "N/A"
    rmse_str = f"{rmse:.0f} MW" if rmse is not None else "N/A"

    if bias is not None:
        direction = "over-forecast" if bias > 0 else "under-forecast"
        bias_str = f"{abs(bias):.0f} MW ({direction}, signed +{bias:.0f} MW)" if bias > 0 else f"{abs(bias):.0f} MW ({direction}, signed {bias:.0f} MW)"
    else:
        bias_str = "N/A"

    # Actual generation profile
    actual_mean = actuals_df["actual_generation"].mean()
    actual_peak_row = actuals_df.loc[actuals_df["actual_generation"].idxmax()]
    actual_min_row = actuals_df.loc[actuals_df["actual_generation"].idxmin()]

    summary_lines = [
        f"DATASET CONTEXT: January 2026 UK Wind Generation ({date_range}).",
        f"Delivery Period: 1 January 2026 00:00 UTC to 31 January 2026 23:59 UTC.",
        f"Data Sources: Elexon BMRS (WINDFOR generation forecast runs and FUELHH half-hourly actual wind outturn).",
        f"Total January 2026 Forecast Records: {forecast_count:,}.",
        f"Total January 2026 Actual Generation Records: {actual_count:,}.",
        f"Matched 24-Hour-Ahead Evaluation Periods: {matched_count:,} delivery periods.",
        "",
        "OVERALL ACCURACY METRICS (January 2026 24-Hour-Ahead Forecasts):",
        f"- Mean Absolute Error (MAE): {mae_str}",
        f"- Root Mean Square Error (RMSE): {rmse_str}",
        f"- Forecast Bias: {bias_str}",
        f"- Actual Wind Generation Mean: {actual_mean:.0f} MW",
        f"- Peak Actual Wind Generation: {actual_peak_row['actual_generation']:.0f} MW (on {actual_peak_row['startTime'].strftime('%d %b %H:%M UTC')})",
        f"- Minimum Actual Wind Generation: {actual_min_row['actual_generation']:.0f} MW (on {actual_min_row['startTime'].strftime('%d %b %H:%M UTC')})",
    ]

    if leadtime_buckets:
        summary_lines.append("")
        summary_lines.append("ACCURACY BY LEAD-TIME HORIZON (January 2026):")
        for b in leadtime_buckets:
            b_mae = f"{b['mae']:.0f} MW" if b.get('mae') is not None else "N/A"
            b_rmse = f"{b['rmse']:.0f} MW" if b.get('rmse') is not None else "N/A"
            b_bias = f"{b['bias']:+.0f} MW" if b.get('bias') is not None else "N/A"
            b_count = b.get('count', 0)
            summary_lines.append(
                f"- Horizon {b['bucket']}: MAE {b_mae}, RMSE {b_rmse}, Bias {b_bias} ({b_count} periods)"
            )

    if selected_date:
        day_slots = get_latest_forecast(forecasts, selected_date)
        valid_slots = [s for s in day_slots if s.get("latest_generation") is not None]
        if valid_slots:
            mean_gen = np.mean([s["latest_generation"] for s in valid_slots])
            peak_slot = max(valid_slots, key=lambda s: s["latest_generation"])
            min_slot = min(valid_slots, key=lambda s: s["latest_generation"])
            revisions = [
                s["latest_generation"] - s["da_generation"]
                for s in valid_slots
                if s.get("da_generation") is not None
            ]
            avg_rev = np.mean(revisions) if revisions else None
            summary_lines.append("")
            summary_lines.append(f"CURRENTLY SELECTED DELIVERY DATE IN UI: {selected_date}")
            summary_lines.append(f"- Average Forecast Generation: {mean_gen:.0f} MW")
            summary_lines.append(f"- Peak Forecast Generation: {peak_slot['latest_generation']:.0f} MW (at {peak_slot['startTime'][-14:-9]})")
            summary_lines.append(f"- Minimum Forecast Generation: {min_slot['latest_generation']:.0f} MW (at {min_slot['startTime'][-14:-9]})")
            if avg_rev is not None:
                summary_lines.append(f"- Average Revision (Latest less Day-Ahead): {avg_rev:+.0f} MW")

    return "\n".join(summary_lines)
