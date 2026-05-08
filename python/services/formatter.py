from models.response import ColorEntry, PaletteResponse
from utils.color import rgb_to_hex, rgb_to_hsl


def assign_percentages(colors: list[tuple[int, int, int]]) -> list[float]:
    n = len(colors)
    if n == 0:
        return []
    
    weights = [1 / (i + 1) for i in range(n)]
    total = sum(weights)
    return [round((w / total) * 100, 1) for w in weights]


def format_palette_response(
    movie_id: int, 
    top_colors: list[tuple[int, int, int]]
) -> PaletteResponse:
    percentages = assign_percentages(top_colors)
    
    palette_entries = []
    for i, color_rgb in enumerate(top_colors):
        palette_entries.append(ColorEntry(
            hex=rgb_to_hex(color_rgb),
            hsl=list(rgb_to_hsl(color_rgb)),
            percentage=percentages[i],
        ))

    return PaletteResponse(
        movie_id=movie_id,
        palette=palette_entries,
        dominant_color=palette_entries[0].hex if palette_entries else ""
    )