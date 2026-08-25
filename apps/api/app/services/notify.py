from __future__ import annotations

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import httpx

from app.config import get_settings
from app.models import Order
from app.utils import html_escape

logger = logging.getLogger(__name__)
settings = get_settings()


def _order_html(order: Order) -> str:
    rows = "".join(
        f"<tr><td>{html_escape(item.title)}</td><td>{item.quantity}</td><td>{item.line_total} ₽</td></tr>"
        for item in order.items
    )
    return (
        f"<h2>Заявка {html_escape(order.public_number)}</h2>"
        f"<p><b>Имя:</b> {html_escape(order.customer_name)}</p>"
        f"<p><b>Телефон:</b> {html_escape(order.phone)}</p>"
        f"<p><b>Комментарий:</b> {html_escape(order.comment) or 'нет'}</p>"
        f"<p><b>Сумма:</b> {order.total_snapshot} ₽</p>"
        f"<table border='1' cellpadding='6'><tr><th>Позиция</th><th>Кол-во</th><th>Сумма</th></tr>{rows}</table>"
    )


def _order_telegram(order: Order) -> str:
    lines = "\n".join(
        f"• {html_escape(item.title)} × {item.quantity} — {item.line_total} ₽" for item in order.items
    )
    return (
        f"<b>Новая заявка {html_escape(order.public_number)}</b>\n"
        f"<b>Имя:</b> {html_escape(order.customer_name)}\n"
        f"<b>Телефон:</b> {html_escape(order.phone)}\n"
        f"<b>Комментарий:</b> {html_escape(order.comment) or 'нет'}\n"
        f"<b>Сумма:</b> {order.total_snapshot} ₽\n\n{lines}"
    )


async def notify_order(order: Order) -> None:
    text = _order_telegram(order)
    html = _order_html(order)
    if settings.telegram_bot_token and settings.telegram_chat_id:
        url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.post(
                    url,
                    json={
                        "chat_id": settings.telegram_chat_id,
                        "text": text,
                        "parse_mode": "HTML",
                    },
                )
                if response.status_code >= 400:
                    logger.error("Telegram error: %s", response.text)
        except Exception:
            logger.exception("Telegram send failed")
    else:
        logger.info("Telegram is not configured, skip")

    if settings.email_user and settings.email_pass:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"Заявка {order.public_number}"
            msg["From"] = settings.email_user
            msg["To"] = settings.email_user
            msg.attach(MIMEText(html, "html", "utf-8"))
            with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=10) as smtp:
                smtp.login(settings.email_user, settings.email_pass)
                smtp.send_message(msg)
        except Exception:
            logger.exception("Email send failed")
    else:
        logger.info("Email is not configured, skip")
