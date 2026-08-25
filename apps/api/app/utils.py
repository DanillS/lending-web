from __future__ import annotations

import re
import unicodedata

_TRANSLIT = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e",
    "ж": "zh", "з": "z", "и": "i", "й": "i", "к": "k", "л": "l", "м": "m",
    "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
    "ф": "f", "х": "h", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sch", "ъ": "",
    "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya",
}


def slugify(value: str) -> str:
    value = value.lower().strip()
    out = []
    for ch in value:
        if ch in _TRANSLIT:
            out.append(_TRANSLIT[ch])
        elif ch.isascii() and (ch.isalnum() or ch in "-_"):
            out.append(ch)
        elif ch.isspace() or ch in ".,/()":
            out.append("-")
        else:
            n = unicodedata.normalize("NFKD", ch)
            out.append(n.encode("ascii", "ignore").decode("ascii") or "-")
    slug = re.sub(r"-+", "-", "".join(out)).strip("-")
    return slug[:200] or "tovar"


def html_escape(value: str | None) -> str:
    if not value:
        return ""
    return (
        str(value)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#39;")
    )


_PHONE_RE = re.compile(r"^\+?7[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}$")
_DIGITS = re.compile(r"\D+")


def normalize_phone(raw: str) -> str | None:
    digits = _DIGITS.sub("", raw or "")
    if len(digits) == 11 and digits.startswith("8"):
        digits = "7" + digits[1:]
    if len(digits) == 10:
        digits = "7" + digits
    if len(digits) == 11 and digits.startswith("7"):
        return "+" + digits
    return None


def is_valid_ru_phone(raw: str) -> bool:
    return normalize_phone(raw) is not None


def apply_percent(base_price: int, percent: int) -> int:
    """current_price from original base_price. Round to whole rubles."""
    value = round(base_price * (1 + percent / 100.0))
    return max(0, int(value))
