from utils.color import rgb_to_hex, rgb_to_hsl

def assign_percentages(colors: list[tuple[int, int, int]]) -> list[float]:
    n = len(colors)
    if n == 0: return []
    weights = [1 / (i + 1) for i in range(n)]
    total = sum(weights)
    return [round((w / total) * 100, 1) for w in weights]

def format_palette_response(movie_id: int, top_colors: list[tuple[int, int, int]]):
    percentages = assign_percentages(top_colors)
    palette_data = []
    for i, color_rgb in enumerate(top_colors):
        h, s, l = rgb_to_hsl(color_rgb)
        palette_data.append({
            "hex": rgb_to_hex(color_rgb),
            "hsl": [h, s, l],
            "percentage": percentages[i],
            "position": i
        })
    
    return {
        "movie_id": movie_id,
        "palette": palette_data,
        "dominant_color": palette_data[0]["hex"] if palette_data else None
    }
