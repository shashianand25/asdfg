"""
Pydantic schemas for request/response models.
"""

from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------

class ChatTurn(BaseModel):
    role: str = Field(..., description="'user' or 'model'")
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    history: list[ChatTurn] = Field(default_factory=list)
    selected_date: Optional[str] = Field(
        default=None,
        description="Optional delivery date (YYYY-MM-DD) currently selected in the UI",
    )


class ChatResponse(BaseModel):
    response: str


# ---------------------------------------------------------------------------
# Forecast
# ---------------------------------------------------------------------------

class ForecastSlot(BaseModel):
    startTime: str
    latest_generation: Optional[float] = None
    da_generation: Optional[float] = None


class ForecastLatestResponse(BaseModel):
    date: str
    slots: list[ForecastSlot]


class ForecastHistoryEntry(BaseModel):
    publishTime: str
    startTime: str
    generation: float


# ---------------------------------------------------------------------------
# Accuracy
# ---------------------------------------------------------------------------

class AccuracySummary(BaseModel):
    mae: Optional[float] = None
    rmse: Optional[float] = None
    bias: Optional[float] = None
    count: int = 0


class LeadTimeBucket(BaseModel):
    bucket: str
    mae: Optional[float] = None
    rmse: Optional[float] = None
    bias: Optional[float] = None
    count: int = 0


class ActualVsForecastPoint(BaseModel):
    startTime: str
    forecast: float
    actual: float
    error: float
