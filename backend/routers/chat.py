"""
Chat router — AI assistant endpoint powered by Gemini.
"""

from __future__ import annotations

import logging
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException

from models.schemas import ChatRequest, ChatResponse
from services import cache as cache_service
from services import chat_tools
from services import elexon_client
from services import llm_service

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


async def execute_tool(name: str, arguments: dict) -> dict:
    if name == "get_forecast":
        validated = chat_tools.ForecastArgs.model_validate(arguments).model_dump(exclude_none=True)
        logger.info("chat validated_tool name=%s arguments=%s", name, validated)
        forecasts = await _get_forecasts()
        actuals = await _get_actuals() if validated.get("include_actual") else None
        return chat_tools.get_forecast(forecasts, validated, actuals)
    if name == "get_accuracy":
        validated = chat_tools.AccuracyArgs.model_validate(arguments).model_dump(exclude_none=True)
        logger.info("chat validated_tool name=%s arguments=%s", name, validated)
        forecasts, actuals = await _get_forecasts(), await _get_actuals()
        return chat_tools.get_accuracy(forecasts, actuals, validated)
    if name == "get_forecast_revisions":
        validated = chat_tools.RevisionArgs.model_validate(arguments).model_dump(exclude_none=True)
        logger.info("chat validated_tool name=%s arguments=%s", name, validated)
        return chat_tools.get_forecast_revisions(await _get_forecasts(), validated)
    return {
        "status": "data_unavailable",
        "reason": "The requested assistant tool is not supported.",
    }


@router.post("", response_model=ChatResponse)
async def chat(body: ChatRequest):
    """
    Send a message to the wind energy analyst AI assistant.

    The assistant has access to January 2026 wind forecast and actual
    generation data, and will answer questions based strictly on that context.
    """
    if not body.message.strip():
        raise HTTPException(status_code=400, detail="Message must not be empty")

    history = [{"role": turn.role, "content": turn.content} for turn in body.history]
    current_date = datetime.now(ZoneInfo("Europe/London")).date().isoformat()
    runtime_context = (
        f"Current date in Europe/London: {current_date}. "
        f"The UI-selected delivery date is {body.selected_date or 'not provided'}. "
        "Use an approved tool for forecast values, revisions, or historical metric values."
    )

    response_text = await llm_service.chat(
        message=body.message,
        history=history,
        runtime_context=runtime_context,
        tool_executor=execute_tool,
    )

    return ChatResponse(response=response_text)
