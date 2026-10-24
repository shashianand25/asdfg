"""
Simple file-based JSON cache for Elexon API responses.
"""

import json
import logging
import os
from pathlib import Path
from typing import Any, Awaitable, Callable, Optional

logger = logging.getLogger(__name__)

CACHE_DIR = Path(__file__).parent.parent / "cache"


def _ensure_cache_dir() -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)


def _cache_path(key: str) -> Path:
    # Sanitise key so it's safe as a filename
    safe_key = "".join(c if c.isalnum() or c in "-_" else "_" for c in key)
    return CACHE_DIR / f"{safe_key}.json"


def get_cached(key: str) -> Optional[Any]:
    """Return cached data for *key*, or None if not cached."""
    _ensure_cache_dir()
    path = _cache_path(key)
    if not path.exists():
        return None
    try:
        with path.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
        logger.debug("Cache HIT for key=%s", key)
        return data
    except (json.JSONDecodeError, OSError) as exc:
        logger.warning("Cache read error for key=%s: %s", key, exc)
        return None


def set_cached(key: str, data: Any) -> None:
    """Persist *data* to cache under *key*."""
    _ensure_cache_dir()
    path = _cache_path(key)
    try:
        with path.open("w", encoding="utf-8") as fh:
            json.dump(data, fh)
        logger.debug("Cache WRITE for key=%s (%d bytes)", key, path.stat().st_size)
    except OSError as exc:
        logger.warning("Cache write error for key=%s: %s", key, exc)


async def get_or_fetch(key: str, fetch_fn: Callable[[], Awaitable[Any]]) -> Any:
    """
    Return cached result for *key* if available; otherwise call *fetch_fn*,
    cache its result, and return it.
    """
    cached = get_cached(key)
    if cached is not None:
        return cached
    logger.info("Cache MISS for key=%s – fetching from API", key)
    data = await fetch_fn()
    if data:
        set_cached(key, data)
    else:
        logger.warning("Not caching empty response for key=%s", key)
    return data
