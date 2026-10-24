"""
Forecast router — wind generation forecast endpoints.
All endpoints strictly scoped to the January 2026 evaluation dataset.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Query

from services import cache as cache_service
from services import data_processor
from services import elexon_client

logger = logging.getLogger(__name__)

router = APIRouter()

# January 2026 date range used throughout
FORECAST_PUBLISH_START = "2025-12-31"
JAN_END = "2026-01-31"
DEFAULT_TARGET_DATE = "2026-01-15"


async def _get_jan_forecasts() -> list[dict]:
    return await cache_service.get_or_fetch(
        "windfor_jan2026_d1",
        lambda: elexon_client.fetch_windfor(FORECAST_PUBLISH_START, JAN_END),
    )


@router.get("/latest")
async def get_latest_forecast(
    date: str = Query(
        default=DEFAULT_TARGET_DATE,
        description="Target delivery date (YYYY-MM-DD) in January 2026. Defaults to 2026-01-15.",
    )
):
    """
    Return the latest pre-delivery (and day-ahead) forecast for each half-hour/hour slot
    on the given delivery date in January 2026.
    """
    target_date = date or DEFAULT_TARGET_DATE
    forecasts = await _get_jan_forecasts()

    slots = data_processor.get_latest_forecast(forecasts, target_date)

    return {"date": target_date, "slots": slots}


@router.get("/history")
async def get_forecast_history():
    """
    Return all January 2026 forecast records (filtered strictly to January 2026 delivery)
    grouped by publishTime, suitable for a timeline / waterfall view.
    """
    forecasts = await _get_jan_forecasts()

    if not forecasts:
        raise HTTPException(status_code=503, detail="No forecast data available")

    # Filter to January 2026 delivery slots
    jan_forecasts = [
        r for r in forecasts
        if r.get("startTime") and f"{JAN_START}T00:00:00" <= r["startTime"] <= f"{JAN_END}T23:59:59"
    ]

    # Group by publishTime — return as list sorted by publishTime then startTime
    sorted_records = sorted(
        jan_forecasts,
        key=lambda r: (r.get("publishTime") or "", r.get("startTime") or ""),
    )

    return {"records": sorted_records, "total": len(sorted_records)}
