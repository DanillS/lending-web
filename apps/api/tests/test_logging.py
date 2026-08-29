import json
import logging

from app.logging import JsonFormatter, RequestIdFilter, request_id_ctx, setup_logging


def test_json_formatter_includes_level_and_message():
    record = logging.LogRecord("doors", logging.INFO, __file__, 1, "hello", (), None)
    line = JsonFormatter().format(record)
    payload = json.loads(line)
    assert payload["level"] == "info"
    assert payload["msg"] == "hello"
    assert "ts" in payload


def test_request_id_filter_reads_context():
    token = request_id_ctx.set("abc123")
    try:
        record = logging.LogRecord("doors", logging.INFO, __file__, 1, "x", (), None)
        assert RequestIdFilter().filter(record) is True
        assert record.request_id == "abc123"
    finally:
        request_id_ctx.reset(token)


def test_setup_logging_text_mode():
    setup_logging(json_logs=False)
    assert logging.getLogger().handlers
