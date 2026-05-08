from utils.color import rgb_to_hex, rgb_to_hsl, hex_to_rgb, hue_distance


def test_rgb_to_hex() -> None:
    assert rgb_to_hex((26, 26, 46)) == "#1A1A2E"
    assert rgb_to_hex((255, 255, 255)) == "#FFFFFF"
    assert rgb_to_hex((0, 0, 0)) == "#000000"


def test_rgb_to_hsl() -> None:
    h, s, l = rgb_to_hsl((255, 0, 0))
    assert h == 0
    assert s == 100
    assert l == 50


def test_hex_to_rgb() -> None:
    assert hex_to_rgb("#1A1A2E") == (26, 26, 46)


def test_hue_distance() -> None:
    assert hue_distance(10, 350) == 20
    assert hue_distance(0, 180) == 180
