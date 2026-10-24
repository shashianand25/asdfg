"""
Wind Power Procurement Dashboard - FastAPI Backend
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import asyncio
import logging

load_dotenv()

from routers import forecast, accuracy, chat
from services import elexon_client, cache as cache_service

logger = logging.getLogger(__name__)

FORECAST_PUBLISH_START = "2025-12-31"
JAN_START = "2026-01-01"
JAN_END   = "2026-01-31"

app = FastAPI(
    title="Wind Power Procurement Dashboard API",
    description="Backend API for wind power forecast data and accuracy metrics",
    version="1.0.0",
)

# Enable CORS for all origins (development-friendly)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(forecast.router, prefix="/api/forecast", tags=["Forecast"])
app.include_router(accuracy.router, prefix="/api/accuracy", tags=["Accuracy"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])


@app.on_event("startup")
async def pre_warm_cache():
    """
    Pre-warm the January 2026 file cache without blocking startup.
    """
    async def _warm():
        try:
            logger.info("Pre-warming cache: fetching WINDFOR Jan 2026...")
            await cache_service.get_or_fetch(
                "windfor_jan2026_d1",
                lambda: elexon_client.fetch_windfor(FORECAST_PUBLISH_START, JAN_END),
            )
            logger.info("Pre-warming cache: fetching FUELHH Jan 2026...")
            await cache_service.get_or_fetch(
                "fuelhh_wind_jan2026",
                lambda: elexon_client.fetch_fuelhh(JAN_START, JAN_END),
            )
            logger.info("Cache pre-warm complete.")
        except Exception as e:
            logger.warning("Cache pre-warm failed (non-fatal): %s", e)

    asyncio.create_task(_warm())


@app.get("/", tags=["Health"])
async def root():
    """Health check endpoint."""
    return {"status": "ok"}
