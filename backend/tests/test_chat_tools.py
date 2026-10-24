import unittest
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from zoneinfo import ZoneInfo

from pydantic import ValidationError

from routers import chat as chat_router
from services import chat_tools, data_processor, llm_service
from models.schemas import ChatRequest, ChatResponse


FORECASTS = [
    {
        "startTime": "2026-01-15T00:00:00+00:00",
        "publishTime": "2026-01-13T12:00:00+00:00",
        "generation": 100,
    },
    {
        "startTime": "2026-01-15T00:00:00+00:00",
        "publishTime": "2026-01-14T00:00:00+00:00",
        "generation": 95,
    },
    {
        "startTime": "2026-01-15T00:00:00+00:00",
        "publishTime": "2026-01-14T12:00:00+00:00",
        "generation": 92,
    },
    {
        "startTime": "2026-01-15T00:00:00+00:00",
        "publishTime": "2026-01-14T23:00:00+00:00",
        "generation": 90,
    },
    {
        "startTime": "2026-01-15T00:30:00+00:00",
        "publishTime": "2026-01-13T12:30:00+00:00",
        "generation": 200,
    },
    {
        "startTime": "2026-01-15T00:30:00+00:00",
        "publishTime": "2026-01-14T00:30:00+00:00",
        "generation": 195,
    },
    {
        "startTime": "2026-01-15T00:30:00+00:00",
        "publishTime": "2026-01-14T12:30:00+00:00",
        "generation": 200,
    },
    {
        "startTime": "2026-01-15T00:30:00+00:00",
        "publishTime": "2026-01-14T23:30:00+00:00",
        "generation": 180,
    },
]

ACTUALS = [
    {"startTime": "2026-01-15T00:00:00+00:00", "generation": 80},
    {"startTime": "2026-01-15T00:30:00+00:00", "generation": 190},
]


class ChatToolsTests(unittest.TestCase):
    def test_specific_forecast_returns_only_exact_interval(self):
        result = chat_tools.get_forecast(
            FORECASTS,
            {"date": "2026-01-15", "time": "00:30", "forecast_type": "both"},
        )

        self.assertEqual(result["status"], "ok")
        self.assertEqual(len(result["slots"]), 1)
        self.assertEqual(result["slots"][0]["latest_forecast_mw"], 180.0)
        self.assertEqual(result["slots"][0]["day_ahead_forecast_mw"], 195.0)

    def test_exact_forecast_comparison_returns_matching_actual(self):
        forecasts = [
            {"startTime": "2026-01-15T14:00:00+00:00", "publishTime": "2026-01-14T14:00:00+00:00", "generation": 300},
            {"startTime": "2026-01-15T14:00:00+00:00", "publishTime": "2026-01-15T13:00:00+00:00", "generation": 275},
        ]
        actuals = [{"startTime": "2026-01-15T14:00:00+00:00", "generation": 260}]
        result = chat_tools.get_forecast(
            forecasts,
            {"date": "2026-01-15", "time": "14:00", "include_actual": True},
            actuals,
        )
        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["slots"][0]["latest_forecast_mw"], 275.0)
        self.assertEqual(result["slots"][0]["day_ahead_forecast_mw"], 300.0)
        self.assertEqual(result["slots"][0]["actual_generation_mw"], 260.0)

    def test_day_ahead_summary_uses_day_ahead_values(self):
        result = chat_tools.get_forecast(
            FORECASTS,
            {"date": "2026-01-15", "forecast_type": "day_ahead"},
        )

        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["average_mw"], 145.0)
        self.assertEqual(result["peak_mw"], 195.0)

    def test_post_delivery_forecasts_are_not_returned_as_available_outlooks(self):
        future_only = [{
            "startTime": "2026-01-15T14:00:00+00:00",
            "publishTime": "2026-01-15T15:00:00+00:00",
            "generation": 123,
        }]
        slot = data_processor.get_latest_forecast(future_only, "2026-01-15")[0]
        self.assertIsNone(slot["latest_generation"])
        self.assertIsNone(slot["da_generation"])

    def test_missing_interval_does_not_substitute_nearby_time(self):
        result = chat_tools.get_forecast(FORECASTS, {"date": "2026-01-15", "time": "00:15"})
        self.assertEqual(result["status"], "data_unavailable")
        self.assertIn("exactly matched", result["reason"])

    def test_relative_date_uses_london_timezone(self):
        now = datetime(2026, 1, 14, 23, 30, tzinfo=ZoneInfo("Europe/London"))
        self.assertEqual(chat_tools.resolve_delivery_date("tomorrow", now), datetime(2026, 1, 15).date())

    def test_outside_dataset_returns_structured_unavailable_result(self):
        result = chat_tools.get_forecast(FORECASTS, {"date": "2026-02-01"})
        self.assertEqual(result["status"], "data_unavailable")
        self.assertEqual(result["resolved_date"], "2026-02-01")

    def test_accuracy_overall_and_lead_time_use_existing_calculations(self):
        overall = chat_tools.get_accuracy(FORECASTS, ACTUALS, {"breakdown": "overall"})
        lead_time = chat_tools.get_accuracy(FORECASTS, ACTUALS, {"breakdown": "lead_time", "lead_time_bucket": "0-6h"})

        self.assertEqual(overall["count"], 2)
        self.assertEqual(overall["mae"], 10.0)
        self.assertEqual(overall["bias"], 10.0)
        self.assertEqual(len(lead_time["buckets"]), 1)
        self.assertEqual(lead_time["buckets"][0]["bucket"], "0-6h")

    def test_missing_actuals_are_not_treated_as_zero(self):
        result = chat_tools.get_accuracy(FORECASTS, [], {"breakdown": "overall"})
        self.assertEqual(result["status"], "data_unavailable")
        self.assertEqual(result["count"], 0)
        self.assertIsNone(result["mae"])

    def test_revisions_keep_latest_minus_day_ahead_sign(self):
        result = chat_tools.get_forecast_revisions(FORECASTS, {"date": "2026-01-15", "limit": 2})
        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["revisions"][0]["change_mw"], -15.0)

    def test_invalid_tool_arguments_are_rejected(self):
        with self.assertRaises(ValidationError):
            chat_tools.get_forecast(FORECASTS, {"date": "2026-01-15", "time": "25:00"})

    def test_tool_dispatch_uses_allowlist_and_cache_loader(self):
        with patch.object(chat_router, "_get_forecasts", new=AsyncMock(return_value=FORECASTS)) as loader:
            result = __import__("asyncio").run(chat_router.execute_tool("get_forecast", {"date": "2026-01-15", "time": "00:00"}))
        self.assertEqual(result["status"], "ok")
        loader.assert_awaited_once()

    def test_accuracy_dispatch_loads_each_cached_dataset_once(self):
        with (
            patch.object(chat_router, "_get_forecasts", new=AsyncMock(return_value=FORECASTS)) as forecasts_loader,
            patch.object(chat_router, "_get_actuals", new=AsyncMock(return_value=ACTUALS)) as actuals_loader,
        ):
            result = __import__("asyncio").run(chat_router.execute_tool("get_accuracy", {"breakdown": "overall"}))
        self.assertEqual(result["count"], 2)
        forecasts_loader.assert_awaited_once()
        actuals_loader.assert_awaited_once()


