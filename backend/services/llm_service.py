"""Gemini integration with one guarded, data-grounded function call per turn."""

from __future__ import annotations

import json
import logging
import os
import time
from collections.abc import Awaitable, Callable
from typing import Any

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

logger = logging.getLogger(__name__)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
FALLBACK_MODELS = ["gemini-3.7-flash"]
_client = genai.Client(api_key=GEMINI_API_KEY, http_options=types.HttpOptions(timeout=15000))

ToolExecutor = Callable[[str, dict[str, Any]], Awaitable[dict[str, Any]]]

TOOL_SCHEMAS = [
    types.FunctionDeclaration(
        name="get_forecast",
        description="Get latest and/or day-ahead wind generation forecasts for a January 2026 delivery date, optionally at one exact UK-local delivery time.",
        parameters_json_schema={
            "type": "object",
            "properties": {
                "date": {"type": "string", "description": "YYYY-MM-DD, today, or tomorrow."},
                "time": {"type": "string", "description": "Optional UK-local interval start in HH:MM."},
                "forecast_type": {"type": "string", "enum": ["latest", "day_ahead", "both"]},
                "include_actual": {"type": "boolean", "description": "Set true when the user asks to compare forecast with measured actual generation."},
            },
            "required": ["date"],
        },
    ),
    types.FunctionDeclaration(
        name="get_accuracy",
        description="Get January 2026 wind forecast accuracy metrics, lead-time breakdowns, or a small actual-versus-forecast sample.",
        parameters_json_schema={
            "type": "object",
            "properties": {
                "breakdown": {"type": "string", "enum": ["overall", "lead_time", "actual_vs_forecast"]},
                "lead_time_bucket": {"type": "string", "description": "Optional exact bucket such as 12-24h."},
                "date_from": {"type": "string", "description": "Optional, unsupported unless the existing calculation path supports it."},
                "date_to": {"type": "string", "description": "Optional, unsupported unless the existing calculation path supports it."},
            },
        },
    ),
    types.FunctionDeclaration(
        name="get_forecast_revisions",
        description="Get the largest absolute differences between latest and day-ahead wind forecasts for one January 2026 delivery date.",
        parameters_json_schema={
            "type": "object",
            "properties": {
                "date": {"type": "string", "description": "YYYY-MM-DD, today, or tomorrow."},
                "limit": {"type": "integer", "minimum": 1, "maximum": 20},
            },
            "required": ["date"],
        },
    ),
]
TOOLS = [types.Tool(function_declarations=TOOL_SCHEMAS)]

SYSTEM_PROMPT = """You are a concise wind-energy analyst supporting a UK electricity trading team.
Use only the supplied context and results from the approved data tools. Never invent forecasts, metrics, timestamps, coverage, sample counts, or procurement requirements.
Generation and errors are in MW. Positive forecast bias means forecast minus actual, so it means over-forecasting. Keep latest forecasts, day-ahead forecasts, and measured actuals distinct.
Historical accuracy describes past forecast behaviour; it is not a confidence interval and does not by itself make a procurement recommendation.
When a user asks how forecast accuracy varies by lead time, call get_accuracy with breakdown="lead_time" and use the returned bucket data to answer. Do not claim the breakdown is unavailable merely because it is absent from the initial static context.
When a user asks for forecast versus actual generation at a date or delivery time, call get_forecast with include_actual=true and the requested date/time. Use the forecast and actual values returned for the same interval; do not make a second tool call.
The supported delivery dataset is January 2026 only. Current date context is supplied separately in Europe/London. If a requested date is outside supported data, say so clearly.
Answer ordinary questions in two to five sentences. Include the relevant period, timestamp, units, and convention when needed.

Runtime context:
{runtime_context}
"""


def _contents(history: list[dict[str, str]], message: str) -> list[types.Content]:
    contents = []
    for turn in history:
        role = turn.get("role", "user")
        if role not in ("user", "model"):
            role = "user"
        contents.append(types.Content(role=role, parts=[types.Part(text=turn.get("content", ""))]))
    contents.append(types.Content(role="user", parts=[types.Part(text=message)]))
    return contents


def _function_call(response: Any) -> tuple[Any, Any] | None:
    for candidate in getattr(response, "candidates", []) or []:
        content = getattr(candidate, "content", None)
        for part in getattr(content, "parts", []) or []:
            call = getattr(part, "function_call", None)
            if call and getattr(call, "name", None):
                return content, call
    return None


