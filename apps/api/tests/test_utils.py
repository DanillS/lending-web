from app.utils import apply_percent, html_escape, normalize_phone, slugify


def test_apply_percent_from_base_not_current():
    assert apply_percent(1000, 10) == 1100
    assert apply_percent(1000, -10) == 900
    assert apply_percent(4050, -10) == 3645
    assert apply_percent(7400, 0) == 7400


def test_html_escape():
    assert html_escape("<b>hi</b>") == "&lt;b&gt;hi&lt;/b&gt;"
    assert "&quot;" in html_escape('"x"')


def test_phone():
    assert normalize_phone("8 (950) 310-15-60") == "+79503101560"
    assert normalize_phone("79503101560") == "+79503101560"
    assert normalize_phone("123") is None


def test_slugify():
    assert "c-5" in slugify("C-5 (Эшвайт ПВХ)")
    assert slugify("") == "tovar"
