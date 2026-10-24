"""
Elexon BMRS API client — correct parameters confirmed by live testing.

WINDFOR: GET /datasets/WINDFOR?publishDateTimeFrom=...&publishDateTimeTo=...
         Response: {"data": [{dataset, publishTime, startTime, generation}, ...]}

FUELHH:  GET /datasets/FUELHH?settlementDate=YYYY-MM-DD&settlementPeriodFrom=1&settlementPeriodTo=48
         Response: {"data": [{dataset, publishTime, startTime, settlementDate,
                               settlementPeriod, fuelType, generation}, ...]}
         Filter: fuelType == "WIND"
"""

import httpx
import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

ELEXON_BASE = "https://data.elexon.co.uk/bmrs/api/v1/datasets"


def _extract_records(response_text: str) -> list[dict]:
    """
    Parse Elexon response — handles both shapes:
      {"data": [...]}   (paginated non-stream endpoint)
      [...]             (stream endpoint)
    """
    try:
        parsed = json.loads(response_text)
        if isinstance(parsed, list):
            return parsed
        if isinstance(parsed, dict):
            return parsed.get("data", [])
    except json.JSONDecodeError:
        logger.error("Failed to parse JSON response")
    return []


async def fetch_windfor(start_date: str, end_date: str) -> list[dict[str, Any]]:
    """
    Fetch wind generation forecasts from Elexon WINDFOR dataset.
    Chunks requests into 7-day windows (API enforced limit).

    Args:
        start_date: YYYY-MM-DD
        end_date:   YYYY-MM-DD (inclusive)

    Returns:
        List of dicts: {startTime, publishTime, generation}
    """
    from datetime import date, timedelta

    url = f"{ELEXON_BASE}/WINDFOR"
    all_results: list[dict] = []

    start = date.fromisoformat(start_date)
    end   = date.fromisoformat(end_date)
    chunk_start = start

    while chunk_start <= end:
        chunk_end = min(chunk_start + timedelta(days=6), end)
        params = {
            "publishDateTimeFrom": f"{chunk_start.isoformat()}T00:00:00Z",
            "publishDateTimeTo":   f"{chunk_end.isoformat()}T23:59:59Z",
        }
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                raw_records = _extract_records(response.text)

            for rec in raw_records:
                if not isinstance(rec, dict):
                    continue
                generation = rec.get("generation")
                if generation is None:
                    continue
                all_results.append({
                    "startTime":   rec.get("startTime"),
                    "publishTime": rec.get("publishTime"),
                    "generation":  float(generation),
                })
        except httpx.HTTPError as exc:
            logger.error("HTTP error fetching WINDFOR %s–%s: %s", chunk_start, chunk_end, exc)
        except Exception as exc:
            logger.error("Error fetching WINDFOR %s–%s: %s", chunk_start, chunk_end, exc)

        chunk_start = chunk_end + timedelta(days=1)

    logger.info("Fetched %d total WINDFOR records (%s to %s)",
                len(all_results), start_date, end_date)
    return all_results


async def fetch_fuelhh_day(settlement_date: str) -> list[dict[str, Any]]:
    """
    Fetch actual WIND generation for a single settlement date.
    Uses publishDateTimeFrom/To spanning the full settlement day.

    Args:
        settlement_date: YYYY-MM-DD

    Returns:
        List of dicts: {startTime, generation}  (WIND only)
    """
    url = f"{ELEXON_BASE}/FUELHH"
    params = {
        "publishDateTimeFrom": f"{settlement_date}T00:00:00Z",
        "publishDateTimeTo":   f"{settlement_date}T23:59:59Z",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            raw_records = _extract_records(response.text)

        results = []
        for rec in raw_records:
            if not isinstance(rec, dict):
                continue
            if rec.get("fuelType", "").upper() != "WIND":
                continue
            generation = rec.get("generation")
            if generation is None:
                continue
            results.append({
                "startTime":  rec.get("startTime"),
                "generation": float(generation),
            })

        return results

    except Exception as exc:
        logger.error("Error fetching FUELHH for %s: %s", settlement_date, exc)
        return []


async def fetch_fuelhh(start_date: str, end_date: str) -> list[dict[str, Any]]:
    """
    Fetch actual WIND generation for a date range.
    Chunks into 7-day windows matching the API limit.

    Args:
        start_date: YYYY-MM-DD
        end_date:   YYYY-MM-DD (inclusive)

    Returns:
        List of dicts: {startTime, generation}
    """
    from datetime import date, timedelta

    url = f"{ELEXON_BASE}/FUELHH"
    all_results: list[dict] = []

    start = date.fromisoformat(start_date)
    end   = date.fromisoformat(end_date)
    chunk_start = start

    while chunk_start <= end:
        chunk_end = min(chunk_start + timedelta(days=6), end)
        params = {
            "publishDateTimeFrom": f"{chunk_start.isoformat()}T00:00:00Z",
            "publishDateTimeTo":   f"{chunk_end.isoformat()}T23:59:59Z",
        }
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                raw_records = _extract_records(response.text)

            for rec in raw_records:
                if not isinstance(rec, dict):
                    continue
                if rec.get("fuelType", "").upper() != "WIND":
                    continue
                generation = rec.get("generation")
                if generation is None:
                    continue
                all_results.append({
                    "startTime":  rec.get("startTime"),
                    "generation": float(generation),
                })
        except Exception as exc:
            logger.error("Error fetching FUELHH %s–%s: %s", chunk_start, chunk_end, exc)

        chunk_start = chunk_end + timedelta(days=1)

    logger.info("Fetched %d total FUELHH WIND records (%s to %s)",
                len(all_results), start_date, end_date)
    return all_results