class LlmFlowTests(unittest.IsolatedAsyncioTestCase):
    async def test_normal_answer_does_not_execute_a_tool(self):
        executor = AsyncMock()
        response = SimpleNamespace(text="MAE is mean absolute error.", candidates=[])
        with patch.object(llm_service, "_generate", new=AsyncMock(return_value=response)) as generate:
            result = await llm_service.chat("What is MAE?", [], "January 2026 only", executor)
        self.assertEqual(result, "MAE is mean absolute error.")
        executor.assert_not_awaited()
        generate.assert_awaited_once()

    async def test_supported_function_call_gets_one_tool_result_then_final_answer(self):
        function_part = llm_service.types.Part(
            function_call=llm_service.types.FunctionCall(
                name="get_accuracy",
                args={"breakdown": "overall"},
            )
        )
        first = SimpleNamespace(
            text="",
            candidates=[SimpleNamespace(content=llm_service.types.Content(role="model", parts=[function_part]))],
        )
        final = SimpleNamespace(text="The January MAE is 10 MW.", candidates=[])
        executor = AsyncMock(return_value={"status": "ok", "mae": 10})
        with patch.object(llm_service, "_generate", new=AsyncMock(side_effect=[first, final])) as generate:
            result = await llm_service.chat("What is the MAE?", [], "January 2026 only", executor)
        self.assertEqual(result, "The January MAE is 10 MW.")
        executor.assert_awaited_once_with("get_accuracy", {"breakdown": "overall"})
        self.assertEqual(generate.await_count, 2)

    async def test_lead_time_accuracy_question_uses_tool_result_in_final_turn(self):
        buckets = chat_tools.get_accuracy(FORECASTS, ACTUALS, {"breakdown": "lead_time"})["buckets"]
        function_part = llm_service.types.Part(
            function_call=llm_service.types.FunctionCall(
                name="get_accuracy",
                args={"breakdown": "lead_time"},
            )
        )
        first = SimpleNamespace(
            text="",
            candidates=[SimpleNamespace(content=llm_service.types.Content(role="model", parts=[function_part]))],
        )
        final = SimpleNamespace(
            text="In January, the 0-6h bucket has MAE 10 MW, RMSE 10 MW, zero bias, and 2 samples. Longer buckets have no matched samples.",
            candidates=[],
        )

        async def execute_selected_tool(name, arguments):
            return await chat_router.execute_tool(name, arguments)

        with (
            patch.object(chat_router, "_get_forecasts", new=AsyncMock(return_value=FORECASTS)),
            patch.object(chat_router, "_get_actuals", new=AsyncMock(return_value=ACTUALS)),
            patch.object(llm_service, "_generate", new=AsyncMock(side_effect=[first, final])) as generate,
        ):
            answer = await llm_service.chat(
                "How does forecast accuracy vary by lead time?",
                [],
                "January 2026 only",
                execute_selected_tool,
            )

        self.assertEqual(answer, final.text)
        first_call = generate.await_args_list[0]
        system_instruction = first_call.args[2]
        self.assertIn('call get_accuracy with breakdown="lead_time"', system_instruction)
        second_contents = generate.await_args_list[1].args[1]
        sent_tool_response = second_contents[-1].parts[0].function_response
        self.assertEqual(sent_tool_response.name, "get_accuracy")
        self.assertEqual(sent_tool_response.response, {"result": {
            "status": "ok",
            "breakdown": "lead_time",
            "period": "January 2026",
            "units": "MW",
            "bias_convention": "forecast minus actual; positive bias means over-forecasting.",
            "buckets": buckets,
        }})
        self.assertEqual(
            [(bucket["bucket"], bucket["mae"], bucket["rmse"], bucket["bias"], bucket["count"]) for bucket in buckets],
            [("0-6h", 10.0, 10.0, 0.0, 2), ("6-12h", None, None, None, 0),
             ("12-24h", 11.0, 11.045361017187261, 11.0, 2), ("24-36h", 10.0, 11.180339887498949, 10.0, 2),
             ("36h+", 15.0, 15.811388300841896, 15.0, 2)],
        )
        self.assertIn("0-6h", answer)
        self.assertIn("2 samples", answer)

    async def test_exact_forecast_vs_actual_survives_empty_gemini_final(self):
        forecasts = [
            {"startTime": "2026-01-15T14:00:00+00:00", "publishTime": "2026-01-14T14:00:00+00:00", "generation": 300},
            {"startTime": "2026-01-15T14:00:00+00:00", "publishTime": "2026-01-15T13:00:00+00:00", "generation": 275},
        ]
        actuals = [{"startTime": "2026-01-15T14:00:00+00:00", "generation": 260}]
        function_part = llm_service.types.Part(
            function_call=llm_service.types.FunctionCall(
                name="get_forecast",
                args={"date": "2026-01-15", "time": "14:00", "include_actual": True},
            )
        )
        first = SimpleNamespace(
            text="",
            candidates=[SimpleNamespace(content=llm_service.types.Content(role="model", parts=[function_part]))],
        )
        empty_final = SimpleNamespace(text=None, candidates=[])

        async def execute_selected_tool(name, arguments):
            return await chat_router.execute_tool(name, arguments)

        with (
            patch.object(chat_router, "_get_forecasts", new=AsyncMock(return_value=forecasts)),
            patch.object(chat_router, "_get_actuals", new=AsyncMock(return_value=actuals)),
            patch.object(llm_service, "_generate", new=AsyncMock(side_effect=[first, empty_final])) as generate,
        ):
            answer = await llm_service.chat(
                "For 15 January 2026 at 14:00, what was the wind generation forecast versus actual generation?",
                [],
                "January 2026 only",
                execute_selected_tool,
            )

        self.assertEqual(
            answer,
            "For 2026-01-15 14:00 GMT, the latest wind generation forecast was 275 MW and measured actual generation was 260 MW. The day-ahead forecast was 300 MW.",
        )
        self.assertIn('call get_forecast with include_actual=true', generate.await_args_list[0].args[2])
        tool_response = generate.await_args_list[1].args[1][-1].parts[0].function_response.response
        self.assertEqual(tool_response["result"]["slots"][0]["actual_generation_mw"], 260.0)

    async def test_tool_validation_error_returns_grounded_unavailable_answer(self):
        function_part = llm_service.types.Part(
            function_call=llm_service.types.FunctionCall(
                name="get_forecast",
                args={"date": "not-a-date"},
            )
        )
        first = SimpleNamespace(
            text="",
            candidates=[SimpleNamespace(content=llm_service.types.Content(role="model", parts=[function_part]))],
        )
        final = SimpleNamespace(text="That forecast request is unavailable.", candidates=[])
        executor = AsyncMock(side_effect=ValueError("invalid date"))
        with patch.object(llm_service, "_generate", new=AsyncMock(side_effect=[first, final])) as generate:
            result = await llm_service.chat("Show me that forecast.", [], "January 2026 only", executor)
        self.assertEqual(result, "That forecast request is unavailable.")
        self.assertEqual(generate.await_count, 2)


class ApiCompatibilityTests(unittest.TestCase):
    def test_existing_chat_response_shape_is_unchanged(self):
        response = ChatResponse(response="Grounded answer")
        self.assertEqual(response.model_dump(), {"response": "Grounded answer"})

    def test_chat_router_returns_existing_response_model(self):
        request = ChatRequest(message="What is MAE?")
        with patch.object(chat_router.llm_service, "chat", new=AsyncMock(return_value="MAE is mean absolute error.")):
            response = __import__("asyncio").run(chat_router.chat(request))
        self.assertIsInstance(response, ChatResponse)
        self.assertEqual(response.response, "MAE is mean absolute error.")
