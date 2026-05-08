import colorsys


def rgb_to_hex(rgb: tuple[int, int, int]) -> str:
    r, g, b = rgb
    return f"#{r:02X}{g:02X}{b:02X}"


def rgb_to_hsl(rgb: tuple[int, int, int]) -> tuple[int, int, int]:
    r, g, b = rgb[0] / 255, rgb[1] / 255, rgb[2] / 255
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    return (
        round(h * 360),
        round(s * 100),
        round(l * 100),
    )


def hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4)) # type: ignore


def hue_distance(h1: int, h2: int) -> int:
    diff = abs(h1 - h2)
    return min(diff, 360 - diff)