def _format_exact_forecast_comparison(result: dict[str, Any]) -> str | None:
    slots = result.get("slots") or []
    if result.get("status") != "ok" or result.get("forecast_type") != "both" or len(slots) != 1:
        return None
    slot = slots[0]
    actual = slot.get("actual_generation_mw")
    latest = slot.get("latest_forecast_mw")
    day_ahead = slot.get("day_ahead_forecast_mw")
    if actual is None or latest is None:
        return None
    answer = (
        f"For {slot['delivery_time']}, the latest wind generation forecast was "
        f"{latest:g} MW and measured actual generation was {actual:g} MW."
    )
    if day_ahead is not None:
        answer += f" The day-ahead forecast was {day_ahead:g} MW."
    return answer


async def _generate(model: str, contents: list[types.Content], system: str, tools: list[Any] | None) -> Any:
    config = types.GenerateContentConfig(
        system_instruction=system,
        temperature=0.2,
        max_output_tokens=800,
        tools=tools,
    )
    return await _client.aio.models.generate_content(model=model, contents=contents, config=config)


async def chat(
    message: str,
    history: list[dict[str, str]],
    runtime_context: str,
    tool_executor: ToolExecutor,
) -> str:
    system = SYSTEM_PROMPT.format(runtime_context=runtime_context)
    contents = _contents(history, message)

    for model_name in FALLBACK_MODELS:
        started = time.perf_counter()
        try:
            first = await _generate(model_name, contents, system, TOOLS)
            requested = _function_call(first)
            if requested is None:
                if first and first.text:
                    logger.info("chat model=%s tool=none latency_ms=%.0f", model_name, (time.perf_counter() - started) * 1000)
                    return first.text
                raise RuntimeError("Gemini returned no text or function call")

            model_content, function_call = requested
            function_name = str(function_call.name)
            raw_args = dict(function_call.args or {})
            logger.info(
                "chat gemini_tool_call model=%s payload=%s",
                model_name,
                json.dumps({"name": function_name, "args": raw_args}, sort_keys=True, default=str),
            )
            tool_started = time.perf_counter()
            try:
                tool_result = await tool_executor(function_name, raw_args)
            except Exception as exc:
                tool_result = {
                    "status": "data_unavailable",
                    "reason": "The requested data query could not be validated or completed.",
                }
                logger.warning(
                    "chat tool=%s failed latency_ms=%.0f error=%s",
                    function_name,
                    (time.perf_counter() - tool_started) * 1000,
                    str(exc)[:160],
                )
            else:
                logger.info(
                    "chat tool=%s result=%s latency_ms=%.0f",
                    function_name,
                    json.dumps(tool_result, sort_keys=True, default=str),
                    (time.perf_counter() - tool_started) * 1000,
                )

            function_response = {"result": tool_result}
            logger.info(
                "chat gemini_tool_response name=%s payload=%s",
                function_name,
                json.dumps(function_response, sort_keys=True, default=str),
            )
            follow_up_contents = contents + [
                model_content,
                types.Content(
                    role="user",
                    parts=[types.Part.from_function_response(name=function_name, response=function_response)],
                ),
            ]
            final = await _generate(model_name, follow_up_contents, system, None)
            if final and final.text:
                logger.info("chat gemini_final_response model=%s text=%s", model_name, final.text)
                logger.info("chat model=%s tool=%s total_latency_ms=%.0f", model_name, function_name, (time.perf_counter() - started) * 1000)
                return final.text
            logger.warning(
                "chat gemini_final_response_empty model=%s candidates=%s",
                model_name,
                json.dumps(
                    [
                        {
                            "finish_reason": str(getattr(candidate, "finish_reason", "")),
                            "parts": [
                                {
                                    "text": getattr(part, "text", None),
                                    "function_call": getattr(part, "function_call", None) is not None,
                                }
                                for part in getattr(getattr(candidate, "content", None), "parts", []) or []
                            ],
                        }
                        for candidate in getattr(final, "candidates", []) or []
                    ],
                    default=str,
                ),
            )
            if function_name == "get_forecast":
                grounded_answer = _format_exact_forecast_comparison(tool_result)
                if grounded_answer:
                    logger.info("chat grounded_fallback_response text=%s", grounded_answer)
                    return grounded_answer
            return "The assistant could not turn the available data into an answer. Please try again."
        except Exception as exc:
            # Keep Google's structured error details (including its denial reason)
            # in the backend logs so deployment permission issues are diagnosable.
            logger.warning("Gemini model=%s failed: %s", model_name, str(exc)[:2000])
            if model_name == FALLBACK_MODELS[-1]:
                logger.error("All Gemini models failed")

    return "The assistant is temporarily unavailable. Please try again in a few moments."
