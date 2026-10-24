"""Validated, cache-friendly data tools used by the WindTrader assistant."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any, Literal
from zoneinfo import ZoneInfo

import numpy as np
from pydantic import BaseModel, ConfigDict, Field, field_validator

from services import data_processor

LONDON = ZoneInfo("Europe/London")
JAN_START = date(2026, 1, 1)
JAN_END = date(2026, 1, 31)


class ForecastArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")

    date: str = Field(description="Delivery date as YYYY-MM-DD, today, or tomorrow.")
    time: str | None = Field(default=None, description="Optional UK-local delivery interval start as HH:MM.")
    forecast_type: Literal["latest", "day_ahead", "both"] = "both"
    include_actual: bool = False

    @field_validator("date")
    @classmethod
    def validate_date(cls, value: str) -> str:
        if value.lower() not in {"today", "tomorrow", "yesterday"}:
            date.fromisoformat(value)
        return value

    @field_validator("time")
    @classmethod
    def validate_time(cls, value: str | None) -> str | None:
        if value is not None:
            datetime.strptime(value, "%H:%M")
        return value


class AccuracyArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")

    breakdown: Literal["overall", "lead_time", "actual_vs_forecast"] = "overall"
    lead_time_bucket: str | None = None
    date_from: str | None = None
    date_to: str | None = None

    @field_validator("date_from", "date_to")
    @classmethod
    def validate_optional_date(cls, value: str | None) -> str | None:
        if value is not None:
            date.fromisoformat(value)
        return value


class RevisionArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")

    date: str = Field(description="Delivery date as YYYY-MM-DD, today, or tomorrow.")
    limit: int = Field(default=5, ge=1, le=20)

    @field_validator("date")
    @classmethod
    def validate_date(cls, value: str) -> str:
        if value.lower() not in {"today", "tomorrow", "yesterday"}:
            date.fromisoformat(value)
        return value


def resolve_delivery_date(value: str, now: datetime | None = None) -> date:
    """Resolve relative dates in Europe/London before checking dataset scope."""
    if value.lower() in {"today", "tomorrow", "yesterday"}:
        current = (now or datetime.now(LONDON)).astimezone(LONDON).date()
        offsets = {"today": 0, "tomorrow": 1, "yesterday": -1}
        return current + timedelta(days=offsets[value.lower()])
    return date.fromisoformat(value)


def _unavailable(reason: str, **details: Any) -> dict[str, Any]:
    return {
        "status": "data_unavailable",
        "reason": reason,
        "supported_delivery_window": f"{JAN_START.isoformat()} to {JAN_END.isoformat()}",
        **details,
    }


def _local_start(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=ZoneInfo("UTC"))
    return parsed.astimezone(LONDON)


def _compact_slot(
    slot: dict[str, Any],
    forecast_type: str,
    actuals_by_time: dict[datetime, float] | None = None,
) -> dict[str, Any]:
    slot_start = datetime.fromisoformat(slot["startTime"].replace("Z", "+00:00"))
    if slot_start.tzinfo is None:
        slot_start = slot_start.replace(tzinfo=timezone.utc)
    result: dict[str, Any] = {
        "delivery_time": _local_start(slot["startTime"]).strftime("%Y-%m-%d %H:%M %Z"),
        "interval_definition": "startTime is the start of the delivery interval.",
        "units": "MW",
    }
    if forecast_type in {"latest", "both"}:
        result["latest_forecast_mw"] = slot.get("latest_generation")
    if forecast_type in {"day_ahead", "both"}:
        result["day_ahead_forecast_mw"] = slot.get("da_generation")
    if actuals_by_time is not None:
        result["actual_generation_mw"] = actuals_by_time.get(slot_start.astimezone(timezone.utc))
    return result


def get_forecast(
    forecasts: list[dict[str, Any]],
    raw_args: dict[str, Any],
    actuals: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    args = ForecastArgs.model_validate(raw_args)
    resolved_date = resolve_delivery_date(args.date)
    if not JAN_START <= resolved_date <= JAN_END:
        return _unavailable("No forecast data is available for the requested delivery date.", resolved_date=resolved_date.isoformat())

    slots = data_processor.get_latest_forecast(forecasts, resolved_date.isoformat())
    if not slots:
        return _unavailable("No forecast records matched the requested delivery date.", resolved_date=resolved_date.isoformat())

    actuals_by_time = None
    if args.include_actual:
        actuals_by_time = {}
        for row in actuals or []:
            start_time = datetime.fromisoformat(row["startTime"].replace("Z", "+00:00"))
            if start_time.tzinfo is None:
                start_time = start_time.replace(tzinfo=timezone.utc)
            actuals_by_time[start_time.astimezone(timezone.utc)] = float(row["generation"])

    if args.time is not None:
        matching = [slot for slot in slots if _local_start(slot["startTime"]).strftime("%H:%M") == args.time]
        if not matching:
            available = [_local_start(slot["startTime"]).strftime("%H:%M") for slot in slots]
            return _unavailable(
                "No delivery interval exactly matched the requested UK-local time; no nearby interval was substituted.",
                resolved_date=resolved_date.isoformat(),
                requested_time=args.time,
                available_times=available[:20],
            )
        return {
            "status": "ok",
            "resolved_date": resolved_date.isoformat(),
            "forecast_type": args.forecast_type,
            "slots": [_compact_slot(matching[0], args.forecast_type, actuals_by_time)],
        }

    value_key = "latest_generation" if args.forecast_type != "day_ahead" else "da_generation"
    valid = [slot for slot in slots if slot.get(value_key) is not None]
    if not valid:
        return _unavailable(
            f"Forecast records exist, but no valid {args.forecast_type} generation values are available.",
            resolved_date=resolved_date.isoformat(),
        )
    values = [slot[value_key] for slot in valid]
    peak = max(valid, key=lambda slot: slot[value_key])
    minimum = min(valid, key=lambda slot: slot[value_key])
    return {
        "status": "ok",
        "resolved_date": resolved_date.isoformat(),
        "forecast_type": args.forecast_type,
        "delivery_interval_definition": "Each returned startTime is the start of the delivery interval in Europe/London.",
        "units": "MW",
        "interval_count": len(valid),
        "average_mw": round(float(np.mean(values)), 2),
        "peak_mw": round(float(peak[value_key]), 2),
        "peak_delivery_time": _local_start(peak["startTime"]).strftime("%Y-%m-%d %H:%M %Z"),
        "minimum_mw": round(float(minimum[value_key]), 2),
        "minimum_delivery_time": _local_start(minimum["startTime"]).strftime("%Y-%m-%d %H:%M %Z"),
        "slots": [_compact_slot(slot, args.forecast_type, actuals_by_time) for slot in valid],
    }


def get_accuracy(
    forecasts: list[dict[str, Any]],
    actuals: list[dict[str, Any]],
    raw_args: dict[str, Any],
) -> dict[str, Any]:
    args = AccuracyArgs.model_validate(raw_args)
    if args.date_from or args.date_to:
        return _unavailable("Date-filtered accuracy is not supported by the existing January 2026 calculation path.")

    metrics = data_processor.compute_accuracy_metrics(forecasts, actuals)
    result: dict[str, Any] = {
        "status": "ok" if metrics.get("count", 0) else "data_unavailable",
        "breakdown": args.breakdown,
        "period": "January 2026",
        "units": "MW",
        "bias_convention": "forecast minus actual; positive bias means over-forecasting.",
    }
    if args.breakdown == "overall":
        result.update({key: metrics.get(key) for key in ("mae", "rmse", "bias", "count")})
        return result

    if args.breakdown == "lead_time":
        buckets = data_processor.compute_accuracy_by_leadtime(forecasts, actuals)
        if args.lead_time_bucket:
            buckets = [bucket for bucket in buckets if bucket.get("bucket") == args.lead_time_bucket]
            if not buckets:
                return _unavailable("The requested lead-time bucket is not present in the available evaluation data.", requested_bucket=args.lead_time_bucket)
        result["buckets"] = buckets
        return result

    forecast_df = data_processor._load_forecasts(forecasts)
    actual_df = data_processor._load_actuals(actuals)
    matched = data_processor._match(forecast_df, actual_df, decision_lead_hours=24)
    result["count"] = int(len(matched))
    result["sample"] = [
        {
            "delivery_time": row["startTime"].isoformat(),
            "forecast_mw": float(row["generation"]),
            "actual_mw": float(row["actual_generation"]),
            "error_mw": float(row["error"]),
        }
        for _, row in matched.head(5).iterrows()
    ]
    return result


def get_forecast_revisions(forecasts: list[dict[str, Any]], raw_args: dict[str, Any]) -> dict[str, Any]:
    args = RevisionArgs.model_validate(raw_args)
    resolved_date = resolve_delivery_date(args.date)
    if not JAN_START <= resolved_date <= JAN_END:
        return _unavailable("No forecast data is available for the requested delivery date.", resolved_date=resolved_date.isoformat())

    slots = data_processor.get_latest_forecast(forecasts, resolved_date.isoformat())
    revisions = [
        {
            "delivery_time": _local_start(slot["startTime"]).strftime("%Y-%m-%d %H:%M %Z"),
            "day_ahead_mw": slot["da_generation"],
            "latest_mw": slot["latest_generation"],
            "change_mw": slot["latest_generation"] - slot["da_generation"],
        }
        for slot in slots
        if slot.get("latest_generation") is not None and slot.get("da_generation") is not None
    ]
    revisions.sort(key=lambda item: abs(item["change_mw"]), reverse=True)
    if not revisions:
        return _unavailable("No matched latest and day-ahead forecast pairs are available for the requested date.", resolved_date=resolved_date.isoformat())
    return {
        "status": "ok",
        "resolved_date": resolved_date.isoformat(),
        "units": "MW",
        "revision_convention": "latest forecast minus day-ahead forecast; negative means the latest forecast is lower.",
        "revisions": revisions[: args.limit],
    }
