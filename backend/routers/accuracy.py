"""
Accuracy router — forecast accuracy metrics endpoints.
All metrics strictly calculated on the January 2026 evaluation dataset.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from services import cache as cache_service
from services import data_processor
from services import elexon_client

logger = logging.getLogger(__name__)

router = APIRouter()

FORECAST_PUBLISH_START = "2025-12-31"
JAN_START = "2026-01-01"
JAN_END = "2026-01-31"


async def _get_forecasts() -> list[dict]:
    return await cache_service.get_or_fetch(
        "windfor_jan2026_d1",
        lambda: elexon_client.fetch_windfor(FORECAST_PUBLISH_START, JAN_END),
    )


async def _get_actuals() -> list[dict]:
    return await cache_service.get_or_fetch(
        "fuelhh_wind_jan2026",
        lambda: elexon_client.fetch_fuelhh(JAN_START, JAN_END),
    )


@router.get("/summary")
async def get_accuracy_summary():
    """
    Return overall MAE, RMSE and bias for January 2026 delivery slots.
    """
    forecasts, actuals = await _get_forecasts(), await _get_actuals()
    metrics = data_processor.compute_accuracy_metrics(forecasts, actuals)
    return metrics


@router.get("/by-leadtime")
async def get_accuracy_by_leadtime():
    """
    Return accuracy metrics broken down by lead-time bucket for January 2026.
    """
    forecasts, actuals = await _get_forecasts(), await _get_actuals()
    buckets = data_processor.compute_accuracy_by_leadtime(forecasts, actuals)
    return {"buckets": buckets}


@router.get("/actuals-vs-forecast")
async def get_actuals_vs_forecast():
    """
    Return matched (forecast, actual) pairs for scatter plot visualisation across January 2026.
    Maximum 200 points returned (sampled evenly if necessary).
    """
    forecasts, actuals = await _get_forecasts(), await _get_actuals()

    if not forecasts or not actuals:
        raise HTTPException(status_code=503, detail="Insufficient data to compute scatter")

    points = data_processor.get_actuals_vs_forecast_points(forecasts, actuals, max_points=200)
    return {"points": points}
