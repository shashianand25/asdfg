import unittest
from unittest.mock import AsyncMock, patch

from services import cache


class CacheTests(unittest.IsolatedAsyncioTestCase):
    async def test_empty_source_response_is_not_cached(self):
        with (
            patch.object(cache, "get_cached", return_value=None),
            patch.object(cache, "set_cached") as set_cached,
        ):
            result = await cache.get_or_fetch("empty", AsyncMock(return_value=[]))

        self.assertEqual(result, [])
        set_cached.assert_not_called()

    async def test_nonempty_source_response_is_cached(self):
        records = [{"generation": 123}]
        with (
            patch.object(cache, "get_cached", return_value=None),
            patch.object(cache, "set_cached") as set_cached,
        ):
            result = await cache.get_or_fetch("records", AsyncMock(return_value=records))

        self.assertEqual(result, records)
        set_cached.assert_called_once_with("records", records)
